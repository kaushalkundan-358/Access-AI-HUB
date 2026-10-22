import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "REQUEST_ERROR"
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>
) {
  return (request: Request, response: Response, next: NextFunction): void => {
    void handler(request, response, next).catch(next);
  };
}

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  let statusCode = 500;
  let message = "An unexpected error occurred";
  let code = "INTERNAL_SERVER_ERROR";
  let details: unknown;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = "Request validation failed";
    code = "VALIDATION_ERROR";
    details = error.flatten();
  } else if (error?.name === "MulterError") {
    statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message = error.code === "LIMIT_FILE_SIZE" ? "Uploaded file exceeds the size limit" : error.message;
    code = "UPLOAD_ERROR";
  } else if (error?.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Request body contains invalid JSON";
    code = "INVALID_JSON";
  }

  if (statusCode >= 500) {
    logger.error("Request failed", {
      method: request.method,
      path: request.path,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  response.status(statusCode).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) }
  });
};
