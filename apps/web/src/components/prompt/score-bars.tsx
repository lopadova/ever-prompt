import { motion } from 'framer-motion';
import { SCORE_DIMENSIONS, SCORE_DIMENSION_LABELS, QUALITY_BANDS } from '@everprompt/shared';
import type { PromptAiReview, QualityBand } from '@everprompt/shared';
import { cn } from '@/lib/utils';

interface ScoreBarsProps {
  review: PromptAiReview;
  compact?: boolean;
}

function getBarColor(score: number): string {
  if (score >= 85) return QUALITY_BANDS.A.color;
  if (score >= 70) return QUALITY_BANDS.B.color;
  if (score >= 50) return QUALITY_BANDS.C.color;
  return QUALITY_BANDS.D.color;
}

export function ScoreBars({ review, compact }: ScoreBarsProps) {
  return (
    <div className={cn('space-y-2', compact && 'space-y-1')}>
      {SCORE_DIMENSIONS.map((dim, i) => {
        const key = `${dim}_score` as keyof PromptAiReview;
        const score = review[key] as number;
        const label = SCORE_DIMENSION_LABELS[dim];
        const color = getBarColor(score);

        return (
          <div key={dim} className="flex items-center gap-2">
            <span
              className={cn(
                'text-zinc-400 shrink-0',
                compact ? 'w-16 text-[10px]' : 'w-24 text-xs',
              )}
            >
              {label}
            </span>
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
            <span
              className={cn(
                'font-mono font-medium tabular-nums shrink-0',
                compact ? 'w-6 text-[10px]' : 'w-8 text-xs',
              )}
              style={{ color }}
            >
              {Math.round(score)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Micro score bar for card view - all 10 dimensions in a compact horizontal strip */
export function MicroScoreBars({ review }: { review: PromptAiReview | null }) {
  if (!review) {
    return (
      <div className="flex gap-px h-1.5">
        {SCORE_DIMENSIONS.map((dim) => (
          <div key={dim} className="flex-1 rounded-full bg-zinc-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-px h-1.5">
      {SCORE_DIMENSIONS.map((dim) => {
        const key = `${dim}_score` as keyof PromptAiReview;
        const score = review[key] as number;
        const color = getBarColor(score);
        return (
          <motion.div
            key={dim}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 rounded-full"
            style={{ backgroundColor: color, opacity: score / 100 }}
          />
        );
      })}
    </div>
  );
}
