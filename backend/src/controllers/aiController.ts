import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errors";
import { aiService } from "../services/aiService";
import { sendSuccess } from "../utils/apiResponse";

export const simplify = asyncHandler(async (request: Request, response: Response) => {
  const result = await aiService.simplify(request.body.text);
  sendSuccess(response, 200, result);
});

export const summarize = asyncHandler(async (request: Request, response: Response) => {
  const result = await aiService.summarize(request.body.text);
  sendSuccess(response, 200, result);
});

export const explain = asyncHandler(async (request: Request, response: Response) => {
  const result = await aiService.explain(request.body.text, request.body.topic);
  sendSuccess(response, 200, result);
});

export const translate = asyncHandler(async (request: Request, response: Response) => {
  const result = await aiService.translate(request.body.text, request.body.targetLanguage);
  sendSuccess(response, 200, result);
});
