import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import type { Env } from '../env';
import { db } from '../lib/db';
import { createPromptSchema, updatePromptSchema, ingestPromptSchema } from '@everprompt/shared';
import { prompts, promptTags, tags } from '@everprompt/db';
import {
  createPrompt,
  listPrompts,
  getPromptById,
  updatePrompt,
  deletePrompt,
  ingestPrompt,
} from '../services/prompt.service';

export const promptRoutes = new Hono<Env>();

// POST / - Create prompt
promptRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createPromptSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues },
    }, 400);
  }

  const prompt = await createPrompt(c.env, parsed.data);
  return c.json({ ok: true, data: prompt }, 201);
});

// POST /ingest - Ingest from plugin/API
promptRoutes.post('/ingest', async (c) => {
  const body = await c.req.json();
  const parsed = ingestPromptSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues },
    }, 400);
  }

  const apiKeyId = c.get('apiKeyId');
  const prompt = await ingestPrompt(c.env, parsed.data, apiKeyId);
  return c.json({ ok: true, data: prompt }, 201);
});

// GET / - List prompts
promptRoutes.get('/', async (c) => {
  const d = db(c.env.DB);
  const page = parseInt(c.req.query('page') || '1', 10);
  const perPage = parseInt(c.req.query('per_page') || '24', 10);
  const status = c.req.query('status');
  const projectId = c.req.query('project_id');
  const categoryId = c.req.query('category_id');
  const isFavorite = c.req.query('is_favorite');
  const sortField = c.req.query('sort') || 'created_at';
  const sortDir = (c.req.query('dir') || 'desc') as 'asc' | 'desc';

  const result = await listPrompts(d, {
    page,
    per_page: Math.min(perPage, 100),
    status: status || undefined,
    project_id: projectId || undefined,
    category_id: categoryId || undefined,
    is_favorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
    sort_field: sortField,
    sort_dir: sortDir,
  });

  return c.json({ ok: true, data: result.data, meta: result.meta });
});

// GET /:id - Get prompt detail
promptRoutes.get('/:id', async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param('id');
  const prompt = await getPromptById(d, id);

  if (!prompt) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Prompt not found' } }, 404);
  }

  return c.json({ ok: true, data: prompt });
});

// PATCH /:id - Update prompt
promptRoutes.patch('/:id', async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updatePromptSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues },
    }, 400);
  }

  const prompt = await updatePrompt(d, id, parsed.data, c.env.AI_QUEUE);
  if (!prompt) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Prompt not found' } }, 404);
  }

  return c.json({ ok: true, data: prompt });
});

// DELETE /:id - Soft delete
promptRoutes.delete('/:id', async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param('id');
  const result = await deletePrompt(d, id);

  if (!result) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Prompt not found' } }, 404);
  }

  return c.json({ ok: true, data: result });
});

// POST /:id/tags - Add a tag to a prompt
promptRoutes.post('/:id/tags', async (c) => {
  const id = c.req.param('id');
  const { tag_id, origin } = await c.req.json();
  const d = db(c.env.DB);

  // Check prompt exists
  const [prompt] = await d.select({ id: prompts.id }).from(prompts).where(eq(prompts.id, id)).limit(1);
  if (!prompt) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Prompt not found' } }, 404);
  }

  // Check tag exists
  const [tag] = await d.select({ id: tags.id }).from(tags).where(eq(tags.id, tag_id)).limit(1);
  if (!tag) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Tag not found' } }, 404);
  }

  // Check if already linked
  const [existing] = await d.select()
    .from(promptTags)
    .where(and(eq(promptTags.prompt_id, id), eq(promptTags.tag_id, tag_id)))
    .limit(1);

  if (!existing) {
    await d.insert(promptTags).values({
      prompt_id: id,
      tag_id,
      confidence: 1.0,
      origin: origin || 'manual',
    });

    // Update tag usage_count
    await d.update(tags).set({
      usage_count: sql`${tags.usage_count} + 1`,
    }).where(eq(tags.id, tag_id));
  }

  return c.json({ ok: true, data: { prompt_id: id, tag_id } });
});

// DELETE /:id/tags/:tagId - Remove a tag from a prompt
promptRoutes.delete('/:id/tags/:tagId', async (c) => {
  const id = c.req.param('id');
  const tagId = c.req.param('tagId');
  const d = db(c.env.DB);

  // Delete from prompt_tags
  const [existing] = await d.select()
    .from(promptTags)
    .where(and(eq(promptTags.prompt_id, id), eq(promptTags.tag_id, tagId)))
    .limit(1);

  if (existing) {
    await d.delete(promptTags).where(
      and(eq(promptTags.prompt_id, id), eq(promptTags.tag_id, tagId))
    );

    // Update tag usage_count
    await d.update(tags).set({
      usage_count: sql`MAX(${tags.usage_count} - 1, 0)`,
    }).where(eq(tags.id, tagId));
  }

  return c.json({ ok: true, data: { prompt_id: id, tag_id: tagId } });
});
