import express from "express";
import path from "node:path";
import { API_PREFIX } from "./constants/api";
import { AppError, errorHandler } from "./middleware/errors";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { corsPolicy, securityHeaders } from "./middleware/security";
import { aiRoutes } from "./routes/aiRoutes";
import { documentRoutes } from "./routes/documentRoutes";
import { healthRoutes } from "./routes/healthRoutes";
import { profileRoutes } from "./routes/profileRoutes";
import { userRoutes } from "./routes/userRoutes";

export const app = express();

app.disable("x-powered-by");
app.use(securityHeaders);
app.use(corsPolicy);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(API_PREFIX, apiRateLimiter);
app.use(`${API_PREFIX}/health`, healthRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/documents`, documentRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/profiles`, profileRoutes);

app.get("/", (_request, response) => {
  response.json({ success: true, message: "AccessHub AI API", data: { docs: "/api/docs" } });
});
app.get(`${API_PREFIX}/docs`, (_request, response) => {
  response.redirect("/openapi.yaml");
});
app.get("/openapi.yaml", (_request, response, next) => {
  response.sendFile(path.resolve(__dirname, "..", "openapi.yaml"), (error) => {
    if (error) next(error);
  });
});

app.use((request, _response, next) => {
  next(new AppError(404, `Route ${request.method} ${request.path} was not found`, "NOT_FOUND"));
});
app.use(errorHandler);
