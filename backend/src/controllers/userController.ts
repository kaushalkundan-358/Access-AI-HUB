import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errors";
import { userService } from "../services/userService";
import { sendSuccess } from "../utils/apiResponse";

export const register = asyncHandler(async (request: Request, response: Response) => {
  const result = await userService.register(request.body.email, request.body.password);
  sendSuccess(response, 201, result, "Account created");
});

export const login = asyncHandler(async (request: Request, response: Response) => {
  const result = await userService.login(request.body.email, request.body.password);
  sendSuccess(response, 200, result, "Signed in");
});

export const getCurrentUser = asyncHandler(async (request: Request, response: Response) => {
  const user = await userService.getById(request.user!.id);
  sendSuccess(response, 200, user);
});
