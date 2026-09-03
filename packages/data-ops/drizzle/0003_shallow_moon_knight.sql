ALTER TABLE `outfit_items` ADD `x` real;--> statement-breakpoint
ALTER TABLE `outfit_items` ADD `y` real;--> statement-breakpoint
ALTER TABLE `outfit_items` ADD `scale` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `outfit_items` ADD `rotation` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `outfit_items` ADD `z_index` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS `outfit_items_outfit_role_sort_order_idx`;--> statement-breakpoint
CREATE INDEX `outfit_items_outfit_z_index_idx` ON `outfit_items` (`outfit_id`,`z_index`);
