import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { staticPlugin } from "@elysiajs/static";
import { env } from "@/env";
import { logging } from "@/logging";

import { testRouter } from "@/api/test";
import { postsRouter } from "@/api/posts";
import { recipesRouter } from "@/api/recipes";
import { cuisinesRouter } from "@/api/cuisines";
import { allergensRouter } from "@/api/allergens";
import { ingredientsRouter } from "@/api/ingredients";

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
  .use(cuisinesRouter)
  .use(allergensRouter)
  .use(ingredientsRouter)
  .listen(env.PORT);

console.log(`🦊 Elysia is running at ${env.HOST}`);
