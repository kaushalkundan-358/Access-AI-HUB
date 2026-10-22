import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must contain at least 32 characters"),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^[1-9]\d*[smhd]$/, "JWT_EXPIRES_IN must use a positive s, m, h, or d duration")
    .default("1d"),
  UPLOAD_MAX_MB: z.coerce.number().int().min(1).max(50).default(10),
  PDF_MAX_PAGES: z.coerce.number().int().min(1).max(200).default(30),
  OCR_LANGUAGES: z.string().default("eng+hin"),
  AI_API_KEY: z.string().optional().default(""),
  AI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${parsedEnv.error.message}`);
}

export const env = parsedEnv.data;
