import {
  sqliteTable,
  int,
  text,
} from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: int().primaryKey(),
  title: text({ length: 200 }).notNull(),
  descr: text().notNull(),
});

export const recipes = sqliteTable("recipes", {
  id: int().primaryKey(),
  title: text({ length: 255 }).notNull(),
  description: text().notNull(),
  cookingTime: int().notNull(),
  difficulty: int().default(1).notNull(),
});
