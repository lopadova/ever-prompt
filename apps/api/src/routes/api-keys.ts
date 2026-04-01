import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../env';
import { db } from '../lib/db';
import { generateApiKey, listApiKeys, updateApiKey, revokeApiKey } from '../services/api-key.service';

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).optional(),
  default_project_id: z.string().optional(),
  expires_at: z.string().optional(),
});

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  permissions: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  default_project_id: z.string().nullable().optional(),
});

export const apiKeyRoutes = new Hono<Env>();

// GET / - List API keys
apiKeyRoutes.get('/', async (c) => {
  const d = db(c.env.DB);
  const data = await listApiKeys(d);
  return c.json({ ok: true, data });
});

// POST / - Generate new API key
apiKeyRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }
  const d = db(c.env.DB);
  const data = await generateApiKey(d, parsed.data);
  return c.json({ ok: true, data }, 201);
});

// PATCH /:id - Update API key
apiKeyRoutes.patch('/:id', async (c) => {
  const body = await c.req.json();
  const parsed = updateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } }, 400);
  }
  const d = db(c.env.DB);
  const data = await updateApiKey(d, c.req.param('id'), parsed.data);
  if (!data) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'API key not found' } }, 404);
  }
  return c.json({ ok: true, data });
});

// DELETE /:id - Revoke API key
apiKeyRoutes.delete('/:id', async (c) => {
  const d = db(c.env.DB);
  const result = await revokeApiKey(d, c.req.param('id'));
  if (!result) {
    return c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'API key not found' } }, 404);
  }
  return c.json({ ok: true, data: result });
});
