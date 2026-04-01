# EverPrompt — Implementation Plan

**Ready for agent-storm execution**

---

## Execution Phases & Dependency Graph

```
Phase 0: Foundation ──────────────────────────────┐
  │                                                │
  ├──► Phase 1: Backend Core ─────┐                │
  │       │                       │                │
  │       ├──► Phase 2: Routes ───┤ (parallel)     │
  │       │                       │                ├──► Phase 5: Frontend Foundation
  │       ├──► Phase 3: AI ───────┤                │       │
  │       │                       │                │       ├──► Phase 6: Frontend Layout
  │       └──► Phase 4: Search ───┘                │       │       │
  │                                                │       └──► Phase 7: Frontend Features
  └──► Phase 8: Plugin (parallel with Phase 1+)    │
                                                   │
  Phase 9: Integration (depends on ALL) ◄──────────┘
```

## Parallelization Groups

| Group | Phases | Can run simultaneously |
|-------|--------|----------------------|
| **G0** | Phase 0 | Must complete first |
| **G1** | Phase 1 + Phase 5 + Phase 8 | All three in parallel after G0 |
| **G2** | Phase 2 + Phase 3 + Phase 6 | After their respective dependencies in G1 |
| **G3** | Phase 4 + Phase 7 | After G2 |
| **G4** | Phase 9 | After everything |

---

## Phase 0: Foundation

### T0.1 — Initialize Monorepo

**Files to create:**
- `everprompt/package.json`
- `everprompt/turbo.json`
- `everprompt/tsconfig.base.json`
- `everprompt/.gitignore`
- `everprompt/.dev.vars.example`
- `everprompt/packages/shared/package.json`
- `everprompt/packages/shared/tsconfig.json`
- `everprompt/packages/db/package.json`
- `everprompt/packages/db/tsconfig.json`
- `everprompt/apps/api/package.json`
- `everprompt/apps/api/tsconfig.json`
- `everprompt/apps/web/package.json`
- `everprompt/apps/web/tsconfig.json`

**Dependencies:**
- None (first task)

**Subtasks:**

#### T0.1.1 — Root package.json + workspace config

```json
// everprompt/package.json
{
  "name": "everprompt",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "db:generate": "bun run --cwd packages/db generate",
    "db:migrate": "wrangler d1 migrations apply everprompt-db --local",
    "db:migrate:prod": "wrangler d1 migrations apply everprompt-db --remote",
    "db:seed": "bun run tools/seed.ts",
    "deploy": "turbo run build && wrangler deploy",
    "tools:import": "bun run tools/import.ts",
    "tools:export": "bun run tools/export.ts"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250312.0",
    "turbo": "^2.4.0",
    "typescript": "^5.7.0",
    "wrangler": "^3.114.0"
  }
}
```

**Verification:**
```bash
cd everprompt && bun install && echo "OK"
```

#### T0.1.2 — turbo.json

```json
// everprompt/turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Verification:**
```bash
bunx turbo run build --dry-run
```

#### T0.1.3 — tsconfig.base.json

```json
// everprompt/tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true
  }
}
```

**Verification:**
```bash
bunx tsc --showConfig -p tsconfig.base.json
```

#### T0.1.4 — .gitignore + .dev.vars.example

```gitignore
# everprompt/.gitignore
node_modules/
dist/
.wrangler/
.dev.vars
*.local
.turbo/
.DS_Store
```

```bash
# everprompt/.dev.vars.example
CLAUDE_API_KEY=sk-ant-xxxxx
ENVIRONMENT=development
```

**Verification:** Files exist and are valid.

---

### T0.2 — Shared Package (types, constants, validation, utils)

**Depends on:** T0.1

**Files to create:**
- `packages/shared/src/types/prompt.ts`
- `packages/shared/src/types/search.ts`
- `packages/shared/src/types/taxonomy.ts`
- `packages/shared/src/types/dashboard.ts`
- `packages/shared/src/types/api.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/constants/scoring.ts`
- `packages/shared/src/constants/search.ts`
- `packages/shared/src/constants/limits.ts`
- `packages/shared/src/constants/index.ts`
- `packages/shared/src/validation/prompt.schema.ts`
- `packages/shared/src/validation/search.schema.ts`
- `packages/shared/src/validation/taxonomy.schema.ts`
- `packages/shared/src/validation/index.ts`
- `packages/shared/src/utils/ulid.ts`
- `packages/shared/src/utils/slug.ts`
- `packages/shared/src/utils/hash.ts`
- `packages/shared/src/utils/diff.ts`
- `packages/shared/src/utils/query-parser.ts`
- `packages/shared/src/utils/index.ts`
- `packages/shared/src/index.ts`

**Subtasks:**

#### T0.2.1 — Shared package.json + tsconfig

```json
// packages/shared/package.json
{
  "name": "@everprompt/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./constants": "./src/constants/index.ts",
    "./validation": "./src/validation/index.ts",
    "./utils": "./src/utils/index.ts"
  },
  "dependencies": {
    "zod": "^3.24.0"
  }
}
```

```json
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Verification:**
```bash
cd packages/shared && bunx tsc --noEmit
```

#### T0.2.2 — Core Types

```typescript
// packages/shared/src/types/prompt.ts
export type PromptStatus = 'inbox' | 'active' | 'archived' | 'deleted';
export type PromptSource = 'manual' | 'import' | 'plugin' | 'api' | 'extension';
export type QualityBand = 'A' | 'B' | 'C' | 'D';
export type AiStatus = 'pending' | 'analyzing' | 'complete' | 'partial' | 'failed_classify' | 'failed_score' | 'failed_embed';
export type VersionKind = 'original' | 'edited' | 'improved_ai' | 'snapshot';
export type TagOrigin = 'ai' | 'manual' | 'rule';

export interface Prompt {
  id: string;
  project_id: string | null;
  category_id: string | null;
  title: string;
  abstract: string;
  body_original: string;
  body_normalized: string;
  language: string;
  source: PromptSource;
  status: PromptStatus;
  quality_band: QualityBand | null;
  overall_score: number | null;
  ai_status: AiStatus;
  is_favorite: boolean;
  is_pinned: boolean;
  has_improved_version: boolean;
  hash_sha256: string;
  fingerprint: string;
  word_count: number;
  char_count: number;
  search_text: string;
  ai_analyzed_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version_no: number;
  body: string;
  kind: VersionKind;
  diff_from_previous: string | null;
  created_at: string;
}

export interface PromptAiReview {
  id: string;
  prompt_id: string;
  overall_score: number;
  clarity_score: number;
  context_score: number;
  specificity_score: number;
  structure_score: number;
  reusability_score: number;
  actionability_score: number;
  evaluation_score: number;
  safety_score: number;
  compression_score: number;
  toolability_score: number;
  quality_band: QualityBand;
  short_verdict: string;
  justification_md: string;
  strengths_md: string;
  weaknesses_md: string;
  improved_prompt_md: string;
  improvement_diff: string;
  recommended_actions: string[];
  model_name: string;
  created_at: string;
}

export interface PromptTag {
  prompt_id: string;
  tag_id: string;
  confidence: number;
  origin: TagOrigin;
}

export interface PromptEmbedding {
  prompt_id: string;
  vector_id: string;
  embedding_model: string;
  embedded_text_hash: string;
  updated_at: string;
}

// List item (lighter than full Prompt)
export interface PromptListItem {
  id: string;
  title: string;
  abstract: string;
  project_id: string | null;
  category_id: string | null;
  quality_band: QualityBand | null;
  overall_score: number | null;
  ai_status: AiStatus;
  status: PromptStatus;
  source: PromptSource;
  is_favorite: boolean;
  is_pinned: boolean;
  has_improved_version: boolean;
  language: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  tags: { id: string; name: string; slug: string; color: string | null }[];
  project_name?: string;
  project_color?: string;
  category_name?: string;
}

// Full detail including review, versions, similar
export interface PromptDetail extends Prompt {
  tags: (Tag & { confidence: number; origin: TagOrigin })[];
  project: Project | null;
  category: Category | null;
  latest_review: PromptAiReview | null;
  versions: PromptVersion[];
  notes: Note[];
}
```

```typescript
// packages/shared/src/types/taxonomy.ts
export interface Project {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  prompt_count: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  color: string | null;
  icon: string | null;
  prompt_count: number;
  children?: Category[];
}

export type TagKind = 'topic' | 'model' | 'tone' | 'task' | 'quality' | 'domain' | 'language' | 'technique';

export interface Tag {
  id: string;
  name: string;
  slug: string;
  kind: TagKind;
  color: string | null;
  usage_count: number;
  is_ai_generated: boolean;
  created_at: string;
}
```

```typescript
// packages/shared/src/types/search.ts
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
```

```typescript
// packages/shared/src/types/dashboard.ts
export interface DashboardStats {
  total_prompts: number;
  ai_analyzed_pct: number;
  avg_score: number;
  avg_band: QualityBand;
  created_this_month: number;
  duplicates_found: number;
  needs_review: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}
```

```typescript
// packages/shared/src/types/api.ts
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
```

```typescript
// packages/shared/src/types/index.ts
export * from './prompt';
export * from './taxonomy';
export * from './search';
export * from './dashboard';
export * from './api';
```

**Verification:**
```bash
cd packages/shared && bunx tsc --noEmit
```

#### T0.2.3 — Constants

```typescript
// packages/shared/src/constants/scoring.ts
export const SCORE_DIMENSIONS = [
  'clarity', 'context', 'specificity', 'structure', 'reusability',
  'actionability', 'evaluation_readiness', 'safety', 'compression', 'toolability'
] as const;

export type ScoreDimension = typeof SCORE_DIMENSIONS[number];

export const SCORE_WEIGHTS: Record<ScoreDimension, number> = {
  clarity: 0.15,
  context: 0.12,
  specificity: 0.13,
  structure: 0.10,
  reusability: 0.08,
  actionability: 0.15,
  evaluation_readiness: 0.10,
  safety: 0.05,
  compression: 0.05,
  toolability: 0.07,
};

export const QUALITY_BANDS = {
  A: { min: 85, max: 100, label: 'Excellent', color: '#22c55e' },
  B: { min: 70, max: 84, label: 'Good', color: '#eab308' },
  C: { min: 50, max: 69, label: 'Sufficient', color: '#f97316' },
  D: { min: 0, max: 49, label: 'Weak', color: '#ef4444' },
} as const;

export const SCORE_DIMENSION_LABELS: Record<ScoreDimension, string> = {
  clarity: 'Clarity',
  context: 'Context',
  specificity: 'Specificity',
  structure: 'Structure',
  reusability: 'Reusability',
  actionability: 'Actionability',
  evaluation_readiness: 'Evaluation',
  safety: 'Safety',
  compression: 'Compression',
  toolability: 'Toolability',
};
```

```typescript
// packages/shared/src/constants/search.ts
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
```

```typescript
// packages/shared/src/constants/limits.ts
export const MAX_PROMPT_LENGTH = 50_000;
export const MAX_TITLE_LENGTH = 200;
export const MAX_ABSTRACT_LENGTH = 500;
export const MAX_TAGS_PER_PROMPT = 20;
export const MAX_NOTE_LENGTH = 5_000;
export const MAX_BULK_IDS = 100;
export const MIN_PROMPT_LENGTH_PLUGIN = 50;
export const API_KEY_PREFIX = 'ep_';
export const API_KEY_LENGTH = 48;
export const EMBEDDING_DIMENSIONS = 768;
export const EMBEDDING_MAX_TOKENS = 512;
```

```typescript
// packages/shared/src/constants/index.ts
export * from './scoring';
export * from './search';
export * from './limits';
```

**Verification:**
```bash
cd packages/shared && bunx tsc --noEmit
```

#### T0.2.4 — Zod Validation Schemas

```typescript
// packages/shared/src/validation/prompt.schema.ts
import { z } from 'zod';
import { MAX_PROMPT_LENGTH, MAX_TITLE_LENGTH, MAX_TAGS_PER_PROMPT, MAX_BULK_IDS } from '../constants/limits';

export const createPromptSchema = z.object({
  body_original: z.string().min(1).max(MAX_PROMPT_LENGTH),
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
  project_id: z.string().optional(),
  category_id: z.string().optional(),
  tag_ids: z.array(z.string()).max(MAX_TAGS_PER_PROMPT).optional(),
  source: z.enum(['manual', 'import', 'plugin', 'api', 'extension']).default('manual'),
  language: z.string().max(10).optional(),
});

export const updatePromptSchema = z.object({
  body_original: z.string().min(1).max(MAX_PROMPT_LENGTH).optional(),
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
  project_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  status: z.enum(['inbox', 'active', 'archived']).optional(),
  is_favorite: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
});

export const ingestPromptSchema = z.object({
  body_original: z.string().min(1).max(MAX_PROMPT_LENGTH),
  project_slug: z.string().optional(),
  source: z.enum(['plugin', 'api', 'extension']).default('plugin'),
});

export const bulkActionSchema = z.object({
  prompt_ids: z.array(z.string()).min(1).max(MAX_BULK_IDS),
});

export const bulkTagSchema = bulkActionSchema.extend({
  add_tag_ids: z.array(z.string()).optional(),
  remove_tag_ids: z.array(z.string()).optional(),
});

export const bulkMoveSchema = bulkActionSchema.extend({
  project_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
});

export const bulkDeleteSchema = bulkActionSchema.extend({
  confirm: z.literal(true),
});

export type CreatePromptInput = z.infer<typeof createPromptSchema>;
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;
export type IngestPromptInput = z.infer<typeof ingestPromptSchema>;
```

```typescript
// packages/shared/src/validation/search.schema.ts
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
```

```typescript
// packages/shared/src/validation/taxonomy.schema.ts
import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  parent_id: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  kind: z.enum(['topic', 'model', 'tone', 'task', 'quality', 'domain', 'language', 'technique']).default('topic'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const updateTagSchema = createTagSchema.partial();

export const mergeTagsSchema = z.object({
  source_tag_id: z.string(),
  target_tag_id: z.string(),
});
```

```typescript
// packages/shared/src/validation/index.ts
export * from './prompt.schema';
export * from './search.schema';
export * from './taxonomy.schema';
```

**Verification:**
```bash
cd packages/shared && bunx tsc --noEmit
```

#### T0.2.5 — Utils

```typescript
// packages/shared/src/utils/ulid.ts
// Use ulid package for sortable unique IDs
export { ulid } from 'ulid';
```

```typescript
// packages/shared/src/utils/slug.ts
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
```

```typescript
// packages/shared/src/utils/hash.ts
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function softFingerprint(text: string): Promise<string> {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return sha256(normalized);
}
```

```typescript
// packages/shared/src/utils/query-parser.ts
import type { SearchFilters } from '../types/search';

interface ParsedQuery {
  freeText: string;
  filters: Partial<SearchFilters>;
}

const OPERATOR_REGEX = /(\w+):([^\s]+)/g;
const SCORE_GT_REGEX = /score>(\d+)/g;
const SCORE_LT_REGEX = /score<(\d+)/g;

export function parseSearchQuery(raw: string): ParsedQuery {
  const filters: Partial<SearchFilters> = {};
  let freeText = raw;

  // Extract score operators
  freeText = freeText.replace(SCORE_GT_REGEX, (_, val) => {
    filters.score_min = parseInt(val, 10);
    return '';
  });
  freeText = freeText.replace(SCORE_LT_REGEX, (_, val) => {
    filters.score_max = parseInt(val, 10);
    return '';
  });

  // Extract key:value operators
  freeText = freeText.replace(OPERATOR_REGEX, (match, key, value) => {
    switch (key) {
      case 'project': filters.project_id = value; break;
      case 'tag':
        filters.tag_ids = filters.tag_ids || [];
        filters.tag_ids.push(value);
        break;
      case 'cat': filters.category_id = value; break;
      case 'band':
        filters.quality_band = filters.quality_band || [];
        filters.quality_band.push(value.toUpperCase() as 'A' | 'B' | 'C' | 'D');
        break;
      case 'lang': filters.language = value; break;
      case 'source': filters.source = value; break;
      case 'status': filters.status = value; break;
      case 'is':
        if (value === 'favorite') filters.is_favorite = true;
        if (value === 'pinned') filters.is_pinned = true;
        break;
      case 'has':
        if (value === 'improved') filters.has_improved = true;
        break;
      case 'created':
        filters.created_after = resolveDateShorthand(value);
        break;
      case 'updated':
        filters.updated_after = resolveDateShorthand(value);
        break;
      default:
        return match; // keep unknown operators in freeText
    }
    return '';
  });

  freeText = freeText.replace(/\s+/g, ' ').trim();

  return { freeText, filters };
}

function resolveDateShorthand(value: string): string {
  const now = new Date();
  switch (value) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    case 'thisweek': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString();
    }
    case 'last7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    case 'last30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
    default:
      return value; // assume ISO date
  }
}
```

```typescript
// packages/shared/src/utils/diff.ts
// Simple line-by-line diff for prompt comparison
export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

export function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const lcs = computeLCS(oldLines, newLines);
  let oi = 0, ni = 0, li = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (li < lcs.length && oi < oldLines.length && oldLines[oi] === lcs[li]) {
      if (ni < newLines.length && newLines[ni] === lcs[li]) {
        result.push({ type: 'unchanged', content: lcs[li], lineNumber: ni + 1 });
        oi++; ni++; li++;
      } else if (ni < newLines.length) {
        result.push({ type: 'added', content: newLines[ni], lineNumber: ni + 1 });
        ni++;
      }
    } else if (oi < oldLines.length) {
      result.push({ type: 'removed', content: oldLines[oi], lineNumber: oi + 1 });
      oi++;
    } else if (ni < newLines.length) {
      result.push({ type: 'added', content: newLines[ni], lineNumber: ni + 1 });
      ni++;
    }
  }

  return result;
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { result.unshift(a[i - 1]); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }
  return result;
}
```

```typescript
// packages/shared/src/utils/index.ts
export * from './ulid';
export * from './slug';
export * from './hash';
export * from './diff';
export * from './query-parser';
```

```typescript
// packages/shared/src/index.ts
export * from './types';
export * from './constants';
export * from './validation';
export * from './utils';
```

**Verification:**
```bash
cd packages/shared && bunx tsc --noEmit && echo "Shared package compiles OK"
```

---

### T0.3 — DB Package (Drizzle Schema + Migrations)

**Depends on:** T0.1, T0.2

**Files to create:**
- `packages/db/src/schema/prompts.ts`
- `packages/db/src/schema/taxonomy.ts`
- `packages/db/src/schema/reviews.ts`
- `packages/db/src/schema/versions.ts`
- `packages/db/src/schema/search.ts`
- `packages/db/src/schema/notes.ts`
- `packages/db/src/schema/api-keys.ts`
- `packages/db/src/schema/activity.ts`
- `packages/db/src/schema/index.ts`
- `packages/db/src/index.ts`
- `packages/db/drizzle.config.ts`

**Subtasks:**

#### T0.3.1 — DB package.json

```json
// packages/db/package.json
{
  "name": "@everprompt/db",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "drizzle-orm": "^0.39.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0"
  }
}
```

**Verification:**
```bash
cd packages/db && bun install
```

#### T0.3.2 — Drizzle Schema (all tables)

```typescript
// packages/db/src/schema/taxonomy.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  color: text('color'),
  icon: text('icon'),
  description: text('description'),
  prompt_count: integer('prompt_count').default(0).notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  parent_id: text('parent_id'),
  sort_order: integer('sort_order').default(0).notNull(),
  color: text('color'),
  icon: text('icon'),
  prompt_count: integer('prompt_count').default(0).notNull(),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').unique().notNull(),
  slug: text('slug').unique().notNull(),
  kind: text('kind').notNull().default('topic'),
  color: text('color'),
  usage_count: integer('usage_count').default(0).notNull(),
  is_ai_generated: integer('is_ai_generated', { mode: 'boolean' }).default(false).notNull(),
  created_at: text('created_at').notNull(),
});
```

```typescript
// packages/db/src/schema/prompts.ts
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const prompts = sqliteTable('prompts', {
  id: text('id').primaryKey(),
  project_id: text('project_id'),
  category_id: text('category_id'),
  title: text('title').default('').notNull(),
  abstract: text('abstract').default('').notNull(),
  body_original: text('body_original').notNull(),
  body_normalized: text('body_normalized').default('').notNull(),
  language: text('language').default('en').notNull(),
  source: text('source').default('manual').notNull(),
  status: text('status').default('inbox').notNull(),
  quality_band: text('quality_band'),
  overall_score: real('overall_score'),
  ai_status: text('ai_status').default('pending').notNull(),
  is_favorite: integer('is_favorite', { mode: 'boolean' }).default(false).notNull(),
  is_pinned: integer('is_pinned', { mode: 'boolean' }).default(false).notNull(),
  has_improved_version: integer('has_improved_version', { mode: 'boolean' }).default(false).notNull(),
  hash_sha256: text('hash_sha256').notNull(),
  fingerprint: text('fingerprint').notNull(),
  word_count: integer('word_count').default(0).notNull(),
  char_count: integer('char_count').default(0).notNull(),
  search_text: text('search_text').default('').notNull(),
  ai_analyzed_at: text('ai_analyzed_at'),
  last_used_at: text('last_used_at'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (table) => [
  index('idx_prompts_project').on(table.project_id, table.status, table.created_at),
  index('idx_prompts_category').on(table.category_id, table.status),
  index('idx_prompts_status').on(table.status, table.created_at),
  index('idx_prompts_quality').on(table.quality_band, table.overall_score),
  index('idx_prompts_hash').on(table.hash_sha256),
  index('idx_prompts_fingerprint').on(table.fingerprint),
  index('idx_prompts_favorite').on(table.is_favorite, table.updated_at),
]);

export const promptTags = sqliteTable('prompt_tags', {
  prompt_id: text('prompt_id').notNull(),
  tag_id: text('tag_id').notNull(),
  confidence: real('confidence').default(1.0).notNull(),
  origin: text('origin').default('manual').notNull(),
}, (table) => [
  index('idx_prompt_tags_tag').on(table.tag_id),
]);
```

```typescript
// packages/db/src/schema/reviews.ts
import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';

export const promptAiReviews = sqliteTable('prompt_ai_reviews', {
  id: text('id').primaryKey(),
  prompt_id: text('prompt_id').notNull(),
  overall_score: real('overall_score').notNull(),
  clarity_score: real('clarity_score').notNull(),
  context_score: real('context_score').notNull(),
  specificity_score: real('specificity_score').notNull(),
  structure_score: real('structure_score').notNull(),
  reusability_score: real('reusability_score').notNull(),
  actionability_score: real('actionability_score').notNull(),
  evaluation_score: real('evaluation_score').notNull(),
  safety_score: real('safety_score').notNull(),
  compression_score: real('compression_score').notNull(),
  toolability_score: real('toolability_score').notNull(),
  quality_band: text('quality_band').notNull(),
  short_verdict: text('short_verdict').notNull(),
  justification_md: text('justification_md').notNull(),
  strengths_md: text('strengths_md').notNull(),
  weaknesses_md: text('weaknesses_md').notNull(),
  improved_prompt_md: text('improved_prompt_md').notNull(),
  improvement_diff: text('improvement_diff').default('').notNull(),
  recommended_actions: text('recommended_actions').notNull(), // JSON array
  model_name: text('model_name').notNull(),
  created_at: text('created_at').notNull(),
}, (table) => [
  index('idx_reviews_prompt').on(table.prompt_id, table.created_at),
]);
```

```typescript
// packages/db/src/schema/versions.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const promptVersions = sqliteTable('prompt_versions', {
  id: text('id').primaryKey(),
  prompt_id: text('prompt_id').notNull(),
  version_no: integer('version_no').notNull(),
  body: text('body').notNull(),
  kind: text('kind').notNull(), // original, edited, improved_ai, snapshot
  diff_from_previous: text('diff_from_previous'),
  created_at: text('created_at').notNull(),
}, (table) => [
  index('idx_versions_prompt').on(table.prompt_id, table.version_no),
]);
```

```typescript
// packages/db/src/schema/search.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const savedSearches = sqliteTable('saved_searches', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  query_text: text('query_text').default('').notNull(),
  filters_json: text('filters_json').default('{}').notNull(),
  sort_json: text('sort_json').default('{}').notNull(),
  is_pinned: integer('is_pinned', { mode: 'boolean' }).default(false).notNull(),
  result_count: integer('result_count').default(0).notNull(),
  last_run_at: text('last_run_at'),
  created_at: text('created_at').notNull(),
});
```

```typescript
// packages/db/src/schema/notes.ts
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  prompt_id: text('prompt_id'),
  body: text('body').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});
```

```typescript
// packages/db/src/schema/api-keys.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  key_hash: text('key_hash').notNull(),
  key_prefix: text('key_prefix').notNull(),
  permissions: text('permissions').notNull(), // JSON
  default_project_id: text('default_project_id'),
  last_used_at: text('last_used_at'),
  expires_at: text('expires_at'),
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').notNull(),
});
```

```typescript
// packages/db/src/schema/activity.ts
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  entity_type: text('entity_type').notNull(),
  entity_id: text('entity_id').notNull(),
  action: text('action').notNull(),
  payload_json: text('payload_json'),
  created_at: text('created_at').notNull(),
}, (table) => [
  index('idx_activity_entity').on(table.entity_type, table.entity_id, table.created_at),
  index('idx_activity_date').on(table.created_at),
]);
```

```typescript
// packages/db/src/schema/index.ts
export * from './taxonomy';
export * from './prompts';
export * from './reviews';
export * from './versions';
export * from './search';
export * from './notes';
export * from './api-keys';
export * from './activity';
```

```typescript
// packages/db/src/index.ts
export * from './schema';
```

**Verification:**
```bash
cd packages/db && bunx tsc --noEmit && echo "DB schema compiles OK"
```

#### T0.3.3 — Drizzle Config + Generate Migration

```typescript
// packages/db/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'sqlite',
});
```

**Verification:**
```bash
cd packages/db && bunx drizzle-kit generate && ls src/migrations/
```

---

### T0.4 — Wrangler Config

**Depends on:** T0.1

**File:** `everprompt/wrangler.jsonc`

```jsonc
{
  "name": "everprompt-api",
  "main": "apps/api/src/index.ts",
  "compatibility_date": "2025-12-01",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "everprompt-db",
      "database_id": "local"
    }
  ],
  "vectorize": [
    {
      "binding": "VECTORIZE",
      "index_name": "everprompt-prompts"
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2",
      "bucket_name": "everprompt-assets"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "local"
    }
  ],
  "queues": {
    "producers": [
      {
        "binding": "AI_QUEUE",
        "queue": "everprompt-ai-pipeline"
      }
    ],
    "consumers": [
      {
        "queue": "everprompt-ai-pipeline",
        "max_retries": 3,
        "max_batch_size": 5,
        "max_batch_timeout": 10
      }
    ]
  },
  "ai": {
    "binding": "AI"
  },
  "vars": {
    "ENVIRONMENT": "development"
  },
  "assets": {
    "directory": "apps/web/dist",
    "binding": "ASSETS"
  }
}
```

**Verification:**
```bash
wrangler d1 list 2>&1 | head -5  # Check wrangler works
```

---

## Phase 1: Backend Core

**Depends on:** Phase 0

### T1.1 — Hono App Entry + Env Types

**Files:**
- `apps/api/package.json`
- `apps/api/src/index.ts`
- `apps/api/src/env.ts`

#### T1.1.1 — API package.json

```json
{
  "name": "@everprompt/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev --config ../../wrangler.jsonc",
    "build": "wrangler deploy --dry-run --config ../../wrangler.jsonc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@everprompt/shared": "workspace:*",
    "@everprompt/db": "workspace:*",
    "hono": "^4.7.0",
    "drizzle-orm": "^0.39.0",
    "@anthropic-ai/sdk": "^0.39.0"
  }
}
```

#### T1.1.2 — Env types + app entry

```typescript
// apps/api/src/env.ts
export type Env = {
  Bindings: {
    DB: D1Database;
    VECTORIZE: VectorizeIndex;
    R2: R2Bucket;
    KV: KVNamespace;
    AI_QUEUE: Queue;
    AI: Ai;
    ASSETS: Fetcher;
    CLAUDE_API_KEY: string;
    ENVIRONMENT: string;
  };
};
```

```typescript
// apps/api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { errorMiddleware } from './middleware/error';
import { authMiddleware } from './middleware/auth';
import { promptRoutes } from './routes/prompts';
import { bulkRoutes } from './routes/bulk';
import { searchRoutes } from './routes/search';
import { aiRoutes } from './routes/ai';
import { taxonomyRoutes } from './routes/taxonomy';
import { dashboardRoutes } from './routes/dashboard';
import { versionRoutes } from './routes/versions';
import { noteRoutes } from './routes/notes';
import { apiKeyRoutes } from './routes/api-keys';
import { savedSearchRoutes } from './routes/saved-searches';
import { settingsRoutes } from './routes/settings';
import { queueConsumer } from './queue/consumer';

const app = new Hono<Env>();

// Global middleware
app.use('/api/*', cors());
app.use('/api/*', errorMiddleware);
app.use('/api/*', authMiddleware);

// API routes
app.route('/api/v1/prompts', promptRoutes);
app.route('/api/v1/prompts', bulkRoutes);
app.route('/api/v1/search', searchRoutes);
app.route('/api/v1/prompts', aiRoutes);
app.route('/api/v1', taxonomyRoutes);
app.route('/api/v1/dashboard', dashboardRoutes);
app.route('/api/v1/prompts', versionRoutes);
app.route('/api/v1', noteRoutes);
app.route('/api/v1/api-keys', apiKeyRoutes);
app.route('/api/v1/saved-searches', savedSearchRoutes);
app.route('/api/v1/settings', settingsRoutes);

// SPA fallback
app.get('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default {
  fetch: app.fetch,
  queue: queueConsumer,
};
```

**Verification:**
```bash
cd apps/api && bunx tsc --noEmit
```

### T1.2 — Middleware (auth, error, cors)

**Files:**
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/middleware/error.ts`

#### T1.2.1 — Auth middleware

```typescript
// apps/api/src/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';
import { db } from '../lib/db';
import { apiKeys } from '@everprompt/db';
import { eq, and } from 'drizzle-orm';
import { sha256 } from '@everprompt/shared';

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  // Check for API key auth first (plugin/external)
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ep_')) {
    const token = authHeader.slice(7);
    const keyHash = await sha256(token);
    const d = db(c.env.DB);
    const [key] = await d.select().from(apiKeys)
      .where(and(eq(apiKeys.key_hash, keyHash), eq(apiKeys.is_active, true)))
      .limit(1);

    if (!key) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }, 401);
    }

    // Check expiry
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'API key expired' } }, 401);
    }

    // Update last_used_at
    await d.update(apiKeys).set({ last_used_at: new Date().toISOString() }).where(eq(apiKeys.id, key.id));

    c.set('authType', 'api_key');
    c.set('apiKeyId', key.id);
    c.set('permissions', JSON.parse(key.permissions));
    return next();
  }

  // Check for Cloudflare Access JWT
  const cfAccessJwt = c.req.header('CF-Access-JWT-Assertion');
  if (cfAccessJwt) {
    // In production, validate JWT. In dev, trust the header.
    c.set('authType', 'zero_trust');
    return next();
  }

  // Dev mode: allow unauthenticated
  if (c.env.ENVIRONMENT === 'development') {
    c.set('authType', 'dev');
    return next();
  }

  return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
});
```

#### T1.2.2 — Error middleware

```typescript
// apps/api/src/middleware/error.ts
import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';

export const errorMiddleware = createMiddleware<Env>(async (c, next) => {
  try {
    await next();
  } catch (err) {
    console.error('Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return c.json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message },
    }, 500);
  }
});
```

**Verification:**
```bash
cd apps/api && bunx tsc --noEmit
```

### T1.3 — Lib Helpers (db, kv, r2, vectorize, claude, pagination)

**Files:**
- `apps/api/src/lib/db.ts`
- `apps/api/src/lib/kv.ts`
- `apps/api/src/lib/r2.ts`
- `apps/api/src/lib/vectorize.ts`
- `apps/api/src/lib/claude.ts`
- `apps/api/src/lib/pagination.ts`

#### T1.3.1 — DB helper

```typescript
// apps/api/src/lib/db.ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@everprompt/db';

export function db(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type DB = ReturnType<typeof db>;
```

#### T1.3.2 — KV helper

```typescript
// apps/api/src/lib/kv.ts
const DEFAULT_TTL = 300; // 5 minutes

export async function kvGet<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const val = await kv.get(key, 'json');
  return val as T | null;
}

export async function kvSet(kv: KVNamespace, key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
}

export async function kvInvalidate(kv: KVNamespace, ...keys: string[]): Promise<void> {
  await Promise.all(keys.map(k => kv.delete(k)));
}
```

#### T1.3.3 — Claude API client

```typescript
// apps/api/src/lib/claude.ts
import Anthropic from '@anthropic-ai/sdk';

export function claude(apiKey: string) {
  return new Anthropic({ apiKey });
}

export async function classifyPrompt(client: Anthropic, body: string, language: string) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Analyze this prompt and return a JSON object with: title (5-10 word concise title), abstract (1-2 sentences), category_suggestion (single category name), tags (array of {name, kind, confidence} where kind is one of: topic, model, tone, task, quality, domain, language, technique), detected_intent (code_generation|analysis|writing|brainstorming|debugging|planning|other), complexity (simple|moderate|complex|expert).

Language: ${language}

Prompt:
${body}

Return ONLY valid JSON, no markdown fences.`
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text);
}

export async function scorePrompt(client: Anthropic, body: string, title: string, abstract: string, tags: string[], intent: string) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Score this prompt on 10 dimensions (0-100 each). Return JSON with: scores (object with keys: clarity, context, specificity, structure, reusability, actionability, evaluation_readiness, safety, compression, toolability), overall_score (weighted average), quality_band (A=85-100, B=70-84, C=50-69, D=0-49), short_verdict (1 sentence), strengths (markdown bullet list), weaknesses (markdown bullet list), improved_prompt (complete rewritten better version), recommended_actions (array of strings).

Title: ${title}
Abstract: ${abstract}
Tags: ${tags.join(', ')}
Intent: ${intent}

Prompt:
${body}

Return ONLY valid JSON, no markdown fences.`
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text);
}
```

#### T1.3.4 — Vectorize helper

```typescript
// apps/api/src/lib/vectorize.ts
export async function embedText(ai: Ai, text: string): Promise<number[]> {
  const result = await ai.run('@cf/baai/bge-base-en-v1.5', { text: [text] });
  return result.data[0];
}

export async function upsertVector(
  vectorize: VectorizeIndex,
  id: string,
  values: number[],
  metadata: Record<string, string | number | boolean>
) {
  await vectorize.upsert([{ id, values, metadata }]);
}

export async function queryVectors(
  vectorize: VectorizeIndex,
  values: number[],
  topK: number,
  filter?: VectorizeVectorMetadataFilter
) {
  return vectorize.query(values, { topK, filter, returnMetadata: 'all' });
}

export async function deleteVector(vectorize: VectorizeIndex, id: string) {
  await vectorize.deleteByIds([id]);
}
```

#### T1.3.5 — Pagination helper

```typescript
// apps/api/src/lib/pagination.ts
import type { PaginationMeta } from '@everprompt/shared';

export function paginationMeta(total: number, page: number, perPage: number): PaginationMeta {
  return {
    total,
    page,
    per_page: perPage,
    has_more: page * perPage < total,
  };
}

export function paginationOffset(page: number, perPage: number) {
  return { limit: perPage, offset: (page - 1) * perPage };
}
```

**Verification:**
```bash
cd apps/api && bunx tsc --noEmit
```

---

## Phase 2: Backend Routes (parallelizable within phase)

**Depends on:** Phase 1

### Parallel Group 2A: T2.1 + T2.2 + T2.3 + T2.4 + T2.5 + T2.6

Each route file can be built independently.

### T2.1 — Prompt CRUD Routes + Service

**Files:**
- `apps/api/src/routes/prompts.ts`
- `apps/api/src/services/prompt.service.ts`

Implement: POST /, GET /, GET /:id, PATCH /:id, DELETE /:id, POST /ingest

Each handler:
1. Validate input with Zod schema
2. Call service function
3. Return `{ ok: true, data, meta? }`

Service functions use Drizzle ORM to query D1.

**On create/ingest:**
- Generate ULID
- Compute hash_sha256 and fingerprint
- Compute word_count and char_count
- Set body_normalized (trimmed)
- Build search_text
- Insert into D1
- Create initial prompt_version (kind: 'original')
- Enqueue AI pipeline job
- Log to activity_log

**Verification:**
```bash
curl -X POST http://localhost:8787/api/v1/prompts -H 'Content-Type: application/json' -d '{"body_original":"Test prompt"}' | jq .ok
# Expected: true
curl http://localhost:8787/api/v1/prompts | jq '.data | length'
# Expected: 1
```

### T2.2 — Taxonomy Routes (Projects, Categories, Tags)

**File:** `apps/api/src/routes/taxonomy.ts`, `apps/api/src/services/taxonomy.service.ts`

Implement all CRUD for projects, categories (including tree), tags (including merge).

**Verification:**
```bash
curl -X POST http://localhost:8787/api/v1/projects -H 'Content-Type: application/json' -d '{"name":"Backend"}' | jq .ok
curl http://localhost:8787/api/v1/categories/tree | jq .ok
curl http://localhost:8787/api/v1/tags | jq .ok
```

### T2.3 — Notes Routes

**File:** `apps/api/src/routes/notes.ts`

GET /prompts/:id/notes, POST /prompts/:id/notes, PATCH /notes/:id, DELETE /notes/:id

**Verification:**
```bash
curl http://localhost:8787/api/v1/prompts/{id}/notes | jq .ok
```

### T2.4 — API Keys Routes + Service

**File:** `apps/api/src/routes/api-keys.ts`, `apps/api/src/services/api-key.service.ts`

On create: generate random 48-char key with `ep_` prefix, store hash only, return full key ONCE.

**Verification:**
```bash
curl -X POST http://localhost:8787/api/v1/api-keys -H 'Content-Type: application/json' -d '{"name":"Test"}' | jq '.data.key'
# Expected: ep_... (48 chars)
```

### T2.5 — Saved Searches Routes

**File:** `apps/api/src/routes/saved-searches.ts`

Standard CRUD.

**Verification:**
```bash
curl http://localhost:8787/api/v1/saved-searches | jq .ok
```

### T2.6 — Settings Routes

**File:** `apps/api/src/routes/settings.ts`

GET /settings, PATCH /settings. Store in KV per user (or single-user default).

**Verification:**
```bash
curl http://localhost:8787/api/v1/settings | jq .ok
```

### T2.7 — Bulk Operations Routes

**File:** `apps/api/src/routes/bulk.ts`

**Depends on:** T2.1 (needs prompt service)

POST /bulk/tag, /bulk/move, /bulk/delete, /bulk/reanalyze, /bulk/archive, /bulk/favorite

Each: validate bulkActionSchema + specific schema, loop over prompt_ids, apply action, return count.

**Verification:**
```bash
curl -X POST http://localhost:8787/api/v1/prompts/bulk/favorite -H 'Content-Type: application/json' -d '{"prompt_ids":["id1"]}' | jq .ok
```

### T2.8 — Versions Routes

**File:** `apps/api/src/routes/versions.ts`

**Depends on:** T2.1

GET /prompts/:id/versions, POST /prompts/:id/versions, GET /prompts/:id/versions/:vid, POST /prompts/:id/versions/:vid/apply

**Verification:**
```bash
curl http://localhost:8787/api/v1/prompts/{id}/versions | jq '.data | length'
```

### T2.9 — Dashboard Routes + Service

**File:** `apps/api/src/routes/dashboard.ts`, `apps/api/src/services/dashboard.service.ts`

GET /stats, GET /charts/creation, GET /charts/quality, GET /charts/tags, GET /charts/projects, GET /recent, GET /needs-review

Uses aggregate SQL queries. Cache results in KV with 5min TTL.

**Verification:**
```bash
curl http://localhost:8787/api/v1/dashboard/stats | jq .data
```

---

## Phase 3: AI Pipeline

**Depends on:** Phase 1

### T3.1 — Normalize Step

**File:** `apps/api/src/ai/normalize.ts`

```typescript
import { sha256, softFingerprint } from '@everprompt/shared';

export interface NormalizeResult {
  body_normalized: string;
  language: string;
  hash_sha256: string;
  fingerprint: string;
  word_count: number;
  char_count: number;
}

export async function normalizePrompt(body: string): Promise<NormalizeResult> {
  const body_normalized = body.replace(/\r\n/g, '\n').trim();
  const words = body_normalized.split(/\s+/).filter(Boolean);

  return {
    body_normalized,
    language: detectLanguage(body_normalized),
    hash_sha256: await sha256(body),
    fingerprint: await softFingerprint(body),
    word_count: words.length,
    char_count: body_normalized.length,
  };
}

function detectLanguage(text: string): string {
  // Simple heuristic: check for common Italian/English words
  const itWords = ['che', 'per', 'con', 'una', 'del', 'non', 'sono', 'anche', 'questo', 'dalla'];
  const lower = text.toLowerCase();
  const itCount = itWords.filter(w => lower.includes(` ${w} `)).length;
  return itCount >= 3 ? 'it' : 'en';
}
```

**Verification:** Unit test normalizePrompt with sample text.

### T3.2 — Classify Step (Haiku)

**File:** `apps/api/src/ai/classify.ts`

Calls `classifyPrompt` from lib/claude.ts. Parses JSON response. Returns structured classification.

**Verification:** Call with sample prompt, verify JSON structure has title, abstract, tags.

### T3.3 — Score Step (Sonnet)

**File:** `apps/api/src/ai/score.ts`

Calls `scorePrompt` from lib/claude.ts. Computes weighted overall_score. Returns structured review.

**Verification:** Call with sample, verify 10 scores + overall + band + improved_prompt.

### T3.4 — Embed Step

**File:** `apps/api/src/ai/embed.ts`

Uses lib/vectorize.ts. Embeds `title | abstract | body_normalized`. Upserts to Vectorize with metadata.

**Verification:** After embed, query Vectorize with same text, verify topK returns the prompt.

### T3.5 — Post-process Step

**File:** `apps/api/src/ai/postprocess.ts`

- Upsert tags (by slug, create if not exists)
- Upsert category
- Update prompt_count on project/category/tags
- Save prompt_ai_reviews record
- Save prompt_versions (original + improved_ai if present)
- Generate diff
- Update prompt fields (title, abstract, quality_band, overall_score, ai_status, search_text, etc.)
- Log activity

**Verification:** After full pipeline run, verify D1 has review, tags are linked, counts are updated.

### T3.6 — Pipeline Orchestrator

**File:** `apps/api/src/ai/pipeline.ts`

```typescript
export async function runPipeline(env: Env['Bindings'], promptId: string) {
  const d = db(env.DB);
  const [prompt] = await d.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
  if (!prompt) throw new Error(`Prompt ${promptId} not found`);

  // Update status
  await d.update(prompts).set({ ai_status: 'analyzing' }).where(eq(prompts.id, promptId));

  try {
    // Step A: Normalize
    const norm = await normalizePrompt(prompt.body_original);
    await d.update(prompts).set({
      body_normalized: norm.body_normalized,
      language: norm.language,
      hash_sha256: norm.hash_sha256,
      fingerprint: norm.fingerprint,
      word_count: norm.word_count,
      char_count: norm.char_count,
    }).where(eq(prompts.id, promptId));

    // Step B: Classify (Haiku)
    const client = claude(env.CLAUDE_API_KEY);
    let classification;
    try {
      classification = await classifyPrompt(client, norm.body_normalized, norm.language);
    } catch (e) {
      await d.update(prompts).set({ ai_status: 'failed_classify' }).where(eq(prompts.id, promptId));
      return;
    }

    // Step C: Score (Sonnet)
    let review;
    try {
      review = await scorePrompt(client, prompt.body_original, classification.title, classification.abstract, classification.tags.map((t: any) => t.name), classification.detected_intent);
    } catch (e) {
      await d.update(prompts).set({ ai_status: 'failed_score', title: classification.title, abstract: classification.abstract }).where(eq(prompts.id, promptId));
      return;
    }

    // Step D: Embed
    try {
      const embedText = `${classification.title} | ${classification.abstract} | ${norm.body_normalized}`;
      const truncated = embedText.slice(0, 2000); // rough token limit
      const vector = await embedTextFn(env.AI, truncated);
      await upsertVector(env.VECTORIZE, promptId, vector, {
        project_id: prompt.project_id || '',
        category_id: prompt.category_id || '',
        quality_band: review.quality_band,
        status: prompt.status,
        language: norm.language,
        is_favorite: prompt.is_favorite ? 1 : 0,
      });
    } catch (e) {
      // Non-fatal: prompt is analyzed but not searchable semantically
      await d.update(prompts).set({ ai_status: 'partial' }).where(eq(prompts.id, promptId));
    }

    // Step E: Post-process
    await postProcess(env, promptId, classification, review, norm);

    // Mark complete
    await d.update(prompts).set({ ai_status: 'complete', ai_analyzed_at: new Date().toISOString() }).where(eq(prompts.id, promptId));

  } catch (e) {
    console.error('Pipeline error:', e);
    await d.update(prompts).set({ ai_status: 'failed_classify' }).where(eq(prompts.id, promptId));
  }
}
```

**Verification:** Create prompt, run pipeline, verify all fields populated in D1.

### T3.7 — Queue Consumer

**File:** `apps/api/src/queue/consumer.ts`

```typescript
import type { Env } from '../env';
import { runPipeline } from '../ai/pipeline';

interface QueueMessage {
  promptId: string;
  action: 'analyze' | 'reanalyze' | 'embed_only';
}

export async function queueConsumer(batch: MessageBatch<QueueMessage>, env: Env['Bindings']) {
  for (const msg of batch.messages) {
    try {
      await runPipeline(env, msg.body.promptId);
      msg.ack();
    } catch (e) {
      console.error('Queue processing error:', e);
      msg.retry();
    }
  }
}
```

**Verification:**
```bash
# Create prompt via API, check ai_status transitions: pending -> analyzing -> complete
curl http://localhost:8787/api/v1/prompts/{id} | jq '.data.ai_status'
```

### T3.8 — AI Routes (analyze, improve, similar)

**File:** `apps/api/src/routes/ai.ts`

POST /:id/analyze, POST /:id/improve, GET /:id/review, GET /:id/reviews, GET /:id/similar

**Verification:**
```bash
curl -X POST http://localhost:8787/api/v1/prompts/{id}/analyze | jq .ok
curl http://localhost:8787/api/v1/prompts/{id}/review | jq '.data.overall_score'
curl http://localhost:8787/api/v1/prompts/{id}/similar | jq '.data | length'
```

---

## Phase 4: Search System

**Depends on:** Phase 2 + Phase 3

### T4.1 — Search Service

**File:** `apps/api/src/services/search.service.ts`

Implements hybrid search:
1. Parse query with `parseSearchQuery()`
2. Build D1 SQL query with filters
3. If freeText present: run Vectorize semantic search in parallel
4. Merge results with weighted scoring
5. Deduplicate, paginate, return

**Verification:**
```bash
curl -X POST http://localhost:8787/api/v1/search -H 'Content-Type: application/json' -d '{"q":"architecture microservices","filters":{},"sort":{"field":"relevance","dir":"desc"},"page":1,"per_page":24}' | jq '.data.prompts | length'
```

### T4.2 — Search Routes

**File:** `apps/api/src/routes/search.ts`

POST /search, GET /suggest, GET /facets

**Verification:**
```bash
curl 'http://localhost:8787/api/v1/search/suggest?q=arch' | jq .data
curl http://localhost:8787/api/v1/search/facets | jq .data
```

---

## Phase 5: Frontend Foundation (parallel with Phase 1)

**Depends on:** Phase 0

### T5.1 — Vite + React Setup

**Files:**
- `apps/web/package.json`
- `apps/web/vite.config.ts`
- `apps/web/index.html`
- `apps/web/src/main.tsx`
- `apps/web/src/app.tsx`
- `apps/web/tsconfig.json`

#### T5.1.1 — Web package.json

```json
{
  "name": "@everprompt/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@everprompt/shared": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.1.0",
    "@tanstack/react-query": "^5.64.0",
    "zustand": "^5.0.0",
    "framer-motion": "^12.0.0",
    "recharts": "^2.15.0",
    "react-resizable-panels": "^2.1.0",
    "cmdk": "^1.0.0",
    "@monaco-editor/react": "^4.7.0",
    "sonner": "^1.7.0",
    "lucide-react": "^0.469.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "@radix-ui/react-checkbox": "^1.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-scroll-area": "^1.2.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^4.0.0",
    "vite": "^6.0.0"
  }
}
```

#### T5.1.2 — Vite config

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

#### T5.1.3 — index.html + main.tsx + app.tsx

```html
<!-- apps/web/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EverPrompt</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
</head>
<body class="bg-zinc-950 text-zinc-100 antialiased">
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

```typescript
// apps/web/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

```typescript
// apps/web/src/app.tsx
import { BrowserRouter, Routes, Route } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/query-client';
import { Layout } from './routes/layout';
import { DashboardPage } from './routes/dashboard';
import { PromptsPage } from './routes/prompts';
import { PromptDetailPage } from './routes/prompt-detail';
import { PromptNewPage } from './routes/prompt-new';
import { SettingsPage } from './routes/settings';
import { ApiKeysPage } from './routes/api-keys';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="prompts" element={<PromptsPage />} />
            <Route path="prompts/new" element={<PromptNewPage />} />
            <Route path="prompts/:id" element={<PromptDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster theme="dark" position="bottom-right" />
    </QueryClientProvider>
  );
}
```

**Verification:**
```bash
cd apps/web && bun run dev
# Open http://localhost:5173, page loads without errors
```

### T5.2 — Tailwind + Design Tokens

**File:** `apps/web/src/styles/globals.css`

```css
@import "tailwindcss";

@theme {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --color-surface: #18181b;
  --color-surface-hover: #27272a;
  --color-border: #27272a;
  --color-border-hover: #3f3f46;
  --color-accent: #6366f1;
  --color-accent-hover: #818cf8;

  --color-band-a: #22c55e;
  --color-band-b: #eab308;
  --color-band-c: #f97316;
  --color-band-d: #ef4444;
}
```

**Verification:**
```bash
cd apps/web && bun run build 2>&1 | tail -3
# Build should succeed
```

### T5.3 — shadcn/ui Init + Base Components

**File:** `apps/web/src/components/ui/*.tsx`

Initialize shadcn/ui components: button, input, dialog, dropdown-menu, select, checkbox, tooltip, tabs, badge, separator, scroll-area, skeleton, sheet.

Use `cn()` utility:

```typescript
// apps/web/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Verification:** Import and render a Button component, no errors.

### T5.4 — API Client Layer

**File:** `apps/web/src/lib/api.ts`

```typescript
const BASE_URL = '/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error?.message || 'API error');
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};
```

**Verification:** TypeScript compiles.

### T5.5 — TanStack Query Config

**File:** `apps/web/src/lib/query-client.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### T5.6 — Zustand Stores

**Files:**
- `apps/web/src/stores/ui.store.ts`
- `apps/web/src/stores/selection.store.ts`
- `apps/web/src/stores/search.store.ts`

```typescript
// apps/web/src/stores/ui.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  theme: 'dark' | 'light';
  viewMode: 'grid' | 'list';
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  density: 'compact' | 'comfortable';
  toggleTheme: () => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'dark',
      viewMode: 'grid',
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      density: 'compact',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
      toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
    }),
    { name: 'everprompt-ui' }
  )
);
```

```typescript
// apps/web/src/stores/selection.store.ts
import { create } from 'zustand';

interface SelectionState {
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
  count: () => number;
}

export const useSelectionStore = create<SelectionState>()((set, get) => ({
  selectedIds: new Set(),
  toggle: (id) => set((s) => {
    const next = new Set(s.selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    return { selectedIds: next };
  }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clear: () => set({ selectedIds: new Set() }),
  isSelected: (id) => get().selectedIds.has(id),
  count: () => get().selectedIds.size,
}));
```

```typescript
// apps/web/src/stores/search.store.ts
import { create } from 'zustand';
import type { SearchFilters, SearchSort } from '@everprompt/shared';
import { DEFAULT_SORT } from '@everprompt/shared';

interface SearchState {
  query: string;
  filters: Partial<SearchFilters>;
  sort: SearchSort;
  setQuery: (q: string) => void;
  setFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  clearFilters: () => void;
  setSort: (sort: SearchSort) => void;
}

export const useSearchStore = create<SearchState>()((set) => ({
  query: '',
  filters: {},
  sort: DEFAULT_SORT,
  setQuery: (query) => set({ query }),
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  clearFilters: () => set({ filters: {} }),
  setSort: (sort) => set({ sort }),
}));
```

**Verification:**
```bash
cd apps/web && bunx tsc --noEmit
```

### T5.7 — React Query Hooks

**Files:**
- `apps/web/src/hooks/use-prompts.ts`
- `apps/web/src/hooks/use-search.ts`
- `apps/web/src/hooks/use-taxonomy.ts`
- `apps/web/src/hooks/use-dashboard.ts`
- `apps/web/src/hooks/use-bulk.ts`
- `apps/web/src/hooks/use-keyboard.ts`
- `apps/web/src/hooks/use-clipboard.ts`

Each hook wraps TanStack Query useQuery/useMutation for its domain. Example pattern:

```typescript
// apps/web/src/hooks/use-prompts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiResponse, PromptListItem, PromptDetail, PaginationMeta } from '@everprompt/shared';

export function usePrompts(params: { page: number; per_page: number; status?: string }) {
  return useQuery({
    queryKey: ['prompts', params],
    queryFn: () => api.get<ApiResponse<PromptListItem[]> & { meta: PaginationMeta }>(`/prompts?${new URLSearchParams(params as any)}`),
  });
}

export function usePrompt(id: string) {
  return useQuery({
    queryKey: ['prompt', id],
    queryFn: () => api.get<ApiResponse<PromptDetail>>(`/prompts/${id}`),
    enabled: !!id,
  });
}

export function useCreatePrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { body_original: string; project_id?: string }) =>
      api.post('/prompts', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompts'] }),
  });
}

// ... updatePrompt, deletePrompt mutations
```

**Verification:**
```bash
cd apps/web && bunx tsc --noEmit
```

---

## Phase 6: Frontend Layout

**Depends on:** Phase 5

### T6.1 — Shell Layout (3-panel)

**File:** `apps/web/src/routes/layout.tsx`, `apps/web/src/components/layout/shell.tsx`

Uses `react-resizable-panels` with PanelGroup, Panel, PanelResizeHandle.

**Verification:** App renders with 3 panels, resizable, left/right collapsible.

### T6.2 — Top Bar

**File:** `apps/web/src/components/layout/top-bar.tsx`

Logo, search input (triggers cmdk), theme toggle, settings gear.

**Verification:** Top bar renders, Cmd+K opens command palette.

### T6.3 — Sidebar Left

**File:** `apps/web/src/components/layout/sidebar-left.tsx`

Navigation links (Dashboard, Inbox, All, Favorites, Pinned, Recent), Saved Searches list, Quality Band counts, Quick stats.

**Verification:** Navigation works, links route correctly.

### T6.4 — Sidebar Right

**File:** `apps/web/src/components/layout/sidebar-right.tsx`

Project tree, Category tree, Tag cloud, Quick stats for active filter.

**Verification:** Trees render, clicking filters the prompt list.

### T6.5 — Status Bar

**File:** `apps/web/src/components/layout/status-bar.tsx`

Prompt count, pipeline status, DB status.

**Verification:** Status bar renders at bottom.

### T6.6 — Command Palette

**File:** `apps/web/src/components/shared/command-palette.tsx`

Uses `cmdk`. Sections: Recent, Actions, Quick Filters.

**Verification:** Cmd+K opens, typing filters, selecting navigates.

### T6.7 — Keyboard Shortcuts

**File:** `apps/web/src/hooks/use-keyboard.ts`, `apps/web/src/components/shared/keyboard-shortcuts.tsx`

Register all shortcuts from design spec. `?` shows help dialog.

**Verification:** Each shortcut triggers its action.

---

## Phase 7: Frontend Features (parallelizable)

**Depends on:** Phase 6

### Parallel Group 7A: T7.1 + T7.2 + T7.6 + T7.7

Card components, score visualization, diff viewer — no dependencies between them.

### T7.1 — Prompt Card (Grid)

**File:** `apps/web/src/components/prompt/prompt-card.tsx`

Checkbox, star, pin, band badge, score, title, abstract, tags, project, category, dates, micro score bar. Framer Motion hover lift.

**Verification:** Card renders with mock data, hover animation works.

### T7.2 — Prompt Row (List)

**File:** `apps/web/src/components/prompt/prompt-row.tsx`

Compact row variant of the card.

**Verification:** Row renders, same data as card.

### T7.6 — Score Visualization

**Files:**
- `apps/web/src/components/prompt/score-bars.tsx`
- `apps/web/src/components/prompt/score-radar.tsx`
- `apps/web/src/components/prompt/score-badge.tsx`

Score bars: 10 horizontal animated bars (Framer Motion, stagger 50ms).
Score radar: Recharts RadarChart with 10 dimensions.
Score badge: Colored badge A/B/C/D.

**Verification:** Components render with sample scores, animations play.

### T7.7 — Diff Viewer

**File:** `apps/web/src/components/prompt/diff-viewer.tsx`

Uses `computeDiff` from shared/utils. Toggle unified/split view. Green/red line highlights.

**Verification:** Diff renders with two different texts.

### Parallel Group 7B: T7.3 + T7.11 + T7.12 + T7.14

Prompts page, dashboard, search bar, taxonomy trees.

### T7.3 — Prompts List Page

**File:** `apps/web/src/routes/prompts.tsx`

Filter bar + grid/list toggle + prompt cards/rows + pagination + "select all" + bulk bar trigger.

**Verification:** Page loads prompts from API, filter changes results, grid/list toggles.

### T7.11 — Dashboard Page

**File:** `apps/web/src/routes/dashboard.tsx`

KPI cards (6), charts (Recharts), widgets (recent, needs-review, top quality).

**Verification:** Dashboard loads stats from API, charts render.

### T7.12 — Search Bar + Autocomplete

**File:** `apps/web/src/components/search/search-bar.tsx`, `apps/web/src/components/search/autocomplete.tsx`

Input with DSL highlighting, autocomplete dropdown with suggestions.

**Verification:** Typing `project:` shows project list, free text triggers search.

### T7.14 — Taxonomy Trees + Tag Cloud

**Files:**
- `apps/web/src/components/taxonomy/project-tree.tsx`
- `apps/web/src/components/taxonomy/category-tree.tsx`
- `apps/web/src/components/taxonomy/tag-cloud.tsx`

Recursive tree components. Click = filter. Counts per node.

**Verification:** Trees render from API data, clicking filters prompts.

### Parallel Group 7C: T7.4 + T7.10 + T7.15 + T7.16

Detail page, bulk actions, saved searches, notes.

### T7.4 — Prompt Detail Page

**File:** `apps/web/src/routes/prompt-detail.tsx`

Full detail view with all sections: header, body (Monaco), AI review, improved version, versions, similar, notes.

**Verification:** Page loads full prompt detail, all sections render, copy button works.

### T7.10 — Bulk Actions Bar

**File:** `apps/web/src/components/bulk/bulk-bar.tsx`, `apps/web/src/components/bulk/delete-confirm.tsx`

Fixed bottom bar when selection.count > 0. Spring slide-up animation. Delete requires typing "delete".

**Verification:** Select cards, bar appears, actions call API, delete shows confirm.

### T7.15 — Saved Searches

**File:** `apps/web/src/components/search/saved-search-list.tsx`

List in left sidebar, pin/unpin, click applies filters.

**Verification:** Saved searches load, clicking applies filters.

### T7.16 — Notes

**File:** `apps/web/src/components/prompt/notes.tsx` (within prompt detail)

Add, edit, delete notes.

**Verification:** CRUD on notes within prompt detail works.

### Remaining: T7.5 + T7.8 + T7.9 + T7.13 + T7.17 + T7.18 + T7.19

### T7.5 — Prompt Form (Create/Edit)

**File:** `apps/web/src/components/prompt/prompt-form.tsx`

Monaco editor for body, project/category selects, tag multi-select, language auto-detect.

### T7.8 — Version List

**File:** `apps/web/src/components/prompt/version-list.tsx`

List versions, view body, apply version.

### T7.9 — Similar Prompts List

**File:** `apps/web/src/components/prompt/similar-list.tsx`

Compact cards with similarity percentage.

### T7.13 — Filter Bar

**File:** `apps/web/src/components/search/filter-bar.tsx`

Dropdown selects for project, band, tags, date, sort. Grid/list toggle.

### T7.17 — API Keys Page

**File:** `apps/web/src/routes/api-keys.tsx`

Generate, list, revoke API keys. Key shown once on create.

### T7.18 — Settings Page

**File:** `apps/web/src/routes/settings.tsx`

Theme, density, default project, default view mode.

### T7.19 — New Prompt Page

**File:** `apps/web/src/routes/prompt-new.tsx`

Uses prompt-form. On submit: create + navigate to detail.

**Verification for all T7.*:**
```bash
cd apps/web && bunx tsc --noEmit && bun run build
# All pages load in browser without errors
```

---

## Phase 8: Claude CLI Plugin (parallel with Phase 1+)

**Depends on:** Phase 0 (only needs API spec knowledge)

### T8.1 — Plugin Structure

**Files to create:**
- `plugins/everprompt-capture/plugin.json`
- `plugins/everprompt-capture/hooks/capture-prompt.sh`
- `plugins/everprompt-capture/commands/ep-config.md`
- `plugins/everprompt-capture/settings.local.md`
- `plugins/everprompt-capture/README.md`

All file contents are specified in the design spec Section 7.

**Verification:**
```bash
# Validate plugin.json is valid JSON
cat plugins/everprompt-capture/plugin.json | jq .
# Verify hook script is executable
bash -n plugins/everprompt-capture/hooks/capture-prompt.sh && echo "Script syntax OK"
```

---

## Phase 9: Integration & Polish

**Depends on:** ALL previous phases

### T9.1 — End-to-End Flow Test

1. Create prompt via API -> verify in D1
2. Pipeline runs -> verify title/tags/score populated
3. Search by keyword -> returns result
4. Search by semantics -> returns result
5. Open detail -> all sections render
6. Improve prompt -> diff shows
7. Bulk select + delete -> prompts soft-deleted
8. Dashboard -> stats reflect data
9. Plugin ingest -> prompt appears in inbox

**Verification:** All 9 checks pass.

### T9.2 — Seed Script

**File:** `tools/seed.ts`

Create 3 projects, 5 categories, 10 tags, 20 sample prompts with varied scores.

**Verification:**
```bash
bun run tools/seed.ts && curl http://localhost:8787/api/v1/dashboard/stats | jq .data.total_prompts
# Expected: 20
```

### T9.3 — Loading States

Add skeleton loading components to all pages that fetch data.

**Verification:** Throttle network in DevTools, verify skeletons show.

### T9.4 — Empty States

Add empty state illustrations/messages when:
- No prompts
- No search results
- No saved searches
- Empty inbox
- No notes

**Verification:** Delete all data, verify empty states render.

### T9.5 — Error States

Global error boundary. Per-component error fallback. Toast on mutation failure.

**Verification:** Simulate API error, verify toast and fallback render.

### T9.6 — Dark/Light Theme

Verify all components render correctly in both themes.

**Verification:** Toggle theme, screenshot compare.

### T9.7 — Build + Deploy

```bash
bun run build
wrangler d1 create everprompt-db
wrangler d1 migrations apply everprompt-db --remote
wrangler vectorize create everprompt-prompts --dimensions=768 --metric=cosine
wrangler r2 bucket create everprompt-assets
wrangler kv namespace create everprompt-kv
# Update wrangler.jsonc with real IDs
wrangler secret put CLAUDE_API_KEY
wrangler deploy
```

**Verification:**
```bash
curl https://everprompt.yourdomain.com/api/v1/dashboard/stats | jq .ok
# Expected: true
```

---

## Final Verification Checklist

- [ ] `bun install` succeeds at root
- [ ] `bun run build` succeeds (all packages + apps)
- [ ] `bunx tsc --noEmit` passes for all packages
- [ ] D1 migrations apply without error
- [ ] API starts with `wrangler dev`
- [ ] Frontend starts with `vite dev`
- [ ] Create prompt -> AI pipeline completes (ai_status: complete)
- [ ] Prompt has title, abstract, tags, scores, improved version
- [ ] Search by keyword returns results
- [ ] Semantic search returns results
- [ ] Grid/list view toggle works
- [ ] Bulk select + actions work
- [ ] Delete with confirmation works
- [ ] Dashboard shows correct stats and charts
- [ ] Saved searches CRUD works
- [ ] API keys generation + auth works
- [ ] Plugin capture-prompt.sh sends to /ingest successfully
- [ ] Dark/light theme works
- [ ] Command palette opens and navigates
- [ ] Keyboard shortcuts work
- [ ] All pages have loading skeletons
- [ ] All pages have empty states
- [ ] Error boundary catches failures
- [ ] `wrangler deploy` succeeds
- [ ] Production URL responds with 200
