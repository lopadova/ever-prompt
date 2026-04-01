import { Star, Pin, Loader2, Copy, RefreshCw, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Checkbox } from '@/components/ui/checkbox';
import { ScoreBadge } from './score-badge';
import { TagPill } from '@/components/taxonomy/tag-pill';
import { useSelectionStore } from '@/stores/selection.store';
import { useUpdatePrompt, useAnalyzePrompt } from '@/hooks/use-prompts';
import { useSearchStore } from '@/stores/search.store';
import { useClipboard } from '@/hooks/use-clipboard';
import { formatDate, truncate, cn } from '@/lib/utils';
import type { PromptListItem } from '@everprompt/shared';

interface PromptRowProps {
  prompt: PromptListItem;
}

export function PromptRow({ prompt }: PromptRowProps) {
  const navigate = useNavigate();
  const { toggle, isSelected } = useSelectionStore();
  const selected = isSelected(prompt.id);
  const updatePrompt = useUpdatePrompt(prompt.id);
  const analyzePrompt = useAnalyzePrompt(prompt.id);
  const { copy } = useClipboard();
  const { setFilters, resetFilters } = useSearchStore();
  const isAnalyzing = prompt.ai_status === 'analyzing' || prompt.ai_status === 'pending';
  // P5: Null-safe tags access
  const tags = prompt.tags ?? [];

  return (
    <div
      onClick={() => navigate(`/prompts/${prompt.id}`)}
      className={cn(
        'group flex items-center gap-3 border-b border-zinc-800/50 px-4 py-2.5 cursor-pointer transition-colors duration-150',
        selected
          ? 'bg-indigo-500/5'
          : 'hover:bg-zinc-800/30',
      )}
    >
      {/* Checkbox */}
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={() => toggle(prompt.id)}
          className="opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
        />
      </div>

      {/* P6: Star */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          updatePrompt.mutate({ is_favorite: !prompt.is_favorite });
        }}
        className={cn(
          'shrink-0 transition-colors',
          prompt.is_favorite ? 'text-yellow-400' : 'text-zinc-600',
        )}
      >
        <Star className={cn('h-3.5 w-3.5', prompt.is_favorite && 'fill-current')} />
      </button>

      {/* P6: Pin */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          updatePrompt.mutate({ is_pinned: !prompt.is_pinned });
        }}
        className={cn(
          'shrink-0 transition-colors',
          prompt.is_pinned ? 'text-indigo-400' : 'text-zinc-600 opacity-0 group-hover:opacity-100',
        )}
      >
        <Pin className={cn('h-3.5 w-3.5', prompt.is_pinned && 'fill-current')} />
      </button>

      {/* Title + Abstract */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200 truncate">
            {prompt.title || 'Untitled'}
          </span>
          {isAnalyzing && <Loader2 className="h-3 w-3 animate-spin text-indigo-400 shrink-0" />}
        </div>
        <span className="text-xs text-zinc-500 truncate block">
          {truncate(prompt.abstract || '', 80)}
        </span>
      </div>

      {/* P6: Quick actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => copy(prompt.abstract || prompt.title || '', 'Prompt')}
          className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"
          title="Copy prompt"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          onClick={() => analyzePrompt.mutate()}
          disabled={analyzePrompt.isPending || isAnalyzing}
          className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 disabled:opacity-50"
          title="Analyze"
        >
          <RefreshCw className={cn('h-3 w-3', (analyzePrompt.isPending || isAnalyzing) && 'animate-spin')} />
        </button>
      </div>

      {/* Project */}
      {prompt.project_name && (
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: prompt.project_color ?? '#6366f1' }}
          />
          <span className="text-xs text-zinc-500">{prompt.project_name}</span>
        </div>
      )}

      {/* Security badge */}
      {prompt.has_security_issues && (
        <span title="Security issues detected" className="shrink-0">
          <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
        </span>
      )}

      {/* Score - P5: null safe */}
      <ScoreBadge band={prompt.quality_band ?? null} score={prompt.overall_score ?? null} size="sm" />

      {/* P5/P6: Tags - null safe and clickable */}
      <div className="hidden lg:flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {tags.slice(0, 2).map((tag) => (
          <TagPill
            key={tag.id}
            name={tag.name}
            color={tag.color}
            size="sm"
            onClick={() => {
              resetFilters();
              setFilters({ tag_ids: [tag.id] });
              navigate('/prompts');
            }}
          />
        ))}
      </div>

      {/* Date */}
      <span className="text-[10px] text-zinc-600 tabular-nums shrink-0 w-16 text-right">
        {formatDate(prompt.created_at)}
      </span>
    </div>
  );
}
