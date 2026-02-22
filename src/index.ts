import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { env } from "@/env";
import { router as postsRouter } from "./api/posts";
import { router as testRouter } from "./api/test";

const app = new Elysia()
  .use(openapi({
    provider: "swagger-ui",
    path: "/docs",
  }))
  .use(postsRouter)
  .use(testRouter)
  .listen(env.PORT);

console.log(`🦊 Elysia is running at ${env.HOST}`);
