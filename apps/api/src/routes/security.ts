import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../env';
import { kvGet, kvSet } from '../lib/kv';
import type { CustomPatternDef } from '../ai/security-scan';

const KV_KEY = 'security:custom-patterns';

const addPatternSchema = z.object({
  pattern: z.string().min(1),
  flags: z.string().optional(),
  type: z.enum(['api_key', 'password', 'credit_card', 'private_key', 'token', 'email', 'ip_address', 'other']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string().min(1),
});

export const securityRoutes = new Hono<Env>();

// GET / - List custom patterns
securityRoutes.get('/patterns', async (c) => {
  const patterns = await kvGet<CustomPatternDef[]>(c.env.KV, KV_KEY) ?? [];
  return c.json({ ok: true, data: patterns });
});

// POST / - Add a custom pattern
securityRoutes.post('/patterns', async (c) => {
  const body = await c.req.json();
  const parsed = addPatternSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } },
      400,
    );
  }

  // Validate that the regex is valid
  try {
    new RegExp(parsed.data.pattern, parsed.data.flags || 'g');
  } catch {
    return c.json(
      { ok: false, error: { code: 'INVALID_REGEX', message: 'Invalid regular expression pattern' } },
      400,
    );
  }

  const patterns = await kvGet<CustomPatternDef[]>(c.env.KV, KV_KEY) ?? [];
  patterns.push(parsed.data);

  // Custom patterns don't expire - use a long TTL (30 days)
  await kvSet(c.env.KV, KV_KEY, patterns, 60 * 60 * 24 * 30);

  return c.json({ ok: true, data: patterns }, 201);
});

// DELETE /:index - Remove pattern by index
securityRoutes.delete('/patterns/:index', async (c) => {
  const index = parseInt(c.req.param('index'), 10);
  if (isNaN(index) || index < 0) {
    return c.json(
      { ok: false, error: { code: 'INVALID_INDEX', message: 'Index must be a non-negative integer' } },
      400,
    );
  }

  const patterns = await kvGet<CustomPatternDef[]>(c.env.KV, KV_KEY) ?? [];
  if (index >= patterns.length) {
    return c.json(
      { ok: false, error: { code: 'NOT_FOUND', message: `Pattern at index ${index} not found` } },
      404,
    );
  }

  patterns.splice(index, 1);
  await kvSet(c.env.KV, KV_KEY, patterns, 60 * 60 * 24 * 30);

  return c.json({ ok: true, data: patterns });
});
