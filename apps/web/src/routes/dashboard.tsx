import { useNavigate } from 'react-router';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  FileText,
  Sparkles,
  BarChart3,
  CalendarPlus,
  Copy,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScoreBadge } from '@/components/prompt/score-badge';
import { DashboardSkeleton } from '@/components/shared/loading-skeleton';
import {
  useDashboardStats,
  useCreationChart,
  useQualityChart,
  useProjectsChart,
  useRecentPrompts,
  useNeedsReview,
} from '@/hooks/use-dashboard';
import { QUALITY_BANDS } from '@everprompt/shared';
import { formatDate, cn } from '@/lib/utils';

const bandColors: Record<string, string> = {
  A: QUALITY_BANDS.A.color,
  B: QUALITY_BANDS.B.color,
  C: QUALITY_BANDS.C.color,
  D: QUALITY_BANDS.D.color,
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: creationData } = useCreationChart();
  const { data: qualityData } = useQualityChart();
  const { data: projectsData } = useProjectsChart();
  const { data: recent } = useRecentPrompts();
  const { data: needsReview } = useNeedsReview();

  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  const kpis = [
    {
      label: 'Total Prompts',
      value: stats?.total_prompts ?? 0,
      icon: FileText,
      accent: 'text-zinc-100',
    },
    {
      label: 'AI Analyzed',
      value: `${stats?.ai_analyzed_pct ?? 0}%`,
      icon: Sparkles,
      accent: 'text-indigo-400',
    },
    {
      label: 'Avg Score',
      value: stats ? `${Math.round(stats.avg_score)}` : '--',
      icon: BarChart3,
      accent: stats?.avg_band ? `text-[${QUALITY_BANDS[stats.avg_band].color}]` : 'text-zinc-400',
      badge: stats?.avg_band,
    },
    {
      label: 'Created This Month',
      value: stats?.created_this_month ?? 0,
      icon: CalendarPlus,
      accent: 'text-green-400',
    },
    {
      label: 'Duplicates',
      value: stats?.duplicates_found ?? 0,
      icon: Copy,
      accent: 'text-yellow-400',
    },
    {
      label: 'Needs Review',
      value: stats?.needs_review ?? 0,
      icon: AlertTriangle,
      accent: 'text-orange-400',
    },
  ];

  return (
    <div>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500">Your prompt intelligence overview.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-3.5 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    {kpi.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={cn('text-xl font-bold tabular-nums', kpi.accent)}>
                    {kpi.value}
                  </span>
                  {kpi.badge && (
                    <ScoreBadge band={kpi.badge} size="sm" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Creation per week */}
          <ChartCard title="Prompts per Week">
            {creationData && creationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={creationData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={{ stroke: '#27272a' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#fafafa',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    fill="url(#areaGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty />
            )}
          </ChartCard>

          {/* Score distribution */}
          <ChartCard title="Score Distribution">
            {qualityData && qualityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={qualityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#fafafa',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {qualityData.map((entry, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={bandColors[entry.label] ?? '#6366f1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty />
            )}
          </ChartCard>

          {/* Top projects */}
          <ChartCard title="Top Projects">
            {projectsData && projectsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={projectsData.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={{ stroke: '#27272a' }}
                    tickLine={false}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#fafafa',
                    }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty />
            )}
          </ChartCard>

          {/* Quality trend */}
          <ChartCard title="Quality Trend">
            {creationData && creationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={creationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={{ stroke: '#27272a' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #27272a',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#fafafa',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty />
            )}
          </ChartCard>
        </div>

        {/* Bottom widgets */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Recent prompts */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300">Recent Prompts</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px]"
                onClick={() => navigate('/prompts')}
              >
                View all
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-1">
              {recent?.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/prompts/${p.id}`)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-zinc-800/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-200 truncate">
                      {p.title || 'Untitled'}
                    </p>
                    <p className="text-[10px] text-zinc-500">{formatDate(p.created_at)}</p>
                  </div>
                  <ScoreBadge band={p.quality_band} score={p.overall_score} size="sm" />
                </button>
              )) ?? (
                <p className="text-xs text-zinc-600">No recent prompts</p>
              )}
            </div>
          </div>

          {/* Needs review */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300">
                Needs Review
                {needsReview && needsReview.length > 0 && (
                  <span className="ml-1.5 text-[10px] text-orange-400 tabular-nums">
                    {needsReview.length}
                  </span>
                )}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px]"
                onClick={() => navigate('/prompts')}
              >
                View all
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <div className="space-y-1">
              {needsReview?.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/prompts/${p.id}`)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-zinc-800/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-200 truncate">
                      {p.title || 'Untitled'}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {p.ai_status === 'pending' && 'Pending analysis'}
                      {p.ai_status === 'analyzing' && 'Analyzing...'}
                      {p.status === 'inbox' && 'In inbox'}
                      {p.ai_status.startsWith('failed') && 'Analysis failed'}
                    </p>
                  </div>
                  <ScoreBadge band={p.quality_band} score={p.overall_score} size="sm" />
                </button>
              )) ?? (
                <p className="text-xs text-zinc-600">Nothing needs review</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-[200px] items-center justify-center text-xs text-zinc-600">
      No data available yet
    </div>
  );
}
