import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";
import { appConfig } from "../config/appConfig";
import { AppError } from "../middleware/errors";

export async function extractPdfTextWithOcr(pdfBuffer: Buffer, pageLimit: number): Promise<string> {
  type PdfjsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadPdfjs = Function(
    "return import('pdfjs-dist/legacy/build/pdf.mjs')"
  ) as () => Promise<PdfjsModule>;
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBuffer), useSystemFonts: true });
  const pdf = await loadingTask.promise;

  if (pdf.numPages > pageLimit) {
    await pdf.destroy();
    throw new AppError(413, `PDF exceeds the ${pageLimit}-page processing limit`, "PDF_PAGE_LIMIT");
  }

  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  const pages: string[] = [];

  try {
    worker = await createWorker(appConfig.ocrLanguages.join("+"));
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");
      await page.render({
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport
      }).promise;
      const result = await worker.recognize(canvas.toBuffer("image/png"));
      pages.push(result.data.text);
      page.cleanup();
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    if (worker) await worker.terminate();
    await pdf.destroy();
  }

  return pages.join("\n\n");
}
