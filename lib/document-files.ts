export const MAX_DOCUMENT_BYTES = 300 * 1024 * 1024;

export type DocumentUploadMetadata = { name: string; type: string; size: number };

export function readDocumentMetadata(value: DocumentUploadMetadata) {
  if (!value || typeof value.name !== "string" || !value.name.trim() ||
      typeof value.type !== "string" || !Number.isSafeInteger(value.size) || value.size <= 0) {
    return { ok: false as const, message: "Choose a non-empty file first." };
  }
  if (value.size > MAX_DOCUMENT_BYTES) {
    return { ok: false as const, message: "Maximum file size is 300 MB." };
  }
  const originalName = value.name.replace(/[\\/\r\n"\x00-\x1f\x7f]/g, "_").slice(0, 255);
  const mimeType = value.type.slice(0, 100) || "application/octet-stream";
  return { ok: true as const, originalName, mimeType, sizeBytes: value.size };
}
