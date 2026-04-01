export const SCORE_DIMENSIONS = [
  'clarity', 'context', 'specificity', 'structure', 'reusability',
  'actionability', 'evaluation_readiness', 'safety', 'compression', 'toolability'
] as const;

export type ScoreDimension = typeof SCORE_DIMENSIONS[number];

export const SCORE_WEIGHTS: Record<ScoreDimension, number> = {
  clarity: 0.15,
  context: 0.12,
  specificity: 0.13,
  structure: 0.10,
  reusability: 0.08,
  actionability: 0.15,
  evaluation_readiness: 0.10,
  safety: 0.05,
  compression: 0.05,
  toolability: 0.07,
};

export const QUALITY_BANDS = {
  A: { min: 85, max: 100, label: 'Excellent', color: '#22c55e' },
  B: { min: 70, max: 84, label: 'Good', color: '#eab308' },
  C: { min: 50, max: 69, label: 'Sufficient', color: '#f97316' },
  D: { min: 0, max: 49, label: 'Weak', color: '#ef4444' },
} as const;

export const SCORE_DIMENSION_LABELS: Record<ScoreDimension, string> = {
  clarity: 'Clarity',
  context: 'Context',
  specificity: 'Specificity',
  structure: 'Structure',
  reusability: 'Reusability',
  actionability: 'Actionability',
  evaluation_readiness: 'Evaluation',
  safety: 'Safety',
  compression: 'Compression',
  toolability: 'Toolability',
};
