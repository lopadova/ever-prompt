# EverPrompt — Design Specification

**Prompt Intelligence System**

> Non una notes app con AI. Un sistema che trasforma ogni prompt in un asset versionato, valutabile, migliorabile e recuperabile semanticamente.

**Date**: 2026-03-31
**Status**: Approved
**Version**: 1.0

---

## Table of Contents

1. [Identity & Stack](#1-identity--stack)
2. [Data Model](#2-data-model)
3. [AI Pipeline & Orchestration](#3-ai-pipeline--orchestration)
4. [Search System](#4-search-system)
5. [API Design](#5-api-design)
6. [UI/UX Design](#6-uiux-design)
7. [Claude CLI Plugin](#7-claude-cli-plugin)
8. [Project Structure & Deployment](#8-project-structure--deployment)
9. [Versioning Roadmap](#9-versioning-roadmap)

---

## 1. Identity & Stack

**Name**: EverPrompt
**Tagline**: Your prompts, forever better.

Three souls in one product:

- **Intelligent archive** — store, organize, find prompts
- **AI critic** — score, judge, improve prompts automatically
- **Semantic retrieval engine** — find prompts by meaning, not just keywords

### Technology Stack

| Layer | Technology | Role |
|-------|-----------|-------|
| Frontend | React 19 + TypeScript + Vite | SPA |
| Routing | React Router v7 | Client-side routing |
| State | Zustand (UI) + TanStack Query v5 (server) | State management |
| UI Kit | shadcn/ui + Radix + Tailwind CSS v4 | Component system |
| Animations | Framer Motion | Micro-interactions, transitions |
| Charts | Recharts | Dashboard metrics |
| Layout | react-resizable-panels | Resizable panels |
| Command | cmdk | Command palette |
| Editor | Monaco Editor | Prompt body editing |
| Table | TanStack Table v8 | List/table view |
| Notifications | Sonner | Toast notifications |
| Icons | Lucide React | Consistent iconography |
| Backend | Hono + Zod | API framework |
| ORM | Drizzle ORM | Type-safe SQL |
| Runtime (prod) | Cloudflare Workers | Edge compute |
| Runtime (dev) | Bun | Dev server + tooling |
| DB | Cloudflare D1 (SQLite) | Source of truth |
| Search | Cloudflare Vectorize | Semantic search |
| Embeddings | Workers AI (`bge-base-en-v1.5`) | Vector generation |
| AI Analysis | Claude API (Haiku + Sonnet) | Scoring, judgment, improvement |
| Object Store | Cloudflare R2 | Attachments, exports |
| Cache | Cloudflare KV | Cache facets, dashboard |
| Queue | Cloudflare Queues | Async AI pipeline |
| Auth | Cloudflare Zero Trust | Access protection |
| Plugin | Claude CLI Plugin (hook) | Prompt capture |

### Design Decisions

- **D1 as source of truth**: consistent, SQL, PITR 30 days. KV is eventual-consistent so never used for core data.
- **Vectorize for semantic search**: native CF, metadata filtering, no external vector DB needed.
- **Claude API hybrid**: Haiku for fast classification (cheap), Sonnet for quality analysis (accurate). Workers AI only for embeddings.
- **No RAG on R2**: prompts are short/medium text, directly embeddable. R2 is only for attachments/exports/snapshots.
- **Queues for async pipeline**: non-blocking UX, automatic retries, no Durable Objects complexity.

---

## 2. Data Model

### Entity Relationship

```
projects --1:N-- prompts --1:N-- prompt_versions
                    |--1:N-- prompt_ai_reviews
                    |--1:N-- prompt_embeddings
                    |--M:N-- tags (via prompt_tags)
                    |--1:N-- notes
                    |--N:1-- categories

saved_searches (standalone)
api_keys (standalone)
activity_log (standalone)
```

### Tables

#### projects

| Field | Type | Notes |
|-------|------|-------|
| id | TEXT PK | ULID |
| name | TEXT NOT NULL | |
| slug | TEXT UNIQUE | URL-safe |
| color | TEXT | Hex color for UI |
| icon | TEXT | Lucide icon name |
| description | TEXT | |
| prompt_count | INTEGER DEFAULT 0 | Counter cache |
| created_at | TEXT | ISO 8601 |
| updated_at | TEXT | ISO 8601 |

#### categories

| Field | Type | Notes |
|-------|------|-------|
| id | TEXT PK | ULID |
| name | TEXT NOT NULL | |
| slug | TEXT UNIQUE | |
| parent_id | TEXT FK nullable | Self-ref for tree |
| sort_order | INTEGER DEFAULT 0 | UI ordering |
| color | TEXT | |
| icon | TEXT | |
| prompt_count | INTEGER DEFAULT 0 | |

#### tags

| Field | Type | Notes |
|-------|------|-------|
| id | TEXT PK | ULID |
| name | TEXT UNIQUE | |
| slug | TEXT UNIQUE | |
| kind | TEXT | `topic`, `model`, `tone`, `task`, `quality`, `domain`, `language`, `technique` |
| color | TEXT | |
| usage_count | INTEGER DEFAULT 0 | Counter cache |
| is_ai_generated | INTEGER DEFAULT 0 | Boolean |
| created_at | TEXT | |

#### prompts (central table)

| Field | Type | Notes |
|-------|------|-------|
| id | TEXT PK | ULID |
| project_id | TEXT FK nullable | |
| category_id | TEXT FK nullable | |
| title | TEXT | AI-generated or manual |
| abstract | TEXT | AI-generated, 1-2 sentences |
| body_original | TEXT NOT NULL | Prompt as written |
| body_normalized | TEXT | Trimmed, cleaned |
| language | TEXT | `en`, `it`, etc. |
| source | TEXT DEFAULT 'manual' | `manual`, `import`, `plugin`, `api`, `extension` |
| status | TEXT DEFAULT 'inbox' | `inbox`, `active`, `archived`, `deleted` |
| quality_band | TEXT | `A`, `B`, `C`, `D` from AI review |
| overall_score | REAL | 0-100, from latest AI review |
| is_favorite | INTEGER DEFAULT 0 | |
| is_pinned | INTEGER DEFAULT 0 | |
| has_improved_version | INTEGER DEFAULT 0 | Quick flag |
| hash_sha256 | TEXT | Exact dedup |
| fingerprint | TEXT | Soft dedup (normalized hash) |
| word_count | INTEGER | |
| char_count | INTEGER | |
| ai_status | TEXT DEFAULT 'pending' | `pending`, `analyzing`, `complete`, `partial`, `failed_classify`, `failed_score`, `failed_embed` |
| search_text | TEXT | Denormalized: title + abstract + body_normalized + tag names (for LIKE search) |
| ai_analyzed_at | TEXT nullable | |
| last_used_at | TEXT nullable | |
| created_at | TEXT | |
| updated_at | TEXT | |

#### prompt_tags (M:N)

| Field | Type | Notes |
|-------|------|-------|
| prompt_id | TEXT FK | Composite PK |
| tag_id | TEXT FK | Composite PK |
| confidence | REAL | 0.0-1.0 if AI-assigned |
| origin | TEXT | `ai`, `manual`, `rule` |

#### prompt_versions

| Field | Type | Notes |
|-------|------|-------|
| id | TEXT PK | ULID |
| prompt_id | TEXT FK | |
| version_no | INTEGER | Auto-increment per prompt |
| body | TEXT NOT NULL | |
| kind | TEXT | `original`, `edited`, `improved_ai`, `snapshot` |
| diff_from_previous | TEXT nullable | Text diff |
| created_at | TEXT | |

#### prompt_ai_reviews

| Field | Type | Notes |
|-------|------|-------|
| id | TEXT PK | ULID |
| prompt_id | TEXT FK | |
| overall_score | REAL | 0-100 |
| clarity_score | REAL | 0-100 |
| context_score | REAL | 0-100 |
| specificity_score | REAL | 0-100 |
| structure_score | REAL | 0-100 |
| reusability_score | REAL | 0-100 |
| actionability_score | REAL | 0-100 |
| evaluation_score | REAL | 0-100 |
| safety_score | REAL | 0-100 |
| compression_score | REAL | 0-100 |
| toolability_score | REAL | 0-100 |
| quality_band | TEXT | `A`/`B`/`C`/`D` |
| short_verdict | TEXT | One sentence |
| justification_md | TEXT | Markdown |
| strengths_md | TEXT | |
| weaknesses_md | TEXT | |
| improved_prompt_md | TEXT | Rewritten prompt |
| improvement_diff | TEXT | Diff original vs improved |
| recommended_actions | TEXT | JSON array |
| model_name | TEXT | `claude-haiku-4-5`, `claude-sonnet-4-6` |
| created_at | TEXT | |

#### prompt_embeddings

| Field | Type | Notes |
|-------|------|-------|
| prompt_id | TEXT PK | |
| vector_id | TEXT NOT NULL | ID in Vectorize |
| embedding_model | TEXT | `bge-base-en-v1.5` |
| embedded_text_hash | TEXT | For re-embed detection |
| updated_at | TEXT | |

#### saved_searches

| Field | Type | Notes |
|-------|------|-------|
| id | TEXT PK | ULID |
| name | TEXT | |
| query_text | TEXT | |
| filters_json | TEXT | Structured JSON |
| sort_json | TEXT | |
| is_pinned | INTEGER DEFAULT 0 | |
| result_count | INTEGER | Last known count |
| last_run_at | TEXT | |
| created_at | TEXT | |

#### notes

| Field | Type | Notes |
|-------|------|-------|
| id | TEXT PK | ULID |
| prompt_id | TEXT FK nullable | |
| body | TEXT | |
| created_at | TEXT | |
| updated_at | TEXT | |

#### api_keys

| Field | Type | Notes |
|-------|------|-------|
| id | TEXT PK | ULID |
| name | TEXT | Label ("Claude CLI", "Browser Ext") |
| key_hash | TEXT | SHA-256 of API key |
| key_prefix | TEXT | First 8 chars for display `ep_abc1...` |
| permissions | TEXT | JSON: `["ingest", "read", "write"]` |
| default_project_id | TEXT FK nullable | Default project for ingest |
| last_used_at | TEXT nullable | |
| expires_at | TEXT nullable | |
| is_active | INTEGER DEFAULT 1 | |
| created_at | TEXT | |

#### activity_log

| Field | Type | Notes |
|-------|------|-------|
| id | TEXT PK | ULID |
| entity_type | TEXT | `prompt`, `project`, `tag`, etc. |
| entity_id | TEXT | |
| action | TEXT | `created`, `analyzed`, `improved`, `deleted`, `tagged`, `moved` |
| payload_json | TEXT nullable | Extra details |
| created_at | TEXT | |

### Key Indexes

```sql
CREATE INDEX idx_prompts_project ON prompts(project_id, status, created_at DESC);
CREATE INDEX idx_prompts_category ON prompts(category_id, status);
CREATE INDEX idx_prompts_status ON prompts(status, created_at DESC);
CREATE INDEX idx_prompts_quality ON prompts(quality_band, overall_score DESC);
CREATE INDEX idx_prompts_hash ON prompts(hash_sha256);
CREATE INDEX idx_prompts_fingerprint ON prompts(fingerprint);
CREATE INDEX idx_prompts_favorite ON prompts(is_favorite, updated_at DESC);
CREATE INDEX idx_prompt_tags_tag ON prompt_tags(tag_id);
CREATE INDEX idx_versions_prompt ON prompt_versions(prompt_id, version_no DESC);
CREATE INDEX idx_reviews_prompt ON prompt_ai_reviews(prompt_id, created_at DESC);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_activity_date ON activity_log(created_at DESC);
```

### Vectorize Index

- **Index name**: `everprompt-prompts`
- **Vector dimensions**: 768 (from `bge-base-en-v1.5`)
- **Filterable metadata**: `project_id`, `category_id`, `quality_band`, `status`, `language`, `is_favorite`
- **Embedded text**: `title + " | " + abstract + " | " + body_normalized` (truncated to 512 tokens)

---

## 3. AI Pipeline & Orchestration

### Flow: Ingest to Analysis

```
User/Plugin          Workers API           Queue             AI Worker
    |                     |                  |                    |
    |-- POST /prompts --->|                  |                    |
    |                     |-- Save D1 ------>|                    |
    |                     |   status: inbox  |                    |
    |                     |-- Enqueue ------>|                    |
    |  <-- 201 {id} ------|                  |                    |
    |                     |                  |-- Dequeue -------->|
    |                     |                  |    Step A: Normalize
    |                     |                  |    Step B: Classify
    |                     |                  |    Step C: Score
    |                     |                  |    Step D: Embed
    |                     |                  |    Step E: Post-proc
    |                     |  <-- Update D1 ----------------------|
    |                     |      Update Vectorize ---------------|
    |                     |      Invalidate KV ------------------|
    |  <-- refetch -------|                  |                    |
    |     (polling 3s)    |                  |                    |
```

### Step A — Normalization (in-worker, no AI)

Deterministic, fast operations:
- Trim whitespace, normalize newlines
- Language detection (lightweight library `tinyld`)
- Word/character count
- SHA-256 hash of original body -> `hash_sha256`
- Soft fingerprint: lowercase + strip punctuation + hash -> `fingerprint`
- Dedup check: query D1 for exact hash and fingerprint
  - Exact duplicate: flag, link to original prompt, skip analysis
  - Near-duplicate: flag but proceed with analysis

### Step B — Classification (Claude Haiku)

Single prompt to Haiku with structured output (JSON mode):

**Input**: `body_normalized` + `language`

**Output**:
```json
{
  "title": "Concise title 5-10 words",
  "abstract": "1-2 sentences describing the prompt's purpose",
  "category_suggestion": "suggested category name",
  "tags": [
    {"name": "architecture", "kind": "topic", "confidence": 0.95},
    {"name": "claude", "kind": "model", "confidence": 0.88},
    {"name": "formal", "kind": "tone", "confidence": 0.72}
  ],
  "detected_intent": "code_generation | analysis | writing | brainstorming | debugging | planning | other",
  "complexity": "simple | moderate | complex | expert"
}
```

Estimated cost: ~0.1-0.3 cents per prompt.

### Step C — Scoring & Judgment (Claude Sonnet)

Structured prompt to Sonnet with 10-dimension rubric:

**Input**: `body_original` + `title` + `abstract` + `tags` + `intent`

**Output**:
```json
{
  "scores": {
    "clarity": 84,
    "context": 91,
    "specificity": 76,
    "structure": 67,
    "reusability": 80,
    "actionability": 88,
    "evaluation_readiness": 42,
    "safety": 95,
    "compression": 73,
    "toolability": 69
  },
  "overall_score": 76.5,
  "quality_band": "B",
  "short_verdict": "Good architecture prompt, lacks verification criteria",
  "strengths": "- Rich technical context\n- Clear objective\n- Good section structure",
  "weaknesses": "- Does not define expected output\n- Missing success criteria\n- Preamble could be 40% shorter",
  "improved_prompt": "... complete rewritten prompt ...",
  "recommended_actions": [
    "Add 'Expected Output Format' section",
    "Define measurable verification criteria",
    "Reduce preamble by 40%"
  ]
}
```

**Overall score formula** (calibrated weights):

| Dimension | Weight | Rationale |
|-----------|--------|-----------|
| clarity | 0.15 | Foundational |
| context | 0.12 | |
| specificity | 0.13 | |
| structure | 0.10 | |
| reusability | 0.08 | |
| actionability | 0.15 | Second most important |
| evaluation_readiness | 0.10 | |
| safety | 0.05 | Rarely differentiating |
| compression | 0.05 | |
| toolability | 0.07 | |

**Quality bands**:
- **A** (85-100): Excellent prompt, ready for direct use
- **B** (70-84): Good, improvable in specific areas
- **C** (50-69): Sufficient, needs revision
- **D** (0-49): Weak, rewrite recommended

Estimated cost: ~1-3 cents per prompt with Sonnet.

### Step D — Embedding (Workers AI)

- **Model**: `@cf/baai/bge-base-en-v1.5` (768 dimensions)
- **Input**: `title + " | " + abstract + " | " + body_normalized` (truncated to 512 tokens)
- **Output**: 768-dim vector -> Vectorize index
- **Metadata**: `project_id`, `category_id`, `quality_band`, `status`, `language`, `is_favorite`

### Step E — Post-processing (in-worker)

- Create/associate tags in D1 (upsert by slug)
- Create/associate category (upsert, AI suggestion)
- Update `prompt_count` on project/category/tags
- Save `prompt_ai_reviews` record
- Save `prompt_versions` with kind `original`
- If improved_prompt present: save version with kind `improved_ai`, set `has_improved_version = 1`
- Generate diff original vs improved
- Update prompt status: `inbox` -> `active` (or stay `inbox` if source=plugin, user confirms)
- Log in `activity_log`
- Invalidate KV cache: dashboard stats, project/category facets

### Retry & Error Handling

- Queue auto-retry: 3 attempts with exponential backoff
- Step B failure: prompt saved without AI title/tags, flag `ai_status: failed_classify`
- Step C failure: classified but not scored, flag `ai_status: failed_score`
- Step D failure: no semantic search for that prompt, flag `ai_status: failed_embed`
- UI shows pipeline status: `pending` -> `analyzing` -> `complete` / `partial` / `failed`
- "Retry analysis" button in prompt detail

### Re-analysis on Edit

When user edits prompt body:
- New version in `prompt_versions` kind `edited`
- Re-enqueue full pipeline
- Old review stays in history, new review replaces as "current"
- Re-embed with new vector

### "Improve Prompt" Flow

1. If `improved_prompt_md` already present from review -> show it
2. If user wants to re-generate -> call Sonnet with improvement focus
3. Show diff side-by-side: original vs improved
4. Actions: "Apply as new version" / "Copy" / "Discard"
5. If applied -> new `prompt_versions` kind `improved_ai` -> re-trigger pipeline

---

## 4. Search System

### Three Layers Combined

**Layer 1 — Structured Filters (D1)**

Direct SQL queries for exact filters:
- Project, category, tag (AND/OR)
- Status, quality_band, score range
- Dates (created, updated, analyzed)
- Flags: favorite, pinned, has_improved_version
- Source: manual, plugin, import
- Language

**Layer 2 — Full-text Keyword (D1)**

- `LIKE` with indexes on `title`, `abstract` for short queries
- Denormalized `search_text` column (title + abstract + body_normalized + tag names) with `LIKE %term%`
- Acceptable for volumes < 50K prompts

**Layer 3 — Semantic Search (Vectorize)**

- Query text -> embedding via Workers AI -> Vectorize topK query
- Inline metadata filter: `{ project_id: "xxx", quality_band: { $in: ["A", "B"] } }`
- TopK = 50, then re-ranking

### Hybrid Search Merge

```
Parse query -> extract operators + free text
                    |
        +-----------+-----------+
        |                       |
   D1 SQL filters          Vectorize semantic
   + LIKE keyword          topK=50 with metadata
        |                       |
        +-----------+-----------+
                    |
            Merge + Re-rank
            final = sum(
              semantic * 0.45
              keyword  * 0.25
              quality  * 0.15
              recency  * 0.10
              exact_filter_bonus
            )
                    |
            Deduplicate + Paginate
```

### Query Language (mini-DSL)

| Operator | Example | Meaning |
|----------|---------|---------|
| `project:` | `project:backend` | Filter by project |
| `tag:` | `tag:architecture` | Filter by tag |
| `cat:` | `cat:engineering` | Filter by category |
| `score>` `score<` | `score>80` | Score range |
| `band:` | `band:A` | Quality band |
| `lang:` | `lang:it` | Language |
| `source:` | `source:plugin` | Source |
| `status:` | `status:inbox` | Status |
| `has:` | `has:improved` | Flag |
| `is:` | `is:favorite` `is:pinned` | Flag |
| `created:` | `created:last30d` `created:2025-03` | Date range |
| `updated:` | `updated:thisweek` | Date range |
| free text | `analisi architettura` | Semantic + keyword |

Composite example:
```
project:backend tag:architecture score>75 created:last30d microservizi scalabili
```

### Autocomplete

- Live suggestions during typing:
  - After `project:` -> project list
  - After `tag:` -> tag list (sorted by usage_count)
  - After `cat:` -> category list
  - Free text -> last 5 prompts with matching title + 3 matching saved searches
- Powered by KV cache for facets + D1 for lookup

### Saved Searches

- Save query + filters + sort as "view"
- Appears in left sidebar under "Saved Searches"
- Badge with periodically updated result count
- Click -> apply filters instantly
- Pin to keep at top

### Similar Prompts

In prompt detail, "Related" section:
- Query Vectorize with current prompt embedding
- TopK=10, exclude self
- Show compact cards with similarity score

---

## 5. API Design

### Base URL: `/api/v1`

### Prompt CRUD

```
POST   /prompts                → Create prompt (+ enqueue pipeline)
GET    /prompts                → List (paginated, filtered, sorted)
GET    /prompts/:id            → Full detail (with review, tags, versions)
PATCH  /prompts/:id            → Update (body, project, category, manual tags)
DELETE /prompts/:id            → Soft delete (status -> deleted)
POST   /prompts/ingest         → Ingest from plugin/API (API key auth)
```

### Bulk Operations

```
POST   /prompts/bulk/tag       → Add/remove tags on N prompts
POST   /prompts/bulk/move      → Change project/category on N prompts
POST   /prompts/bulk/delete    → Soft delete N prompts (requires confirm: true)
POST   /prompts/bulk/reanalyze → Re-trigger AI pipeline on N prompts
POST   /prompts/bulk/archive   → Archive N prompts
POST   /prompts/bulk/favorite  → Toggle favorite on N prompts
```

All accept `{ prompt_ids: string[] }` + specific action payload.

### Search

```
POST   /search                 → Hybrid search (body: query + filters + sort + pagination)
GET    /search/suggest         → Autocomplete (query param: q)
GET    /search/facets          → Current facets (counts per project, category, tag, band)
```

### AI Operations

```
POST   /prompts/:id/analyze   → Trigger/re-trigger full pipeline
POST   /prompts/:id/improve   → Generate new improved version
GET    /prompts/:id/review     → Latest AI review
GET    /prompts/:id/reviews    → Review history
GET    /prompts/:id/similar    → Similar prompts via Vectorize
```

### Versions

```
GET    /prompts/:id/versions           → List versions
POST   /prompts/:id/versions           → Create manual version
GET    /prompts/:id/versions/:vid      → Version detail
POST   /prompts/:id/versions/:vid/apply → Apply version as current body
```

### Taxonomy

```
GET    /projects               → List projects
POST   /projects               → Create
PATCH  /projects/:id           → Update
DELETE /projects/:id           → Delete (only if 0 prompts)

GET    /categories             → Flat list
GET    /categories/tree        → Hierarchical tree
POST   /categories             → Create
PATCH  /categories/:id         → Update
DELETE /categories/:id         → Delete

GET    /tags                   → List (sorted by usage_count)
POST   /tags                   → Create manual
PATCH  /tags/:id               → Update
DELETE /tags/:id               → Delete
POST   /tags/merge             → Merge two tags into one
```

### Dashboard

```
GET    /dashboard/stats             → Main KPIs
GET    /dashboard/charts/creation   → Prompts per week/month
GET    /dashboard/charts/quality    → Score/band distribution
GET    /dashboard/charts/tags       → Top tags
GET    /dashboard/charts/projects   → Usage by project
GET    /dashboard/recent            → Last 10 prompts
GET    /dashboard/needs-review      → Inbox/failed/low-score prompts
```

### Saved Searches

```
GET    /saved-searches         → List
POST   /saved-searches         → Create
PATCH  /saved-searches/:id     → Update
DELETE /saved-searches/:id     → Delete
```

### Notes

```
GET    /prompts/:id/notes      → Prompt notes
POST   /prompts/:id/notes      → Add note
PATCH  /notes/:id              → Update
DELETE /notes/:id              → Delete
```

### API Keys

```
GET    /api-keys               → List (no key visible, only prefix)
POST   /api-keys               → Generate new (returns key ONCE)
PATCH  /api-keys/:id           → Update name/permissions/active
DELETE /api-keys/:id           → Revoke
```

### Settings

```
GET    /settings               → User preferences (view mode, theme, default project...)
PATCH  /settings               → Update
```

### Standard Response Format

Success:
```json
{
  "ok": true,
  "data": { ... },
  "meta": {
    "total": 342,
    "page": 1,
    "per_page": 24,
    "has_more": true
  }
}
```

Error:
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "body_original is required",
    "details": [...]
  }
}
```

### Auth Flow

- **Browser**: Cloudflare Zero Trust -> header `CF-Access-JWT-Assertion` -> validated by worker
- **Plugin/API**: header `Authorization: Bearer ep_xxxxx` -> lookup `api_keys`, verify hash, check permissions

Middleware chain:
```
authMiddleware -> ZeroTrust JWT || API Key -> inject user context -> next()
```

---

## 6. UI/UX Design

### Design System

**Philosophy**: Dark-first, high density, editorial feel. Inspiration: Linear + Notion + Raycast.

| Aspect | Choice |
|--------|--------|
| Theme | Dark default + light mode toggle |
| Font | Inter (UI) + JetBrains Mono (code/prompt body) |
| Dark palette | bg `#09090b` (zinc-950), surface `#18181b` (zinc-900), border `#27272a` (zinc-800), accent `#6366f1` (indigo-500) |
| Light palette | bg `#fafafa`, surface `#ffffff`, border `#e4e4e7`, accent `#4f46e5` |
| Border radius | 8px cards, 6px inputs, 12px modals |
| Spacing | 4px grid, Tailwind scale |
| Density | Compact default, toggle comfortable |
| Animations | Framer Motion: 150ms ease-out transitions, spring for modals, layout animation for lists |

### Main Layout — Shell

Hybrid approach: panel-based for main views, page-based for dashboard/settings.

```
+-------------------------------------------------------------------+
| Top Bar (h-12)                                                     |
| [logo] EverPrompt    [Search or type /...]         Cmd+K  Moon Gear|
+------------+--------------------------------------+----------------+
|            |                                      |                |
| Sidebar L  |         Main Content Area            |  Sidebar R     |
| (w-56      |                                      |  (w-72         |
| resizable  |  Filter Bar                          |  resizable     |
| collapsible|  [project][band][tags][date][sort]   |  toggle)       |
|            |  [Grid/List toggle]                   |                |
| Navigation |                                      | BROWSE         |
| - Dashboard|  Card Grid or List View              |  Projects tree |
| - Inbox    |  (paginated, virtual scroll)          |  Categories    |
| - All      |                                      |  Tags cloud    |
| - Favorites|                                      |                |
| - Pinned   |                                      | QUICK STATS    |
| - Recent   |                                      |  Filter count  |
|            |                                      |  Avg score     |
| SAVED      |                                      |  Top tag       |
| - search1  |                                      |                |
| - search2  |                                      |                |
|            |                                      |                |
| QUALITY    |                                      |                |
| - A: 42    |                                      |                |
| - B: 87    |                                      |                |
| - C: 31    |                                      |                |
| - D: 12    |                                      |                |
|            |                                      |                |
| STATS      |                                      |                |
| 342 total  |                                      |                |
| 89% AI     |                                      |                |
+------------+--------------------------------------+----------------+
| Status Bar | 342 prompts | Pipeline: 2 analyzing | D1 ok          |
+-------------------------------------------------------------------+
```

### Prompt Card (Grid Mode)

```
+-------------------------------------+
| [ ] [star] [pin]          [B] [76]  |
|                                     |
| Architettura microservizi per       |
| sistema di pagamento                |
|                                     |
| Prompt per progettare un sistema    |
| di microservizi con event sourcing  |
|                                     |
| [architect] [microservice] [event]  |
|                                     |
| Project: Backend  Cat: Engineering  |
| Created: Mar 28   Updated: Mar 30  |
|                                     |
| [micro score bar - 10 dims visual]  |
+-------------------------------------+
```

### Prompt Card (List Mode)

```
+-------------------------------------------------------------------------+
| [ ] [star] | Title + abstract (truncated)  | Project | B 76 | tags...  |
|            |                               |         |      | dates    |
+-------------------------------------------------------------------------+
```

### Prompt Detail View

Opens as sheet sliding from right or dedicated page:

**Header**: Title, metadata (project, category, language, dates, source, status), tags

**Prompt Body**: Monaco editor (read-only, toggle edit), copy button, word/char/hash stats

**AI Quality Review**:
- Overall score bar with band badge
- Short verdict
- 10 dimension bars (animated on mount, stagger 50ms)
- Strengths section (markdown)
- Weaknesses section (markdown)
- Recommended actions (checklist)
- Model name + analysis date
- Re-analyze button

**Improved Version**:
- Diff view: original vs improved (toggle unified/split, green/red highlights)
- Copy button
- Apply as new version button
- Re-generate improvement button

**Versions**: List with kind, date, description, Apply/View buttons

**Similar Prompts**: Top 5-10 from Vectorize with similarity percentage

**Notes**: List with add/edit/delete

### Dashboard View

**Top KPI Cards** (6):
- Total prompts
- AI analyzed %
- Average score + band
- Created this month
- Duplicates found
- Prompts needing review

**Charts**:
- Creation per week (area chart)
- Score distribution (horizontal bar A/B/C/D)
- Top projects (horizontal bar)
- Quality trend over time (line chart)

**Widgets**:
- Recent prompts (compact list)
- Needs review (inbox count, failed, low-score)
- Top quality prompts (favorites/high score)

### Bulk Actions Bar

Appears when 1+ cards selected, slides up from bottom with spring animation:

```
+-------------------------------------------------------------------+
| [x] 5 selected | Tag | Move | Fav | Re-analyze | Delete | Close  |
+-------------------------------------------------------------------+
```

Delete shows confirmation modal requiring typing "delete" to confirm.

### Command Palette (cmdk)

`Cmd+K` / `Ctrl+K` everywhere:

- Recent prompts
- Actions: new prompt, search, go to dashboard, go to project, filter by tag, settings
- Quick filters: show favorites, show inbox, show needs improvement, show top quality

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette |
| `Cmd+N` | New prompt |
| `Cmd+F` | Focus search |
| `Cmd+/` | Toggle right sidebar |
| `Cmd+\` | Toggle left sidebar |
| `Cmd+Shift+C` | Copy prompt body |
| `G then D` | Go to Dashboard |
| `G then I` | Go to Inbox |
| `G then A` | Go to All prompts |
| `J` / `K` | Navigate up/down in list |
| `Enter` | Open selected prompt |
| `Esc` | Close detail / deselect |
| `X` | Toggle select card |
| `Cmd+A` | Select all visible |
| `S` | Toggle star/favorite |
| `P` | Toggle pin |
| `E` | Edit mode |
| `?` | Show shortcuts help |

### Micro-interactions (Framer Motion)

- Card hover: slight lift (translateY -2px) + border glow accent
- Card select: checkbox check with spring animation
- Panel open/close: layout animation with ease-out 200ms
- Score bars: animate from 0 to value on mount with stagger 50ms per bar
- Bulk bar: slide-up from bottom with spring
- Tab switch: crossfade 150ms
- Toast: slide-in from right + auto-dismiss with progress bar
- Modal: backdrop blur-in + scale spring from 0.95
- Tag pills: scale spring on add/remove
- Skeleton loading: shimmer gradient animation during AI analysis
- Status badge: pulse animation on "analyzing"

---

## 7. Claude CLI Plugin: `everprompt-capture`

### Plugin Structure

```
everprompt-capture/
  plugin.json              <- manifest
  hooks/
    capture-prompt.sh      <- hook script
  commands/
    ep-config.md           <- slash command /ep-config
  settings.local.md        <- user config (API key, project, filters)
  README.md
```

### plugin.json

```json
{
  "name": "everprompt-capture",
  "description": "Automatically captures prompts to EverPrompt inbox",
  "version": "1.0.0",
  "hooks": {
    "user-prompt-submit": [
      {
        "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/capture-prompt.sh",
        "timeout": 5000
      }
    ]
  },
  "commands": {
    "ep-config": {
      "description": "Configure EverPrompt capture settings",
      "file": "commands/ep-config.md"
    }
  }
}
```

### Hook Logic (capture-prompt.sh)

- Reads prompt from stdin (hook input)
- Parses settings from `settings.local.md` YAML frontmatter
- Guards: enabled? minimum length? excluded patterns?
- Sends `POST /api/v1/prompts/ingest` with API key (fire-and-forget, non-blocking)
- Prompt arrives in EverPrompt inbox, pipeline triggers in background

### settings.local.md

```yaml
---
enabled: true
api_url: https://everprompt.yourdomain.com
api_key: ep_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
default_project: backend
min_length: 50
exclude_patterns: /help /clear /config test hello
---
```

### /ep-config Command

Allows user to configure the plugin from within Claude CLI:
- Show current status
- Guide to generate API key on EverPrompt
- Set default project
- Set filters

### Capture Flow

```
User writes prompt in Claude CLI
  -> Hook user-prompt-submit fires
  -> capture-prompt.sh receives text
  -> Check: enabled? length ok? not excluded?
  -> POST /api/v1/prompts/ingest (fire & forget, async)
  -> EverPrompt: save in D1 status=inbox
  -> Queue: AI pipeline starts in background
  -> Prompt appears in EverPrompt Inbox with title/tags/score
  -> User sees it, confirms/organizes when ready
```

---

## 8. Project Structure & Deployment

### Monorepo Structure

```
everprompt/
  package.json                  <- workspace root (Bun)
  bun.lock
  turbo.json                    <- Turborepo for build/dev orchestration
  tsconfig.base.json            <- shared TS config
  wrangler.jsonc                <- Cloudflare Workers config
  .dev.vars                     <- local secrets (CLAUDE_API_KEY, etc.)
  drizzle.config.ts             <- Drizzle ORM config

  packages/
    shared/                     <- shared types, constants, utils
      src/
        types/
          prompt.ts             <- Prompt, PromptVersion, AIReview types
          search.ts             <- SearchQuery, SearchResult, Filters
          taxonomy.ts           <- Project, Category, Tag
          dashboard.ts          <- DashboardStats, ChartData
          api.ts                <- ApiResponse<T>, ApiError, PaginationMeta
        constants/
          scoring.ts            <- SCORE_WEIGHTS, QUALITY_BANDS, DIMENSIONS
          search.ts             <- OPERATORS, DEFAULT_SORT, MAX_PAGE_SIZE
          limits.ts             <- MAX_PROMPT_LENGTH, MAX_TAGS, etc.
        validation/
          prompt.schema.ts      <- Zod schemas
          search.schema.ts
          taxonomy.schema.ts
        utils/
          ulid.ts
          slug.ts
          hash.ts               <- SHA-256, soft fingerprint
          diff.ts               <- text diff utility
          query-parser.ts       <- parse search DSL

    db/                         <- Drizzle schema + migrations
      src/
        schema/
          prompts.ts
          taxonomy.ts
          reviews.ts
          versions.ts
          search.ts
          notes.ts
          api-keys.ts
          activity.ts
          index.ts              <- re-export all
        migrations/
          0001_initial.sql

  apps/
    api/                        <- Hono API (Cloudflare Worker)
      src/
        index.ts                <- Hono app entry, bindings type
        middleware/
          auth.ts               <- Zero Trust JWT + API Key validation
          error.ts              <- Global error handler
          cors.ts
        routes/
          prompts.ts            <- CRUD + ingest
          bulk.ts               <- Bulk operations
          search.ts             <- Hybrid search endpoint
          ai.ts                 <- Analyze, improve, re-embed
          taxonomy.ts           <- Projects, categories, tags
          dashboard.ts          <- Stats, charts data
          versions.ts           <- Prompt versions
          notes.ts
          api-keys.ts
          saved-searches.ts
          settings.ts
        services/
          prompt.service.ts
          search.service.ts
          taxonomy.service.ts
          dashboard.service.ts
          api-key.service.ts
        ai/
          pipeline.ts           <- Full pipeline orchestrator
          normalize.ts          <- Step A
          classify.ts           <- Step B: Haiku
          score.ts              <- Step C: Sonnet
          embed.ts              <- Step D: Workers AI
          postprocess.ts        <- Step E
          prompts/              <- System prompts for AI
            classify.txt
            score.txt
        queue/
          consumer.ts           <- Queue consumer
        lib/
          db.ts                 <- D1 helper + Drizzle instance
          vectorize.ts          <- Vectorize helper
          r2.ts                 <- R2 helper
          kv.ts                 <- KV cache helper
          claude.ts             <- Claude API client wrapper
          pagination.ts         <- Pagination helper

    web/                        <- React SPA
      vite.config.ts
      index.html
      src/
        main.tsx                <- React entry
        app.tsx                 <- Router + providers
        routes/
          layout.tsx            <- Shell: top bar + sidebars + main
          dashboard.tsx
          prompts.tsx           <- List/grid + filter bar
          prompt-detail.tsx
          prompt-new.tsx
          settings.tsx
          api-keys.tsx
        components/
          ui/                   <- shadcn/ui components
          layout/
            shell.tsx
            top-bar.tsx
            sidebar-left.tsx
            sidebar-right.tsx
            status-bar.tsx
          prompt/
            prompt-card.tsx
            prompt-row.tsx
            prompt-detail.tsx
            prompt-editor.tsx
            prompt-form.tsx
            score-radar.tsx
            score-bars.tsx
            score-badge.tsx
            diff-viewer.tsx
            version-list.tsx
            similar-list.tsx
          search/
            search-bar.tsx
            filter-bar.tsx
            autocomplete.tsx
            saved-search-list.tsx
            facets.tsx
          taxonomy/
            project-tree.tsx
            category-tree.tsx
            tag-cloud.tsx
            tag-pill.tsx
          dashboard/
            kpi-cards.tsx
            creation-chart.tsx
            quality-chart.tsx
            project-chart.tsx
            recent-list.tsx
            needs-review.tsx
          bulk/
            bulk-bar.tsx
            delete-confirm.tsx
          shared/
            command-palette.tsx
            keyboard-shortcuts.tsx
            empty-state.tsx
            loading-skeleton.tsx
            confirm-dialog.tsx
        hooks/
          use-prompts.ts
          use-search.ts
          use-taxonomy.ts
          use-dashboard.ts
          use-bulk.ts
          use-keyboard.ts
          use-clipboard.ts
        stores/
          ui.store.ts
          selection.store.ts
          search.store.ts
        lib/
          api.ts
          query-client.ts
          format.ts
        styles/
          globals.css

  plugins/
    everprompt-capture/         <- Claude CLI plugin
      plugin.json
      hooks/
        capture-prompt.sh
      commands/
        ep-config.md
      settings.local.md
      README.md

  tools/                        <- CLI tools (Bun runtime)
    import.ts                   <- Batch import from JSON/CSV/Markdown
    export.ts                   <- Full export
    seed.ts                     <- Seed DB with demo data
    migrate.ts                  <- Run Drizzle migrations
```

### Cloudflare Bindings (wrangler.jsonc)

```jsonc
{
  "name": "everprompt-api",
  "main": "apps/api/src/index.ts",
  "compatibility_date": "2025-12-01",
  "d1_databases": [
    { "binding": "DB", "database_name": "everprompt-db", "database_id": "<id>" }
  ],
  "vectorize": [
    { "binding": "VECTORIZE", "index_name": "everprompt-prompts" }
  ],
  "r2_buckets": [
    { "binding": "R2", "bucket_name": "everprompt-assets" }
  ],
  "kv_namespaces": [
    { "binding": "KV", "id": "<id>" }
  ],
  "queues": {
    "producers": [
      { "binding": "AI_QUEUE", "queue": "everprompt-ai-pipeline" }
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
  "ai": { "binding": "AI" },
  "vars": { "ENVIRONMENT": "production" },
  "assets": {
    "directory": "apps/web/dist",
    "binding": "ASSETS"
  }
}
```

### Hono App Entry Type

```typescript
type Env = {
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

const app = new Hono<Env>();

export default {
  fetch: app.fetch,
  queue: queueConsumer,
};
```

### Deployment Architecture

```
Cloudflare Zero Trust (Auth gate)
        |
Cloudflare CDN / Edge
  +-- Static Assets (Vite build -> Assets binding)
  +-- Worker: everprompt-api (Hono)
        |-- /api/* -> Hono routes
        |-- /*     -> SPA assets
        |
        +-- D1 (SQLite database)
        +-- KV (cache)
        +-- R2 (object storage)
        +-- AI (Workers AI for embeddings)
        +-- Vectorize (semantic search index)
        +-- Queue: ai-pipeline -> consumer in same worker
        |
External: Claude API (Anthropic) for Haiku + Sonnet
```

### Dev Workflow

```bash
bun install                    # Install deps
bun run dev                    # turbo dev -> wrangler dev + vite dev
bun run db:generate            # drizzle-kit generate
bun run db:migrate             # apply migrations to local D1
bun run db:seed                # seed with demo data
bun run build                  # turbo build -> API bundle + Vite build
bun run deploy                 # wrangler deploy
bun run tools/import.ts        # batch import
bun run tools/export.ts        # full export
```

### Environments

| Env | D1 | Vectorize | R2 | KV |
|-----|----|-----------|----|------|
| local | wrangler d1 local | wrangler vectorize local | wrangler r2 local | wrangler kv local |
| staging | everprompt-db-staging | everprompt-prompts-staging | everprompt-assets-staging | staging KV |
| production | everprompt-db | everprompt-prompts | everprompt-assets | prod KV |

---

## 9. Versioning Roadmap

### V1 — Core

- CRUD prompts with full detail view
- Project, category, tag taxonomy
- AI pipeline: auto-title, auto-tag, auto-categorize (Haiku)
- AI scoring: 10-dimension rubric + judgment + improved version (Sonnet)
- Embedding + Vectorize for semantic search
- Hybrid search (structured + keyword + semantic)
- Search DSL with operators
- Grid/list view toggle
- Bulk actions (tag, move, delete, reanalyze, archive, favorite)
- Dashboard with KPIs and charts
- Saved searches
- API key generation for plugin auth
- Claude CLI plugin (everprompt-capture)
- Cloudflare Zero Trust auth
- Dark/light theme

### V1.5 — Polish

- Duplicate/near-duplicate detection and linking
- Version history with diff viewer
- Inbox flow: plugin captures -> inbox -> user confirms/organizes
- Command palette (cmdk)
- Full keyboard shortcuts
- Notes on prompts
- Autocomplete in search
- Facets with counts in right sidebar
- Status bar with pipeline status
- Empty states and onboarding

### V2 — Scale

- Workspace/team support (multi-tenant)
- Prompt sharing and collaboration
- Human rating vs AI rating comparison
- Prompt execution tracking (which LLM, what result, notes)
- Prompt templates
- Benchmark across models
- Batch import from Slack/Notion/clipboard
- Semantic clustering (auto-group similar prompts)
- Collections/playbooks
- Usage intelligence (most reused, high-score-low-use, trends)
- Browser extension / quick capture
- Export: Markdown, JSON, CSV, ZIP
