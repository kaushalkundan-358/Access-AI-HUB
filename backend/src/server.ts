import { app } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { appConfig } from "./config/appConfig";
import { logger } from "./utils/logger";

async function startServer(): Promise<void> {
  await connectDatabase();
  const server = app.listen(appConfig.port, () => {
    logger.info("AccessHub AI API listening", {
      port: appConfig.port,
      environment: appConfig.environment
    });
  });

  const shutdown = (signal: string): void => {
    logger.info("Shutting down server", { signal });
    server.close(() => {
      void disconnectDatabase()
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          logger.error("Database disconnect failed during shutdown", {
            error: error instanceof Error ? error.message : String(error)
          });
          process.exit(1);
        });
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

void startServer().catch((error: unknown) => {
  logger.error("Server startup failed", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exitCode = 1;
});
