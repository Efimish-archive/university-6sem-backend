import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { staticPlugin } from "@elysiajs/static";
import { env } from "@/env";
import { logging } from "@/logging";
import { router as testRouter } from "@/api/test";
import { router as postsRouter } from "@/api/posts";
import { router as recipesRouter } from "@/api/recipes";

const app = new Elysia()
  .use(
    openapi({
      // provider: "swagger-ui",
      path: "/docs",
      documentation: {
        info: {
          title: "Бэкенд разработка",
          version: "0.0.1",
        },
      },
    })
  )
  .use(staticPlugin())
  .use(logging())
  .use(testRouter)
  .use(postsRouter)
  .use(recipesRouter)
  .listen(env.PORT);

console.log(`🦊 Elysia is running at ${env.HOST}`);
