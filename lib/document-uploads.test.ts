import assert from "node:assert/strict";
import { test } from "node:test";
import { uploadOrderDocument } from "./document-uploads";

test("streams staged files to the saved order with an optional supplier reference", async t => {
  const calls: { url: unknown; options: RequestInit | undefined }[] = [];
  const document = { id: "document", supplierRowKey: null, originalName: "quote.pdf", title: "quote.pdf", sizeBytes: 5 };
  t.mock.method(globalThis, "fetch", async (url: unknown, options?: RequestInit) => {
    calls.push({ url, options });
    return Response.json({ ok: true, document }, { status: 201 });
  });
  const file = new File(["quote"], "quote.pdf", { type: "application/pdf" });
  assert.deepEqual(await uploadOrderDocument(42, file, "supplier:ACME & Co"), document);
  assert.equal(calls[0].url, "/api/orders/42/documents");
  assert.equal(calls[0].options?.body, file);
  assert.equal(new Headers(calls[0].options?.headers).get("X-Supplier-Row-Key"), encodeURIComponent("supplier:ACME & Co"));
  await uploadOrderDocument(42, file);
  assert.equal(new Headers(calls[1].options?.headers).has("X-Supplier-Row-Key"), false);
});

test("failed upload responses reject instead of reporting an attachment saved", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ ok: false, message: "Access revoked." }, { status: 403 }));
  await assert.rejects(uploadOrderDocument(42, new File(["x"], "quote.pdf")), /Access revoked/);
});
