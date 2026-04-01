import { sha256, softFingerprint } from '@everprompt/shared';

export interface NormalizeResult {
  body_normalized: string;
  language: string;
  hash_sha256: string;
  fingerprint: string;
  word_count: number;
  char_count: number;
}

export async function normalizePrompt(body: string): Promise<NormalizeResult> {
  const body_normalized = body.replace(/\r\n/g, '\n').trim();
  const words = body_normalized.split(/\s+/).filter(Boolean);

  return {
    body_normalized,
    language: detectLanguage(body_normalized),
    hash_sha256: await sha256(body),
    fingerprint: await softFingerprint(body),
    word_count: words.length,
    char_count: body_normalized.length,
  };
}

function detectLanguage(text: string): string {
  // Heuristic language detection based on common stop words
  const lower = text.toLowerCase();
  const tokens = lower.split(/\s+/);

  // Italian stop words
  const itWords = ['che', 'per', 'con', 'una', 'del', 'non', 'sono', 'anche', 'questo', 'dalla', 'della', 'nella', 'alla', 'degli', 'delle', 'nelle'];
  const itCount = itWords.filter(w => tokens.includes(w)).length;

  // Spanish stop words
  const esWords = ['que', 'por', 'para', 'los', 'las', 'una', 'pero', 'como', 'este', 'esta', 'tiene', 'desde'];
  const esCount = esWords.filter(w => tokens.includes(w)).length;

  // French stop words
  const frWords = ['que', 'pour', 'les', 'des', 'une', 'dans', 'avec', 'mais', 'sont', 'cette', 'nous', 'vous'];
  const frCount = frWords.filter(w => tokens.includes(w)).length;

  // German stop words
  const deWords = ['und', 'der', 'die', 'das', 'ist', 'ein', 'eine', 'mit', 'auf', 'nicht', 'sich', 'auch'];
  const deCount = deWords.filter(w => tokens.includes(w)).length;

  const scores: [string, number][] = [
    ['it', itCount],
    ['es', esCount],
    ['fr', frCount],
    ['de', deCount],
  ];

  const best = scores.reduce((max, curr) => curr[1] > max[1] ? curr : max, ['en', 0]);

  // Need at least 3 matches to be confident it's not English
  return best[1] >= 3 ? best[0] : 'en';
}
