import type { LLMProvider } from '../lib/llm';
import type { ClassificationResult } from '../lib/claude';
import { stripJsonFences } from './utils';

/**
 * Generate a short session name (3-6 words) from the first prompt in a session.
 */
export async function generateSessionName(
  llm: LLMProvider,
  model: string,
  promptBody: string,
): Promise<string> {
  const truncated = promptBody.slice(0, 2000);
  const systemPrompt = `You generate very short session names (3-6 words) that summarize what a coding/AI conversation session is about. Return ONLY the session name, no quotes, no punctuation at the end, no explanation.`;

  try {
    const text = await llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a short session name for a session that started with this prompt:\n\n${truncated}` },
      ],
      maxTokens: 50,
      model,
    });

    const name = text.trim().replace(/^["']|["']$/g, '').slice(0, 100);
    return name || 'Unnamed Session';
  } catch (e) {
    console.error('Failed to generate session name:', e);
    return 'Unnamed Session';
  }
}

export interface ClassifyInput {
  body_normalized: string;
  language: string;
  llm: LLMProvider;
  model: string;
}

export interface ClassifyOutput {
  title: string;
  abstract: string;
  category_suggestion: string;
  tags: { name: string; kind: string; confidence: number }[];
  detected_intent: string;
  complexity: string;
}

export async function classify(input: ClassifyInput): Promise<ClassifyOutput> {
  const prompt = `Analyze this prompt and return a JSON object with: title (5-10 word concise title), abstract (1-2 sentences), category_suggestion (single category name), tags (array of {name, kind, confidence} where kind is one of: topic, model, tone, task, quality, domain, language, technique), detected_intent (code_generation|analysis|writing|brainstorming|debugging|planning|other), complexity (simple|moderate|complex|expert).

Language: ${input.language}

Prompt:
${input.body_normalized}

Return ONLY valid JSON, no markdown fences.`;

  const text = await input.llm.chat({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 1024,
    model: input.model,
  });

  let result: ClassificationResult;
  try {
    result = JSON.parse(stripJsonFences(text)) as ClassificationResult;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Classification returned invalid JSON: ${err.message}`);
    }
    throw err;
  }

  // Validate and sanitize the response
  return {
    title: typeof result.title === 'string' ? result.title.slice(0, 200) : 'Untitled Prompt',
    abstract: typeof result.abstract === 'string' ? result.abstract.slice(0, 500) : '',
    category_suggestion: typeof result.category_suggestion === 'string' ? result.category_suggestion : 'uncategorized',
    tags: Array.isArray(result.tags)
      ? result.tags.filter(
          (t): t is { name: string; kind: string; confidence: number } =>
            typeof t === 'object' && t !== null &&
            typeof t.name === 'string' &&
            typeof t.kind === 'string' &&
            typeof t.confidence === 'number'
        ).slice(0, 20)
      : [],
    detected_intent: typeof result.detected_intent === 'string' ? result.detected_intent : 'other',
    complexity: typeof result.complexity === 'string' ? result.complexity : 'moderate',
  };
}
