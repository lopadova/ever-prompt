import { eq, desc, and, sql, like, count as drizzleCount, asc } from 'drizzle-orm';
import { prompts, promptTags, promptVersions, promptAiReviews, tags, projects, categories, notes, activityLog, sessions } from '@everprompt/db';
import { ulid, sha256, softFingerprint, slugify } from '@everprompt/shared';
import type { CreatePromptInput, UpdatePromptInput, IngestPromptInput } from '@everprompt/shared';
import type { DB } from '../lib/db';
import { db } from '../lib/db';
import { paginationMeta, paginationOffset } from '../lib/pagination';
import type { Env } from '../env';

export async function createPrompt(
  env: Env['Bindings'],
  input: CreatePromptInput
) {
  const d = db(env.DB);
  const now = new Date().toISOString();
  const id = ulid();

  const bodyNormalized = input.body_original.replace(/\r\n/g, '\n').trim();
  const words = bodyNormalized.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = bodyNormalized.length;
  const hashSha256 = await sha256(input.body_original);
  const fp = await softFingerprint(input.body_original);

  const title = input.title || '';
  const searchText = [title, bodyNormalized].filter(Boolean).join(' ');

  await d.insert(prompts).values({
    id,
    project_id: input.project_id ?? null,
    category_id: input.category_id ?? null,
    title,
    abstract: '',
    body_original: input.body_original,
    body_normalized: bodyNormalized,
    language: input.language || 'en',
    source: input.source,
    status: 'inbox',
    quality_band: null,
    overall_score: null,
    ai_status: 'pending',
    is_favorite: false,
    is_pinned: false,
    has_improved_version: false,
    has_security_issues: false,
    security_issues_json: null,
    hash_sha256: hashSha256,
    fingerprint: fp,
    word_count: wordCount,
    char_count: charCount,
    search_text: searchText,
    ai_analyzed_at: null,
    last_used_at: null,
    created_at: now,
    updated_at: now,
  });

  // Link manual tags if provided
  if (input.tag_ids && input.tag_ids.length > 0) {
    await d.insert(promptTags).values(
      input.tag_ids.map(tagId => ({
        prompt_id: id,
        tag_id: tagId,
        confidence: 1.0,
        origin: 'manual',
      }))
    );
    // Update usage counts
    for (const tagId of input.tag_ids) {
      await d.update(tags).set({
        usage_count: sql`${tags.usage_count} + 1`,
      }).where(eq(tags.id, tagId));
    }
  }

  // Update project prompt_count if assigned
  if (input.project_id) {
    await d.update(projects).set({
      prompt_count: sql`${projects.prompt_count} + 1`,
    }).where(eq(projects.id, input.project_id));
  }

  // Update category prompt_count if assigned
  if (input.category_id) {
    await d.update(categories).set({
      prompt_count: sql`${categories.prompt_count} + 1`,
    }).where(eq(categories.id, input.category_id));
  }

  // Create initial prompt_version (kind: 'original')
  await d.insert(promptVersions).values({
    id: ulid(),
    prompt_id: id,
    version_no: 1,
    body: input.body_original,
    kind: 'original',
    diff_from_previous: null,
    created_at: now,
  });

  // Enqueue AI pipeline job
  await env.AI_QUEUE.send({ promptId: id, action: 'analyze' });

  // Log to activity_log
  await d.insert(activityLog).values({
    id: ulid(),
    entity_type: 'prompt',
    entity_id: id,
    action: 'created',
    payload_json: JSON.stringify({ source: input.source }),
    created_at: now,
  });

  // Return the created prompt
  const [created] = await d.select().from(prompts).where(eq(prompts.id, id)).limit(1);
  return created;
}

export async function ingestPrompt(
  env: Env['Bindings'],
  input: IngestPromptInput,
  apiKeyId?: string
) {
  const d = db(env.DB);

  // Resolve project by slug if provided
  let projectId: string | null = null;
  if (input.project_slug) {
    const [project] = await d.select().from(projects)
      .where(eq(projects.slug, input.project_slug))
      .limit(1);
    if (project) {
      projectId = project.id;
    }
  }

  // Handle session tracking
  let sessionId: string | null = null;
  if (input.session_id) {
    const now = new Date().toISOString();

    // Look up existing session by external_id
    const [existingSession] = await d.select().from(sessions)
      .where(eq(sessions.external_id, input.session_id))
      .limit(1);

    if (existingSession) {
      sessionId = existingSession.id;

      // Update session stats
      await d.update(sessions).set({
        prompt_count: sql`${sessions.prompt_count} + 1`,
        last_prompt_at: now,
        updated_at: now,
      }).where(eq(sessions.id, existingSession.id));
    } else {
      // Create new session
      sessionId = ulid();
      const sessionName = input.session_name || 'Session (pending)';

      await d.insert(sessions).values({
        id: sessionId,
        external_id: input.session_id,
        name: sessionName,
        source: 'plugin',
        prompt_count: 1,
        first_prompt_at: now,
        last_prompt_at: now,
        created_at: now,
        updated_at: now,
      });

      // Queue AI session naming if no name was provided
      if (!input.session_name) {
        await env.AI_QUEUE.send({
          action: 'name_session',
          sessionId,
          promptBody: input.body_original,
        });
      }
    }
  }

  const prompt = await createPrompt(env, {
    body_original: input.body_original,
    source: input.source,
    project_id: projectId ?? undefined,
  });

  // Link prompt to session if we have one
  if (sessionId && prompt) {
    await d.update(prompts).set({ session_id: sessionId })
      .where(eq(prompts.id, prompt.id));
  }

  return prompt;
}

export async function listPrompts(
  d: DB,
  params: {
    page: number;
    per_page: number;
    status?: string;
    project_id?: string;
    category_id?: string;
    is_favorite?: boolean;
    sort_field?: string;
    sort_dir?: 'asc' | 'desc';
  }
) {
  const { limit, offset } = paginationOffset(params.page, params.per_page);

  const conditions = [];
  if (params.status) conditions.push(eq(prompts.status, params.status));
  if (params.project_id) conditions.push(eq(prompts.project_id, params.project_id));
  if (params.category_id) conditions.push(eq(prompts.category_id, params.category_id));
  if (params.is_favorite !== undefined) conditions.push(eq(prompts.is_favorite, params.is_favorite));

  // Exclude soft-deleted by default unless explicitly asking for deleted
  if (!params.status) {
    conditions.push(sql`${prompts.status} != 'deleted'`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Get sort column
  const sortDir = params.sort_dir === 'asc' ? asc : desc;
  let orderBy;
  switch (params.sort_field) {
    case 'title': orderBy = sortDir(prompts.title); break;
    case 'overall_score': orderBy = sortDir(prompts.overall_score); break;
    case 'updated_at': orderBy = sortDir(prompts.updated_at); break;
    default: orderBy = sortDir(prompts.created_at); break;
  }

  const [totalResult] = await d.select({ count: drizzleCount() }).from(prompts).where(where);
  const total = totalResult.count;

  const rows = await d.select().from(prompts)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  // Fetch tags for all returned prompts
  const promptIds = rows.map(r => r.id);
  const promptTagRows = promptIds.length > 0
    ? await d.select({
        prompt_id: promptTags.prompt_id,
        tag_id: promptTags.tag_id,
        confidence: promptTags.confidence,
        origin: promptTags.origin,
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

  const data = rows.map(r => ({
    ...r,
    tags: (tagMap.get(r.id) ?? []).map(t => ({
      id: t.tag_id,
      name: t.name,
      slug: t.slug,
      color: t.color,
    })),
  }));

  return {
    data,
    meta: paginationMeta(total, params.page, params.per_page),
  };
}

export async function getPromptById(d: DB, id: string) {
  const [prompt] = await d.select().from(prompts).where(eq(prompts.id, id)).limit(1);
  if (!prompt) return null;

  // Fetch related data in parallel
  const [promptTagsData, versionsData, reviewsData, notesData] = await Promise.all([
    d.select({
      tag_id: promptTags.tag_id,
      confidence: promptTags.confidence,
      origin: promptTags.origin,
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      kind: tags.kind,
      color: tags.color,
      usage_count: tags.usage_count,
      is_ai_generated: tags.is_ai_generated,
      created_at: tags.created_at,
    })
    .from(promptTags)
    .innerJoin(tags, eq(promptTags.tag_id, tags.id))
    .where(eq(promptTags.prompt_id, id)),

    d.select().from(promptVersions)
      .where(eq(promptVersions.prompt_id, id))
      .orderBy(desc(promptVersions.version_no)),

    d.select().from(promptAiReviews)
      .where(eq(promptAiReviews.prompt_id, id))
      .orderBy(desc(promptAiReviews.created_at)),

    d.select().from(notes)
      .where(eq(notes.prompt_id, id))
      .orderBy(desc(notes.created_at)),
  ]);

  // Fetch project and category if assigned
  let project = null;
  let category = null;
  if (prompt.project_id) {
    const [p] = await d.select().from(projects).where(eq(projects.id, prompt.project_id)).limit(1);
    project = p ?? null;
  }
  if (prompt.category_id) {
    const [c] = await d.select().from(categories).where(eq(categories.id, prompt.category_id)).limit(1);
    category = c ?? null;
  }

  return {
    ...prompt,
    tags: promptTagsData.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      kind: t.kind,
      color: t.color,
      usage_count: t.usage_count,
      is_ai_generated: t.is_ai_generated,
      created_at: t.created_at,
      confidence: t.confidence,
      origin: t.origin,
    })),
    project,
    category,
    latest_review: reviewsData[0] ?? null,
    versions: versionsData,
    notes: notesData,
  };
}

export async function updatePrompt(
  d: DB,
  id: string,
  input: UpdatePromptInput,
  enqueue?: Queue
) {
  const [existing] = await d.select().from(prompts).where(eq(prompts.id, id)).limit(1);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };

  if (input.title !== undefined) updates.title = input.title;
  if (input.status !== undefined) updates.status = input.status;
  if (input.is_favorite !== undefined) updates.is_favorite = input.is_favorite;
  if (input.is_pinned !== undefined) updates.is_pinned = input.is_pinned;
  if (input.project_id !== undefined) updates.project_id = input.project_id;
  if (input.category_id !== undefined) updates.category_id = input.category_id;

  // If body changed, recompute hashes and re-enqueue
  if (input.body_original !== undefined && input.body_original !== existing.body_original) {
    const bodyNormalized = input.body_original.replace(/\r\n/g, '\n').trim();
    const words = bodyNormalized.split(/\s+/).filter(Boolean);
    updates.body_original = input.body_original;
    updates.body_normalized = bodyNormalized;
    updates.hash_sha256 = await sha256(input.body_original);
    updates.fingerprint = await softFingerprint(input.body_original);
    updates.word_count = words.length;
    updates.char_count = bodyNormalized.length;
    updates.ai_status = 'pending';
    updates.search_text = [(updates.title as string) || existing.title, bodyNormalized].filter(Boolean).join(' ');

    // Get the latest version number
    const [latestVersion] = await d.select({ version_no: promptVersions.version_no })
      .from(promptVersions)
      .where(eq(promptVersions.prompt_id, id))
      .orderBy(desc(promptVersions.version_no))
      .limit(1);
    const nextVersionNo = (latestVersion?.version_no ?? 0) + 1;

    // Create new version
    await d.insert(promptVersions).values({
      id: ulid(),
      prompt_id: id,
      version_no: nextVersionNo,
      body: input.body_original,
      kind: 'edited',
      diff_from_previous: null,
      created_at: now,
    });

    // Re-enqueue pipeline
    if (enqueue) {
      await enqueue.send({ promptId: id, action: 'reanalyze' });
    }
  }

  // Handle project_id change: update counters
  if (input.project_id !== undefined && input.project_id !== existing.project_id) {
    if (existing.project_id) {
      await d.update(projects).set({
        prompt_count: sql`MAX(${projects.prompt_count} - 1, 0)`,
      }).where(eq(projects.id, existing.project_id));
    }
    if (input.project_id) {
      await d.update(projects).set({
        prompt_count: sql`${projects.prompt_count} + 1`,
      }).where(eq(projects.id, input.project_id));
    }
  }

  // Handle category_id change: update counters
  if (input.category_id !== undefined && input.category_id !== existing.category_id) {
    if (existing.category_id) {
      await d.update(categories).set({
        prompt_count: sql`MAX(${categories.prompt_count} - 1, 0)`,
      }).where(eq(categories.id, existing.category_id));
    }
    if (input.category_id) {
      await d.update(categories).set({
        prompt_count: sql`${categories.prompt_count} + 1`,
      }).where(eq(categories.id, input.category_id));
    }
  }

  await d.update(prompts).set(updates).where(eq(prompts.id, id));

  // Return full prompt detail (with tags, review, etc.) so response is consistent with GET /:id
  return getPromptById(d, id);
}

export async function deletePrompt(d: DB, id: string) {
  const [existing] = await d.select().from(prompts).where(eq(prompts.id, id)).limit(1);
  if (!existing) return null;

  const now = new Date().toISOString();
  await d.update(prompts).set({ status: 'deleted', updated_at: now }).where(eq(prompts.id, id));

  // Update counters
  if (existing.project_id) {
    await d.update(projects).set({
      prompt_count: sql`MAX(${projects.prompt_count} - 1, 0)`,
    }).where(eq(projects.id, existing.project_id));
  }
  if (existing.category_id) {
    await d.update(categories).set({
      prompt_count: sql`MAX(${categories.prompt_count} - 1, 0)`,
    }).where(eq(categories.id, existing.category_id));
  }

  // Log activity
  await d.insert(activityLog).values({
    id: ulid(),
    entity_type: 'prompt',
    entity_id: id,
    action: 'deleted',
    payload_json: null,
    created_at: now,
  });

  return { id };
}
