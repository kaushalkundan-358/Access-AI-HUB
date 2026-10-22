import { extractPdfText } from "../services/pdfService";

function createTextPdf(text: string): Buffer {
  const content = `BT /F1 18 Tf 20 80 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}

describe("PDF processing", () => {
  it("rejects files that only claim to be PDFs", async () => {
    await expect(extractPdfText(Buffer.from("not a PDF"))).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_PDF"
    });
  });

  it("extracts text from a PDF with an embedded text layer", async () => {
    const result = await extractPdfText(
      createTextPdf("This is a readable PDF with enough text for extraction.")
    );

    expect(result.pageCount).toBe(1);
    expect(result.extractionMethod).toBe("text");
    expect(result.text).toContain("readable PDF");
  });
});
