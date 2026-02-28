import { Elysia } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { jwt } from "@elysiajs/jwt";
import { z } from "zod";
import { env } from "@/env";

export const context = new Elysia({ name: "context" })
  .use(bearer())
  .use(
    jwt({
      name: "jwt",
      secret: env.JWT_SECRET,
    })
  )
  .macro("auth", {
    detail: {
      security: [{ bearerAuth: [] }]
    },
    headers: z.object({
      authorization: z.string(),
    }),
    response: {
      401: z.object({
        error: z.string()
      }),
    },
    resolve: async ({ bearer, jwt, status }) => {
      const error = status(401, { error: "Unauthorized" });
      if (!bearer) return error;

      const auth = await jwt.verify(bearer);
      if (!auth) return error;

      return {
        auth: {
          userId: Number(auth.sub),
        },
      };
    },
  });
