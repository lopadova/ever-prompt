import { eq, sql, desc } from 'drizzle-orm';
import {
  prompts, tags, promptTags, categories,
  projects, promptAiReviews, promptVersions, activityLog,
} from '@everprompt/db';
import { ulid, slugify, computeDiff } from '@everprompt/shared';
import { db as createDb } from '../lib/db';
import { kvInvalidate } from '../lib/kv';
import type { ClassifyOutput } from './classify';
import type { ScoreOutput } from './score';
import type { NormalizeResult } from './normalize';

export interface PostProcessInput {
  promptId: string;
  classification: ClassifyOutput;
  review: ScoreOutput;
  norm: NormalizeResult;
  env: {
    DB: D1Database;
    KV: KVNamespace;
  };
}

export async function postProcess(input: PostProcessInput): Promise<void> {
  const { promptId, classification, review, norm, env } = input;
  const d = createDb(env.DB);
  const now = new Date().toISOString();

  // ---- Upsert tags by slug (create if not exists) ----
  const tagIds: string[] = [];
  for (const aiTag of classification.tags) {
    const tagSlug = slugify(aiTag.name);
    if (!tagSlug) continue;

    // Check if tag exists
    const [existingTag] = await d.select().from(tags)
      .where(eq(tags.slug, tagSlug))
      .limit(1);

    let tagId: string;
    if (existingTag) {
      tagId = existingTag.id;
    } else {
      // Create new tag
      tagId = ulid();
      await d.insert(tags).values({
        id: tagId,
        name: aiTag.name,
        slug: tagSlug,
        kind: aiTag.kind || 'topic',
        color: null,
        usage_count: 0,
        is_ai_generated: true,
        created_at: now,
      });
    }

    tagIds.push(tagId);

    // Link tag to prompt (upsert: skip if already linked)
    const existing = await d.select().from(promptTags)
      .where(sql`${promptTags.prompt_id} = ${promptId} AND ${promptTags.tag_id} = ${tagId}`)
      .limit(1);

    if (existing.length === 0) {
      await d.insert(promptTags).values({
        prompt_id: promptId,
        tag_id: tagId,
        confidence: aiTag.confidence,
        origin: 'ai',
      });
    }
  }

  // ---- Upsert category (AI suggestion) ----
  let categoryId: string | null = null;
  if (classification.category_suggestion) {
    const catSlug = slugify(classification.category_suggestion);
    if (catSlug) {
      const [existingCat] = await d.select().from(categories)
        .where(eq(categories.slug, catSlug))
        .limit(1);

      if (existingCat) {
        categoryId = existingCat.id;
      } else {
        categoryId = ulid();
        await d.insert(categories).values({
          id: categoryId,
          name: classification.category_suggestion,
          slug: catSlug,
          parent_id: null,
          sort_order: 0,
          color: null,
          icon: null,
          prompt_count: 0,
        });
      }
    }
  }

  // ---- Update prompt_count on project/category/tags ----
  // Get current prompt to know its project_id
  const [currentPrompt] = await d.select().from(prompts)
    .where(eq(prompts.id, promptId))
    .limit(1);

  // Update tag usage counts
  for (const tagId of tagIds) {
    // Recount to be accurate
    const [countResult] = await d.select({
      count: sql<number>`COUNT(*)`,
    }).from(promptTags).where(eq(promptTags.tag_id, tagId));
    await d.update(tags).set({ usage_count: countResult.count }).where(eq(tags.id, tagId));
  }

  // Update category prompt_count if we're setting a new category
  if (categoryId && currentPrompt && !currentPrompt.category_id) {
    await d.update(categories).set({
      prompt_count: sql`${categories.prompt_count} + 1`,
    }).where(eq(categories.id, categoryId));
  } else if (categoryId && currentPrompt && currentPrompt.category_id && currentPrompt.category_id !== categoryId) {
    // Decrement old, increment new
    await d.update(categories).set({
      prompt_count: sql`MAX(${categories.prompt_count} - 1, 0)`,
    }).where(eq(categories.id, currentPrompt.category_id));
    await d.update(categories).set({
      prompt_count: sql`${categories.prompt_count} + 1`,
    }).where(eq(categories.id, categoryId));
  }

  // ---- Save prompt_ai_reviews record ----
  const reviewId = ulid();
  await d.insert(promptAiReviews).values({
    id: reviewId,
    prompt_id: promptId,
    overall_score: review.overall_score,
    clarity_score: review.scores.clarity,
    context_score: review.scores.context,
    specificity_score: review.scores.specificity,
    structure_score: review.scores.structure,
    reusability_score: review.scores.reusability,
    actionability_score: review.scores.actionability,
    evaluation_score: review.scores.evaluation_readiness,
    safety_score: review.scores.safety,
    compression_score: review.scores.compression,
    toolability_score: review.scores.toolability,
    quality_band: review.quality_band,
    short_verdict: review.short_verdict,
    justification_md: '',
    strengths_md: review.strengths,
    weaknesses_md: review.weaknesses,
    improved_prompt_md: review.improved_prompt,
    improvement_diff: '',
    recommended_actions: JSON.stringify(review.recommended_actions),
    model_name: 'claude-sonnet-4-20250514',
    created_at: now,
  });

  // ---- Save prompt_versions ----
  // Check if original version exists
  const [existingOriginal] = await d.select().from(promptVersions)
    .where(sql`${promptVersions.prompt_id} = ${promptId} AND ${promptVersions.kind} = 'original'`)
    .limit(1);

  if (!existingOriginal && currentPrompt) {
    // Create original version if it doesn't exist yet
    await d.insert(promptVersions).values({
      id: ulid(),
      prompt_id: promptId,
      version_no: 1,
      body: currentPrompt.body_original,
      kind: 'original',
      diff_from_previous: null,
      created_at: now,
    });
  }

  // If improved prompt present, save as improved_ai version
  let hasImproved = false;
  let diffText = '';
  if (review.improved_prompt && review.improved_prompt.trim().length > 0) {
    hasImproved = true;

    // Generate diff
    const diffLines = computeDiff(
      currentPrompt?.body_original ?? '',
      review.improved_prompt,
    );
    diffText = diffLines
      .filter(line => line.type !== 'unchanged')
      .map(line => `${line.type === 'added' ? '+' : '-'} ${line.content}`)
      .join('\n');

    // Get latest version number
    const [latestVersion] = await d.select({ version_no: promptVersions.version_no })
      .from(promptVersions)
      .where(eq(promptVersions.prompt_id, promptId))
      .orderBy(desc(promptVersions.version_no))
      .limit(1);
    const nextVersionNo = (latestVersion?.version_no ?? 0) + 1;

    await d.insert(promptVersions).values({
      id: ulid(),
      prompt_id: promptId,
      version_no: nextVersionNo,
      body: review.improved_prompt,
      kind: 'improved_ai',
      diff_from_previous: diffText,
      created_at: now,
    });

    // Also update the improvement_diff on the review record
    await d.update(promptAiReviews).set({
      improvement_diff: diffText,
    }).where(eq(promptAiReviews.id, reviewId));
  }

  // ---- Update prompt fields ----
  const tagNames = classification.tags.map(t => t.name).join(' ');
  const searchText = [
    classification.title,
    classification.abstract,
    norm.body_normalized,
    tagNames,
  ].filter(Boolean).join(' ');

  const promptUpdates: Record<string, unknown> = {
    title: classification.title,
    abstract: classification.abstract,
    quality_band: review.quality_band,
    overall_score: review.overall_score,
    search_text: searchText,
    has_improved_version: hasImproved,
    updated_at: now,
  };

  // Set category if prompt doesn't already have one
  if (categoryId && currentPrompt && !currentPrompt.category_id) {
    promptUpdates.category_id = categoryId;
  }

  await d.update(prompts).set(promptUpdates).where(eq(prompts.id, promptId));

  // ---- Log to activity_log ----
  await d.insert(activityLog).values({
    id: ulid(),
    entity_type: 'prompt',
    entity_id: promptId,
    action: 'analyzed',
    payload_json: JSON.stringify({
      overall_score: review.overall_score,
      quality_band: review.quality_band,
      tags_count: classification.tags.length,
      has_improved: hasImproved,
    }),
    created_at: now,
  });

  // ---- Invalidate KV cache ----
  await kvInvalidate(
    env.KV,
    'dashboard:stats',
    'dashboard:charts:creation',
    'dashboard:charts:quality',
    'dashboard:charts:tags',
    'dashboard:charts:projects',
    'search:facets',
  );
}
