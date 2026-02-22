import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { env } from "@/env";

export const db = drizzle({
  connection: env.DB_FILE_NAME,
  schema,
  casing: "snake_case",
});

export { schema };
