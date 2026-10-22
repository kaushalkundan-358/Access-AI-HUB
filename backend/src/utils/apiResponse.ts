import { Response } from "express";

export function sendSuccess<T>(
  response: Response,
  statusCode: number,
  data: T,
  message = "Request completed successfully"
): void {
  response.status(statusCode).json({ success: true, message, data });
}
