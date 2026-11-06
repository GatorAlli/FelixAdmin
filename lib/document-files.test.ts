import assert from "node:assert/strict";
import test from "node:test";
import { MAX_DOCUMENT_BYTES, readDocumentMetadata } from "./document-files";

test("accepts arbitrary file types up to the 300 MB boundary", () => {
  for (const type of [
    "application/pdf",
    "application/zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "",
  ]) {
    const result = readDocumentMetadata({
      name: "attachment",
      type,
      size: MAX_DOCUMENT_BYTES,
    });
    assert.equal(result.ok, true);
    if (result.ok)
      assert.equal(result.mimeType, type || "application/octet-stream");
  }
  assert.equal(MAX_DOCUMENT_BYTES, 300 * 1024 * 1024);
  const result = readDocumentMetadata({
    name: "large.zip",
    type: "application/zip",
    size: MAX_DOCUMENT_BYTES + 1,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /300 MB/);
});

test("rejects missing or invalid file metadata", () => {
  for (const size of [0, -1, NaN, Infinity, 1.5]) {
    assert.equal(
      readDocumentMetadata({ name: "file", type: "", size }).ok,
      false,
    );
  }
  assert.equal(readDocumentMetadata({ name: "", type: "", size: 1 }).ok, false);
});

test("sanitizes names without rejecting other document formats", () => {
  const result = readDocumentMetadata({
    name: "folder/quote\r\n.docx",
    type: "",
    size: 42,
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.originalName, "folder_quote__.docx");
});
