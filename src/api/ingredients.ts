import { Elysia } from "elysia";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const IngredientRead = z.object({
  id: z.int32().min(0),
  name: z.string(),
});

const IngredientCreate = z.object({
  name: z.string(),
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
  .get("/:id", async ({ query: { id } }) => {
    const ingredient = await db.query.ingredients.findFirst({
      where: eq(schema.ingredients.id, id),
    });
    return ingredient;
  }, {
    query: z.object({ id: z.number() }),
    response: IngredientRead.optional(),
  })
  .put("/:id", async ({ query: { id }, body }) => {
    const [ingredient] = await db
      .update(schema.ingredients)
      .set(body)
      .where(eq(schema.ingredients.id, id))
      .returning();

    return ingredient;
  }, {
    query: z.object({ id: z.number() }),
    body: IngredientCreate,
    response: IngredientRead.optional(),
  })
  .delete("/:id", async ({ query: { id }, status }) => {
    await db
      .delete(schema.ingredients)
      .where(eq(schema.ingredients.id, id));

    return status(204, {});
  }, {
    query: z.object({ id: z.number() }),
    response: { 204: z.object() },
  })
