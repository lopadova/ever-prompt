import { Bookmark, Pin, Trash2, PinOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useSearchStore } from '@/stores/search.store';
import { cn } from '@/lib/utils';
import type { SavedSearch } from '@everprompt/shared';

export function SavedSearchList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setQuery = useSearchStore((s) => s.setQuery);
  const resetFilters = useSearchStore((s) => s.resetFilters);

  const { data: searches } = useQuery<SavedSearch[]>({
    queryKey: ['saved-searches'],
    queryFn: () => api.get<SavedSearch[]>('/saved-searches'),
    staleTime: 1000 * 60 * 5,
  });

  const togglePin = useMutation({
    mutationFn: (search: SavedSearch) =>
      api.patch<SavedSearch>(`/saved-searches/${search.id}`, {
        is_pinned: !search.is_pinned,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });

  const deleteSearch = useMutation({
    mutationFn: (id: string) => api.delete(`/saved-searches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });

  function applySearch(search: SavedSearch) {
    resetFilters();
    setQuery(search.query_text);
    navigate('/prompts');
  }

  if (!searches || searches.length === 0) {
    return (
      <p className="px-2.5 text-xs text-zinc-600">No saved searches</p>
    );
  }

  const pinned = searches.filter((s) => s.is_pinned);
  const unpinned = searches.filter((s) => !s.is_pinned);
  const sorted = [...pinned, ...unpinned];

  return (
    <div className="space-y-0.5">
      {sorted.map((search) => (
        <div
          key={search.id}
          className="group flex items-center gap-1 rounded-md px-2.5 py-1.5 transition-colors hover:bg-zinc-800/50"
        >
          <button
            onClick={() => applySearch(search)}
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
  );
}
