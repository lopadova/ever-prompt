import { useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Inbox,
  FileText,
  Star,
  Pin,
  Clock,
  Bookmark,
  BarChart3,
  PinOff,
  Trash2,
  MessagesSquare,
  ShieldAlert,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useSearchFacets } from '@/hooks/use-search';
import { useSearchStore } from '@/stores/search.store';
import { QUALITY_BANDS } from '@everprompt/shared';
import { cn } from '@/lib/utils';
import type { SavedSearch } from '@everprompt/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  onClick?: () => void;
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Inbox', icon: Inbox, path: '/prompts?status=inbox' },
  { label: 'All Prompts', icon: FileText, path: '/prompts' },
  { label: 'Favorites', icon: Star, path: '/prompts?is_favorite=true' },
  { label: 'Pinned', icon: Pin, path: '/prompts?is_pinned=true' },
  { label: 'Recent', icon: Clock, path: '/prompts?sort=updated_at' },
  { label: 'Sessions', icon: MessagesSquare, path: '/sessions' },
];

export function SidebarLeft() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: facets } = useSearchFacets();
  const { data: securityCount } = useQuery<number>({
    queryKey: ['security-count'],
    queryFn: async () => {
      const result = await api.post<{ prompts: unknown[]; total: number }>('/search', {
        q: '', filters: { has_security_issues: true }, sort: { field: 'created_at', dir: 'desc' }, page: 1, per_page: 1,
      });
      return result.total;
    },
    staleTime: 30000,
  });
  const setFilters = useSearchStore((s) => s.setFilters);
  const resetFilters = useSearchStore((s) => s.resetFilters);
  const setQuery = useSearchStore((s) => s.setQuery);
  const setSort = useSearchStore((s) => s.setSort);

  const { data: savedSearches } = useQuery<SavedSearch[]>({
    queryKey: ['saved-searches'],
    queryFn: () => api.get<SavedSearch[]>('/saved-searches'),
    staleTime: 1000 * 60 * 5,
  });

  // P9: Toggle pin on saved search
  const togglePin = useMutation({
    mutationFn: (search: SavedSearch) =>
      api.patch<SavedSearch>(`/saved-searches/${search.id}`, {
        is_pinned: !search.is_pinned,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });

  // P9: Delete saved search
  const deleteSearch = useMutation({
    mutationFn: (id: string) => api.delete(`/saved-searches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });

  const bandCounts = facets?.quality_bands ?? [];

  function handleNavClick(item: NavItem) {
    resetFilters();
    if (item.path.includes('status=inbox')) {
      setFilters({ status: 'inbox' });
      navigate('/prompts');
    } else if (item.path.includes('is_favorite=true')) {
      setFilters({ is_favorite: true });
      navigate('/prompts');
    } else if (item.path.includes('is_pinned=true')) {
      setFilters({ is_pinned: true });
      navigate('/prompts');
    } else if (item.path.includes('sort=updated_at')) {
      navigate('/prompts');
    } else {
      navigate(item.path);
    }
  }

  // P9: Apply saved search - parse stored filters and apply
  function applySavedSearch(search: SavedSearch) {
    resetFilters();
    setQuery(search.query_text ?? '');
    try {
      if (search.filters_json) {
        const filters = JSON.parse(search.filters_json);
        setFilters(filters);
      }
      if (search.sort_json) {
        const sort = JSON.parse(search.sort_json);
        setSort(sort);
      }
    } catch {
      // If parsing fails, just apply the query text
    }
    navigate('/prompts');
  }

  function isActive(item: NavItem): boolean {
    const base = item.path.split('?')[0];
    return location.pathname === base;
  }

  // Sort saved searches: pinned first
  const sortedSearches = savedSearches
    ? [...savedSearches.filter((s) => s.is_pinned), ...savedSearches.filter((s) => !s.is_pinned)]
    : [];

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-3">
        {/* Main Navigation */}
        <div className="space-y-0.5">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150',
                  active
                    ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <Separator className="my-3" />

        {/* P9: Saved Searches - clickable with pin/delete */}
        <div>
          <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Saved Searches
          </p>
          {sortedSearches.length > 0 ? (
            <div className="space-y-0.5">
              {sortedSearches.map((search) => (
                <div
                  key={search.id}
                  className="group flex items-center gap-1 rounded-md px-2.5 py-1.5 transition-colors hover:bg-zinc-800/50"
                >
                  <button
                    onClick={() => applySavedSearch(search)}
                    className="flex flex-1 items-center gap-2 text-left min-w-0"
                  >
                    <Bookmark
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        search.is_pinned ? 'text-indigo-400' : 'text-zinc-500',
                      )}
                    />
                    <span className="truncate text-sm text-zinc-400 group-hover:text-zinc-200">
                      {search.name}
                    </span>
                  </button>
                  <span className="shrink-0 text-[10px] text-zinc-600 tabular-nums">
                    {search.result_count}
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => togglePin.mutate(search)}
                      className="h-5 w-5"
                    >
                      {search.is_pinned ? (
                        <PinOff className="h-3 w-3 text-zinc-500" />
                      ) : (
                        <Pin className="h-3 w-3 text-zinc-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => deleteSearch.mutate(search.id)}
                      className="h-5 w-5"
                    >
                      <Trash2 className="h-3 w-3 text-red-400/70" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-2.5 text-xs text-zinc-600">No saved searches</p>
          )}
        </div>

        <Separator className="my-3" />

        {/* Quality Bands */}
        <div>
          <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Quality
          </p>
          <div className="space-y-0.5">
            {(['A', 'B', 'C', 'D'] as const).map((band) => {
              const bandInfo = QUALITY_BANDS[band];
              const count = bandCounts.find((b) => b.band === band)?.count ?? 0;
              return (
                <button
                  key={band}
                  onClick={() => {
                    resetFilters();
                    setFilters({ quality_band: [band] });
                    navigate('/prompts');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors duration-150"
                >
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: bandInfo.color }}
                  />
                  <span>
                    Band {band}
                    <span className="ml-1 text-zinc-600 text-xs">({bandInfo.label})</span>
                  </span>
                  <span className="ml-auto text-[10px] tabular-nums text-zinc-600">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              resetFilters();
              setFilters({ has_security_issues: true });
              navigate('/prompts');
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-150"
          >
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span className="flex-1">Security Issues</span>
            {(securityCount ?? 0) > 0 && (
              <span className="ml-auto rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-red-400">
                {securityCount}
              </span>
            )}
          </button>
        </div>

        <Separator className="my-3" />

        {/* Quick Stats */}
        <div>
          <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Quick Stats
          </p>
          <div className="space-y-1 px-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Total</span>
              <span className="text-zinc-300 tabular-nums">
                {facets?.quality_bands?.reduce((sum, b) => sum + b.count, 0) ?? '--'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">
                <BarChart3 className="inline h-3 w-3 mr-1" />
                AI Analyzed
              </span>
              <span className="text-zinc-300 tabular-nums">
                {facets ? `${Math.round(((facets.quality_bands?.reduce((s, b) => s + b.count, 0) ?? 0) / Math.max(1, facets.statuses?.reduce((s, st) => s + st.count, 0) ?? 1)) * 100)}%` : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
