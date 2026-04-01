import { LayoutGrid, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useSearchStore } from '@/stores/search.store';
import { useUiStore } from '@/stores/ui.store';
import { useProjects, useTags } from '@/hooks/use-taxonomy';
import { QUALITY_BANDS } from '@everprompt/shared';
import type { QualityBand, SearchSortField, SearchSortDir } from '@everprompt/shared';
import { cn } from '@/lib/utils';

export function FilterBar() {
  const filters = useSearchStore((s) => s.filters);
  const sort = useSearchStore((s) => s.sort);
  const setFilters = useSearchStore((s) => s.setFilters);
  const resetFilters = useSearchStore((s) => s.resetFilters);
  const setSort = useSearchStore((s) => s.setSort);
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);

  const { data: projects } = useProjects();
  const { data: tags } = useTags();

  const hasFilters =
    !!filters.project_id ||
    (filters.quality_band && filters.quality_band.length > 0) ||
    (filters.tag_ids && filters.tag_ids.length > 0) ||
    !!filters.created_after ||
    !!filters.created_before;

  const sortOptions: { label: string; field: SearchSortField; dir: SearchSortDir }[] = [
    { label: 'Newest first', field: 'created_at', dir: 'desc' },
    { label: 'Oldest first', field: 'created_at', dir: 'asc' },
    { label: 'Highest score', field: 'overall_score', dir: 'desc' },
    { label: 'Lowest score', field: 'overall_score', dir: 'asc' },
    { label: 'Recently updated', field: 'updated_at', dir: 'desc' },
    { label: 'Title A-Z', field: 'title', dir: 'asc' },
  ];

  const currentSortLabel =
    sortOptions.find((o) => o.field === sort.field && o.dir === sort.dir)?.label ?? 'Sort';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Project select */}
      <Select
        value={filters.project_id ?? '__all__'}
        onValueChange={(v) => setFilters({ project_id: v === '__all__' ? undefined : v })}
      >
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="All projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All projects</SelectItem>
          {projects?.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: p.color ?? '#6366f1' }}
                />
                {p.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Quality band select */}
      <Select
        value={filters.quality_band?.[0] ?? '__all__'}
        onValueChange={(v) =>
          setFilters({
            quality_band: v === '__all__' ? undefined : [v as QualityBand],
          })
        }
      >
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue placeholder="All bands" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All bands</SelectItem>
          {(['A', 'B', 'C', 'D'] as const).map((band) => (
            <SelectItem key={band} value={band}>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: QUALITY_BANDS[band].color }}
                />
                Band {band} ({QUALITY_BANDS[band].label})
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tag select */}
      <Select
        value={filters.tag_ids?.[0] ?? '__all__'}
        onValueChange={(v) =>
          setFilters({ tag_ids: v === '__all__' ? undefined : [v] })
        }
      >
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder="All tags" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All tags</SelectItem>
          {tags?.slice(0, 30).map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date range quick filter */}
      <Select
        value={
          filters.created_after
            ? 'custom'
            : '__all__'
        }
        onValueChange={(v) => {
          if (v === '__all__') {
            setFilters({ created_after: undefined, created_before: undefined });
          } else {
            const now = new Date();
            const d = new Date();
            if (v === '7d') d.setDate(now.getDate() - 7);
            else if (v === '30d') d.setDate(now.getDate() - 30);
            else if (v === '90d') d.setDate(now.getDate() - 90);
            setFilters({ created_after: d.toISOString(), created_before: undefined });
          }
        }}
      >
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue placeholder="Any date" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Any date</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        value={`${sort.field}:${sort.dir}`}
        onValueChange={(v) => {
          const [field, dir] = v.split(':') as [SearchSortField, SearchSortDir];
          setSort({ field, dir });
        }}
      >
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue>{currentSortLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((opt) => (
            <SelectItem key={`${opt.field}:${opt.dir}`} value={`${opt.field}:${opt.dir}`}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-8 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* View mode toggle */}
      <div className="flex items-center rounded-md border border-zinc-800 p-0.5">
        <button
          onClick={() => setViewMode('grid')}
          className={cn(
            'rounded p-1.5 transition-colors',
            viewMode === 'grid'
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={cn(
            'rounded p-1.5 transition-colors',
            viewMode === 'list'
              ? 'bg-zinc-800 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
