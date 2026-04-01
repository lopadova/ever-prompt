import { eq, desc, asc, sql, and, like, count as drizzleCount } from 'drizzle-orm';
import { prompts, promptTags, tags, projects, categories } from '@everprompt/db';
import {
  parseSearchQuery,
  SEARCH_WEIGHTS,
  SEMANTIC_TOP_K,
} from '@everprompt/shared';
import type { SearchFilters, SearchFacets, PromptListItem } from '@everprompt/shared';
import type { DB } from '../lib/db';
import { embedText, queryVectors } from '../lib/vectorize';
import { paginationMeta } from '../lib/pagination';

interface HybridSearchParams {
  q: string;
  filters: SearchFilters;
  sort: { field: string; dir: 'asc' | 'desc' };
  page: number;
  per_page: number;
  db: DB;
  ai: Ai;
  vectorize: VectorizeIndex;
}

interface SearchResultItem {
  prompt: typeof prompts.$inferSelect;
  keywordScore: number;
  semanticScore: number;
  qualityScore: number;
  recencyScore: number;
  finalScore: number;
}

export async function hybridSearch(params: HybridSearchParams) {
  const { q, filters: inputFilters, sort, page, per_page, db: d, ai, vectorize } = params;

  // Parse query DSL: extract operators and free text
  const parsed = parseSearchQuery(q);
  const mergedFilters: SearchFilters = { ...inputFilters, ...parsed.filters };
  const freeText = parsed.freeText;

  // Build D1 SQL conditions
  const conditions = buildSqlConditions(mergedFilters, freeText);

  // Run D1 keyword search and Vectorize semantic search in parallel
  const [keywordResults, semanticResults] = await Promise.all([
    runKeywordSearch(d, conditions, freeText),
    freeText ? runSemanticSearch(ai, vectorize, freeText, mergedFilters) : Promise.resolve(new Map<string, number>()),
  ]);

  // Merge results with weighted scoring
  const now = Date.now();
  const mergedMap = new Map<string, SearchResultItem>();

  // Add keyword results
  for (const row of keywordResults) {
    const keywordScore = freeText ? computeKeywordScore(row, freeText) : 0;
    const semanticScore = semanticResults.get(row.id) ?? 0;
    const qualityScore = row.overall_score != null ? row.overall_score / 100 : 0;
    const recencyScore = computeRecencyScore(row.created_at, now);

    const finalScore = sort.field === 'relevance'
      ? (semanticScore * SEARCH_WEIGHTS.semantic) +
        (keywordScore * SEARCH_WEIGHTS.keyword) +
        (qualityScore * SEARCH_WEIGHTS.quality) +
        (recencyScore * SEARCH_WEIGHTS.recency)
      : 0;

    mergedMap.set(row.id, {
      prompt: row,
      keywordScore,
      semanticScore,
      qualityScore,
      recencyScore,
      finalScore,
    });
  }

  // Add semantic-only results (found by Vectorize but not keyword)
  for (const [promptId, semScore] of semanticResults) {
    if (!mergedMap.has(promptId)) {
      // Fetch the prompt from D1 to verify it matches filters
      const [row] = await d.select().from(prompts)
        .where(eq(prompts.id, promptId))
        .limit(1);

      if (row && row.status !== 'deleted') {
        const qualityScore = row.overall_score != null ? row.overall_score / 100 : 0;
        const recencyScore = computeRecencyScore(row.created_at, now);

        mergedMap.set(row.id, {
          prompt: row,
          keywordScore: 0,
          semanticScore: semScore,
          qualityScore,
          recencyScore,
          finalScore: sort.field === 'relevance'
            ? (semScore * SEARCH_WEIGHTS.semantic) +
              (qualityScore * SEARCH_WEIGHTS.quality) +
              (recencyScore * SEARCH_WEIGHTS.recency)
            : 0,
        });
      }
    }
  }

  // Sort results
  let sorted = Array.from(mergedMap.values());
  sorted = sortResults(sorted, sort);

  // Paginate
  const total = sorted.length;
  const offset = (page - 1) * per_page;
  const pageResults = sorted.slice(offset, offset + per_page);

  // Fetch tags for results
  const promptIds = pageResults.map(r => r.prompt.id);
  const promptTagRows = promptIds.length > 0
    ? await d.select({
        prompt_id: promptTags.prompt_id,
        tag_id: promptTags.tag_id,
        name: tags.name,
        slug: tags.slug,
        color: tags.color,
      })
      .from(promptTags)
      .innerJoin(tags, eq(promptTags.tag_id, tags.id))
      .where(sql`${promptTags.prompt_id} IN (${sql.join(promptIds.map(id => sql`${id}`), sql`, `)})`)
    : [];

  // Group tags by prompt
  const tagMap = new Map<string, typeof promptTagRows>();
  for (const row of promptTagRows) {
    const existing = tagMap.get(row.prompt_id) ?? [];
    existing.push(row);
    tagMap.set(row.prompt_id, existing);
  }

  const data = pageResults.map(r => ({
    ...r.prompt,
    tags: (tagMap.get(r.prompt.id) ?? []).map(t => ({
      id: t.tag_id,
      name: t.name,
      slug: t.slug,
      color: t.color,
    })),
  }));

  return {
    prompts: data,
    total,
    page,
    per_page,
    has_more: offset + per_page < total,
  };
}

function buildSqlConditions(filters: SearchFilters, freeText: string) {
  const conditions = [];

  // Always exclude deleted
  conditions.push(sql`${prompts.status} != 'deleted'`);

  if (filters.project_id) conditions.push(eq(prompts.project_id, filters.project_id));
  if (filters.category_id) conditions.push(eq(prompts.category_id, filters.category_id));
  if (filters.status) conditions.push(eq(prompts.status, filters.status));
  if (filters.source) conditions.push(eq(prompts.source, filters.source));
  if (filters.language) conditions.push(eq(prompts.language, filters.language));
  if (filters.session_id) conditions.push(eq(prompts.session_id, filters.session_id));

  if (filters.quality_band && filters.quality_band.length > 0) {
    const bandConditions = filters.quality_band.map(b => sql`${prompts.quality_band} = ${b}`);
    conditions.push(sql`(${sql.join(bandConditions, sql` OR `)})`);
  }

  if (filters.score_min !== undefined) {
    conditions.push(sql`${prompts.overall_score} >= ${filters.score_min}`);
  }
  if (filters.score_max !== undefined) {
    conditions.push(sql`${prompts.overall_score} <= ${filters.score_max}`);
  }

  if (filters.is_favorite !== undefined) {
    conditions.push(eq(prompts.is_favorite, filters.is_favorite));
  }
  if (filters.is_pinned !== undefined) {
    conditions.push(eq(prompts.is_pinned, filters.is_pinned));
  }
  if (filters.has_improved !== undefined) {
    conditions.push(eq(prompts.has_improved_version, filters.has_improved));
  }
  if (filters.has_security_issues !== undefined) {
    conditions.push(eq(prompts.has_security_issues, filters.has_security_issues));
  }

  if (filters.created_after) {
    conditions.push(sql`${prompts.created_at} >= ${filters.created_after}`);
  }
  if (filters.created_before) {
    conditions.push(sql`${prompts.created_at} <= ${filters.created_before}`);
  }
  if (filters.updated_after) {
    conditions.push(sql`${prompts.updated_at} >= ${filters.updated_after}`);
  }
  if (filters.updated_before) {
    conditions.push(sql`${prompts.updated_at} <= ${filters.updated_before}`);
  }

  // Keyword search: LIKE on search_text
  if (freeText) {
    conditions.push(sql`${prompts.search_text} LIKE ${'%' + freeText + '%'}`);
  }

  return conditions;
}

async function runKeywordSearch(
  d: DB,
  conditions: ReturnType<typeof buildSqlConditions>,
  _freeText: string,
) {
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Fetch up to 200 results for merging
  const results = await d.select().from(prompts)
    .where(where)
    .orderBy(desc(prompts.created_at))
    .limit(200);

  return results;
}

async function runSemanticSearch(
  ai: Ai,
  vectorize: VectorizeIndex,
  freeText: string,
  filters: SearchFilters,
): Promise<Map<string, number>> {
  try {
    const vector = await embedText(ai, freeText);

    // Build Vectorize metadata filter
    const metadataFilter: Record<string, unknown> = {};
    if (filters.project_id) metadataFilter.project_id = filters.project_id;
    if (filters.category_id) metadataFilter.category_id = filters.category_id;
    if (filters.quality_band && filters.quality_band.length > 0) {
      metadataFilter.quality_band = { $in: filters.quality_band };
    }
    if (filters.language) metadataFilter.language = filters.language;

    const filter = Object.keys(metadataFilter).length > 0
      ? metadataFilter as VectorizeVectorMetadataFilter
      : undefined;

    const matches = await queryVectors(vectorize, vector, SEMANTIC_TOP_K, filter);
    const scoreMap = new Map<string, number>();

    for (const match of matches.matches ?? []) {
      scoreMap.set(match.id as string, match.score);
    }

    return scoreMap;
  } catch (e) {
    console.error('Semantic search failed:', e);
    return new Map();
  }
}

function computeKeywordScore(
  row: typeof prompts.$inferSelect,
  freeText: string,
): number {
  const searchText = (row.search_text || '').toLowerCase();
  const query = freeText.toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);

  if (terms.length === 0) return 0;

  let matchCount = 0;
  for (const term of terms) {
    if (searchText.includes(term)) matchCount++;
  }

  // Base keyword score: fraction of terms matched
  let score = matchCount / terms.length;

  // Bonus for title match
  if (row.title.toLowerCase().includes(query)) score += 0.3;

  // Bonus for abstract match
  if (row.abstract.toLowerCase().includes(query)) score += 0.1;

  return Math.min(1, score);
}

function computeRecencyScore(createdAt: string, now: number): number {
  const created = new Date(createdAt).getTime();
  const ageMs = now - created;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  // Decay: 1.0 for today, ~0.5 for 30 days ago, ~0.1 for 180 days
  return Math.exp(-ageDays / 60);
}

function sortResults(
  results: SearchResultItem[],
  sort: { field: string; dir: 'asc' | 'desc' },
): SearchResultItem[] {
  const dir = sort.dir === 'asc' ? 1 : -1;

  switch (sort.field) {
    case 'relevance':
      return results.sort((a, b) => (b.finalScore - a.finalScore) * dir);
    case 'overall_score':
      return results.sort((a, b) =>
        ((a.prompt.overall_score ?? 0) - (b.prompt.overall_score ?? 0)) * dir
      );
    case 'title':
      return results.sort((a, b) => a.prompt.title.localeCompare(b.prompt.title) * dir);
    case 'updated_at':
      return results.sort((a, b) => a.prompt.updated_at.localeCompare(b.prompt.updated_at) * dir);
    case 'created_at':
    default:
      return results.sort((a, b) => a.prompt.created_at.localeCompare(b.prompt.created_at) * dir);
  }
}

export async function getSearchFacets(d: DB): Promise<SearchFacets> {
  // Projects facet
  const projectFacets = await d.select({
    id: projects.id,
    name: projects.name,
    count: projects.prompt_count,
  }).from(projects).orderBy(desc(projects.prompt_count));

  // Categories facet
  const categoryFacets = await d.select({
    id: categories.id,
    name: categories.name,
    count: categories.prompt_count,
  }).from(categories).orderBy(desc(categories.prompt_count));

  // Tags facet
  const tagFacets = await d.select({
    id: tags.id,
    name: tags.name,
    count: tags.usage_count,
  }).from(tags).orderBy(desc(tags.usage_count)).limit(50);

  // Quality bands facet
  const bands = ['A', 'B', 'C', 'D'] as const;
  const qualityBandFacets = [];
  for (const band of bands) {
    const [result] = await d.select({ count: drizzleCount() }).from(prompts)
      .where(sql`${prompts.quality_band} = ${band} AND ${prompts.status} != 'deleted'`);
    qualityBandFacets.push({ band, count: result.count });
  }

  // Status facet
  const statuses = ['inbox', 'active', 'archived'] as const;
  const statusFacets = [];
  for (const status of statuses) {
    const [result] = await d.select({ count: drizzleCount() }).from(prompts)
      .where(sql`${prompts.status} = ${status}`);
    statusFacets.push({ status, count: result.count });
  }

  return {
    projects: projectFacets,
    categories: categoryFacets,
    tags: tagFacets,
    quality_bands: qualityBandFacets,
    statuses: statusFacets,
  };
}

export async function getSuggestions(
  d: DB,
  q: string,
): Promise<{ prompts: { id: string; title: string }[]; saved_searches: { id: string; name: string }[] }> {
  if (!q || q.length < 2) {
    return { prompts: [], saved_searches: [] };
  }

  // Last 5 prompts with matching title
  const matchingPrompts = await d.select({
    id: prompts.id,
    title: prompts.title,
  }).from(prompts)
    .where(sql`${prompts.title} LIKE ${'%' + q + '%'} AND ${prompts.status} != 'deleted'`)
    .orderBy(desc(prompts.updated_at))
    .limit(5);

  // Matching saved searches
  const { savedSearches } = await import('@everprompt/db');
  const matchingSaved = await d.select({
    id: savedSearches.id,
    name: savedSearches.name,
  }).from(savedSearches)
    .where(sql`${savedSearches.name} LIKE ${'%' + q + '%'}`)
    .limit(3);

  return {
    prompts: matchingPrompts,
    saved_searches: matchingSaved,
  };
}
