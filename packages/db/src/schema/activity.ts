import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  entity_type: text('entity_type').notNull(),
  entity_id: text('entity_id').notNull(),
  action: text('action').notNull(),
  payload_json: text('payload_json'),
  created_at: text('created_at').notNull(),
}, (table) => [
  index('idx_activity_entity').on(table.entity_type, table.entity_id, table.created_at),
  index('idx_activity_date').on(table.created_at),
]);
