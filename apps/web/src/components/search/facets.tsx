import { useSearchFacets } from '@/hooks/use-search';
import { useSearchStore } from '@/stores/search.store';
import { useNavigate } from 'react-router';
import { QUALITY_BANDS } from '@everprompt/shared';
import type { QualityBand } from '@everprompt/shared';
import { cn } from '@/lib/utils';

export function Facets() {
  const { data: facets, isLoading } = useSearchFacets();
  const setFilters = useSearchStore((s) => s.setFilters);
  const resetFilters = useSearchStore((s) => s.resetFilters);
  const navigate = useNavigate();

  if (isLoading || !facets) {
    return (
      <div className="space-y-4 px-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-16 rounded bg-zinc-800 animate-pulse" />
            <div className="h-3 w-24 rounded bg-zinc-800/50 animate-pulse" />
            <div className="h-3 w-20 rounded bg-zinc-800/50 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  function applyFilter(key: string, value: string) {
    resetFilters();
    if (key === 'project') {
      setFilters({ project_id: value });
    } else if (key === 'category') {
      setFilters({ category_id: value });
    } else if (key === 'tag') {
      setFilters({ tag_ids: [value] });
    } else if (key === 'band') {
      setFilters({ quality_band: [value as QualityBand] });
    }
    navigate('/prompts');
  }

  return (
    <div className="space-y-4">
      {/* Projects facet */}
      {facets.projects.length > 0 && (
        <FacetSection title="Projects">
          {facets.projects.slice(0, 8).map((p) => (
            <FacetItem
              key={p.id}
              label={p.name}
              count={p.count}
              onClick={() => applyFilter('project', p.id)}
            />
          ))}
        </FacetSection>
      )}

      {/* Categories facet */}
      {facets.categories.length > 0 && (
        <FacetSection title="Categories">
          {facets.categories.slice(0, 8).map((c) => (
            <FacetItem
              key={c.id}
              label={c.name}
              count={c.count}
              onClick={() => applyFilter('category', c.id)}
            />
          ))}
        </FacetSection>
      )}

      {/* Tags facet */}
      {facets.tags.length > 0 && (
        <FacetSection title="Tags">
          {facets.tags.slice(0, 10).map((t) => (
            <FacetItem
              key={t.id}
              label={t.name}
              count={t.count}
              onClick={() => applyFilter('tag', t.id)}
            />
          ))}
        </FacetSection>
      )}

      {/* Quality bands facet */}
      {facets.quality_bands.length > 0 && (
        <FacetSection title="Quality">
          {facets.quality_bands.map((b) => (
            <FacetItem
              key={b.band}
              label={`Band ${b.band}`}
              count={b.count}
              onClick={() => applyFilter('band', b.band)}
              color={QUALITY_BANDS[b.band].color}
            />
          ))}
        </FacetSection>
      )}
    </div>
  );
}

function FacetSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FacetItem({
  label,
  count,
  color,
  onClick,
}: {
  label: string;
  count: number;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200"
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="flex-1 truncate text-left">{label}</span>
      <span className="shrink-0 text-[10px] tabular-nums text-zinc-600">{count}</span>
    </button>
  );
}
