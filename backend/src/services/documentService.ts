import fs from "node:fs/promises";
import { prisma } from "../config/database";
import { AppError } from "../middleware/errors";
import { extractPdfText } from "./pdfService";

interface UploadedPdf {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

export const documentService = {
  async upload(userId: string, file: UploadedPdf) {
    const parsed = await extractPdfText(await fs.readFile(file.path));
    const document = await prisma.document.create({
      data: {
        userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        extractedText: parsed.text
      },
      select: { id: true, originalName: true, sizeBytes: true, createdAt: true }
    });

    return {
      ...document,
      pageCount: parsed.pageCount,
      extractionMethod: parsed.extractionMethod,
      characterCount: parsed.text.length
    };
  },

  async getText(userId: string, id: string) {
    const document = await prisma.document.findFirst({
      where: { id, userId },
      select: { id: true, originalName: true, extractedText: true, createdAt: true }
    });
    if (!document) throw new AppError(404, "Document not found", "DOCUMENT_NOT_FOUND");
    return document;
  }
};
