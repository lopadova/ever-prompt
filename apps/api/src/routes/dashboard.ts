import { Hono } from 'hono';
import type { Env } from '../env';
import { db } from '../lib/db';
import {
  getDashboardStats,
  getCreationChart,
  getQualityChart,
  getTagsChart,
  getProjectsChart,
  getRecentPrompts,
  getNeedsReviewPrompts,
} from '../services/dashboard.service';

export const dashboardRoutes = new Hono<Env>();

// GET /stats - Main KPIs
dashboardRoutes.get('/stats', async (c) => {
  const d = db(c.env.DB);
  const data = await getDashboardStats(d, c.env.KV);
  return c.json({ ok: true, data });
});

// GET /charts/creation - Prompts per week
dashboardRoutes.get('/charts/creation', async (c) => {
  const d = db(c.env.DB);
  const data = await getCreationChart(d, c.env.KV);
  return c.json({ ok: true, data });
});

// GET /charts/quality - Score/band distribution
dashboardRoutes.get('/charts/quality', async (c) => {
  const d = db(c.env.DB);
  const data = await getQualityChart(d, c.env.KV);
  return c.json({ ok: true, data });
});

// GET /charts/tags - Top tags
dashboardRoutes.get('/charts/tags', async (c) => {
  const d = db(c.env.DB);
  const data = await getTagsChart(d, c.env.KV);
  return c.json({ ok: true, data });
});

// GET /charts/projects - Usage by project
dashboardRoutes.get('/charts/projects', async (c) => {
  const d = db(c.env.DB);
  const data = await getProjectsChart(d, c.env.KV);
  return c.json({ ok: true, data });
});

// GET /recent - Last 10 prompts
dashboardRoutes.get('/recent', async (c) => {
  const d = db(c.env.DB);
  const data = await getRecentPrompts(d);
  return c.json({ ok: true, data });
});

// GET /needs-review - Inbox/failed/low-score prompts
dashboardRoutes.get('/needs-review', async (c) => {
  const d = db(c.env.DB);
  const data = await getNeedsReviewPrompts(d);
  return c.json({ ok: true, data });
});
