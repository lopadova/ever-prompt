import { eq, desc, asc, sql } from 'drizzle-orm';
import { projects, categories, tags, promptTags } from '@everprompt/db';
import { ulid, slugify } from '@everprompt/shared';
import type { DB } from '../lib/db';

// ---- Projects ----

export async function listProjects(d: DB) {
  return d.select().from(projects).orderBy(asc(projects.name));
}

export async function createProject(d: DB, input: { name: string; slug?: string; color?: string; icon?: string; description?: string }) {
  const now = new Date().toISOString();
  const id = ulid();
  const slug = input.slug || slugify(input.name);

  await d.insert(projects).values({
    id,
    name: input.name,
    slug,
    color: input.color ?? null,
    icon: input.icon ?? null,
    description: input.description ?? null,
    prompt_count: 0,
    created_at: now,
    updated_at: now,
  });

  const [created] = await d.select().from(projects).where(eq(projects.id, id)).limit(1);
  return created;
}

export async function updateProject(d: DB, id: string, input: { name?: string; slug?: string; color?: string; icon?: string; description?: string }) {
  const [existing] = await d.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };
  if (input.name !== undefined) updates.name = input.name;
  if (input.slug !== undefined) updates.slug = input.slug;
  if (input.color !== undefined) updates.color = input.color;
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.description !== undefined) updates.description = input.description;

  await d.update(projects).set(updates).where(eq(projects.id, id));
  const [updated] = await d.select().from(projects).where(eq(projects.id, id)).limit(1);
  return updated;
}

export async function deleteProject(d: DB, id: string) {
  const [existing] = await d.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!existing) return null;
  if (existing.prompt_count > 0) {
    throw new Error('Cannot delete project with prompts. Move or delete prompts first.');
  }
  await d.delete(projects).where(eq(projects.id, id));
  return { id };
}

// ---- Categories ----

export async function listCategories(d: DB) {
  return d.select().from(categories).orderBy(asc(categories.sort_order), asc(categories.name));
}

export async function getCategoryTree(d: DB) {
  const all = await d.select().from(categories).orderBy(asc(categories.sort_order), asc(categories.name));

  // Build tree from flat list
  const map = new Map<string, typeof all[0] & { children: typeof all }>();
  const roots: (typeof all[0] & { children: typeof all })[] = [];

  for (const cat of all) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of all) {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function createCategory(d: DB, input: { name: string; slug?: string; parent_id?: string | null; sort_order?: number; color?: string; icon?: string }) {
  const id = ulid();
  const slug = input.slug || slugify(input.name);

  await d.insert(categories).values({
    id,
    name: input.name,
    slug,
    parent_id: input.parent_id ?? null,
    sort_order: input.sort_order ?? 0,
    color: input.color ?? null,
    icon: input.icon ?? null,
    prompt_count: 0,
  });

  const [created] = await d.select().from(categories).where(eq(categories.id, id)).limit(1);
  return created;
}

export async function updateCategory(d: DB, id: string, input: { name?: string; slug?: string; parent_id?: string | null; sort_order?: number; color?: string; icon?: string }) {
  const [existing] = await d.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!existing) return null;

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.slug !== undefined) updates.slug = input.slug;
  if (input.parent_id !== undefined) updates.parent_id = input.parent_id;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
  if (input.color !== undefined) updates.color = input.color;
  if (input.icon !== undefined) updates.icon = input.icon;

  await d.update(categories).set(updates).where(eq(categories.id, id));
  const [updated] = await d.select().from(categories).where(eq(categories.id, id)).limit(1);
  return updated;
}

export async function deleteCategory(d: DB, id: string) {
  const [existing] = await d.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!existing) return null;
  await d.delete(categories).where(eq(categories.id, id));
  return { id };
}

// ---- Tags ----

export async function listTags(d: DB) {
  return d.select().from(tags).orderBy(desc(tags.usage_count), asc(tags.name));
}

export async function createTag(d: DB, input: { name: string; kind?: string; color?: string }) {
  const id = ulid();
  const slug = slugify(input.name);
  const now = new Date().toISOString();

  await d.insert(tags).values({
    id,
    name: input.name,
    slug,
    kind: input.kind ?? 'topic',
    color: input.color ?? null,
    usage_count: 0,
    is_ai_generated: false,
    created_at: now,
  });

  const [created] = await d.select().from(tags).where(eq(tags.id, id)).limit(1);
  return created;
}

export async function updateTag(d: DB, id: string, input: { name?: string; kind?: string; color?: string }) {
  const [existing] = await d.select().from(tags).where(eq(tags.id, id)).limit(1);
  if (!existing) return null;

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) {
    updates.name = input.name;
    updates.slug = slugify(input.name);
  }
  if (input.kind !== undefined) updates.kind = input.kind;
  if (input.color !== undefined) updates.color = input.color;

  await d.update(tags).set(updates).where(eq(tags.id, id));
  const [updated] = await d.select().from(tags).where(eq(tags.id, id)).limit(1);
  return updated;
}

export async function deleteTag(d: DB, id: string) {
  const [existing] = await d.select().from(tags).where(eq(tags.id, id)).limit(1);
  if (!existing) return null;
  // Remove from prompt_tags
  await d.delete(promptTags).where(eq(promptTags.tag_id, id));
  await d.delete(tags).where(eq(tags.id, id));
  return { id };
}

export async function mergeTags(d: DB, sourceTagId: string, targetTagId: string) {
  const [source] = await d.select().from(tags).where(eq(tags.id, sourceTagId)).limit(1);
  const [target] = await d.select().from(tags).where(eq(tags.id, targetTagId)).limit(1);
  if (!source || !target) return null;

  // Move all prompt_tags from source to target
  // First, delete any duplicates (prompts that already have target tag)
  const existingTargetPairs = await d.select({ prompt_id: promptTags.prompt_id })
    .from(promptTags)
    .where(eq(promptTags.tag_id, targetTagId));
  const existingPromptIds = new Set(existingTargetPairs.map(p => p.prompt_id));

  // Get source tag associations
  const sourcePairs = await d.select().from(promptTags).where(eq(promptTags.tag_id, sourceTagId));

  // Move non-duplicate associations
  for (const pair of sourcePairs) {
    if (!existingPromptIds.has(pair.prompt_id)) {
      await d.update(promptTags)
        .set({ tag_id: targetTagId })
        .where(sql`${promptTags.prompt_id} = ${pair.prompt_id} AND ${promptTags.tag_id} = ${sourceTagId}`);
    }
  }

  // Delete remaining source tag associations (duplicates)
  await d.delete(promptTags).where(eq(promptTags.tag_id, sourceTagId));

  // Update target usage count
  await d.update(tags).set({
    usage_count: sql`${tags.usage_count} + ${source.usage_count}`,
  }).where(eq(tags.id, targetTagId));

  // Delete source tag
  await d.delete(tags).where(eq(tags.id, sourceTagId));

  const [updated] = await d.select().from(tags).where(eq(tags.id, targetTagId)).limit(1);
  return updated;
}
