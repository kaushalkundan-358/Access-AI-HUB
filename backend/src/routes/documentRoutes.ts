import { Router } from "express";
import { getDocumentText, uploadDocument } from "../controllers/documentController";
import { authenticate } from "../middleware/authenticate";
import { pdfUpload } from "../middleware/upload";
import { validateRequest } from "../middleware/validateRequest";
import { documentIdSchema } from "../validators/documentValidators";

export const documentRoutes = Router();
documentRoutes.use(authenticate);
documentRoutes.post("/upload", pdfUpload, uploadDocument);
documentRoutes.get("/:id/text", validateRequest(documentIdSchema), getDocumentText);
