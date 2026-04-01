import { Hono } from 'hono';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import type { Env } from '../env';
import { db } from '../lib/db';
import { promptVersions, prompts } from '@everprompt/db';
import { ulid, sha256, softFingerprint, MAX_PROMPT_LENGTH } from '@everprompt/shared';

const createVersionSchema = z.object({
  body: z.string().min(1).max(MAX_PROMPT_LENGTH),
  kind: z.enum(['edited', 'snapshot', 'improved_ai']).default('edited'),
});

export const versionRoutes = new Hono<Env>();

// GET /:id/versions - List versions for a prompt
versionRoutes.get('/:id/versions', async (c) => {
  const d = db(c.env.DB);
  const promptId = c.req.param('id');
  const data = await d.select().from(promptVersions)
    .where(eq(promptVersions.prompt_id, promptId))
    .orderBy(desc(promptVersions.version_no));
  return c.json({ ok: true, data });
});

// POST /:id/versions - Create manual version
versionRoutes.post('/:id/versions', async (c) => {
  const body = await c.req.json();
  const parsed = createVersionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }

  const d = db(c.env.DB);
  const promptId = c.req.param('id');
  const now = new Date().toISOString();

  // Get current latest version number
  const [latestVersion] = await d.select({ version_no: promptVersions.version_no })
    .from(promptVersions)
    .where(eq(promptVersions.prompt_id, promptId))
    .orderBy(desc(promptVersions.version_no))
    .limit(1);

  const nextVersionNo = (latestVersion?.version_no ?? 0) + 1;
  const id = ulid();

  await d.insert(promptVersions).values({
    id,
    prompt_id: promptId,
    version_no: nextVersionNo,
    body: parsed.data.body,
    kind: parsed.data.kind,
    diff_from_previous: null,
    created_at: now,
  });

  const [created] = await d.select().from(promptVersions).where(eq(promptVersions.id, id)).limit(1);
  return c.json({ ok: true, data: created }, 201);
});

// GET /:id/versions/:vid - Get specific version
versionRoutes.get('/:id/versions/:vid', async (c) => {
  const d = db(c.env.DB);
  const vid = c.req.param('vid');
  const [version] = await d.select().from(promptVersions).where(eq(promptVersions.id, vid)).limit(1);

  if (!version) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Version not found' } }, 404);
  }

  return c.json({ ok: true, data: version });
});

// POST /:id/versions/:vid/apply - Apply version as current body
versionRoutes.post('/:id/versions/:vid/apply', async (c) => {
  const d = db(c.env.DB);
  const promptId = c.req.param('id');
  const vid = c.req.param('vid');

  const [version] = await d.select().from(promptVersions).where(eq(promptVersions.id, vid)).limit(1);
  if (!version) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Version not found' } }, 404);
  }

  const [existingPrompt] = await d.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
  if (!existingPrompt) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Prompt not found' } }, 404);
  }

  const now = new Date().toISOString();
  const bodyNormalized = version.body.replace(/\r\n/g, '\n').trim();
  const words = bodyNormalized.split(/\s+/).filter(Boolean);
  const hashSha256 = await sha256(version.body);
  const fp = await softFingerprint(version.body);

  // Update the prompt body
  await d.update(prompts).set({
    body_original: version.body,
    body_normalized: bodyNormalized,
    hash_sha256: hashSha256,
    fingerprint: fp,
    word_count: words.length,
    char_count: bodyNormalized.length,
    ai_status: 'pending',
    search_text: [existingPrompt.title, bodyNormalized].filter(Boolean).join(' '),
    updated_at: now,
  }).where(eq(prompts.id, promptId));

  // Create a new version record for this application
  const [latestVersion] = await d.select({ version_no: promptVersions.version_no })
    .from(promptVersions)
    .where(eq(promptVersions.prompt_id, promptId))
    .orderBy(desc(promptVersions.version_no))
    .limit(1);
  const nextVersionNo = (latestVersion?.version_no ?? 0) + 1;

  await d.insert(promptVersions).values({
    id: ulid(),
    prompt_id: promptId,
    version_no: nextVersionNo,
    body: version.body,
    kind: 'edited',
    diff_from_previous: null,
    created_at: now,
  });

  // Re-enqueue AI pipeline
  await c.env.AI_QUEUE.send({ promptId, action: 'reanalyze' });

  const [updated] = await d.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
  return c.json({ ok: true, data: updated });
});
