import Anthropic from '@anthropic-ai/sdk';

export function claude(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

export interface ClassificationResult {
  title: string;
  abstract: string;
  category_suggestion: string;
  tags: { name: string; kind: string; confidence: number }[];
  detected_intent: string;
  complexity: string;
}

export async function classifyPrompt(client: Anthropic, body: string, language: string): Promise<ClassificationResult> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Analyze this prompt and return a JSON object with: title (5-10 word concise title), abstract (1-2 sentences), category_suggestion (single category name), tags (array of {name, kind, confidence} where kind is one of: topic, model, tone, task, quality, domain, language, technique), detected_intent (code_generation|analysis|writing|brainstorming|debugging|planning|other), complexity (simple|moderate|complex|expert).

Language: ${language}

Prompt:
${body}

Return ONLY valid JSON, no markdown fences.`
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text) as ClassificationResult;
}

export interface ScoreResult {
  scores: {
    clarity: number;
    context: number;
    specificity: number;
    structure: number;
    reusability: number;
    actionability: number;
    evaluation_readiness: number;
    safety: number;
    compression: number;
    toolability: number;
  };
  overall_score: number;
  quality_band: string;
  short_verdict: string;
  strengths: string;
  weaknesses: string;
  improved_prompt: string;
  recommended_actions: string[];
}

export async function scorePrompt(
  client: Anthropic,
  body: string,
  title: string,
  abstract: string,
  tags: string[],
  intent: string
): Promise<ScoreResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Score this prompt on 10 dimensions (0-100 each). Return JSON with: scores (object with keys: clarity, context, specificity, structure, reusability, actionability, evaluation_readiness, safety, compression, toolability), overall_score (weighted average), quality_band (A=85-100, B=70-84, C=50-69, D=0-49), short_verdict (1 sentence), strengths (markdown bullet list), weaknesses (markdown bullet list), improved_prompt (complete rewritten better version), recommended_actions (array of strings).

Title: ${title}
Abstract: ${abstract}
Tags: ${tags.join(', ')}
Intent: ${intent}

Prompt:
${body}

Return ONLY valid JSON, no markdown fences.`
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text) as ScoreResult;
}
