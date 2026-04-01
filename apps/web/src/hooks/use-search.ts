import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SearchFacets } from '@everprompt/shared';

export const searchKeys = {
  all: ['search'] as const,
  suggestions: (q: string) => [...searchKeys.all, 'suggest', q] as const,
  facets: () => [...searchKeys.all, 'facets'] as const,
};

interface SearchSuggestion {
  type: 'prompt' | 'saved_search' | 'operator';
  label: string;
  value: string;
  id?: string;
}

export function useSearchSuggestions(q: string) {
  return useQuery<SearchSuggestion[]>({
    queryKey: searchKeys.suggestions(q),
    queryFn: () => api.get<SearchSuggestion[]>('/search/suggest', { q }),
    enabled: q.length >= 2,
    staleTime: 1000 * 30,
  });
}

export function useSearchFacets() {
  return useQuery<SearchFacets>({
    queryKey: searchKeys.facets(),
    queryFn: () => api.get<SearchFacets>('/search/facets'),
    staleTime: 1000 * 60 * 2,
  });
}
