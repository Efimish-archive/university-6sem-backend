import { Elysia } from "elysia";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const Id = z.int32().min(0);

export const RecipeRead = z.object({
  id: Id,
  title: z.string().max(200),
  description: z.string(),
  cookingTime: z.int32().min(1),
  difficulty: z.int32().min(1).max(5),
  cuisine: z.object({
    id: Id,
    name: z.string(),
  }),
  allergens: z.object({
    id: Id,
    name: z.string(),
  }).array(),
  ingredients: z.object({
    id: Id,
    quantity: z.int32().min(1),
    measurement: z.enum(schema.MeasurementEnum),
    name: z.string(),
  }).array(),
});

const RecipeCreate = z.object({
  title: z.string().max(200),
  description: z.string(),
  cookingTime: z.int32().min(1),
  difficulty: z.int32().min(1).max(5),
  cuisineId: Id,
  allergenIds: Id.array(),
  ingredients: z.object({
    ingredientId: Id,
    quantity: z.int32().min(1),
    measurement: z.enum(schema.MeasurementEnum),
  }).array(),
});

const Params = z.object({
  id: z.coerce.number(),
});

const Message = z.object({
  message: z.string(),
});

const Error = z.object({
  error: z.string(),
});

export const baseQuery = {
  with: {
    cuisine: true,
    recipeAllergens: {
      with: {
        allergen: true,
      },
    },
    recipeIngredients: {
      with: {
        ingredient: true,
      },
    },
  },
} satisfies Parameters<typeof db.query.recipes.findFirst>[0];

export function serializeRecipe(recipe: NonNullable<Awaited<ReturnType<typeof db.query.recipes.findFirst<typeof baseQuery>>>>): z.infer<typeof RecipeRead> {
  const { cuisineId, recipeAllergens, recipeIngredients, ...rest } = recipe;

  return {
    ...rest,
    allergens: recipe.recipeAllergens.map((ra) => ra.allergen),
    ingredients: recipe.recipeIngredients.map((ri) => ({
      id: ri.ingredient.id,
      quantity: ri.quantity,
      measurement: ri.measurement,
      name: ri.ingredient.name,
    })),
  };
}

export const recipesRouter = new Elysia({ prefix: "/recipes" })
  .get("", async () => {
    const recipes = await db.query.recipes.findMany(baseQuery);
    return recipes.map(serializeRecipe);
  }, {
    response: RecipeRead.array(),
  })
  .post("", async ({ body, status }) => {
    return await db.transaction(async (tx) => {
      const [newRecipe] = await tx
        .insert(schema.recipes)
        .values(body)
        .returning();

      await tx.insert(schema.recipeAllergens).values(
        body.allergenIds.map((allergenId) => ({
          recipeId: newRecipe.id,
          allergenId
        }))
      );

      await tx.insert(schema.recipeIngredients).values(
        body.ingredients.map((ingredient) => ({
          recipeId: newRecipe.id,
          ...ingredient,
        }))
      );

      const recipe = await tx.query.recipes.findFirst({
        ...baseQuery,
        where: eq(schema.recipes.id, newRecipe.id),
      });

      if (!recipe) return tx.rollback();

      return status(201, serializeRecipe(recipe));
    });
  }, {
    body: RecipeCreate,
    response: { 201: RecipeRead },
  })
  .get("/:id", async ({ params: { id }, status }) => {
    const recipe = await db.query.recipes.findFirst({
      ...baseQuery,
      where: eq(schema.recipes.id, id),
    });
    if (!recipe) return status(404, {
      error: "recipe with this id not found",
    });
    return serializeRecipe(recipe);
  }, {
    params: Params,
    response: {
      200: RecipeRead,
      404: Error,
    },
  })
  .put("/:id", async ({ params: { id }, body, status }) => {
    return await db.transaction(async (tx) => {
      const updated = await tx
        .update(schema.recipes)
        .set(body)
        .where(eq(schema.recipes.id, id));

      if (updated.rowsAffected === 0) return status(404, {
        error: "recipe with this id not found",
      });

      await tx.delete(schema.recipeAllergens).where(eq(schema.recipeAllergens.recipeId, id));
      await tx.insert(schema.recipeAllergens).values(
        body.allergenIds.map((allergenId) => ({
          recipeId: id,
          allergenId,
        }))
      );

      await tx.delete(schema.recipeIngredients).where(eq(schema.recipeIngredients.recipeId, id));
      await tx.insert(schema.recipeIngredients).values(
        body.ingredients.map((ingredient) => ({
          recipeId: id,
          ...ingredient,
        }))
      );

      const recipe = await tx.query.recipes.findFirst({
        ...baseQuery,
        where: eq(schema.recipes.id, id),
      });

      if (!recipe) return tx.rollback();

      return serializeRecipe(recipe);
    });
  }, {
    params: Params,
    body: RecipeCreate,
    response: {
      200: RecipeRead,
      404: Error,
    },
  })
  .delete("/:id", async ({ params: { id }, status }) => {
    return await db.transaction(async (tx) => {
      await tx
        .delete(schema.recipeAllergens)
        .where(eq(schema.recipeAllergens.recipeId, id));

      await tx
        .delete(schema.recipeIngredients)
        .where(eq(schema.recipeIngredients.recipeId, id));

      const deleted = await tx
        .delete(schema.recipes)
        .where(eq(schema.recipes.id, id));

      if (deleted.rowsAffected === 0) return status(404, {
        error: "recipe with this id not found",
      });

      return status(204, {
        message: "success",
      });
    });
  }, {
    params: Params,
    response: {
      204: Message,
      404: Error,
    },
  })
