import { Hono } from 'hono';
import type { Env } from '../env';
import { db } from '../lib/db';
import { kvGet, kvSet } from '../lib/kv';
import { searchQuerySchema } from '@everprompt/shared';
import { hybridSearch, getSearchFacets, getSuggestions } from '../services/search.service';
import type { SearchFacets } from '@everprompt/shared';

export const searchRoutes = new Hono<Env>();

// POST / - Hybrid search
searchRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = searchQuerySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid search query', details: parsed.error.issues },
    }, 400);
  }

  const d = db(c.env.DB);
  const result = await hybridSearch({
    q: parsed.data.q,
    filters: parsed.data.filters,
    sort: parsed.data.sort,
    page: parsed.data.page,
    per_page: parsed.data.per_page,
    db: d,
    ai: c.env.AI,
    vectorize: c.env.VECTORIZE,
  });

  return c.json({
    ok: true,
    data: {
      prompts: result.prompts,
    },
    meta: {
      total: result.total,
      page: result.page,
      per_page: result.per_page,
      has_more: result.has_more,
    },
  });
});

// GET /suggest - Autocomplete suggestions
searchRoutes.get('/suggest', async (c) => {
  const q = c.req.query('q') || '';
  const d = db(c.env.DB);
  const data = await getSuggestions(d, q);
  return c.json({ ok: true, data });
});

// GET /facets - Counts per project/category/tag/band
searchRoutes.get('/facets', async (c) => {
  // Try cache first
  const cacheKey = 'search:facets';
  const cached = await kvGet<SearchFacets>(c.env.KV, cacheKey);
  if (cached) {
    return c.json({ ok: true, data: cached });
  }

  const d = db(c.env.DB);
  const data = await getSearchFacets(d);

  // Cache for 5 minutes
  await kvSet(c.env.KV, cacheKey, data, 300);

  return c.json({ ok: true, data });
});
