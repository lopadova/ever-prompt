import { cn } from '@/lib/utils';
import { QUALITY_BANDS } from '@everprompt/shared';
import type { QualityBand } from '@everprompt/shared';

interface ScoreBadgeProps {
  band: QualityBand | null | undefined;
  score?: number | null;
  size?: 'sm' | 'default' | 'lg';
}

export function ScoreBadge({ band, score, size = 'default' }: ScoreBadgeProps) {
  if (!band) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded font-mono font-semibold tabular-nums',
          'bg-zinc-800 text-zinc-500',
          size === 'sm' && 'h-5 min-w-[20px] px-1 text-[10px]',
          size === 'default' && 'h-6 min-w-[24px] px-1.5 text-xs',
          size === 'lg' && 'h-8 min-w-[32px] px-2 text-sm',
        )}
      >
        --
      </div>
    );
  }

  const bandInfo = QUALITY_BANDS[band];

  return (
    <div className="inline-flex items-center gap-1">
      <div
        className={cn(
          'inline-flex items-center justify-center rounded font-mono font-bold tabular-nums',
          size === 'sm' && 'h-5 min-w-[20px] px-1 text-[10px]',
          size === 'default' && 'h-6 min-w-[24px] px-1.5 text-xs',
          size === 'lg' && 'h-8 min-w-[32px] px-2 text-sm',
        )}
        style={{
          backgroundColor: `${bandInfo.color}20`,
          color: bandInfo.color,
        }}
      >
        {band}
      </div>
      {score != null && (
        <span
          className={cn(
            'font-mono font-semibold tabular-nums',
            size === 'sm' && 'text-[10px]',
            size === 'default' && 'text-xs',
            size === 'lg' && 'text-sm',
          )}
          style={{ color: bandInfo.color }}
        >
          {Math.round(score)}
        </span>
      )}
    </div>
  );
}
