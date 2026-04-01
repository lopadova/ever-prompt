import type { LLMProvider } from '../lib/llm';
import type { ScoreResult } from '../lib/claude';
import { SCORE_WEIGHTS, type ScoreDimension } from '@everprompt/shared';
import { stripJsonFences } from './utils';
import type { QualityBand } from '@everprompt/shared';

export interface ScoreInput {
  body_original: string;
  title: string;
  abstract: string;
  tags: string[];
  intent: string;
  llm: LLMProvider;
  model: string;
}

export interface ScoreOutput {
  scores: Record<ScoreDimension, number>;
  overall_score: number;
  quality_band: QualityBand;
  short_verdict: string;
  strengths: string;
  weaknesses: string;
  improved_prompt: string;
  recommended_actions: string[];
}

function computeWeightedScore(scores: Record<string, number>): number {
  let total = 0;
  for (const [dim, weight] of Object.entries(SCORE_WEIGHTS)) {
    const score = scores[dim];
    if (typeof score === 'number' && !isNaN(score)) {
      total += Math.min(100, Math.max(0, score)) * weight;
    }
  }
  return Math.round(total * 10) / 10;
}

function determineQualityBand(score: number): QualityBand {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

export async function score(input: ScoreInput): Promise<ScoreOutput> {
  const prompt = `Score this prompt on 10 dimensions (0-100 each). Return JSON with: scores (object with keys: clarity, context, specificity, structure, reusability, actionability, evaluation_readiness, safety, compression, toolability), overall_score (weighted average), quality_band (A=85-100, B=70-84, C=50-69, D=0-49), short_verdict (1 sentence), strengths (markdown bullet list), weaknesses (markdown bullet list), improved_prompt (complete rewritten better version), recommended_actions (array of strings).

Title: ${input.title}
Abstract: ${input.abstract}
Tags: ${input.tags.join(', ')}
Intent: ${input.intent}

Prompt:
${input.body_original}

Return ONLY valid JSON, no markdown fences.`;

  let text: string;
  try {
    text = await input.llm.chat({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 4096,
      model: input.model,
    });
  } catch (err) {
    throw err;
  }

  let result: ScoreResult;
  try {
    result = JSON.parse(stripJsonFences(text)) as ScoreResult;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Scoring returned invalid JSON: ${err.message}`);
    }
    throw err;
  }

  // Extract and validate scores
  const rawScores = result.scores ?? {};
  const scores: Record<ScoreDimension, number> = {
    clarity: clampScore(rawScores.clarity),
    context: clampScore(rawScores.context),
    specificity: clampScore(rawScores.specificity),
    structure: clampScore(rawScores.structure),
    reusability: clampScore(rawScores.reusability),
    actionability: clampScore(rawScores.actionability),
    evaluation_readiness: clampScore(rawScores.evaluation_readiness),
    safety: clampScore(rawScores.safety),
    compression: clampScore(rawScores.compression),
    toolability: clampScore(rawScores.toolability),
  };

  // Compute weighted overall_score using SCORE_WEIGHTS
  const overall_score = computeWeightedScore(scores);

  // Determine quality_band from computed score (not from AI response)
  const quality_band = determineQualityBand(overall_score);

  return {
    scores,
    overall_score,
    quality_band,
    short_verdict: typeof result.short_verdict === 'string' ? result.short_verdict : '',
    strengths: typeof result.strengths === 'string' ? result.strengths : '',
    weaknesses: typeof result.weaknesses === 'string' ? result.weaknesses : '',
    improved_prompt: typeof result.improved_prompt === 'string' ? result.improved_prompt : '',
    recommended_actions: Array.isArray(result.recommended_actions)
      ? result.recommended_actions.filter((a): a is string => typeof a === 'string')
      : [],
  };
}

function clampScore(val: unknown): number {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Math.min(100, Math.max(0, Math.round(val * 10) / 10));
}
