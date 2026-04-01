import { sql, eq, desc, count as drizzleCount } from 'drizzle-orm';
import { prompts, tags, promptTags, projects, categories, activityLog } from '@everprompt/db';
import type { DB } from '../lib/db';
import { kvGet, kvSet, kvInvalidate } from '../lib/kv';
import type { DashboardStats, ChartDataPoint, TimeSeriesPoint } from '@everprompt/shared';

const KV_DASHBOARD_STATS = 'dashboard:stats';
const KV_DASHBOARD_CHARTS_PREFIX = 'dashboard:charts:';
const KV_TTL = 300; // 5 minutes

export async function getDashboardStats(d: DB, kv: KVNamespace): Promise<DashboardStats> {
  const cached = await kvGet<DashboardStats>(kv, KV_DASHBOARD_STATS);
  if (cached) return cached;

  const [totalResult] = await d.select({ count: drizzleCount() }).from(prompts)
    .where(sql`${prompts.status} != 'deleted'`);
  const totalPrompts = totalResult.count;

  const [analyzedResult] = await d.select({ count: drizzleCount() }).from(prompts)
    .where(sql`${prompts.ai_status} = 'complete' AND ${prompts.status} != 'deleted'`);
  const analyzedCount = analyzedResult.count;

  const [avgResult] = await d.select({ avg: sql<number>`COALESCE(AVG(${prompts.overall_score}), 0)` }).from(prompts)
    .where(sql`${prompts.overall_score} IS NOT NULL AND ${prompts.status} != 'deleted'`);
  const avgScore = Math.round((avgResult.avg ?? 0) * 10) / 10;

  // Determine average band
  let avgBand: 'A' | 'B' | 'C' | 'D' = 'D';
  if (avgScore >= 85) avgBand = 'A';
  else if (avgScore >= 70) avgBand = 'B';
  else if (avgScore >= 50) avgBand = 'C';

  // Created this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [monthResult] = await d.select({ count: drizzleCount() }).from(prompts)
    .where(sql`${prompts.created_at} >= ${monthStart.toISOString()} AND ${prompts.status} != 'deleted'`);
  const createdThisMonth = monthResult.count;

  // Duplicates (prompts sharing fingerprint)
  const [dupResult] = await d.select({
    count: sql<number>`COUNT(*) - COUNT(DISTINCT ${prompts.fingerprint})`,
  }).from(prompts).where(sql`${prompts.status} != 'deleted'`);
  const duplicatesFound = Math.max(dupResult.count ?? 0, 0);

  // Needs review: inbox or failed_* or low score
  const [needsReviewResult] = await d.select({ count: drizzleCount() }).from(prompts)
    .where(sql`(${prompts.status} = 'inbox' OR ${prompts.ai_status} LIKE 'failed_%' OR (${prompts.overall_score} IS NOT NULL AND ${prompts.overall_score} < 50)) AND ${prompts.status} != 'deleted'`);
  const needsReview = needsReviewResult.count;

  const stats: DashboardStats = {
    total_prompts: totalPrompts,
    ai_analyzed_pct: totalPrompts > 0 ? Math.round((analyzedCount / totalPrompts) * 100) : 0,
    avg_score: avgScore,
    avg_band: avgBand,
    created_this_month: createdThisMonth,
    duplicates_found: duplicatesFound,
    needs_review: needsReview,
  };

  await kvSet(kv, KV_DASHBOARD_STATS, stats, KV_TTL);
  return stats;
}

export async function getCreationChart(d: DB, kv: KVNamespace): Promise<TimeSeriesPoint[]> {
  const cacheKey = KV_DASHBOARD_CHARTS_PREFIX + 'creation';
  const cached = await kvGet<TimeSeriesPoint[]>(kv, cacheKey);
  if (cached) return cached;

  // Last 12 weeks
  const weeks: TimeSeriesPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - (i + 1) * 7);
    const end = new Date();
    end.setDate(end.getDate() - i * 7);

    const [result] = await d.select({ count: drizzleCount() }).from(prompts)
      .where(sql`${prompts.created_at} >= ${start.toISOString()} AND ${prompts.created_at} < ${end.toISOString()} AND ${prompts.status} != 'deleted'`);

    weeks.push({
      date: start.toISOString().split('T')[0],
      value: result.count,
    });
  }

  await kvSet(kv, cacheKey, weeks, KV_TTL);
  return weeks;
}

export async function getQualityChart(d: DB, kv: KVNamespace): Promise<ChartDataPoint[]> {
  const cacheKey = KV_DASHBOARD_CHARTS_PREFIX + 'quality';
  const cached = await kvGet<ChartDataPoint[]>(kv, cacheKey);
  if (cached) return cached;

  const bands = ['A', 'B', 'C', 'D'] as const;
  const data: ChartDataPoint[] = [];

  for (const band of bands) {
    const [result] = await d.select({ count: drizzleCount() }).from(prompts)
      .where(sql`${prompts.quality_band} = ${band} AND ${prompts.status} != 'deleted'`);
    data.push({ label: band, value: result.count });
  }

  await kvSet(kv, cacheKey, data, KV_TTL);
  return data;
}

export async function getTagsChart(d: DB, kv: KVNamespace): Promise<ChartDataPoint[]> {
  const cacheKey = KV_DASHBOARD_CHARTS_PREFIX + 'tags';
  const cached = await kvGet<ChartDataPoint[]>(kv, cacheKey);
  if (cached) return cached;

  const topTags = await d.select().from(tags).orderBy(desc(tags.usage_count)).limit(10);
  const data = topTags.map(t => ({ label: t.name, value: t.usage_count }));

  await kvSet(kv, cacheKey, data, KV_TTL);
  return data;
}

export async function getProjectsChart(d: DB, kv: KVNamespace): Promise<ChartDataPoint[]> {
  const cacheKey = KV_DASHBOARD_CHARTS_PREFIX + 'projects';
  const cached = await kvGet<ChartDataPoint[]>(kv, cacheKey);
  if (cached) return cached;

  const allProjects = await d.select().from(projects).orderBy(desc(projects.prompt_count)).limit(10);
  const data = allProjects.map(p => ({ label: p.name, value: p.prompt_count }));

  await kvSet(kv, cacheKey, data, KV_TTL);
  return data;
}

export async function getRecentPrompts(d: DB) {
  return d.select().from(prompts)
    .where(sql`${prompts.status} != 'deleted'`)
    .orderBy(desc(prompts.created_at))
    .limit(10);
}

export async function getNeedsReviewPrompts(d: DB) {
  return d.select().from(prompts)
    .where(sql`(${prompts.status} = 'inbox' OR ${prompts.ai_status} LIKE 'failed_%' OR (${prompts.overall_score} IS NOT NULL AND ${prompts.overall_score} < 50)) AND ${prompts.status} != 'deleted'`)
    .orderBy(desc(prompts.created_at))
    .limit(20);
}
