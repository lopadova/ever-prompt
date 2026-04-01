import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  parent_id: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  kind: z.enum(['topic', 'model', 'tone', 'task', 'quality', 'domain', 'language', 'technique']).default('topic'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const updateTagSchema = createTagSchema.partial();

export const mergeTagsSchema = z.object({
  source_tag_id: z.string(),
  target_tag_id: z.string(),
});
