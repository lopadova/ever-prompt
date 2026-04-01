import type { PaginationMeta } from '@everprompt/shared';

export function paginationMeta(total: number, page: number, perPage: number): PaginationMeta {
  return {
    total,
    page,
    per_page: perPage,
    has_more: page * perPage < total,
  };
}

export function paginationOffset(page: number, perPage: number): { limit: number; offset: number } {
  return { limit: perPage, offset: (page - 1) * perPage };
}
