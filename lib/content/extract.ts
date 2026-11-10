import mammoth from "mammoth";

export interface ExtractionResult {
  success: boolean;
  text?: string;
  wordCount?: number;
  format?: "txt" | "md" | "docx";
  error?: string;
  isUnsupportedPdf?: boolean;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS = new Set(["txt", "md", "markdown", "docx"]);

/**
 * Validates file extension and size.
 */
export function validateUploadFile(file: {
  name: string;
  size: number;
  type?: string;
}): { valid: boolean; error?: string; isUnsupportedPdf?: boolean } {
  if (file.size > MAX_UPLOAD_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed limit of 5 MB.`,
    };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  if (extension === "pdf") {
    return {
      valid: false,
      isUnsupportedPdf: true,
      error:
        "PDF extraction is not supported yet. Please upload a .txt, .md, or .docx file, or paste your draft text directly into the editor.",
    };
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      valid: false,
      error: `Unsupported file format ".${extension}". Only .txt, .md, and .docx documents are supported.`,
    };
  }

  return { valid: true };
}

/**
 * Extracts plain text from an uploaded document buffer (.txt, .md, .docx).
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string
): Promise<ExtractionResult> {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  if (extension === "pdf") {
    return {
      success: false,
      isUnsupportedPdf: true,
      error:
        "PDF extraction is not supported yet. Please upload a .txt, .md, or .docx file, or paste your draft text directly into the editor.",
    };
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      success: false,
      error: `Unsupported file type ".${extension}". Supported formats: .txt, .md, .docx.`,
    };
  }

  try {
    let extracted = "";
    let format: "txt" | "md" | "docx" = "txt";

    if (extension === "txt" || extension === "md" || extension === "markdown") {
      extracted = buffer.toString("utf-8");
      format = extension === "txt" ? "txt" : "md";
    } else if (extension === "docx") {
      format = "docx";
      const result = await mammoth.extractRawText({ buffer });
      extracted = result.value || "";
      if (result.messages && result.messages.length > 0) {
        // Collect any warnings from mammoth
        const warnings = result.messages.filter((m) => m.type === "warning");
        if (warnings.length > 0) {
          console.warn("Mammoth DOCX warnings:", warnings);
        }
      }
    }

    // Clean up excessive blank lines and trailing whitespace
    const cleanText = extracted
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!cleanText) {
      return {
        success: false,
        error: "The uploaded document appears to be empty.",
      };
    }

    const words = cleanText.split(/\s+/).filter(Boolean);

    return {
      success: true,
      text: cleanText,
      wordCount: words.length,
      format,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to extract text from document: ${err?.message || "Unknown parsing error"}`,
    };
  }
}

