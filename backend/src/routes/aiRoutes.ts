import { Router } from "express";
import { explain, simplify, summarize, translate } from "../controllers/aiController";
import { authenticate } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validateRequest";
import { explainSchema, textTaskSchema, translateSchema } from "../validators/aiValidators";

export const aiRoutes = Router();
aiRoutes.use(authenticate);
aiRoutes.post("/simplify", validateRequest(textTaskSchema), simplify);
aiRoutes.post("/summarize", validateRequest(textTaskSchema), summarize);
aiRoutes.post("/explain", validateRequest(explainSchema), explain);
aiRoutes.post("/translate", validateRequest(translateSchema), translate);
