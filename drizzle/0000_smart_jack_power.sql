CREATE TABLE `posts` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text(200) NOT NULL,
	`descr` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text(255) NOT NULL,
	`description` text NOT NULL,
	`cooking_time` integer NOT NULL,
	`difficulty` integer DEFAULT 1 NOT NULL
);
