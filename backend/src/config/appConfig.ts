import path from "node:path";
import { env } from "./env";

export const appConfig = {
  environment: env.NODE_ENV,
  port: env.PORT,
  frontendOrigin: env.FRONTEND_ORIGIN,
  supabase: {
    url: env.SUPABASE_URL,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY
  },
  uploadDirectory: path.resolve(__dirname, "../../uploads/temp"),
  uploadMaxBytes: env.UPLOAD_MAX_MB * 1024 * 1024,
  pdfMaxPages: env.PDF_MAX_PAGES,
  ocrLanguages: env.OCR_LANGUAGES.split("+"),
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  ai: {
    apiKey: env.AI_API_KEY,
    baseURL: env.AI_BASE_URL,
    model: env.AI_MODEL,
    timeoutMs: env.AI_TIMEOUT_MS
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX
  }
} as const;
