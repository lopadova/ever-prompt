import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  color: text('color'),
  icon: text('icon'),
  description: text('description'),
  prompt_count: integer('prompt_count').default(0).notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  parent_id: text('parent_id'),
  sort_order: integer('sort_order').default(0).notNull(),
  color: text('color'),
  icon: text('icon'),
  prompt_count: integer('prompt_count').default(0).notNull(),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').unique().notNull(),
  slug: text('slug').unique().notNull(),
  kind: text('kind').notNull().default('topic'),
  color: text('color'),
  usage_count: integer('usage_count').default(0).notNull(),
  is_ai_generated: integer('is_ai_generated', { mode: 'boolean' }).default(false).notNull(),
  created_at: text('created_at').notNull(),
});
