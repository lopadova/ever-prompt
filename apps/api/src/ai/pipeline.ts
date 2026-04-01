import { eq } from 'drizzle-orm';
import { prompts } from '@everprompt/db';
import { db } from '../lib/db';
import type { Env } from '../env';
import { normalizePrompt } from './normalize';
import { classify } from './classify';
import { score } from './score';
import { embed } from './embed';
import { postProcess } from './postprocess';
import { scanForSecurityIssues } from './security-scan';
import type { CustomPatternDef } from './security-scan';
import { getLLMConfig, createLLMProvider } from '../lib/llm';
import { kvGet } from '../lib/kv';

export async function runPipeline(
  env: Env['Bindings'],
  promptId: string
): Promise<void> {
  const d = db(env.DB);

  // Fetch prompt from D1
  const [prompt] = await d.select().from(prompts)
    .where(eq(prompts.id, promptId))
    .limit(1);

  if (!prompt) {
    throw new Error(`Prompt ${promptId} not found`);
  }

  // Set ai_status='analyzing'
  await d.update(prompts).set({ ai_status: 'analyzing' })
    .where(eq(prompts.id, promptId));

  try {
    // Build LLM provider from settings + env
    const llmConfig = await getLLMConfig(env.KV, env);
    const llm = createLLMProvider(llmConfig);

    // Step A: Security scan FIRST — redact sensitive data before any external AI call
    const customPatterns = await kvGet<CustomPatternDef[]>(env.KV, 'security:custom-patterns') ?? [];
    const securityResult = scanForSecurityIssues(prompt.body_original, customPatterns);

    // Use redacted body for ALL subsequent steps (prevents sending secrets to AI cloud)
    const safeBody = securityResult.has_issues ? securityResult.redacted_body : prompt.body_original;

    await d.update(prompts).set({
      has_security_issues: securityResult.has_issues,
      security_issues_json: securityResult.has_issues ? JSON.stringify(securityResult.issues) : null,
      // Store the redacted version as body_normalized so it's always safe
      body_normalized: safeBody,
    }).where(eq(prompts.id, promptId));

    // Step A.5: Normalize (on the safe/redacted body)
    const norm = await normalizePrompt(safeBody);
    await d.update(prompts).set({
      body_normalized: norm.body_normalized,
      language: norm.language,
      hash_sha256: norm.hash_sha256,
      fingerprint: norm.fingerprint,
      word_count: norm.word_count,
      char_count: norm.char_count,
    }).where(eq(prompts.id, promptId));

    // Step B: Classify (fast/cheap model) — uses REDACTED body, never sends raw secrets
    let classification;
    try {
      classification = await classify({
        body_normalized: norm.body_normalized,
        language: norm.language,
        llm,
        model: llmConfig.classifyModel,
      });
    } catch (e) {
      console.error('Classification failed:', e);
      await d.update(prompts).set({ ai_status: 'failed_classify' })
        .where(eq(prompts.id, promptId));
      return;
    }

    // Step C: Score (powerful model) — uses REDACTED body, never sends raw secrets
    let review;
    try {
      review = await score({
        body_original: safeBody,
        title: classification.title,
        abstract: classification.abstract,
        tags: classification.tags.map(t => t.name),
        intent: classification.detected_intent,
        llm,
        model: llmConfig.scoreModel,
      });
    } catch (e) {
      console.error('Scoring failed:', e);
      // Partial save: classification succeeded, scoring failed
      await d.update(prompts).set({
        ai_status: 'failed_score',
        title: classification.title,
        abstract: classification.abstract,
      }).where(eq(prompts.id, promptId));
      return;
    }

    // Step D: Embed
    try {
      await embed({
        promptId,
        title: classification.title,
        abstract: classification.abstract,
        body_normalized: norm.body_normalized,
        project_id: prompt.project_id,
        category_id: prompt.category_id,
        quality_band: review.quality_band,
        status: prompt.status,
        language: norm.language,
        is_favorite: prompt.is_favorite,
        ai: env.AI,
        vectorize: env.VECTORIZE,
        db: env.DB,
      });
    } catch (e) {
      console.error('Embedding failed (non-fatal):', e);
      // Non-fatal: prompt is analyzed but not semantically searchable
      // Continue to post-process, mark as partial at the end
      await d.update(prompts).set({ ai_status: 'partial' })
        .where(eq(prompts.id, promptId));
      // Still run post-process
    }

    // Step E: Post-process
    await postProcess({
      promptId,
      classification,
      review,
      norm,
      env: { DB: env.DB, KV: env.KV },
    });

    // Mark complete (unless already marked as partial due to embed failure)
    const [currentState] = await d.select({ ai_status: prompts.ai_status })
      .from(prompts)
      .where(eq(prompts.id, promptId))
      .limit(1);

    if (currentState && currentState.ai_status !== 'partial') {
      await d.update(prompts).set({
        ai_status: 'complete',
        ai_analyzed_at: new Date().toISOString(),
      }).where(eq(prompts.id, promptId));
    } else if (currentState && currentState.ai_status === 'partial') {
      // Still update ai_analyzed_at for partial completions
      await d.update(prompts).set({
        ai_analyzed_at: new Date().toISOString(),
      }).where(eq(prompts.id, promptId));
    }

  } catch (e) {
    console.error('Pipeline unexpected error:', e);
    await d.update(prompts).set({ ai_status: 'failed_classify' })
      .where(eq(prompts.id, promptId));
  }
}
