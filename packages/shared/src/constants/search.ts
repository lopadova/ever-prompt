export const SEARCH_OPERATORS = [
  'project', 'tag', 'cat', 'score', 'band', 'lang',
  'source', 'status', 'has', 'is', 'created', 'updated'
] as const;

export const DEFAULT_SORT = { field: 'created_at' as const, dir: 'desc' as const };
export const DEFAULT_PER_PAGE = 24;
export const MAX_PER_PAGE = 100;
export const SEMANTIC_TOP_K = 50;

export const SEARCH_WEIGHTS = {
  semantic: 0.45,
  keyword: 0.25,
  quality: 0.15,
  recency: 0.10,
  exact_filter_bonus: 0.05,
} as const;
