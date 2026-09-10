CREATE TABLE `custom_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`equipment` text DEFAULT 'other' NOT NULL,
	`primary_muscles` text DEFAULT '[]' NOT NULL,
	`groups` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `custom_exercises_user_idx` ON `custom_exercises` (`user_id`);--> statement-breakpoint
CREATE TABLE `plan_days` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'full' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plan_days_user_idx` ON `plan_days` (`user_id`,`position`);--> statement-breakpoint
CREATE TABLE `plan_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`day_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`tracking_mode` text DEFAULT 'weight' NOT NULL,
	`target_sets` integer DEFAULT 3 NOT NULL,
	`target_reps` integer DEFAULT 10 NOT NULL,
	`target_seconds` integer DEFAULT 600 NOT NULL,
	`weight_kg` real DEFAULT 20 NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`day_id`) REFERENCES `plan_days`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plan_exercises_day_idx` ON `plan_exercises` (`day_id`,`position`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`units` text DEFAULT 'kg' NOT NULL,
	`timezone` text DEFAULT 'Europe/Rome' NOT NULL,
	`rest_timer_sec` integer DEFAULT 90 NOT NULL,
	`reminders_enabled` integer DEFAULT false NOT NULL,
	`reminder_time` text DEFAULT '18:00' NOT NULL,
	`reminder_days` text DEFAULT '[1,2,3,4,5]' NOT NULL,
	`streak_reminders_enabled` integer DEFAULT false NOT NULL,
	`analytics_consent` integer DEFAULT false NOT NULL,
	`last_reminded_at` integer,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deletion_requested_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `workout_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`plan_exercise_id` text,
	`name` text NOT NULL,
	`tracking_mode` text DEFAULT 'weight' NOT NULL,
	`sets` integer DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`seconds` integer DEFAULT 0 NOT NULL,
	`weight_kg` real DEFAULT 0 NOT NULL,
	`volume_kg` real DEFAULT 0 NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_entries_workout_idx` ON `workout_entries` (`workout_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `workout_entries_slot_unique` ON `workout_entries` (`workout_id`,`plan_exercise_id`);--> statement-breakpoint
CREATE INDEX `workout_entries_exercise_idx` ON `workout_entries` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`day_id` text,
	`day_name` text NOT NULL,
	`day_kind` text DEFAULT 'full' NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`duration_sec` integer DEFAULT 0 NOT NULL,
	`volume_kg` real DEFAULT 0 NOT NULL,
	`completed_count` integer DEFAULT 0 NOT NULL,
	`total_sets` integer DEFAULT 0 NOT NULL,
	`total_reps` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`day_id`) REFERENCES `plan_days`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workouts_user_idx` ON `workouts` (`user_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `workouts_active_idx` ON `workouts` (`user_id`,`ended_at`);