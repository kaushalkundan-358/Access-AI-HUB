import { Request, Response } from "express";
import { prisma } from "../config/database";
import { asyncHandler } from "../middleware/errors";
import { sendSuccess } from "../utils/apiResponse";

export const getHealth = asyncHandler(async (_request: Request, response: Response) => {
  await prisma.$queryRaw`SELECT 1`;
  sendSuccess(response, 200, {
    status: "ok",
    database: "connected",
    timestamp: new Date().toISOString()
  });
});
