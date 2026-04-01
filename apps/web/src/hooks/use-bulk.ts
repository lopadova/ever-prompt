import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { promptKeys } from './use-prompts';
import { useSelectionStore } from '@/stores/selection.store';
import { toast } from 'sonner';

export function useBulkTag() {
  const queryClient = useQueryClient();
  const clear = useSelectionStore((s) => s.clear);

  return useMutation({
    mutationFn: (data: { prompt_ids: string[]; add_tag_ids?: string[]; remove_tag_ids?: string[] }) =>
      api.post('/prompts/bulk/tag', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
      toast.success(`Tags updated on ${variables.prompt_ids.length} prompts`);
      clear();
    },
    onError: (err) => {
      toast.error(`Failed to update tags: ${err.message}`);
    },
  });
}

export function useBulkMove() {
  const queryClient = useQueryClient();
  const clear = useSelectionStore((s) => s.clear);

  return useMutation({
    mutationFn: (data: { prompt_ids: string[]; project_id?: string | null; category_id?: string | null }) =>
      api.post('/prompts/bulk/move', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
      toast.success(`Moved ${variables.prompt_ids.length} prompts`);
      clear();
    },
    onError: (err) => {
      toast.error(`Failed to move prompts: ${err.message}`);
    },
  });
}

export function useBulkDelete() {
  const queryClient = useQueryClient();
  const clear = useSelectionStore((s) => s.clear);

  return useMutation({
    mutationFn: (data: { prompt_ids: string[]; confirm: true }) =>
      api.post('/prompts/bulk/delete', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
      toast.success(`Deleted ${variables.prompt_ids.length} prompts`);
      clear();
    },
    onError: (err) => {
      toast.error(`Failed to delete prompts: ${err.message}`);
    },
  });
}

export function useBulkReanalyze() {
  const queryClient = useQueryClient();
  const clear = useSelectionStore((s) => s.clear);

  return useMutation({
    mutationFn: (data: { prompt_ids: string[] }) =>
      api.post('/prompts/bulk/reanalyze', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
      toast.success(`Re-analyzing ${variables.prompt_ids.length} prompts`);
      clear();
    },
    onError: (err) => {
      toast.error(`Failed to re-analyze: ${err.message}`);
    },
  });
}

export function useBulkFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { prompt_ids: string[] }) =>
      api.post('/prompts/bulk/favorite', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
      toast.success(`Toggled favorite on ${variables.prompt_ids.length} prompts`);
    },
    onError: (err) => {
      toast.error(`Failed to toggle favorite: ${err.message}`);
    },
  });
}

export function useBulkArchive() {
  const queryClient = useQueryClient();
  const clear = useSelectionStore((s) => s.clear);

  return useMutation({
    mutationFn: (data: { prompt_ids: string[] }) =>
      api.post('/prompts/bulk/archive', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
      toast.success(`Archived ${variables.prompt_ids.length} prompts`);
      clear();
    },
    onError: (err) => {
      toast.error(`Failed to archive: ${err.message}`);
    },
  });
}
