import { Hono } from 'hono';
import { sql, and } from 'drizzle-orm';
import type { Env } from '../env';
import { db } from '../lib/db';
import type { DB } from '../lib/db';
import { prompts, promptTags } from '@everprompt/db';
import { kvGet } from '../lib/kv';

const SETTINGS_KEY = 'user:settings';

interface PruneSettings {
  prune_enabled: boolean;
  prune_after_days: number;
  prune_protected_tag_ids: string[];
}

interface PrunablePrompt {
  id: string;
  title: string;
  created_at: string;
}

async function getPruneCandidates(
  d: DB,
  pruneAfterDays: number,
  protectedTagIds: string[],
): Promise<PrunablePrompt[]> {
  const cutoffDate = new Date(Date.now() - pruneAfterDays * 24 * 60 * 60 * 1000).toISOString();

  // Build the base conditions for prunable prompts
  const baseConditions = and(
    sql`${prompts.created_at} < ${cutoffDate}`,
    sql`${prompts.is_favorite} = 0`,
    sql`${prompts.is_pinned} = 0`,
    sql`${prompts.status} != 'deleted'`,
  );

  if (protectedTagIds.length > 0) {
    // Exclude prompts that have any of the protected tags
    const protectedPromptIds = d
      .select({ prompt_id: promptTags.prompt_id })
      .from(promptTags)
      .where(sql`${promptTags.tag_id} IN (${sql.join(protectedTagIds.map(id => sql`${id}`), sql`, `)})`);

    const rows = await d
      .select({
        id: prompts.id,
        title: prompts.title,
        created_at: prompts.created_at,
      })
      .from(prompts)
      .where(and(
        baseConditions,
        sql`${prompts.id} NOT IN (${protectedPromptIds})`,
      ))
      .orderBy(sql`${prompts.created_at} ASC`);

    return rows;
  }

  const rows = await d
    .select({
      id: prompts.id,
      title: prompts.title,
      created_at: prompts.created_at,
    })
    .from(prompts)
    .where(baseConditions)
    .orderBy(sql`${prompts.created_at} ASC`);

  return rows;
}

export async function executePrune(
  d: DB,
  pruneAfterDays: number,
  protectedTagIds: string[],
): Promise<{ pruned_count: number; protected_count: number }> {
  const cutoffDate = new Date(Date.now() - pruneAfterDays * 24 * 60 * 60 * 1000).toISOString();

  // Count total old prompts (not already deleted)
  const [totalOldResult] = await d
    .select({ count: sql<number>`COUNT(*)` })
    .from(prompts)
    .where(and(
      sql`${prompts.created_at} < ${cutoffDate}`,
      sql`${prompts.status} != 'deleted'`,
    ));
  const totalOld = totalOldResult?.count ?? 0;

  // Get candidates (excluding protected)
  const candidates = await getPruneCandidates(d, pruneAfterDays, protectedTagIds);
  const prunedCount = candidates.length;
  const protectedCount = totalOld - prunedCount;

  if (prunedCount > 0) {
    const now = new Date().toISOString();
    const ids = candidates.map((c) => c.id);
    // Soft-delete in batches of 100
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await d
        .update(prompts)
        .set({ status: 'deleted', updated_at: now })
        .where(sql`${prompts.id} IN (${sql.join(batch.map(id => sql`${id}`), sql`, `)})`);
    }
  }

  return { pruned_count: prunedCount, protected_count: protectedCount };
}

export const pruneRoutes = new Hono<Env>();

// GET /preview - Preview what would be pruned (dry-run)
pruneRoutes.get('/preview', async (c) => {
  const settings = await kvGet<PruneSettings>(c.env.KV, SETTINGS_KEY);
  const pruneAfterDays = settings?.prune_after_days ?? 180;
  const protectedTagIds = settings?.prune_protected_tag_ids ?? [];

  const d = db(c.env.DB);
  const candidates = await getPruneCandidates(d, pruneAfterDays, protectedTagIds);

  // Count protected
  const cutoffDate = new Date(Date.now() - pruneAfterDays * 24 * 60 * 60 * 1000).toISOString();
  const [totalOldResult] = await d
    .select({ count: sql<number>`COUNT(*)` })
    .from(prompts)
    .where(and(
      sql`${prompts.created_at} < ${cutoffDate}`,
      sql`${prompts.status} != 'deleted'`,
    ));
  const totalOld = totalOldResult?.count ?? 0;
  const protectedCount = totalOld - candidates.length;

  return c.json({
    ok: true,
    data: {
      pruned_count: candidates.length,
      protected_count: protectedCount,
      prompts: candidates,
    },
  });
});

// POST /run - Execute prune now (manual trigger)
pruneRoutes.post('/run', async (c) => {
  const settings = await kvGet<PruneSettings>(c.env.KV, SETTINGS_KEY);
  const pruneAfterDays = settings?.prune_after_days ?? 180;
  const protectedTagIds = settings?.prune_protected_tag_ids ?? [];

  const d = db(c.env.DB);
  const result = await executePrune(d, pruneAfterDays, protectedTagIds);

  return c.json({ ok: true, data: result });
});
