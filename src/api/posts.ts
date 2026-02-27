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
  .get("/:id", async ({ query: { id } }) => {
    const post = await db.query.posts.findFirst({
      where: eq(schema.posts.id, id),
    });
    return post;
  }, {
    query: z.object({ id: z.number() }),
    response: PostRead.optional(),
  })
  .put("/:id", async ({ query: { id }, body }) => {
    const [post] = await db
      .update(schema.posts)
      .set(body)
      .where(eq(schema.posts.id, id))
      .returning();

    return post;
  }, {
    query: z.object({ id: z.number() }),
    body: PostCreate,
    response: PostRead.optional(),
  })
  .delete("/:id", async ({ query: { id }, status }) => {
    await db
      .delete(schema.posts)
      .where(eq(schema.posts.id, id));

    return status(204, {});
  }, {
    query: z.object({ id: z.number() }),
    response: { 204: z.object() },
  })
