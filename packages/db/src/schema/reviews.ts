import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';

export const promptAiReviews = sqliteTable('prompt_ai_reviews', {
  id: text('id').primaryKey(),
  prompt_id: text('prompt_id').notNull(),
  overall_score: real('overall_score').notNull(),
  clarity_score: real('clarity_score').notNull(),
  context_score: real('context_score').notNull(),
  specificity_score: real('specificity_score').notNull(),
  structure_score: real('structure_score').notNull(),
  reusability_score: real('reusability_score').notNull(),
  actionability_score: real('actionability_score').notNull(),
  evaluation_score: real('evaluation_score').notNull(),
  safety_score: real('safety_score').notNull(),
  compression_score: real('compression_score').notNull(),
  toolability_score: real('toolability_score').notNull(),
  quality_band: text('quality_band').notNull(),
  short_verdict: text('short_verdict').notNull(),
  justification_md: text('justification_md').notNull(),
  strengths_md: text('strengths_md').notNull(),
  weaknesses_md: text('weaknesses_md').notNull(),
  improved_prompt_md: text('improved_prompt_md').notNull(),
  improvement_diff: text('improvement_diff').default('').notNull(),
  recommended_actions: text('recommended_actions').notNull(), // JSON array
  model_name: text('model_name').notNull(),
  created_at: text('created_at').notNull(),
}, (table) => [
  index('idx_reviews_prompt').on(table.prompt_id, table.created_at),
]);
