import { Router } from "express";
import {
  createProfile,
  deleteProfile,
  listProfiles,
  updateProfile
} from "../controllers/profileController";
import { authenticate } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validateRequest";
import {
  createProfileSchema,
  profileIdSchema,
  updateProfileSchema
} from "../validators/profileValidators";

export const profileRoutes = Router();
profileRoutes.use(authenticate);
profileRoutes.get("/", listProfiles);
profileRoutes.post("/", validateRequest(createProfileSchema), createProfile);
profileRoutes.put("/:id", validateRequest(updateProfileSchema), updateProfile);
profileRoutes.delete("/:id", validateRequest(profileIdSchema), deleteProfile);
