import { createHmac, timingSafeEqual } from "node:crypto";

// A signed receipt ties upload completion to one user, order, file and expiry time.
export type DocumentUploadTicket = {
  orderId: number;
  userId: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: number;
};

export function signDocumentUpload(upload: DocumentUploadTicket, secret: string) {
  const payload = Buffer.from(JSON.stringify(upload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(`document-upload:${payload}`).digest("base64url");
  return `${payload}.${signature}`;
}

// Reject changed, expired or reused-for-another-user tickets before saving metadata.
export function verifyDocumentUpload(ticket: string, secret: string, orderId: number, userId: string): DocumentUploadTicket | null {
  try {
    if (typeof ticket !== "string" || ticket.length > 4096) return null;
    const [payload, signature, extra] = ticket.split(".");
    if (!payload || !signature || extra !== undefined) return null;
    const expected = createHmac("sha256", secret).update(`document-upload:${payload}`).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const upload = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DocumentUploadTicket;
    if (upload.orderId !== orderId || upload.userId !== userId || upload.expiresAt <= Date.now()) return null;
    return upload;
  } catch {
    return null;
  }
}
