import { Hono } from 'hono';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import type { Env } from '../env';
import { db } from '../lib/db';
import { notes } from '@everprompt/db';
import { ulid, MAX_NOTE_LENGTH } from '@everprompt/shared';

const createNoteSchema = z.object({
  body: z.string().min(1).max(MAX_NOTE_LENGTH),
});

const updateNoteSchema = z.object({
  body: z.string().min(1).max(MAX_NOTE_LENGTH),
});

export const noteRoutes = new Hono<Env>();

// GET /prompts/:id/notes - List notes for a prompt
noteRoutes.get('/prompts/:id/notes', async (c) => {
  const d = db(c.env.DB);
  const promptId = c.req.param('id');
  const data = await d.select().from(notes)
    .where(eq(notes.prompt_id, promptId))
    .orderBy(desc(notes.created_at));
  return c.json({ ok: true, data });
});

// POST /prompts/:id/notes - Create note for a prompt
noteRoutes.post('/prompts/:id/notes', async (c) => {
  const body = await c.req.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }

  const d = db(c.env.DB);
  const promptId = c.req.param('id');
  const now = new Date().toISOString();
  const id = ulid();

  await d.insert(notes).values({
    id,
    prompt_id: promptId,
    body: parsed.data.body,
    created_at: now,
    updated_at: now,
  });

  const [created] = await d.select().from(notes).where(eq(notes.id, id)).limit(1);
  return c.json({ ok: true, data: created }, 201);
});

// PATCH /notes/:id - Update note
noteRoutes.patch('/notes/:id', async (c) => {
  const body = await c.req.json();
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }

  const d = db(c.env.DB);
  const id = c.req.param('id');
  const [existing] = await d.select().from(notes).where(eq(notes.id, id)).limit(1);
  if (!existing) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Note not found' } }, 404);
  }

  const now = new Date().toISOString();
  await d.update(notes).set({ body: parsed.data.body, updated_at: now }).where(eq(notes.id, id));
  const [updated] = await d.select().from(notes).where(eq(notes.id, id)).limit(1);
  return c.json({ ok: true, data: updated });
});

// DELETE /notes/:id - Delete note
noteRoutes.delete('/notes/:id', async (c) => {
  const d = db(c.env.DB);
  const id = c.req.param('id');
  const [existing] = await d.select().from(notes).where(eq(notes.id, id)).limit(1);
  if (!existing) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Note not found' } }, 404);
  }
  await d.delete(notes).where(eq(notes.id, id));
  return c.json({ ok: true, data: { id } });
});
