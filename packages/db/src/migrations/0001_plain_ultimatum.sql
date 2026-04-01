CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`external_id` text,
	`name` text NOT NULL,
	`source` text DEFAULT 'plugin' NOT NULL,
	`prompt_count` integer DEFAULT 0 NOT NULL,
	`first_prompt_at` text,
	`last_prompt_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_external_id_unique` ON `sessions` (`external_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_external` ON `sessions` (`external_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_date` ON `sessions` (`last_prompt_at`);--> statement-breakpoint
ALTER TABLE `prompts` ADD `session_id` text;--> statement-breakpoint
CREATE INDEX `idx_prompts_session` ON `prompts` (`session_id`);