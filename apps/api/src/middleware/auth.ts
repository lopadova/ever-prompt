import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';
import { db } from '../lib/db';
import { apiKeys } from '@everprompt/db';
import { eq, and } from 'drizzle-orm';
import { sha256 } from '@everprompt/shared';

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  // Check for API key auth first (plugin/external)
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ep_')) {
    const token = authHeader.slice(7);
    const keyHash = await sha256(token);
    const d = db(c.env.DB);
    const [key] = await d.select().from(apiKeys)
      .where(and(eq(apiKeys.key_hash, keyHash), eq(apiKeys.is_active, true)))
      .limit(1);

    if (!key) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }, 401);
    }

    // Check expiry
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'API key expired' } }, 401);
    }

    // Update last_used_at (fire-and-forget, non-blocking)
    c.executionCtx.waitUntil(
      d.update(apiKeys).set({ last_used_at: new Date().toISOString() }).where(eq(apiKeys.id, key.id))
    );

    let permissions: string[] = [];
    try {
      permissions = JSON.parse(key.permissions);
    } catch {
      return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API key configuration' } }, 401);
    }

    c.set('authType', 'api_key');
    c.set('apiKeyId', key.id);
    c.set('permissions', permissions);
    return next();
  }

  // Check for Cloudflare Access JWT
  const cfAccessJwt = c.req.header('CF-Access-JWT-Assertion');
  if (cfAccessJwt) {
    // In production, validate JWT signature against CF Access certs.
    // For now, trust the header presence (CF Access validates before it reaches the worker).
    c.set('authType', 'zero_trust');
    return next();
  }

  // Dev mode: allow unauthenticated
  if (c.env.ENVIRONMENT === 'development') {
    c.set('authType', 'dev');
    return next();
  }

  return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
});
