import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';

export const errorMiddleware = createMiddleware<Env>(async (c, next) => {
  try {
    await next();
  } catch (err) {
    console.error('Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return c.json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message },
    }, 500);
  }
});
