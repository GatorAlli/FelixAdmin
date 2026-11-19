import assert from "node:assert/strict";
import { test } from "node:test";
import { uploadProposalDocument } from "./document-uploads";

test("streams staged files to the saved proposal", async (t) => {
  const calls: { url: unknown; options: RequestInit | undefined }[] = [];
  const document = {
    id: "document",
    originalName: "quote.pdf",
    title: "quote.pdf",
    sizeBytes: 5,
  };
  t.mock.method(
    globalThis,
    "fetch",
    async (url: unknown, options?: RequestInit) => {
      calls.push({ url, options });
      return Response.json({ ok: true, document }, { status: 201 });
    },
  );
  const file = new File(["quote"], "quote.pdf", { type: "application/pdf" });
  assert.deepEqual(await uploadProposalDocument(42, file), document);
  assert.equal(calls[0].url, "/api/proposals/42/documents");
  assert.equal(calls[0].options?.body, file);
  const headers = new Headers(calls[0].options?.headers);
  assert.equal(headers.get("X-File-Name"), "quote.pdf");
  assert.equal(headers.get("X-File-Size"), "5");
  assert.equal(headers.get("Content-Type"), "application/pdf");
  assert.equal(headers.has("X-Supplier-Row-Key"), false);
});

test("failed upload responses reject instead of reporting an attachment saved", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ ok: false, message: "Access revoked." }, { status: 403 }),
  );
  await assert.rejects(
    uploadProposalDocument(42, new File(["x"], "quote.pdf")),
    /Access revoked/,
  );
});
