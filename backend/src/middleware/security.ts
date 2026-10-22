import cors from "cors";
import helmet from "helmet";
import { RequestHandler } from "express";
import { appConfig } from "../config/appConfig";

export const securityHeaders = helmet();

export const corsPolicy: RequestHandler = cors({
  origin: appConfig.frontendOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
});
