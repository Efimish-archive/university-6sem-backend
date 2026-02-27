CREATE TABLE `allergen` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `allergen_name_unique` ON `allergen` (`name`);--> statement-breakpoint
CREATE TABLE `cuisine` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cuisine_name_unique` ON `cuisine` (`name`);--> statement-breakpoint
CREATE TABLE `ingredient` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredient_name_unique` ON `ingredient` (`name`);--> statement-breakpoint
CREATE TABLE `recipe_allergens` (
	`recipe_id` integer NOT NULL,
	`allergen_id` integer NOT NULL,
	PRIMARY KEY(`recipe_id`, `allergen_id`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`allergen_id`) REFERENCES `allergen`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` integer PRIMARY KEY NOT NULL,
	`recipe_id` integer NOT NULL,
	`ingredient_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`measurement` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredient`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `recipes` ADD `cuisine_id` integer NOT NULL REFERENCES cuisine(id);