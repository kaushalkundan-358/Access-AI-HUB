import fs from "node:fs/promises";
import { Request, Response } from "express";
import { asyncHandler, AppError } from "../middleware/errors";
import { documentService } from "../services/documentService";
import { sendSuccess } from "../utils/apiResponse";

export const uploadDocument = asyncHandler(async (request: Request, response: Response) => {
  if (!request.file) {
    throw new AppError(400, "A PDF file is required in the 'file' field", "FILE_REQUIRED");
  }

  let document: Awaited<ReturnType<typeof documentService.upload>>;
  try {
    document = await documentService.upload(request.user!.id, request.file);
  } finally {
    await fs.rm(request.file.path, { force: true });
  }
  sendSuccess(response, 201, document, "PDF uploaded and processed");
});

export const getDocumentText = asyncHandler(async (request: Request, response: Response) => {
  const document = await documentService.getText(request.user!.id, request.params.id);
  sendSuccess(response, 200, document);
});
