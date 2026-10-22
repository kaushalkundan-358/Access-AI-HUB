import rateLimit from "express-rate-limit";
import { appConfig } from "../config/appConfig";

export const apiRateLimiter = rateLimit({
  windowMs: appConfig.rateLimit.windowMs,
  limit: appConfig.rateLimit.max,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many requests; please try again later" }
  }
});
