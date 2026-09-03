ALTER TABLE `account` ADD `issuer` text NOT NULL DEFAULT 'https://accounts.google.com';--> statement-breakpoint
CREATE UNIQUE INDEX `account_issuer_accountId_uidx` ON `account` (`issuer`,`account_id`);
