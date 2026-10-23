import assert from "node:assert/strict";
import test from "node:test";
import { MAX_DOCUMENT_BYTES, readDocumentMetadata } from "./document-files";
import { signDocumentUpload, verifyDocumentUpload } from "./document-upload-ticket";

test("accepts arbitrary file types up to the 300 MB boundary", () => {
  for (const type of ["application/pdf", "application/zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ""]) {
    const result = readDocumentMetadata({ name: "attachment", type, size: MAX_DOCUMENT_BYTES });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.mimeType, type || "application/octet-stream");
  }
  assert.equal(MAX_DOCUMENT_BYTES, 300 * 1024 * 1024);
  const result = readDocumentMetadata({ name: "large.zip", type: "application/zip", size: MAX_DOCUMENT_BYTES + 1 });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /300 MB/);
});

test("rejects missing or invalid file metadata", () => {
  for (const size of [0, -1, NaN, Infinity, 1.5]) {
    assert.equal(readDocumentMetadata({ name: "file", type: "", size }).ok, false);
  }
  assert.equal(readDocumentMetadata({ name: "", type: "", size: 1 }).ok, false);
});

test("sanitizes names without rejecting other document formats", () => {
  const result = readDocumentMetadata({ name: "folder/quote\r\n.docx", type: "", size: 42 });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.originalName, "folder_quote__.docx");
});

const upload = {
  orderId: 42, userId: "test-user", storagePath: "orders/42/test-file",
  originalName: "quotation.zip", mimeType: "application/zip", sizeBytes: 123,
  expiresAt: Date.now() + 60_000,
};

test("upload completion is bound to its authorized user, order and metadata", () => {
  const ticket = signDocumentUpload(upload, "test-key");
  assert.deepEqual(verifyDocumentUpload(ticket, "test-key", 42, "test-user"), upload);
  assert.equal(verifyDocumentUpload(ticket, "test-key", 43, "test-user"), null);
  assert.equal(verifyDocumentUpload(ticket, "test-key", 42, "another-user"), null);
  assert.equal(verifyDocumentUpload(ticket, "another-key", 42, "test-user"), null);
  const [payload, signature] = ticket.split(".");
  const changed = Buffer.from(JSON.stringify({ ...upload, storagePath: "orders/99/another-file" })).toString("base64url");
  assert.notEqual(changed, payload);
  assert.equal(verifyDocumentUpload(`${changed}.${signature}`, "test-key", 42, "test-user"), null);
});

test("rejects expired and malformed upload tickets", () => {
  const expired = signDocumentUpload({ ...upload, expiresAt: Date.now() - 1 }, "test-key");
  for (const value of [expired, "invalid", "bad.signature.extra", "x".repeat(4097)]) {
    assert.equal(verifyDocumentUpload(value, "test-key", 42, "test-user"), null);
  }
});
