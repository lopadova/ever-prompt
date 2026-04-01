CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`parent_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`color` text,
	`icon` text,
	`prompt_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`color` text,
	`icon` text,
	`description` text,
	`prompt_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`kind` text DEFAULT 'topic' NOT NULL,
	`color` text,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`is_ai_generated` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE TABLE `prompt_tags` (
	`prompt_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`confidence` real DEFAULT 1 NOT NULL,
	`origin` text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_prompt_tags_tag` ON `prompt_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`category_id` text,
	`title` text DEFAULT '' NOT NULL,
	`abstract` text DEFAULT '' NOT NULL,
	`body_original` text NOT NULL,
	`body_normalized` text DEFAULT '' NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`status` text DEFAULT 'inbox' NOT NULL,
	`quality_band` text,
	`overall_score` real,
	`ai_status` text DEFAULT 'pending' NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`has_improved_version` integer DEFAULT false NOT NULL,
	`hash_sha256` text NOT NULL,
	`fingerprint` text NOT NULL,
	`word_count` integer DEFAULT 0 NOT NULL,
	`char_count` integer DEFAULT 0 NOT NULL,
	`search_text` text DEFAULT '' NOT NULL,
	`ai_analyzed_at` text,
	`last_used_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_prompts_project` ON `prompts` (`project_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_prompts_category` ON `prompts` (`category_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_prompts_status` ON `prompts` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_prompts_quality` ON `prompts` (`quality_band`,`overall_score`);--> statement-breakpoint
CREATE INDEX `idx_prompts_hash` ON `prompts` (`hash_sha256`);--> statement-breakpoint
CREATE INDEX `idx_prompts_fingerprint` ON `prompts` (`fingerprint`);--> statement-breakpoint
CREATE INDEX `idx_prompts_favorite` ON `prompts` (`is_favorite`,`updated_at`);--> statement-breakpoint
CREATE TABLE `prompt_ai_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text NOT NULL,
	`overall_score` real NOT NULL,
	`clarity_score` real NOT NULL,
	`context_score` real NOT NULL,
	`specificity_score` real NOT NULL,
	`structure_score` real NOT NULL,
	`reusability_score` real NOT NULL,
	`actionability_score` real NOT NULL,
	`evaluation_score` real NOT NULL,
	`safety_score` real NOT NULL,
	`compression_score` real NOT NULL,
	`toolability_score` real NOT NULL,
	`quality_band` text NOT NULL,
	`short_verdict` text NOT NULL,
	`justification_md` text NOT NULL,
	`strengths_md` text NOT NULL,
	`weaknesses_md` text NOT NULL,
	`improved_prompt_md` text NOT NULL,
	`improvement_diff` text DEFAULT '' NOT NULL,
	`recommended_actions` text NOT NULL,
	`model_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_prompt` ON `prompt_ai_reviews` (`prompt_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `prompt_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text NOT NULL,
	`version_no` integer NOT NULL,
	`body` text NOT NULL,
	`kind` text NOT NULL,
	`diff_from_previous` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_versions_prompt` ON `prompt_versions` (`prompt_id`,`version_no`);--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`query_text` text DEFAULT '' NOT NULL,
	`filters_json` text DEFAULT '{}' NOT NULL,
	`sort_json` text DEFAULT '{}' NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`result_count` integer DEFAULT 0 NOT NULL,
	`last_run_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`permissions` text NOT NULL,
	`default_project_id` text,
	`last_used_at` text,
	`expires_at` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`payload_json` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_activity_entity` ON `activity_log` (`entity_type`,`entity_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activity_date` ON `activity_log` (`created_at`);