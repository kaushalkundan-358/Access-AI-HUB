import { Router } from "express";
import { getCurrentUser, login, register } from "../controllers/userController";
import { authenticate } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validateRequest";
import { loginSchema, registerSchema } from "../validators/userValidators";

export const userRoutes = Router();
userRoutes.post("/register", validateRequest(registerSchema), register);
userRoutes.post("/login", validateRequest(loginSchema), login);
userRoutes.get("/me", authenticate, getCurrentUser);
