import { Elysia } from "elysia";
import { z } from "zod";
import { db, schema } from "@/db";
import { context } from "@/context";
import { eq } from "drizzle-orm";
import argon2 from "argon2";

const Login = z.object({
  login: z.string(),
  password: z.string(),
});

const Register = z.object({
  login: z.string(),
  password: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

const Error = z.object({
  error: z.string(),
});

const Token = z.object({
  token: z.string(),
});

export const usersRouter = new Elysia({ prefix: "/users" })
  .use(context)
  .post("/login", async ({ body, jwt, status }) => {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.login, body.login),
    });
    if (!user) return status(401, {
      error: "возможно 403",
    });

    const { password, ...rest } = body;
    const isPasswordCorrect = await argon2.verify(user.passwordHash, password);
    if (!isPasswordCorrect) return status(401, {
      error: "возможно 403",
    });

    const token = await jwt.sign({
      sub: user.id.toString(),
    });

    return { token };
  }, {
    body: Login,
    response: {
      200: Token,
      401: Error,
    },
  })
  .post("/register", async ({ body, jwt, status }) => {
    const { password, ...rest } = body;
    const passwordHash = await argon2.hash(password);

    const doesUserAlreadyExist = await db.query.users.findFirst({
      where: eq(schema.users.login, body.login),
    });

    if (doesUserAlreadyExist) return status(409, {
      error: "возможно не 409",
    });

    const [user] = await db.insert(schema.users).values({
      ...rest,
      passwordHash,
    }).returning();

    const token = await jwt.sign({
      sub: user.id.toString(),
    });

    return { token };
  }, {
    body: Register,
    response: {
      200: Token,
      409: Error,
    },
  })
// TODO: /update
