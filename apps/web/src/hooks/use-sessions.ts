import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Session, PaginationMeta } from '@everprompt/shared';

export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...sessionKeys.lists(), params] as const,
  detail: (id: string) => [...sessionKeys.all, 'detail', id] as const,
};

interface SessionListResponse {
  data: Session[];
  meta: PaginationMeta;
}

export function useSessions(page = 1, perPage = 24) {
  return useQuery<Session[]>({
    queryKey: sessionKeys.list({ page, perPage }),
    queryFn: () => api.get<Session[]>('/sessions', { page, per_page: perPage }),
  });
}

export function useSessionDetail(id: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.detail(id!),
    queryFn: () => api.get<Session & { prompts: unknown[] }>(`/sessions/${id}`),
    enabled: !!id,
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<Session>(`/sessions/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
}
