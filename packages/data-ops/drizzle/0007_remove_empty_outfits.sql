DELETE FROM `outfits`
WHERE NOT EXISTS (
	SELECT 1
	FROM `outfit_items`
	WHERE `outfit_items`.`outfit_id` = `outfits`.`id`
);
