ALTER TABLE `prompts` ADD `has_security_issues` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `prompts` ADD `security_issues_json` text;