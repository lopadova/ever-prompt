import { useState } from 'react';
import { computeDiff, type DiffLine } from '@everprompt/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  original: string;
  improved: string;
}

export function DiffViewer({ original, improved }: DiffViewerProps) {
  const [mode, setMode] = useState<'unified' | 'split'>('unified');
  const diffLines = computeDiff(original, improved);

  return (
    <div>
      {/* Mode toggle */}
      <div className="mb-3 flex items-center gap-2">
        <Button
          variant={mode === 'unified' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setMode('unified')}
        >
          Unified
        </Button>
        <Button
          variant={mode === 'split' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setMode('split')}
        >
          Split
        </Button>
      </div>

      {mode === 'unified' ? (
        <UnifiedDiff lines={diffLines} />
      ) : (
        <SplitDiff original={original} improved={improved} lines={diffLines} />
      )}
    </div>
  );
}

function UnifiedDiff({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 font-mono text-xs">
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            'flex',
            line.type === 'added' && 'bg-green-500/10',
            line.type === 'removed' && 'bg-red-500/10',
          )}
        >
          <span className="w-10 shrink-0 border-r border-zinc-800 px-2 py-0.5 text-right text-zinc-600 select-none">
            {line.lineNumber}
          </span>
          <span className="w-6 shrink-0 py-0.5 text-center select-none">
            {line.type === 'added' && <span className="text-green-400">+</span>}
            {line.type === 'removed' && <span className="text-red-400">-</span>}
          </span>
          <span
            className={cn(
              'flex-1 py-0.5 pr-4 whitespace-pre-wrap',
              line.type === 'added' && 'text-green-300',
              line.type === 'removed' && 'text-red-300',
              line.type === 'unchanged' && 'text-zinc-400',
            )}
          >
            {line.content}
          </span>
        </div>
      ))}
    </div>
  );
}

function SplitDiff({ original, improved, lines }: { original: string; improved: string; lines: DiffLine[] }) {
  const oldLines = original.split('\n');
  const newLines = improved.split('\n');

  return (
    <div className="grid grid-cols-2 gap-px rounded-lg border border-zinc-800 overflow-hidden">
      {/* Original */}
      <div className="bg-zinc-950 font-mono text-xs">
        <div className="border-b border-zinc-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Original
        </div>
        {oldLines.map((line, i) => (
          <div key={i} className="flex">
            <span className="w-8 shrink-0 border-r border-zinc-800 px-2 py-0.5 text-right text-zinc-600 select-none">
              {i + 1}
            </span>
            <span className="flex-1 py-0.5 px-2 whitespace-pre-wrap text-zinc-400">
              {line}
            </span>
          </div>
        ))}
      </div>
      {/* Improved */}
      <div className="bg-zinc-950 font-mono text-xs">
        <div className="border-b border-zinc-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Improved
        </div>
        {newLines.map((line, i) => (
          <div key={i} className="flex">
            <span className="w-8 shrink-0 border-r border-zinc-800 px-2 py-0.5 text-right text-zinc-600 select-none">
              {i + 1}
            </span>
            <span className="flex-1 py-0.5 px-2 whitespace-pre-wrap text-green-300/80">
              {line}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
