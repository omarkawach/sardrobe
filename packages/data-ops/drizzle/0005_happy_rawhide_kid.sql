CREATE TABLE `packing_plan_items` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`item_id` text NOT NULL,
	`user_id` text NOT NULL,
	`packed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `packing_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `wardrobe_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `packing_plan_items_plan_id_idx` ON `packing_plan_items` (`plan_id`);--> statement-breakpoint
CREATE INDEX `packing_plan_items_item_id_idx` ON `packing_plan_items` (`item_id`);--> statement-breakpoint
CREATE INDEX `packing_plan_items_user_id_idx` ON `packing_plan_items` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `packing_plan_items_plan_item_unique` ON `packing_plan_items` (`plan_id`,`item_id`);--> statement-breakpoint
CREATE TABLE `packing_plan_outfits` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`outfit_id` text NOT NULL,
	`user_id` text NOT NULL,
	`packed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `packing_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`outfit_id`) REFERENCES `outfits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `packing_plan_outfits_plan_id_idx` ON `packing_plan_outfits` (`plan_id`);--> statement-breakpoint
CREATE INDEX `packing_plan_outfits_outfit_id_idx` ON `packing_plan_outfits` (`outfit_id`);--> statement-breakpoint
CREATE INDEX `packing_plan_outfits_user_id_idx` ON `packing_plan_outfits` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `packing_plan_outfits_plan_outfit_unique` ON `packing_plan_outfits` (`plan_id`,`outfit_id`);--> statement-breakpoint
CREATE TABLE `packing_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`status` text DEFAULT 'planning' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `packing_plans_user_id_idx` ON `packing_plans` (`user_id`);--> statement-breakpoint
CREATE INDEX `packing_plans_user_status_idx` ON `packing_plans` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `packing_plans_user_plan_idx` ON `packing_plans` (`user_id`,`plan`);