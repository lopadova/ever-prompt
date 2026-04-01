import type { QualityBand } from './prompt';
import type { PromptListItem } from './prompt';

export interface SearchQuery {
  q: string;
  filters: SearchFilters;
  sort: SearchSort;
  page: number;
  per_page: number;
}

export interface SearchFilters {
  project_id?: string;
  category_id?: string;
  tag_ids?: string[];
  tag_mode?: 'and' | 'or';
  status?: string;
  quality_band?: QualityBand[];
  score_min?: number;
  score_max?: number;
  source?: string;
  language?: string;
  is_favorite?: boolean;
  is_pinned?: boolean;
  has_improved?: boolean;
  has_security_issues?: boolean;
  session_id?: string;
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
}

export type SearchSortField = 'created_at' | 'updated_at' | 'overall_score' | 'title' | 'relevance';
export type SearchSortDir = 'asc' | 'desc';

export interface SearchSort {
  field: SearchSortField;
  dir: SearchSortDir;
}

export interface SearchResult {
  prompts: PromptListItem[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
  facets?: SearchFacets;
}

export interface SearchFacets {
  projects: { id: string; name: string; count: number }[];
  categories: { id: string; name: string; count: number }[];
  tags: { id: string; name: string; count: number }[];
  quality_bands: { band: QualityBand; count: number }[];
  statuses: { status: string; count: number }[];
}
