import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  DashboardStats,
  ChartDataPoint,
  TimeSeriesPoint,
  PromptListItem,
} from '@everprompt/shared';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  chartsCreation: () => [...dashboardKeys.all, 'charts', 'creation'] as const,
  chartsQuality: () => [...dashboardKeys.all, 'charts', 'quality'] as const,
  chartsTags: () => [...dashboardKeys.all, 'charts', 'tags'] as const,
  chartsProjects: () => [...dashboardKeys.all, 'charts', 'projects'] as const,
  recent: () => [...dashboardKeys.all, 'recent'] as const,
  needsReview: () => [...dashboardKeys.all, 'needs-review'] as const,
};

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: dashboardKeys.stats(),
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
    staleTime: 1000 * 60,
  });
}

export function useCreationChart() {
  return useQuery<TimeSeriesPoint[]>({
    queryKey: dashboardKeys.chartsCreation(),
    queryFn: () => api.get<TimeSeriesPoint[]>('/dashboard/charts/creation'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useQualityChart() {
  return useQuery<ChartDataPoint[]>({
    queryKey: dashboardKeys.chartsQuality(),
    queryFn: () => api.get<ChartDataPoint[]>('/dashboard/charts/quality'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTagsChart() {
  return useQuery<ChartDataPoint[]>({
    queryKey: dashboardKeys.chartsTags(),
    queryFn: () => api.get<ChartDataPoint[]>('/dashboard/charts/tags'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useProjectsChart() {
  return useQuery<ChartDataPoint[]>({
    queryKey: dashboardKeys.chartsProjects(),
    queryFn: () => api.get<ChartDataPoint[]>('/dashboard/charts/projects'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useRecentPrompts() {
  return useQuery<PromptListItem[]>({
    queryKey: dashboardKeys.recent(),
    queryFn: () => api.get<PromptListItem[]>('/dashboard/recent'),
    staleTime: 1000 * 30,
  });
}

export function useNeedsReview() {
  return useQuery<PromptListItem[]>({
    queryKey: dashboardKeys.needsReview(),
    queryFn: () => api.get<PromptListItem[]>('/dashboard/needs-review'),
    staleTime: 1000 * 30,
  });
}
