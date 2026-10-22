import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./errors";
import { JwtPayload } from "../types/auth";

export function authenticate(request: Request, _response: Response, next: NextFunction): void {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

  if (!token) {
    next(new AppError(401, "Authentication is required", "UNAUTHENTICATED"));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      throw new Error("Invalid token payload");
    }
    request.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(new AppError(401, "The access token is invalid or expired", "INVALID_TOKEN"));
  }
}
