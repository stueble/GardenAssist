CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_type` text NOT NULL,
	`owner_id` text,
	`attachment_type` text NOT NULL,
	`category` text,
	`url` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `color_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_type` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `garden` (
	`id` text PRIMARY KEY DEFAULT 'garden' NOT NULL,
	`plan_url` text,
	`plan_name` text
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`plant_id` text,
	`schedule_id` text,
	`week` text,
	`entry_type` text NOT NULL,
	`date` text NOT NULL,
	`title` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`plant_id`) REFERENCES `plants`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `journal_entry_attachments` (
	`journal_entry_id` text NOT NULL,
	`attachment_id` text NOT NULL,
	PRIMARY KEY(`journal_entry_id`, `attachment_id`),
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `plant_positions` (
	`id` text PRIMARY KEY NOT NULL,
	`plant_id` text NOT NULL,
	`x_percent` real NOT NULL,
	`y_percent` real NOT NULL,
	FOREIGN KEY (`plant_id`) REFERENCES `plants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `plants` (
	`id` text PRIMARY KEY NOT NULL,
	`name_common` text NOT NULL,
	`name_botanical` text,
	`icon` text,
	`origin_type` text,
	`category` text,
	`lifecycle` text,
	`description` text,
	`care_notes` text,
	`sun_demand` text,
	`water_demand` text,
	`soil_type` text,
	`frost_tolerance_min_c` integer,
	`temperature_protected` integer DEFAULT false NOT NULL,
	`health_status` text,
	`location` text,
	`watering_zone` text,
	`purchase_date` text,
	`purchase_price` real,
	`thumbnail_attachment_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`plant_id` text NOT NULL,
	`schedule_type` text NOT NULL,
	`start_week` integer NOT NULL,
	`end_week` integer NOT NULL,
	`color` text,
	`label` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`plant_id`) REFERENCES `plants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY DEFAULT 'settings' NOT NULL,
	`location_city` text,
	`location_zip` text,
	`irrigation_zones` text DEFAULT '[]',
	`plant_categories` text DEFAULT '[]',
	`task_lookback_weeks` integer DEFAULT 2 NOT NULL,
	`task_lookahead_weeks` integer DEFAULT 4 NOT NULL,
	`attachment_size_limit_mb` integer DEFAULT 10 NOT NULL,
	`ai_provider` text,
	`ai_model` text,
	`ai_api_key` text
);
