import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Project,
  Category,
  Tag,
  CreatePromptInput,
} from '@everprompt/shared';

export const taxonomyKeys = {
  all: ['taxonomy'] as const,
  projects: () => [...taxonomyKeys.all, 'projects'] as const,
  categories: () => [...taxonomyKeys.all, 'categories'] as const,
  categoriesTree: () => [...taxonomyKeys.all, 'categories-tree'] as const,
  tags: () => [...taxonomyKeys.all, 'tags'] as const,
};

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: taxonomyKeys.projects(),
    queryFn: () => api.get<Project[]>('/projects'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: taxonomyKeys.categories(),
    queryFn: () => api.get<Category[]>('/categories'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCategoriesTree() {
  return useQuery<Category[]>({
    queryKey: taxonomyKeys.categoriesTree(),
    queryFn: () => api.get<Category[]>('/categories/tree'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: taxonomyKeys.tags(),
    queryFn: () => api.get<Tag[]>('/tags'),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string; icon?: string; description?: string }) =>
      api.post<Project>('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxonomyKeys.projects() });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; parent_id?: string; color?: string; icon?: string }) =>
      api.post<Category>('/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxonomyKeys.categories() });
      queryClient.invalidateQueries({ queryKey: taxonomyKeys.categoriesTree() });
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; kind?: string; color?: string }) =>
      api.post<Tag>('/tags', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taxonomyKeys.tags() });
    },
  });
}
