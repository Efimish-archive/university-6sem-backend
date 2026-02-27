import { Elysia } from "elysia";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const AllergenRead = z.object({
  id: z.int32().min(0),
  name: z.string(),
});

const AllergenCreate = z.object({
  name: z.string(),
});

export const allergensRouter = new Elysia({ prefix: "/allergens" })
  .get("", async () => {
    const allergens = await db.query.allergens.findMany();
    return allergens;
  }, {
    response: AllergenRead.array(),
  })
  .post("", async ({ body, status }) => {
    const [allergen] = await db
      .insert(schema.allergens)
      .values(body)
      .returning();

    return status(201, allergen);
  }, {
    body: AllergenCreate,
    response: { 201: AllergenRead },
  })
  .get("/:id", async ({ query: { id } }) => {
    const allergen = await db.query.allergens.findFirst({
      where: eq(schema.allergens.id, id),
    });
    return allergen;
  }, {
    query: z.object({ id: z.number() }),
    response: AllergenRead.optional(),
  })
  .put("/:id", async ({ query: { id }, body }) => {
    const [allergen] = await db
      .update(schema.allergens)
      .set(body)
      .where(eq(schema.allergens.id, id))
      .returning();

    return allergen;
  }, {
    query: z.object({ id: z.number() }),
    body: AllergenCreate,
    response: AllergenRead.optional(),
  })
  .delete("/:id", async ({ query: { id }, status }) => {
    await db
      .delete(schema.allergens)
      .where(eq(schema.allergens.id, id));

    return status(204, {});
  }, {
    query: z.object({ id: z.number() }),
    response: { 204: z.object() },
  })
