import { describe, it, expect } from "vitest";
import {
  validateUploadFile,
  extractTextFromBuffer,
  MAX_UPLOAD_BYTES,
} from "@/lib/content/extract";

describe("Document Upload Validation & Text Extraction", () => {
  // ---------------------------------------------------------------------------
  // 1. Upload Validation Tests
  // ---------------------------------------------------------------------------
  describe("validateUploadFile", () => {
    it("accepts valid .txt, .md, and .docx files under 5 MB", () => {
      expect(
        validateUploadFile({ name: "announcement.txt", size: 1024 })
      ).toEqual({ valid: true });

      expect(
        validateUploadFile({ name: "style-guide.md", size: 50 * 1024 })
      ).toEqual({ valid: true });

      expect(
        validateUploadFile({ name: "press-release.docx", size: 500 * 1024 })
      ).toEqual({ valid: true });
    });

    it("rejects files exceeding the 5 MB limit", () => {
      const oversized = MAX_UPLOAD_BYTES + 1024;
      const res = validateUploadFile({
        name: "huge-document.docx",
        size: oversized,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toContain("exceeds maximum allowed limit of 5 MB");
    });

    it("specifically rejects PDF files with an informative explanation", () => {
      const res = validateUploadFile({
        name: "product-manual.pdf",
        size: 200 * 1024,
      });

      expect(res.valid).toBe(false);
      expect(res.isUnsupportedPdf).toBe(true);
      expect(res.error).toContain("PDF extraction is not supported yet");
      expect(res.error).toContain(".txt, .md, or .docx");
    });

    it("rejects unsupported file formats like .png, .exe, or .xlsx", () => {
      expect(
        validateUploadFile({ name: "image.png", size: 1000 }).valid
      ).toBe(false);

      expect(
        validateUploadFile({ name: "installer.exe", size: 1000 }).valid
      ).toBe(false);

      expect(
        validateUploadFile({ name: "financials.xlsx", size: 1000 }).valid
      ).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Text Extraction Tests
  // ---------------------------------------------------------------------------
  describe("extractTextFromBuffer", () => {
    it("extracts clean UTF-8 text and computes word count from .txt file", async () => {
      const content = "The all-new SummitX expedition pack is engineered for high alpine ascents.";
      const buffer = Buffer.from(content, "utf-8");

      const res = await extractTextFromBuffer(buffer, "sample.txt");

      expect(res.success).toBe(true);
      expect(res.text).toBe(content);
      expect(res.wordCount).toBe(11);
      expect(res.format).toBe("txt");
    });

    it("extracts markdown document and normalizes line breaks", async () => {
      const markdown = `# Aster & Pine\r\n\r\n\r\n\r\nRugged outdoor gear.\r\n\r\nBuilt to endure.`;
      const buffer = Buffer.from(markdown, "utf-8");

      const res = await extractTextFromBuffer(buffer, "guidelines.md");

      expect(res.success).toBe(true);
      expect(res.text).toBe("# Aster & Pine\n\nRugged outdoor gear.\n\nBuilt to endure.");
      expect(res.wordCount).toBe(10);
      expect(res.format).toBe("md");
    });

    it("rejects empty text documents", async () => {
      const buffer = Buffer.from("    \n\n  \t ", "utf-8");
      const res = await extractTextFromBuffer(buffer, "empty.txt");

      expect(res.success).toBe(false);
      expect(res.error).toContain("empty");
    });

    it("refuses PDF extraction gracefully", async () => {
      const dummyPdfBuffer = Buffer.from("%PDF-1.5 dummy content", "utf-8");
      const res = await extractTextFromBuffer(dummyPdfBuffer, "brochure.pdf");

      expect(res.success).toBe(false);
      expect(res.isUnsupportedPdf).toBe(true);
      expect(res.error).toContain("PDF extraction is not supported yet");
    });
  });
});
