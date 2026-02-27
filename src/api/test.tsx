import { Elysia, fileType } from "elysia";
import { html, Html } from "@elysiajs/html";
import { z } from "zod";
import { env } from "@/env";
import fsp from "fs/promises";
import { parse as parsePath } from "path";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const ItemSchema = z.object({
  id: z.int32().min(0),
  name: z.string(),
});

const items: z.infer<typeof ItemSchema>[] = [
  { id: 1, name: "apple" },
  { id: 2, name: "banana" },
  { id: 3, name: "orange" },
  { id: 4, name: "strawberry" },
];

const FilterParamsSchema = z.object({
  limit: z.int32().min(1).max(10).default(10),
  offset: z.int32().min(0).default(0),
});

const InnerSchema = z.object({
  name: z.string(),
});

const OuterSchema = z.object({
  inner: InnerSchema,
});

const ImageSchema = z.object({
  file: z.file()
    .mime(["image/png", "image/jpeg", "image/webp"])
    .refine((file) => fileType(file, ["image/png", "image/jpeg", "image/webp"])),
});

export const router = new Elysia({ prefix: "/test" })
  .post("/items", ({ body }) => {
    return body;
  }, {
    body: ItemSchema,
  })
  .get("/items", ({ query: { q } }) => {
    return items.filter((item) => item.name.toLowerCase().includes(q.toLowerCase()));
  }, {
    query: z.object({ q: z.string() }),
    response: ItemSchema.array(),
  })
  .get("/items/:id", ({ params: { id } }) => {
    return items.find((item) => item.id === id);
  }, {
    params: z.object({ id: z.coerce.number() }),
  })
  .get("/items/filter", ({ query }) => {
    return items.slice(query.offset, query.offset + query.limit);
  }, {
    query: FilterParamsSchema,
  })
  .post("/items/nested", ({ body }) => {
    return body;
  }, {
    body: OuterSchema,
  })
  .get("/json-or-html-1", ({ query: { format } }) => {
    if (format === "json") return items;
    const html = `<ul>${items.map((item) => `<li>${item.id}) ${item.name}</li>`).join("")}</ul>`
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }, {
    query: z.object({ format: z.enum(["json", "html"]) }),
  })
  .use(html())
  .get("/json-or-html-2", ({ query: { format } }) => {
    if (format === "json") return items;
    return (
      <ul>
        {items.map((item) => (
          <li>{item.id}) {item.name}</li>
        ))}
      </ul>
    );
  }, {
    query: z.object({ format: z.enum(["json", "html"]) }),
  })
  .post("/image", async ({ body: { file } }) => {
    const { ext } = parsePath(file.name);
    const data = await file.bytes();
    const filename = bytesToHex(sha256(data)) + ext;
    await fsp.writeFile(`public/${filename}`, data);
    return {
      url: `${env.HOST}/public/${filename}`,
    };
  }, {
    body: ImageSchema,
  })
