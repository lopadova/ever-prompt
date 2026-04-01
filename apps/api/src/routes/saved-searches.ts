import { Hono } from 'hono';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import type { Env } from '../env';
import { db } from '../lib/db';
import { savedSearches } from '@everprompt/db';
import { ulid } from '@everprompt/shared';

const createSavedSearchSchema = z.object({
  name: z.string().min(1).max(100),
  query_text: z.string().default(''),
  filters_json: z.string().default('{}'),
  sort_json: z.string().default('{}'),
  is_pinned: z.boolean().default(false),
});

const updateSavedSearchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  query_text: z.string().optional(),
  filters_json: z.string().optional(),
  sort_json: z.string().optional(),
  is_pinned: z.boolean().optional(),
  result_count: z.number().int().optional(),
  last_run_at: z.string().optional(),
});

export const savedSearchRoutes = new Hono<Env>();

// GET / - List saved searches
savedSearchRoutes.get('/', async (c) => {
  const d = db(c.env.DB);
  const data = await d.select().from(savedSearches).orderBy(desc(savedSearches.created_at));
  return c.json({ ok: true, data });
});

// POST / - Create saved search
savedSearchRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSavedSearchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }

  const d = db(c.env.DB);
  const now = new Date().toISOString();
  const id = ulid();

  await d.insert(savedSearches).values({
    id,
    name: parsed.data.name,
    query_text: parsed.data.query_text,
    filters_json: parsed.data.filters_json,
    sort_json: parsed.data.sort_json,
    is_pinned: parsed.data.is_pinned,
    result_count: 0,
    last_run_at: null,
    created_at: now,
  });

  const [created] = await d.select().from(savedSearches).where(eq(savedSearches.id, id)).limit(1);
  return c.json({ ok: true, data: created }, 201);
});

// PATCH /:id - Update saved search
savedSearchRoutes.patch('/:id', async (c) => {
  const body = await c.req.json();
  const parsed = updateSavedSearchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }

  const d = db(c.env.DB);
  const id = c.req.param('id');
  const [existing] = await d.select().from(savedSearches).where(eq(savedSearches.id, id)).limit(1);
  if (!existing) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Saved search not found' } }, 404);
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.query_text !== undefined) updates.query_text = parsed.data.query_text;
  if (parsed.data.filters_json !== undefined) updates.filters_json = parsed.data.filters_json;
  if (parsed.data.sort_json !== undefined) updates.sort_json = parsed.data.sort_json;
  if (parsed.data.is_pinned !== undefined) updates.is_pinned = parsed.data.is_pinned;
  if (parsed.data.result_count !== undefined) updates.result_count = parsed.data.result_count;
  if (parsed.data.last_run_at !== undefined) updates.last_run_at = parsed.data.last_run_at;

  await d.update(savedSearches).set(updates).where(eq(savedSearches.id, id));
  const [updated] = await d.select().from(savedSearches).where(eq(savedSearches.id, id)).limit(1);
  return c.json({ ok: true, data: updated });
});

// DELETE /:id - Delete saved search
savedSearchRoutes.delete('/:id', async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param('id');
  const [existing] = await d.select().from(savedSearches).where(eq(savedSearches.id, id)).limit(1);
  if (!existing) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Saved search not found' } }, 404);
  }
  await d.delete(savedSearches).where(eq(savedSearches.id, id));
  return c.json({ ok: true, data: { id } });
});
