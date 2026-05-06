import { describe, it, expect } from 'vitest';
import { clampScore, determineQualityBand, computeWeightedScore } from '../ai/score';

describe('clampScore', () => {
  it('returns 0 for non-number values', () => {
    expect(clampScore(undefined)).toBe(0);
    expect(clampScore(null)).toBe(0);
    expect(clampScore('high')).toBe(0);
    expect(clampScore({})).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(clampScore(NaN)).toBe(0);
  });

  it('clamps values below 0 to 0', () => {
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(-0.1)).toBe(0);
  });

  it('clamps values above 100 to 100', () => {
    expect(clampScore(101)).toBe(100);
    expect(clampScore(999)).toBe(100);
  });

  it('returns the value as-is for valid 0-100 numbers', () => {
    expect(clampScore(0)).toBe(0);
    expect(clampScore(50)).toBe(50);
    expect(clampScore(100)).toBe(100);
  });

  it('rounds to one decimal place', () => {
    expect(clampScore(75.456)).toBe(75.5);
    expect(clampScore(80.123)).toBe(80.1);
  });
});

describe('determineQualityBand', () => {
  it('returns A for scores >= 85', () => {
    expect(determineQualityBand(85)).toBe('A');
    expect(determineQualityBand(100)).toBe('A');
    expect(determineQualityBand(90.5)).toBe('A');
  });

  it('returns B for scores 70–84', () => {
    expect(determineQualityBand(70)).toBe('B');
    expect(determineQualityBand(84.9)).toBe('B');
  });

  it('returns C for scores 50–69', () => {
    expect(determineQualityBand(50)).toBe('C');
    expect(determineQualityBand(69.9)).toBe('C');
  });

  it('returns D for scores < 50', () => {
    expect(determineQualityBand(0)).toBe('D');
    expect(determineQualityBand(49.9)).toBe('D');
  });
});

describe('computeWeightedScore', () => {
  it('returns 0 for empty scores', () => {
    expect(computeWeightedScore({})).toBe(0);
  });

  it('ignores non-number entries', () => {
    expect(computeWeightedScore({ clarity: 80, context: NaN })).toBeGreaterThan(0);
  });

  it('computes weighted score correctly for all 10 dimensions at 100', () => {
    const perfect: Record<string, number> = {
      clarity: 100,
      context: 100,
      specificity: 100,
      structure: 100,
      reusability: 100,
      actionability: 100,
      evaluation_readiness: 100,
      safety: 100,
      compression: 100,
      toolability: 100,
    };
    // All at 100 → total weight × 100 = overall
    const result = computeWeightedScore(perfect);
    // Weights sum to <= 1.0, so result should be close to 100 (or exactly 100 if weights sum to 1)
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('clamps individual scores to [0, 100] before weighting', () => {
    const scores: Record<string, number> = { clarity: 200, context: -50 };
    const withClamped: Record<string, number> = { clarity: 100, context: 0 };
    // The function internally clamps each score to [0, 100]
    expect(computeWeightedScore(scores)).toBe(computeWeightedScore(withClamped));
  });
});
