import { Elysia } from "elysia";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const PostRead = z.object({
  id: z.int32().min(0),
  title: z.string().max(200),
  descr: z.string(),
});

const PostCreate = z.object({
  title: z.string().max(200),
  descr: z.string(),
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

export const postsRouter = new Elysia({ prefix: "/posts" })
  .get("", async () => {
    const posts = await db.query.posts.findMany();
    return posts;
  }, {
    response: PostRead.array(),
  })
  .post("", async ({ body, status }) => {
    const [post] = await db
      .insert(schema.posts)
      .values(body)
      .returning();

    return status(201, post);
  }, {
    body: PostCreate,
    response: { 201: PostRead },
  })
  .get("/:id", async ({ params: { id }, status }) => {
    const post = await db.query.posts.findFirst({
      where: eq(schema.posts.id, id),
    });
    if (!post) return status(404, {
      error: "post with this id not found",
    });
    return post;
  }, {
    params: Params,
    response: {
      200: PostRead,
      404: Error,
    },
  })
  .put("/:id", async ({ params: { id }, body, status }) => {
    const [post] = await db
      .update(schema.posts)
      .set(body)
      .where(eq(schema.posts.id, id))
      .returning();

    if (!post) return status(404, {
      error: "post with this id not found",
    });

    return post;
  }, {
    params: Params,
    body: PostCreate,
    response: {
      200: PostRead,
      404: Error,
    },
  })
  .delete("/:id", async ({ params: { id }, status }) => {
    const deleted = await db
      .delete(schema.posts)
      .where(eq(schema.posts.id, id));

    if (deleted.rowsAffected === 0) return status(404, {
      error: "post with this id not found",
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
