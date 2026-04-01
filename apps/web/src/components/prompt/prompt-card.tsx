import { motion } from 'framer-motion';
import { Star, Pin, Loader2, Copy, RefreshCw, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Checkbox } from '@/components/ui/checkbox';
import { ScoreBadge } from './score-badge';
import { MicroScoreBars } from './score-bars';
import { TagPill } from '@/components/taxonomy/tag-pill';
import { useSelectionStore } from '@/stores/selection.store';
import { useUpdatePrompt, useAnalyzePrompt } from '@/hooks/use-prompts';
import { useSearchStore } from '@/stores/search.store';
import { useClipboard } from '@/hooks/use-clipboard';
import { formatDate, truncate, cn } from '@/lib/utils';
import type { PromptListItem } from '@everprompt/shared';

interface PromptCardProps {
  prompt: PromptListItem;
}

export function PromptCard({ prompt }: PromptCardProps) {
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

  // P2: Tag click handler
  const handleTagClick = (e: React.MouseEvent, tagId: string) => {
    e.stopPropagation();
    resetFilters();
    setFilters({ tag_ids: [tagId] });
    navigate('/prompts');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={() => navigate(`/prompts/${prompt.id}`)}
      className={cn(
        'group relative cursor-pointer rounded-lg border bg-zinc-900 p-4 transition-all duration-150',
        selected
          ? 'border-indigo-500/50 bg-indigo-500/5'
          : 'border-zinc-800 hover:border-zinc-700 hover:shadow-lg hover:shadow-indigo-500/5',
      )}
    >
      {/* Top row: checkbox, star, pin, band badge, score */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selected}
              onCheckedChange={() => toggle(prompt.id)}
              className="opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
            />
          </div>
          {/* P6: Star button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              updatePrompt.mutate({ is_favorite: !prompt.is_favorite });
            }}
            className={cn(
              'transition-colors',
              prompt.is_favorite
                ? 'text-yellow-400'
                : 'text-zinc-600 opacity-0 group-hover:opacity-100',
            )}
          >
            <Star className={cn('h-3.5 w-3.5', prompt.is_favorite && 'fill-current')} />
          </button>
          {/* P6: Pin button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              updatePrompt.mutate({ is_pinned: !prompt.is_pinned });
            }}
            className={cn(
              'transition-colors',
              prompt.is_pinned
                ? 'text-indigo-400'
                : 'text-zinc-600 opacity-0 group-hover:opacity-100',
            )}
          >
            <Pin className={cn('h-3.5 w-3.5', prompt.is_pinned && 'fill-current')} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {/* P6: Quick actions - copy + analyze */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              copy(prompt.abstract || prompt.title || '', 'Prompt');
            }}
            className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-all hover:text-zinc-300"
            title="Copy prompt"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              analyzePrompt.mutate();
            }}
            disabled={analyzePrompt.isPending || isAnalyzing}
            className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-all hover:text-zinc-300 disabled:opacity-50"
            title="Analyze prompt"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', (analyzePrompt.isPending || isAnalyzing) && 'animate-spin')} />
          </button>
          {isAnalyzing && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
          )}
          {prompt.has_security_issues && (
            <span title="Security issues detected">
              <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
            </span>
          )}
          <ScoreBadge band={prompt.quality_band ?? null} score={prompt.overall_score ?? null} size="sm" />
        </div>
      </div>

      {/* Title */}
      <h3 className="mb-1 text-sm font-medium leading-snug text-zinc-100 line-clamp-2">
        {prompt.title || 'Untitled prompt'}
      </h3>

      {/* Abstract */}
      <p className="mb-3 text-xs leading-relaxed text-zinc-500 line-clamp-2">
        {prompt.abstract || 'No description available'}
      </p>

      {/* P5/P6: Tags - null safe and clickable */}
      {tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
          {tags.slice(0, 3).map((tag) => (
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
          {tags.length > 3 && (
            <span className="px-1 text-[10px] text-zinc-600">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Project + Category + Dates */}
      <div className="mb-2 flex items-center justify-between text-[10px] text-zinc-600">
        <div className="flex items-center gap-2">
          {prompt.project_name && (
            <span className="flex items-center gap-1">
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: prompt.project_color ?? '#6366f1' }}
              />
              {prompt.project_name}
            </span>
          )}
          {prompt.category_name && (
            <span>{prompt.category_name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>{formatDate(prompt.created_at)}</span>
        </div>
      </div>

      {/* Micro score bars */}
      <MicroScoreBars review={null} />
    </motion.div>
  );
}
