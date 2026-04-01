import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const savedSearches = sqliteTable('saved_searches', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  query_text: text('query_text').default('').notNull(),
  filters_json: text('filters_json').default('{}').notNull(),
  sort_json: text('sort_json').default('{}').notNull(),
  is_pinned: integer('is_pinned', { mode: 'boolean' }).default(false).notNull(),
  result_count: integer('result_count').default(0).notNull(),
  last_run_at: text('last_run_at'),
  created_at: text('created_at').notNull(),
});
