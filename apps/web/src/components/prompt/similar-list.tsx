import { useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { ScoreBadge } from './score-badge';
import { cn } from '@/lib/utils';
import type { PromptListItem } from '@everprompt/shared';

interface SimilarListProps {
  prompts: PromptListItem[];
}

export function SimilarList({ prompts }: SimilarListProps) {
  const navigate = useNavigate();

  if (prompts.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-4">No similar prompts found.</p>
    );
  }

  return (
    <div className="space-y-2">
      {prompts.map((prompt) => (
        <button
          key={prompt.id}
          onClick={() => navigate(`/prompts/${prompt.id}`)}
          className="group flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-left transition-colors duration-150 hover:border-zinc-700 hover:bg-zinc-800/50"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">
              {prompt.title || 'Untitled'}
            </p>
            <p className="text-xs text-zinc-500 truncate">
              {prompt.abstract || 'No description'}
            </p>
          </div>
          <ScoreBadge band={prompt.quality_band} score={prompt.overall_score} size="sm" />
          <ArrowRight className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
    </div>
  );
}
