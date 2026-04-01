export interface ApiResponse<T> {
  ok: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface Note {
  id: string;
  prompt_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  default_project_id: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query_text: string;
  filters_json: string;
  sort_json: string;
  is_pinned: boolean;
  result_count: number;
  last_run_at: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  external_id: string | null;
  name: string;
  source: string;
  prompt_count: number;
  first_prompt_at: string | null;
  last_prompt_at: string | null;
  created_at: string;
  updated_at: string;
}
