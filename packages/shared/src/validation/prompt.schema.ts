import { z } from 'zod';
import { MAX_PROMPT_LENGTH, MAX_TITLE_LENGTH, MAX_TAGS_PER_PROMPT, MAX_BULK_IDS } from '../constants/limits';

export const createPromptSchema = z.object({
  body_original: z.string().min(1).max(MAX_PROMPT_LENGTH),
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
  project_id: z.string().optional(),
  category_id: z.string().optional(),
  tag_ids: z.array(z.string()).max(MAX_TAGS_PER_PROMPT).optional(),
  source: z.enum(['manual', 'import', 'plugin', 'api', 'extension']).default('manual'),
  language: z.string().max(10).optional(),
});

export const updatePromptSchema = z.object({
  body_original: z.string().min(1).max(MAX_PROMPT_LENGTH).optional(),
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
  project_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  status: z.enum(['inbox', 'active', 'archived']).optional(),
  is_favorite: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
});

export const ingestPromptSchema = z.object({
  body_original: z.string().min(1).max(MAX_PROMPT_LENGTH),
  project_slug: z.string().optional(),
  source: z.enum(['plugin', 'api', 'extension']).default('plugin'),
  session_id: z.string().optional(), // External Claude session ID
  session_name: z.string().optional(), // Optional session name
});

export const bulkActionSchema = z.object({
  prompt_ids: z.array(z.string()).min(1).max(MAX_BULK_IDS),
});

export const bulkTagSchema = bulkActionSchema.extend({
  add_tag_ids: z.array(z.string()).optional(),
  remove_tag_ids: z.array(z.string()).optional(),
});

export const bulkMoveSchema = bulkActionSchema.extend({
  project_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
});

export const bulkDeleteSchema = bulkActionSchema.extend({
  confirm: z.literal(true),
});

export type CreatePromptInput = z.infer<typeof createPromptSchema>;
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;
export type IngestPromptInput = z.infer<typeof ingestPromptSchema>;
