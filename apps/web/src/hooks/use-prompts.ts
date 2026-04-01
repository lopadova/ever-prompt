import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  PromptListItem,
  PromptDetail,
  PromptAiReview,
  PromptVersion,
  SearchResult,
  CreatePromptInput,
  UpdatePromptInput,
} from '@everprompt/shared';
import { useSearchStore } from '@/stores/search.store';

export const promptKeys = {
  all: ['prompts'] as const,
  lists: () => [...promptKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...promptKeys.lists(), params] as const,
  details: () => [...promptKeys.all, 'detail'] as const,
  detail: (id: string) => [...promptKeys.details(), id] as const,
  reviews: (id: string) => [...promptKeys.all, 'reviews', id] as const,
  versions: (id: string) => [...promptKeys.all, 'versions', id] as const,
  similar: (id: string) => [...promptKeys.all, 'similar', id] as const,
};

export function usePromptList() {
  const { query, filters, sort, page, perPage } = useSearchStore();

  return useQuery<SearchResult>({
    queryKey: promptKeys.list({ query, filters, sort, page, perPage }),
    queryFn: () =>
      api.post<SearchResult>('/search', {
        q: query,
        filters,
        sort,
        page,
        per_page: perPage,
      }),
  });
}

export function usePromptDetail(id: string | undefined) {
  return useQuery<PromptDetail>({
    queryKey: promptKeys.detail(id!),
    queryFn: () => api.get<PromptDetail>(`/prompts/${id}`),
    enabled: !!id,
  });
}

export function usePromptReviews(id: string) {
  return useQuery<PromptAiReview[]>({
    queryKey: promptKeys.reviews(id),
    queryFn: () => api.get<PromptAiReview[]>(`/prompts/${id}/reviews`),
  });
}

export function usePromptVersions(id: string) {
  return useQuery<PromptVersion[]>({
    queryKey: promptKeys.versions(id),
    queryFn: () => api.get<PromptVersion[]>(`/prompts/${id}/versions`),
  });
}

export function usePromptSimilar(id: string | undefined) {
  return useQuery<PromptListItem[]>({
    queryKey: promptKeys.similar(id!),
    queryFn: () => api.get<PromptListItem[]>(`/prompts/${id}/similar`),
    enabled: !!id,
    retry: false,
  });
}

export function useCreatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePromptInput) => api.post<PromptDetail>('/prompts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
}

export function useUpdatePrompt(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePromptInput) => api.patch<PromptDetail>(`/prompts/${id}`, data),
    onSuccess: (data) => {
      queryClient.setQueryData(promptKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/prompts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
    },
  });
}

export function useAnalyzePrompt(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post(`/prompts/${id}/analyze`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: promptKeys.reviews(id) });
    },
  });
}

export function useImprovePrompt(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post(`/prompts/${id}/improve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: promptKeys.versions(id) });
    },
  });
}
