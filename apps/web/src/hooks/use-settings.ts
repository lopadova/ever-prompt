import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type AIProvider = 'anthropic' | 'openai' | 'openrouter' | 'workers-ai';

export interface UserSettings {
  view_mode: 'grid' | 'list' | 'table';
  theme: 'dark' | 'light' | 'system';
  default_project_id: string | null;
  default_sort_field: string;
  default_sort_dir: string;
  prompts_per_page: number;
  show_ai_scores: boolean;
  auto_analyze: boolean;
  ai_provider: AIProvider;
  ai_classify_model: string;
  ai_score_model: string;
  prune_enabled: boolean;
  prune_after_days: number;
  prune_protected_tag_ids: string[];
}

export const settingsKeys = {
  all: ['settings'] as const,
};

export function useSettings() {
  return useQuery<UserSettings>({
    queryKey: settingsKeys.all,
    queryFn: () => api.get<UserSettings>('/settings'),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserSettings>) =>
      api.patch<UserSettings>('/settings', data),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.all, data);
    },
  });
}
