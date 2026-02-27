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

const Params = z.object({
  id: z.coerce.number(),
});

const Message = z.object({
  message: z.string(),
});

const Error = z.object({
  error: z.string(),
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
  .get("/:id", async ({ params: { id }, status }) => {
    const allergen = await db.query.allergens.findFirst({
      where: eq(schema.allergens.id, id),
    });
    if (!allergen) return status(404, {
      error: "allergen with this id not found",
    });
    return allergen;
  }, {
    params: Params,
    response: {
      200: AllergenRead,
      404: Error,
    },
  })
  .put("/:id", async ({ params: { id }, body, status }) => {
    const [allergen] = await db
      .update(schema.allergens)
      .set(body)
      .where(eq(schema.allergens.id, id))
      .returning();

    if (!allergen) return status(404, {
      error: "allergen with this id not found",
    });

    return allergen;
  }, {
    params: Params,
    body: AllergenCreate,
    response: {
      200: AllergenRead,
      404: Error,
    },
  })
  .delete("/:id", async ({ params: { id }, status }) => {
    const deleted = await db
      .delete(schema.allergens)
      .where(eq(schema.allergens.id, id));

    if (deleted.rowsAffected === 0) return status(404, {
      error: "allergen with this id not found",
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
