import { Elysia } from "elysia";

export const router = new Elysia({ prefix: "/test" })
  .get("", {
    message: "Hello, World!"
  })
