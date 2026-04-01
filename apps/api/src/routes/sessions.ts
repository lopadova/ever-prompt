import { Hono } from 'hono';
import { z } from 'zod';
import { eq, desc, sql, count as drizzleCount } from 'drizzle-orm';
import type { Env } from '../env';
import { db } from '../lib/db';
import { sessions, prompts } from '@everprompt/db';
import { paginationMeta, paginationOffset } from '../lib/pagination';

export const sessionRoutes = new Hono<Env>();

// GET / - List sessions (paginated, newest first)
sessionRoutes.get('/', async (c) => {
  const d = db(c.env.DB);
  const page = parseInt(c.req.query('page') || '1', 10);
  const perPage = Math.min(parseInt(c.req.query('per_page') || '24', 10), 100);
  const { limit, offset } = paginationOffset(page, perPage);

  const [totalResult] = await d.select({ count: drizzleCount() }).from(sessions);
  const total = totalResult.count;

  const rows = await d.select().from(sessions)
    .orderBy(desc(sessions.last_prompt_at))
    .limit(limit)
    .offset(offset);

  return c.json({
    ok: true,
    data: rows,
    meta: paginationMeta(total, page, perPage),
  });
});

// GET /:id - Session detail with prompts
sessionRoutes.get('/:id', async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param('id');

  const [session] = await d.select().from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);

  if (!session) {
    return c.json({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Session not found' },
    }, 404);
  }

  // Fetch prompts in this session
  const sessionPrompts = await d.select().from(prompts)
    .where(eq(prompts.session_id, id))
    .orderBy(desc(prompts.created_at));

  return c.json({
    ok: true,
    data: { ...session, prompts: sessionPrompts },
  });
});

const updateSessionSchema = z.object({
  name: z.string().min(1).max(200),
});

// PATCH /:id - Update session name
sessionRoutes.patch('/:id', async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const parsed = updateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues },
    }, 400);
  }

  const [existing] = await d.select().from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);

  if (!existing) {
    return c.json({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Session not found' },
    }, 404);
  }

  const now = new Date().toISOString();
  await d.update(sessions).set({
    name: parsed.data.name,
    updated_at: now,
  }).where(eq(sessions.id, id));

  const [updated] = await d.select().from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);

  return c.json({ ok: true, data: updated });
});

// DELETE /:id - Delete session (unlinks prompts, doesn't delete them)
sessionRoutes.delete('/:id', async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param('id');

  const [existing] = await d.select().from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);

  if (!existing) {
    return c.json({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Session not found' },
    }, 404);
  }

  // Unlink prompts from this session
  await d.update(prompts).set({ session_id: null })
    .where(eq(prompts.session_id, id));

  // Delete the session
  await d.delete(sessions).where(eq(sessions.id, id));

  return c.json({ ok: true, data: { id } });
});
