import type { QualityBand } from './prompt';

export interface DashboardStats {
  total_prompts: number;
  ai_analyzed_pct: number;
  avg_score: number;
  avg_band: QualityBand;
  created_this_month: number;
  duplicates_found: number;
  needs_review: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}
