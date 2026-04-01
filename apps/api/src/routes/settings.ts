import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../env';
import { kvGet, kvSet } from '../lib/kv';

const SETTINGS_KEY = 'user:settings';

interface UserSettings {
  view_mode: 'grid' | 'list' | 'table';
  theme: 'dark' | 'light' | 'system';
  default_project_id: string | null;
  default_sort_field: string;
  default_sort_dir: string;
  prompts_per_page: number;
  show_ai_scores: boolean;
  auto_analyze: boolean;
  ai_provider: 'anthropic' | 'openai' | 'openrouter' | 'workers-ai';
  ai_classify_model: string;
  ai_score_model: string;
  prune_enabled: boolean;
  prune_after_days: number;
  prune_protected_tag_ids: string[];
}

const DEFAULT_SETTINGS: UserSettings = {
  view_mode: 'grid',
  theme: 'dark',
  default_project_id: null,
  default_sort_field: 'created_at',
  default_sort_dir: 'desc',
  prompts_per_page: 24,
  show_ai_scores: true,
  auto_analyze: true,
  ai_provider: 'anthropic',
  ai_classify_model: 'claude-haiku-4-5-20251001',
  ai_score_model: 'claude-sonnet-4-20250514',
  prune_enabled: false,
  prune_after_days: 180,
  prune_protected_tag_ids: [],
};

const updateSettingsSchema = z.object({
  view_mode: z.enum(['grid', 'list', 'table']).optional(),
  theme: z.enum(['dark', 'light', 'system']).optional(),
  default_project_id: z.string().nullable().optional(),
  default_sort_field: z.string().optional(),
  default_sort_dir: z.string().optional(),
  prompts_per_page: z.number().int().min(12).max(100).optional(),
  show_ai_scores: z.boolean().optional(),
  auto_analyze: z.boolean().optional(),
  ai_provider: z.enum(['anthropic', 'openai', 'openrouter', 'workers-ai']).optional(),
  ai_classify_model: z.string().optional(),
  ai_score_model: z.string().optional(),
  prune_enabled: z.boolean().optional(),
  prune_after_days: z.number().int().min(7).max(3650).optional(),
  prune_protected_tag_ids: z.array(z.string()).optional(),
});

export const settingsRoutes = new Hono<Env>();

// GET / - Get settings
settingsRoutes.get('/', async (c) => {
  const existing = await kvGet<UserSettings>(c.env.KV, SETTINGS_KEY);
  const data = existing ? { ...DEFAULT_SETTINGS, ...existing } : DEFAULT_SETTINGS;
  return c.json({ ok: true, data });
});

// PATCH / - Update settings
settingsRoutes.patch('/', async (c) => {
  const body = await c.req.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }

  const existing = await kvGet<UserSettings>(c.env.KV, SETTINGS_KEY);
  const merged = { ...DEFAULT_SETTINGS, ...existing, ...parsed.data };

  // Settings don't expire - use a long TTL (30 days)
  await kvSet(c.env.KV, SETTINGS_KEY, merged, 60 * 60 * 24 * 30);

  return c.json({ ok: true, data: merged });
});
