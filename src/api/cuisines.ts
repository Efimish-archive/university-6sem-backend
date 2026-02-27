import { Elysia } from "elysia";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const CuisineRead = z.object({
  id: z.int32().min(0),
  name: z.string(),
});

const CuisineCreate = z.object({
  name: z.string(),
});

export const cuisinesRouter = new Elysia({ prefix: "/cuisines" })
  .get("", async () => {
    const cuisines = await db.query.cuisines.findMany();
    return cuisines;
  }, {
    response: CuisineRead.array(),
  })
  .post("", async ({ body, status }) => {
    const [cuisine] = await db
      .insert(schema.cuisines)
      .values(body)
      .returning();

    return status(201, cuisine);
  }, {
    body: CuisineCreate,
    response: { 201: CuisineRead },
  })
  .get("/:id", async ({ query: { id } }) => {
    const cuisine = await db.query.cuisines.findFirst({
      where: eq(schema.cuisines.id, id),
    });
    return cuisine;
  }, {
    query: z.object({ id: z.number() }),
    response: CuisineRead.optional(),
  })
  .put("/:id", async ({ query: { id }, body }) => {
    const [cuisine] = await db
      .update(schema.cuisines)
      .set(body)
      .where(eq(schema.cuisines.id, id))
      .returning();

    return cuisine;
  }, {
    query: z.object({ id: z.number() }),
    body: CuisineCreate,
    response: CuisineRead.optional(),
  })
  .delete("/:id", async ({ query: { id }, status }) => {
    await db
      .delete(schema.cuisines)
      .where(eq(schema.cuisines.id, id));

    return status(204, {});
  }, {
    query: z.object({ id: z.number() }),
    response: { 204: z.object() },
  })
