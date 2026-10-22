import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errors";
import { profileService } from "../services/profileService";
import { sendSuccess } from "../utils/apiResponse";

export const listProfiles = asyncHandler(async (request: Request, response: Response) => {
  const profiles = await profileService.list(request.user!.id);
  sendSuccess(response, 200, profiles);
});

export const createProfile = asyncHandler(async (request: Request, response: Response) => {
  const profile = await profileService.create(request.user!.id, request.body);
  sendSuccess(response, 201, profile, "Accessibility profile created");
});

export const updateProfile = asyncHandler(async (request: Request, response: Response) => {
  const profile = await profileService.update(request.user!.id, request.params.id, request.body);
  sendSuccess(response, 200, profile, "Accessibility profile updated");
});

export const deleteProfile = asyncHandler(async (request: Request, response: Response) => {
  await profileService.remove(request.user!.id, request.params.id);
  sendSuccess(response, 200, { id: request.params.id }, "Accessibility profile deleted");
});
