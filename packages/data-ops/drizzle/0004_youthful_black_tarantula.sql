WITH ranked AS (
  SELECT
    `id`,
    CASE `role`
      WHEN 'bag' THEN 0
      WHEN 'bottom' THEN 100
      WHEN 'shoes' THEN 200
      WHEN 'top' THEN 300
      WHEN 'outerwear' THEN 400
      WHEN 'belt' THEN 500
      WHEN 'accessories' THEN 600
      ELSE 0
    END + ROW_NUMBER() OVER (
      PARTITION BY `outfit_id`, `role`
      ORDER BY `sort_order`, `created_at`, `id`
    ) - 1 AS `next_z_index`
  FROM `outfit_items`
)
UPDATE `outfit_items`
SET `z_index` = (
  SELECT `next_z_index`
  FROM ranked
  WHERE ranked.`id` = `outfit_items`.`id`
);--> statement-breakpoint
ALTER TABLE `outfit_items` DROP COLUMN `sort_order`;
