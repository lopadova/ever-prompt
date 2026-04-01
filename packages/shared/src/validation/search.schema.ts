import { z } from 'zod';
import { MAX_PER_PAGE } from '../constants/search';

export const searchQuerySchema = z.object({
  q: z.string().default(''),
  filters: z.object({
    project_id: z.string().optional(),
    category_id: z.string().optional(),
    tag_ids: z.array(z.string()).optional(),
    tag_mode: z.enum(['and', 'or']).default('or'),
    status: z.string().optional(),
    quality_band: z.array(z.enum(['A', 'B', 'C', 'D'])).optional(),
    score_min: z.number().min(0).max(100).optional(),
    score_max: z.number().min(0).max(100).optional(),
    source: z.string().optional(),
    language: z.string().optional(),
    is_favorite: z.boolean().optional(),
    is_pinned: z.boolean().optional(),
    has_improved: z.boolean().optional(),
    has_security_issues: z.boolean().optional(),
    session_id: z.string().optional(),
    created_after: z.string().optional(),
    created_before: z.string().optional(),
    updated_after: z.string().optional(),
    updated_before: z.string().optional(),
  }).default({}),
  sort: z.object({
    field: z.enum(['created_at', 'updated_at', 'overall_score', 'title', 'relevance']).default('created_at'),
    dir: z.enum(['asc', 'desc']).default('desc'),
  }).default({ field: 'created_at', dir: 'desc' }),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(MAX_PER_PAGE).default(24),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
