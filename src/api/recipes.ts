import { Elysia } from "elysia";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const RecipeRead = z.object({
  id: z.int32().min(0),
  title: z.string().max(200),
  description: z.string(),
  cookingTime: z.int32().min(1),
  difficulty: z.int32().min(1).max(5),
});

const RecipeCreate = z.object({
  title: z.string().max(200),
  description: z.string(),
  cookingTime: z.int32().min(1),
  difficulty: z.int32().min(1).max(5),
});

export const router = new Elysia({ prefix: "/recipes" })
  .get("", async () => {
    const recipes = await db.query.recipes.findMany();
    return recipes;
  }, {
    response: RecipeRead.array(),
  })
  .post("", async ({ body, status }) => {
    const [recipe] = await db
      .insert(schema.recipes)
      .values(body)
      .returning();

    return status(201, recipe);
  }, {
    body: RecipeCreate,
    response: { 201: RecipeRead },
  })
  .get("/:id", async ({ query: { id } }) => {
    const recipe = await db.query.recipes.findFirst({
      where: eq(schema.recipes.id, id),
    });
    return recipe;
  }, {
    query: z.object({ id: z.number() }),
    response: RecipeRead.optional(),
  })
  .put("/:id", async ({ query: { id }, body }) => {
    const [recipe] = await db
      .update(schema.recipes)
      .set(body)
      .where(eq(schema.recipes.id, id))
      .returning();

    return recipe;
  }, {
    query: z.object({ id: z.number() }),
    body: RecipeCreate,
    response: RecipeRead.optional(),
  })
  .delete("/:id", async ({ query: { id }, status }) => {
    await db
      .delete(schema.recipes)
      .where(eq(schema.recipes.id, id))
      .returning();

    return status(204, {});
  }, {
    query: z.object({ id: z.number() }),
    response: { 204: z.object() },
  })
