import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const promptVersions = sqliteTable('prompt_versions', {
  id: text('id').primaryKey(),
  prompt_id: text('prompt_id').notNull(),
  version_no: integer('version_no').notNull(),
  body: text('body').notNull(),
  kind: text('kind').notNull(), // original, edited, improved_ai, snapshot
  diff_from_previous: text('diff_from_previous'),
  created_at: text('created_at').notNull(),
}, (table) => [
  index('idx_versions_prompt').on(table.prompt_id, table.version_no),
]);
