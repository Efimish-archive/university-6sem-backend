CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`login` text NOT NULL,
	`password_hash` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_login_unique` ON `users` (`login`);--> statement-breakpoint
ALTER TABLE `recipes` ADD `author_id` integer NOT NULL REFERENCES users(id);