import {
  sqliteTable,
  int,
  text,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const posts = sqliteTable("posts", {
  id: int().primaryKey(),
  title: text({ length: 200 }).notNull(),
  descr: text().notNull(),
});

export const cuisines = sqliteTable("cuisine", {
  id: int().primaryKey(),
  /** уникальное название кухни, например, "Итальянская", "Японская" */
  name: text().unique().notNull(),
});

export const cuisinesRelations = relations(cuisines, ({ many }) => ({
  recipes: many(recipes),
}));

export const allergens = sqliteTable("allergen", {
  id: int().primaryKey(),
  /** уникальное название аллергена, например, "Глютен", "Молоко" */
  name: text().unique().notNull(),
});

export const allergensRelations = relations(allergens, ({ many }) => ({
  recipeAllergens: many(recipeAllergens),
}));

export const ingredients = sqliteTable("ingredient", {
  id: int().primaryKey(),
  /** уникальное название ингредиента, например, "Мука", "Сахар" */
  name: text().unique().notNull(),
});

export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  recipeIngredients: many(recipeIngredients),
}));

export const recipes = sqliteTable("recipes", {
  id: int().primaryKey(),
  title: text({ length: 255 }).notNull(),
  description: text().notNull(),
  cookingTime: int().notNull(),
  difficulty: int().default(1).notNull(),
  cuisineId: int().references(() => cuisines.id).notNull(),
});

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  cuisine: one(cuisines, {
    fields: [recipes.cuisineId],
    references: [cuisines.id],
  }),
  recipeAllergens: many(recipeAllergens),
  recipeIngredients: many(recipeIngredients),
}));

export const recipeAllergens = sqliteTable("recipe_allergens", {
  recipeId: int().references(() => recipes.id).notNull(),
  allergenId: int().references(() => allergens.id).notNull(),
}, (table) => [
  primaryKey({ columns: [table.recipeId, table.allergenId] }),
]);

export const recipeAllergensRelations = relations(recipeAllergens, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeAllergens.recipeId],
    references: [recipes.id],
  }),
  allergen: one(allergens, {
    fields: [recipeAllergens.allergenId],
    references: [allergens.id],
  }),
}));

export enum MeasurementEnum {
  GRAMS = 1,
  PIECES = 2,
  MILLILITERS = 3,
}

export const recipeIngredients = sqliteTable("recipe_ingredients", {
  id: int().primaryKey(),
  recipeId: int().references(() => recipes.id).notNull(),
  ingredientId: int().references(() => ingredients.id).notNull(),
  quantity: int().notNull(),
  measurement: int().$type<MeasurementEnum>().notNull(),
});

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeIngredients.recipeId],
    references: [recipes.id],
  }),
  ingredient: one(ingredients, {
    fields: [recipeIngredients.ingredientId],
    references: [ingredients.id],
  }),
}));
