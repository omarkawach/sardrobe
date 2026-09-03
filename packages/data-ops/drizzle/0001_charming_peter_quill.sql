CREATE TABLE `outfit_items` (
	`id` text PRIMARY KEY NOT NULL,
	`outfit_id` text NOT NULL,
	`item_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`outfit_id`) REFERENCES `outfits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `wardrobe_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `outfit_items_outfit_id_idx` ON `outfit_items` (`outfit_id`);--> statement-breakpoint
CREATE INDEX `outfit_items_item_id_idx` ON `outfit_items` (`item_id`);--> statement-breakpoint
CREATE INDEX `outfit_items_user_id_idx` ON `outfit_items` (`user_id`);--> statement-breakpoint
CREATE TABLE `outfits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`source` text,
	`description` text,
	`styling_formula` text,
	`occasion` text,
	`season` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `outfits_user_id_idx` ON `outfits` (`user_id`);--> statement-breakpoint
CREATE INDEX `outfits_user_status_idx` ON `outfits` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `wardrobe_item_media` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`user_id` text NOT NULL,
	`kind` text DEFAULT 'cutout' NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text DEFAULT 'image/webp' NOT NULL,
	`byte_size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `wardrobe_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wardrobe_item_media_object_key_unique` ON `wardrobe_item_media` (`object_key`);--> statement-breakpoint
CREATE INDEX `wardrobe_item_media_item_id_idx` ON `wardrobe_item_media` (`item_id`);--> statement-breakpoint
CREATE INDEX `wardrobe_item_media_user_id_idx` ON `wardrobe_item_media` (`user_id`);--> statement-breakpoint
CREATE TABLE `wardrobe_items` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`subcategory` text,
	`color` text,
	`description` text,
	`occasion` text,
	`season` text,
	`status` text DEFAULT 'owned' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wardrobe_items_user_id_idx` ON `wardrobe_items` (`user_id`);--> statement-breakpoint
CREATE INDEX `wardrobe_items_user_category_idx` ON `wardrobe_items` (`user_id`,`category`);--> statement-breakpoint
CREATE INDEX `wardrobe_items_user_status_idx` ON `wardrobe_items` (`user_id`,`status`);