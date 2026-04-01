import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import type { Env } from '../env';
import { db } from '../lib/db';
import { prompts } from '@everprompt/db';

export const queueRoutes = new Hono<Env>();

// GET /status - Show queue status
queueRoutes.get('/status', async (c) => {
  const d = db(c.env.DB);

  const activeRows = await d.select({
    id: prompts.id,
    title: prompts.title,
    ai_status: prompts.ai_status,
    created_at: prompts.created_at,
  })
  .from(prompts)
  .where(sql`${prompts.ai_status} IN ('pending', 'analyzing')`)
  .orderBy(prompts.created_at);

  const failedRows = await d.select({ id: prompts.id })
    .from(prompts)
    .where(sql`${prompts.ai_status} LIKE '%failed%'`);

  const pendingCount = activeRows.filter(r => r.ai_status === 'pending').length;
  const analyzingCount = activeRows.filter(r => r.ai_status === 'analyzing').length;

  return c.json({
    ok: true,
    data: {
      pending: pendingCount,
      analyzing: analyzingCount,
      failed: failedRows.length,
      count: activeRows.length,
      items: activeRows.map(r => ({
        prompt_id: r.id,
        title: r.title || 'Untitled',
        status: r.ai_status,
        created_at: r.created_at,
      })),
    },
  });
});

// POST /unstick - Mark stuck pending/analyzing prompts (>5min old) as failed
queueRoutes.post('/unstick', async (c) => {
  const d = db(c.env.DB);
  const now = new Date().toISOString();
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const stuckRows = await d.select({ id: prompts.id })
    .from(prompts)
    .where(sql`${prompts.ai_status} IN ('pending', 'analyzing') AND ${prompts.updated_at} < ${fiveMinAgo}`);

  for (const row of stuckRows) {
    await d.update(prompts)
      .set({ ai_status: 'failed_classify', updated_at: now })
      .where(eq(prompts.id, row.id));
  }

  return c.json({
    ok: true,
    data: { count: stuckRows.length, message: `${stuckRows.length} stuck prompts marked as failed` },
  });
});

// POST /retry-failed - Re-enqueue all failed prompts
queueRoutes.post('/retry-failed', async (c) => {
  const d = db(c.env.DB);
  const now = new Date().toISOString();

  const failedRows = await d.select({ id: prompts.id })
    .from(prompts)
    .where(sql`${prompts.ai_status} LIKE '%failed%'`);

  for (const row of failedRows) {
    await d.update(prompts)
      .set({ ai_status: 'pending', updated_at: now })
      .where(eq(prompts.id, row.id));
    await c.env.AI_QUEUE.send({ promptId: row.id, action: 'reanalyze' });
  }

  return c.json({
    ok: true,
    data: { count: failedRows.length },
  });
});
