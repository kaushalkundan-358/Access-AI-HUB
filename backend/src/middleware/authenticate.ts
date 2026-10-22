import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { AppError } from "./errors";
import { userService } from "../services/userService";
import { JwtPayload } from "../types/auth";

export function authenticate(request: Request, _response: Response, next: NextFunction): void {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

  if (!token) {
    next(new AppError(401, "Authentication is required", "UNAUTHENTICATED"));
    return;
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    authenticateSupabaseToken(token, request, next);
    return;
  }

  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    next(new AppError(401, "The access token is invalid or expired", "INVALID_TOKEN"));
    return;
  }

  request.user = { id: payload.sub, email: payload.email };
  next();
}

function authenticateSupabaseToken(
  token: string,
  request: Request,
  next: NextFunction
): void {
  const { url, publishableKey } = env.SUPABASE_URL
    ? { url: env.SUPABASE_URL, publishableKey: env.SUPABASE_PUBLISHABLE_KEY }
    : { url: undefined, publishableKey: undefined };

  if (!url || !publishableKey) {
    next(
      new AppError(
        503,
        "Supabase authentication is not configured on the API",
        "AUTH_PROVIDER_NOT_CONFIGURED"
      )
    );
    return;
  }

  const supabase = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });

  void supabase.auth.getUser(token).then(async ({ data, error }) => {
    if (error || !data.user?.email) {
      const unavailable = error !== null && (error.status ?? 0) >= 500;
      next(
        new AppError(
          unavailable ? 503 : 401,
          unavailable
            ? "Authentication service is temporarily unavailable"
            : "The access token is invalid or expired",
          unavailable ? "AUTH_PROVIDER_UNAVAILABLE" : "INVALID_TOKEN"
        )
      );
      return;
    }

    try {
      const user = await userService.syncSupabaseUser(data.user.id, data.user.email);
      request.user = { id: user.id, email: user.email };
      next();
    } catch (error) {
      next(error);
    }
  }).catch(next);
}
