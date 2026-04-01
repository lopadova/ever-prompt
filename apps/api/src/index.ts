import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { errorMiddleware } from './middleware/error';
import { authMiddleware } from './middleware/auth';
import { promptRoutes } from './routes/prompts';
import { bulkRoutes } from './routes/bulk';
import { searchRoutes } from './routes/search';
import { aiRoutes } from './routes/ai';
import { taxonomyRoutes } from './routes/taxonomy';
import { dashboardRoutes } from './routes/dashboard';
import { versionRoutes } from './routes/versions';
import { noteRoutes } from './routes/notes';
import { apiKeyRoutes } from './routes/api-keys';
import { savedSearchRoutes } from './routes/saved-searches';
import { settingsRoutes } from './routes/settings';
import { securityRoutes } from './routes/security';
import { queueRoutes } from './routes/queue';
import { sessionRoutes } from './routes/sessions';
import { pruneRoutes } from './routes/prune';
import { executePrune } from './routes/prune';
import { queueConsumer } from './queue/consumer';
import { kvGet } from './lib/kv';
import { db } from './lib/db';

const app = new Hono<Env>();

// Global middleware
app.use('/api/*', cors());
app.use('/api/*', errorMiddleware);
app.use('/api/*', authMiddleware);

// API routes
app.route('/api/v1/prompts', promptRoutes);
app.route('/api/v1/prompts', bulkRoutes);
app.route('/api/v1/search', searchRoutes);
app.route('/api/v1/prompts', aiRoutes);
app.route('/api/v1', taxonomyRoutes);
app.route('/api/v1/dashboard', dashboardRoutes);
app.route('/api/v1/prompts', versionRoutes);
app.route('/api/v1', noteRoutes);
app.route('/api/v1/api-keys', apiKeyRoutes);
app.route('/api/v1/saved-searches', savedSearchRoutes);
app.route('/api/v1/settings', settingsRoutes);
app.route('/api/v1/security', securityRoutes);
app.route('/api/v1/queue', queueRoutes);
app.route('/api/v1/sessions', sessionRoutes);
app.route('/api/v1/prune', pruneRoutes);

// SPA fallback
app.get('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default {
  fetch: app.fetch,
  queue: queueConsumer,
  scheduled: async (event: ScheduledEvent, env: Env['Bindings'], ctx: ExecutionContext) => {
    const settings = await kvGet<{
      prune_enabled: boolean;
      prune_after_days: number;
      prune_protected_tag_ids: string[];
    }>(env.KV, 'user:settings');

    if (settings?.prune_enabled) {
      const d = db(env.DB);
      const result = await executePrune(
        d,
        settings.prune_after_days ?? 180,
        settings.prune_protected_tag_ids ?? [],
      );
      console.log(`[scheduled] Auto-prune complete: pruned=${result.pruned_count}, protected=${result.protected_count}`);
    }
  },
};
