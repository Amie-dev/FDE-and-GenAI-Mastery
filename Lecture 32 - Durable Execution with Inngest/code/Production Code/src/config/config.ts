import { z } from "zod";

const EnvSchema = z.object({
  INNGEST_APP_ID: z.string().min(1, "INNGEST_APP_ID is required"),
  INNGEST_EVENT_KEY: z.string().optional(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  OPENAI_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

type EnvConfig = z.infer<typeof EnvSchema>;

function loadConfig(): EnvConfig {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}

export const config = loadConfig();