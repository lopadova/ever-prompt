import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  key_hash: text('key_hash').notNull(),
  key_prefix: text('key_prefix').notNull(),
  permissions: text('permissions').notNull(), // JSON
  default_project_id: text('default_project_id'),
  last_used_at: text('last_used_at'),
  expires_at: text('expires_at'),
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: text('created_at').notNull(),
});
