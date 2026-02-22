import { z } from "zod";

const EnvSchema = z.object({
  HOST: z.url(),
  PORT: z.coerce.number().default(3000),
  DB_FILE_NAME: z.string(),
});

export const env = EnvSchema.parse(process.env);
