import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";

export function validateRequest(schema: ZodType) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: request.body,
      params: request.params,
      query: request.query
    });

    if (!result.success) {
      next(result.error);
      return;
    }

    if (result.data && typeof result.data === "object") {
      const parsed = result.data as {
        body?: unknown;
        params?: Request["params"];
        query?: Request["query"];
      };
      if (parsed.body !== undefined) request.body = parsed.body;
      if (parsed.params !== undefined) request.params = parsed.params;
      if (parsed.query !== undefined) request.query = parsed.query;
    }
    next();
  };
}
