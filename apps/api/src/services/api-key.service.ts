import { eq } from 'drizzle-orm';
import { apiKeys } from '@everprompt/db';
import { ulid, sha256, API_KEY_PREFIX, API_KEY_LENGTH } from '@everprompt/shared';
import type { DB } from '../lib/db';

function generateRandomKey(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, v => chars[v % chars.length]).join('');
}

export async function generateApiKey(
  d: DB,
  input: { name: string; permissions?: string[]; default_project_id?: string; expires_at?: string }
) {
  const id = ulid();
  const now = new Date().toISOString();

  // Generate the raw key: ep_ + random chars
  const rawKey = API_KEY_PREFIX + generateRandomKey(API_KEY_LENGTH - API_KEY_PREFIX.length);
  const keyHash = await sha256(rawKey);
  const keyPrefix = rawKey.slice(0, 8) + '...';

  const permissions = input.permissions ?? ['ingest', 'read'];

  await d.insert(apiKeys).values({
    id,
    name: input.name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    permissions: JSON.stringify(permissions),
    default_project_id: input.default_project_id ?? null,
    last_used_at: null,
    expires_at: input.expires_at ?? null,
    is_active: true,
    created_at: now,
  });

  const [created] = await d.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);

  // Return with the raw key (only time it's visible)
  return {
    ...created,
    key: rawKey,
  };
}

export async function listApiKeys(d: DB) {
  const keys = await d.select().from(apiKeys);
  // Never return the hash, return safe view
  return keys.map(k => ({
    id: k.id,
    name: k.name,
    key_prefix: k.key_prefix,
    permissions: JSON.parse(k.permissions),
    default_project_id: k.default_project_id,
    last_used_at: k.last_used_at,
    expires_at: k.expires_at,
    is_active: k.is_active,
    created_at: k.created_at,
  }));
}

export async function updateApiKey(
  d: DB,
  id: string,
  input: { name?: string; permissions?: string[]; is_active?: boolean; default_project_id?: string | null }
) {
  const [existing] = await d.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  if (!existing) return null;

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.permissions !== undefined) updates.permissions = JSON.stringify(input.permissions);
  if (input.is_active !== undefined) updates.is_active = input.is_active;
  if (input.default_project_id !== undefined) updates.default_project_id = input.default_project_id;

  await d.update(apiKeys).set(updates).where(eq(apiKeys.id, id));
  const [updated] = await d.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  return {
    id: updated.id,
    name: updated.name,
    key_prefix: updated.key_prefix,
    permissions: JSON.parse(updated.permissions),
    default_project_id: updated.default_project_id,
    last_used_at: updated.last_used_at,
    expires_at: updated.expires_at,
    is_active: updated.is_active,
    created_at: updated.created_at,
  };
}

export async function revokeApiKey(d: DB, id: string) {
  const [existing] = await d.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
  if (!existing) return null;
  await d.delete(apiKeys).where(eq(apiKeys.id, id));
  return { id };
}
