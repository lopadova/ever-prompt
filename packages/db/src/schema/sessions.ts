import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // ULID
  external_id: text('external_id').unique(), // Claude session ID from hook
  name: text('name').notNull(), // AI-generated or manual session name
  source: text('source').default('plugin').notNull(), // 'plugin', 'manual'
  prompt_count: integer('prompt_count').default(0).notNull(),
  first_prompt_at: text('first_prompt_at'),
  last_prompt_at: text('last_prompt_at'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (table) => [
  index('idx_sessions_external').on(table.external_id),
  index('idx_sessions_date').on(table.last_prompt_at),
]);
