CREATE INDEX `outfit_items_outfit_role_sort_order_idx` ON `outfit_items` (`outfit_id`,`role`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `outfit_items_outfit_item_unique` ON `outfit_items` (`outfit_id`,`item_id`);
