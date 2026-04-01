import { create } from 'zustand';
import type { SearchFilters, SearchSort } from '@everprompt/shared';
import { DEFAULT_SORT, DEFAULT_PER_PAGE } from '@everprompt/shared';

interface SearchState {
  query: string;
  filters: SearchFilters;
  sort: SearchSort;
  page: number;
  perPage: number;

  setQuery: (query: string) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  setSort: (sort: SearchSort) => void;
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  reset: () => void;
}

const initialFilters: SearchFilters = {};

export const useSearchStore = create<SearchState>()((set) => ({
  query: '',
  filters: initialFilters,
  sort: DEFAULT_SORT,
  page: 1,
  perPage: DEFAULT_PER_PAGE,

  setQuery: (query) => set({ query, page: 1 }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      page: 1,
    })),

  resetFilters: () => set({ filters: initialFilters, page: 1 }),

  setSort: (sort) => set({ sort, page: 1 }),

  setPage: (page) => set({ page }),

  setPerPage: (perPage) => set({ perPage, page: 1 }),

  reset: () =>
    set({
      query: '',
      filters: initialFilters,
      sort: DEFAULT_SORT,
      page: 1,
      perPage: DEFAULT_PER_PAGE,
    }),
}));
