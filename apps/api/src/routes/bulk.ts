import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import type { Env } from '../env';
import { db } from '../lib/db';
import { prompts, promptTags, tags, projects, categories, activityLog } from '@everprompt/db';
import { bulkActionSchema, bulkTagSchema, bulkMoveSchema, bulkDeleteSchema, ulid } from '@everprompt/shared';

export const bulkRoutes = new Hono<Env>();

// POST /bulk/tag - Add/remove tags on N prompts
bulkRoutes.post('/bulk/tag', async (c) => {
  const body = await c.req.json();
  const parsed = bulkTagSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }

  const d = db(c.env.DB);
  const { prompt_ids, add_tag_ids, remove_tag_ids } = parsed.data;
  let affected = 0;

  for (const promptId of prompt_ids) {
    if (add_tag_ids) {
      for (const tagId of add_tag_ids) {
        // Check if already exists
        const existing = await d.select().from(promptTags)
          .where(sql`${promptTags.prompt_id} = ${promptId} AND ${promptTags.tag_id} = ${tagId}`)
          .limit(1);
        if (existing.length === 0) {
          await d.insert(promptTags).values({
            prompt_id: promptId,
            tag_id: tagId,
            confidence: 1.0,
            origin: 'manual',
          });
          await d.update(tags).set({ usage_count: sql`${tags.usage_count} + 1` }).where(eq(tags.id, tagId));
        }
      }
    }
    if (remove_tag_ids) {
      for (const tagId of remove_tag_ids) {
        const deleted = await d.delete(promptTags)
          .where(sql`${promptTags.prompt_id} = ${promptId} AND ${promptTags.tag_id} = ${tagId}`);
        await d.update(tags).set({ usage_count: sql`MAX(${tags.usage_count} - 1, 0)` }).where(eq(tags.id, tagId));
      }
    }
    affected++;
  }

  return c.json({ ok: true, data: { count: affected } });
});

// POST /bulk/move - Change project/category on N prompts
bulkRoutes.post('/bulk/move', async (c) => {
  const body = await c.req.json();
  const parsed = bulkMoveSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }

  const d = db(c.env.DB);
  const { prompt_ids, project_id, category_id } = parsed.data;
  const now = new Date().toISOString();
  let affected = 0;

  for (const promptId of prompt_ids) {
    const [existing] = await d.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
    if (!existing) continue;

    const updates: Record<string, unknown> = { updated_at: now };

    if (project_id !== undefined) {
      // Decrement old project counter
      if (existing.project_id) {
        await d.update(projects).set({ prompt_count: sql`MAX(${projects.prompt_count} - 1, 0)` }).where(eq(projects.id, existing.project_id));
      }
      // Increment new project counter
      if (project_id) {
        await d.update(projects).set({ prompt_count: sql`${projects.prompt_count} + 1` }).where(eq(projects.id, project_id));
      }
      updates.project_id = project_id;
    }

    if (category_id !== undefined) {
      if (existing.category_id) {
        await d.update(categories).set({ prompt_count: sql`MAX(${categories.prompt_count} - 1, 0)` }).where(eq(categories.id, existing.category_id));
      }
      if (category_id) {
        await d.update(categories).set({ prompt_count: sql`${categories.prompt_count} + 1` }).where(eq(categories.id, category_id));
      }
      updates.category_id = category_id;
    }

    await d.update(prompts).set(updates).where(eq(prompts.id, promptId));
    affected++;
  }

  return c.json({ ok: true, data: { count: affected } });
});

// POST /bulk/delete - Soft delete N prompts
bulkRoutes.post('/bulk/delete', async (c) => {
  const body = await c.req.json();
  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }

  const d = db(c.env.DB);
  const { prompt_ids } = parsed.data;
  const now = new Date().toISOString();
  let affected = 0;

  for (const promptId of prompt_ids) {
    const [existing] = await d.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
    if (!existing || existing.status === 'deleted') continue;

    await d.update(prompts).set({ status: 'deleted', updated_at: now }).where(eq(prompts.id, promptId));

    if (existing.project_id) {
      await d.update(projects).set({ prompt_count: sql`MAX(${projects.prompt_count} - 1, 0)` }).where(eq(projects.id, existing.project_id));
    }
    if (existing.category_id) {
      await d.update(categories).set({ prompt_count: sql`MAX(${categories.prompt_count} - 1, 0)` }).where(eq(categories.id, existing.category_id));
    }

    await d.insert(activityLog).values({
      id: ulid(),
      entity_type: 'prompt',
      entity_id: promptId,
      action: 'deleted',
      payload_json: JSON.stringify({ bulk: true }),
      created_at: now,
    });

    affected++;
  }

  return c.json({ ok: true, data: { count: affected } });
});

// POST /bulk/reanalyze - Re-trigger AI pipeline on N prompts
bulkRoutes.post('/bulk/reanalyze', async (c) => {
  const body = await c.req.json();
  const parsed = bulkActionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }

  const d = db(c.env.DB);
  const { prompt_ids } = parsed.data;
  const now = new Date().toISOString();
  let affected = 0;

  for (const promptId of prompt_ids) {
    await d.update(prompts).set({ ai_status: 'pending', updated_at: now }).where(eq(prompts.id, promptId));
    await c.env.AI_QUEUE.send({ promptId, action: 'reanalyze' });
    affected++;
  }

  return c.json({ ok: true, data: { count: affected } });
});

// POST /bulk/archive - Archive N prompts
bulkRoutes.post('/bulk/archive', async (c) => {
  const body = await c.req.json();
  const parsed = bulkActionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }

  const d = db(c.env.DB);
  const { prompt_ids } = parsed.data;
  const now = new Date().toISOString();
  let affected = 0;

  for (const promptId of prompt_ids) {
    await d.update(prompts).set({ status: 'archived', updated_at: now }).where(eq(prompts.id, promptId));
    affected++;
  }

  return c.json({ ok: true, data: { count: affected } });
});

// POST /bulk/favorite - Toggle favorite on N prompts
bulkRoutes.post('/bulk/favorite', async (c) => {
  const body = await c.req.json();
  const parsed = bulkActionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }

  const d = db(c.env.DB);
  const { prompt_ids } = parsed.data;
  const now = new Date().toISOString();
  let affected = 0;

  for (const promptId of prompt_ids) {
    const [existing] = await d.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
    if (!existing) continue;
    await d.update(prompts).set({ is_favorite: !existing.is_favorite, updated_at: now }).where(eq(prompts.id, promptId));
    affected++;
  }

  return c.json({ ok: true, data: { count: affected } });
});
