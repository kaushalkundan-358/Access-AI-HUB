import { PDFParse } from "pdf-parse";
import { appConfig } from "../config/appConfig";
import { AppError } from "../middleware/errors";
import { logger } from "../utils/logger";
import { normalizeExtractedText } from "../utils/text";
import { extractPdfTextWithOcr } from "./ocrService";

export interface PdfTextResult {
  text: string;
  pageCount: number;
  extractionMethod: "text" | "ocr";
}

export async function extractPdfText(buffer: Buffer): Promise<PdfTextResult> {
  if (buffer.length < 5 || buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new AppError(400, "The uploaded file is not a valid PDF", "INVALID_PDF");
  }

  const parser = new PDFParse({ data: buffer });
  let pageCount: number;
  let extractedText: string;
  try {
    const info = await parser.getInfo();
    pageCount = info.total;
    if (pageCount > appConfig.pdfMaxPages) {
      throw new AppError(
        413,
        `PDF exceeds the ${appConfig.pdfMaxPages}-page processing limit`,
        "PDF_PAGE_LIMIT"
      );
    }
    extractedText = normalizeExtractedText((await parser.getText()).text);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.warn("PDF parser rejected an uploaded document", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new AppError(400, "The PDF could not be parsed", "PDF_PARSE_ERROR");
  } finally {
    await parser.destroy();
  }

  if (extractedText.length >= 40) {
    return { text: extractedText, pageCount, extractionMethod: "text" };
  }

  let ocrText: string;
  try {
    ocrText = normalizeExtractedText(
      await extractPdfTextWithOcr(buffer, appConfig.pdfMaxPages)
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      503,
      "OCR processing failed. Confirm OCR language data can be downloaded and retry.",
      "OCR_PROCESSING_ERROR"
    );
  }

  return {
    text: ocrText || extractedText,
    pageCount,
    extractionMethod: "ocr"
  };
}
