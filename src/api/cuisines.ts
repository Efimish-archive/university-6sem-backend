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

const Params = z.object({
  id: z.coerce.number(),
});

const Message = z.object({
  message: z.string(),
});

const Error = z.object({
  error: z.string(),
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
  .get("/:id", async ({ params: { id }, status }) => {
    const cuisine = await db.query.cuisines.findFirst({
      where: eq(schema.cuisines.id, id),
    });
    if (!cuisine) return status(404, {
      error: "cuisine with this id not found",
    });
    return cuisine;
  }, {
    params: Params,
    response: {
      200: CuisineRead,
      404: Error,
    },
  })
  .put("/:id", async ({ params: { id }, body, status }) => {
    const [cuisine] = await db
      .update(schema.cuisines)
      .set(body)
      .where(eq(schema.cuisines.id, id))
      .returning();

    if (!cuisine) return status(404, {
      error: "cuisine with this id not found",
    });

    return cuisine;
  }, {
    params: Params,
    body: CuisineCreate,
    response: {
      200: CuisineRead,
      404: Error,
    },
  })
  .delete("/:id", async ({ params: { id }, status }) => {
    const deleted = await db
      .delete(schema.cuisines)
      .where(eq(schema.cuisines.id, id));

    if (deleted.rowsAffected === 0) return status(404, {
      error: "cuisine with this id not found",
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
