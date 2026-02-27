import { Elysia } from "elysia";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq, count } from "drizzle-orm";
import { RecipeRead, baseQuery, serializeRecipe } from "./recipes";

const IngredientRead = z.object({
  id: z.int32().min(0),
  name: z.string(),
});

const IngredientCreate = z.object({
  name: z.string(),
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

export const ingredientsRouter = new Elysia({ prefix: "/ingredients" })
  .get("", async () => {
    const ingredients = await db.query.ingredients.findMany();
    return ingredients;
  }, {
    response: IngredientRead.array(),
  })
  .post("", async ({ body, status }) => {
    const [ingredient] = await db
      .insert(schema.ingredients)
      .values(body)
      .returning();

    return status(201, ingredient);
  }, {
    body: IngredientCreate,
    response: { 201: IngredientRead },
  })
  .get("/:id", async ({ params: { id }, status }) => {
    const ingredient = await db.query.ingredients.findFirst({
      where: eq(schema.ingredients.id, id),
    });
    if (!ingredient) return status(404, {
      error: "ingredient with this id not found",
    });
    return ingredient;
  }, {
    params: Params,
    response: {
      200: IngredientRead,
      404: Error,
    },
  })
  .put("/:id", async ({ params: { id }, body, status }) => {
    const [ingredient] = await db
      .update(schema.ingredients)
      .set(body)
      .where(eq(schema.ingredients.id, id))
      .returning();

    if (!ingredient) return status(404, {
      error: "ingredient with this id not found",
    });

    return ingredient;
  }, {
    params: Params,
    body: IngredientCreate,
    response: {
      200: IngredientRead,
      404: Error,
    },
  })
  .delete("/:id", async ({ params: { id }, status }) => {
    const deleted = await db
      .delete(schema.ingredients)
      .where(eq(schema.ingredients.id, id));

    if (deleted.rowsAffected === 0) return status(404, {
      error: "ingredient with this id not found",
    });

    return status(204, {
      message: "success",
    });
  }, {
    params: Params,
    response: {
      204: Message,
      404: Error,
    },
  })
  .get("/:id/recipes", async ({ params: { id }, status }) => {
    const ingredient = await db.query.ingredients.findFirst({
      where: eq(schema.ingredients.id, id),
      with: {
        recipeIngredients: {
          with: {
            recipe: baseQuery,
          },
        },
      },
    });
    if (!ingredient) return status(404, {
      error: "ingredient with this id not found",
    });
    return ingredient.recipeIngredients.map((ri) => serializeRecipe(ri.recipe));
  }, {
    params: Params,
    response: {
      200: RecipeRead.array(),
      404: Error,
    },
  })
