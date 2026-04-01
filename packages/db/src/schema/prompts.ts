import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const prompts = sqliteTable('prompts', {
  id: text('id').primaryKey(),
  project_id: text('project_id'),
  category_id: text('category_id'),
  title: text('title').default('').notNull(),
  abstract: text('abstract').default('').notNull(),
  body_original: text('body_original').notNull(),
  body_normalized: text('body_normalized').default('').notNull(),
  language: text('language').default('en').notNull(),
  source: text('source').default('manual').notNull(),
  status: text('status').default('inbox').notNull(),
  quality_band: text('quality_band'),
  overall_score: real('overall_score'),
  ai_status: text('ai_status').default('pending').notNull(),
  is_favorite: integer('is_favorite', { mode: 'boolean' }).default(false).notNull(),
  is_pinned: integer('is_pinned', { mode: 'boolean' }).default(false).notNull(),
  has_improved_version: integer('has_improved_version', { mode: 'boolean' }).default(false).notNull(),
  hash_sha256: text('hash_sha256').notNull(),
  fingerprint: text('fingerprint').notNull(),
  word_count: integer('word_count').default(0).notNull(),
  char_count: integer('char_count').default(0).notNull(),
  search_text: text('search_text').default('').notNull(),
  ai_analyzed_at: text('ai_analyzed_at'),
  last_used_at: text('last_used_at'),
  created_at: text('created_at').notNull(),
  has_security_issues: integer('has_security_issues', { mode: 'boolean' }).default(false).notNull(),
  security_issues_json: text('security_issues_json'),
  session_id: text('session_id'), // FK to sessions.id
  updated_at: text('updated_at').notNull(),
}, (table) => [
  index('idx_prompts_project').on(table.project_id, table.status, table.created_at),
  index('idx_prompts_category').on(table.category_id, table.status),
  index('idx_prompts_status').on(table.status, table.created_at),
  index('idx_prompts_quality').on(table.quality_band, table.overall_score),
  index('idx_prompts_hash').on(table.hash_sha256),
  index('idx_prompts_fingerprint').on(table.fingerprint),
  index('idx_prompts_favorite').on(table.is_favorite, table.updated_at),
  index('idx_prompts_session').on(table.session_id),
]);

export const promptTags = sqliteTable('prompt_tags', {
  prompt_id: text('prompt_id').notNull(),
  tag_id: text('tag_id').notNull(),
  confidence: real('confidence').default(1.0).notNull(),
  origin: text('origin').default('manual').notNull(),
}, (table) => [
  index('idx_prompt_tags_tag').on(table.tag_id),
]);
