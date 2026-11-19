# Phase 5: Documents

[❮ Phase 4 Settings, Roles and Branding](phase-4-settings-roles-branding.md) | [Phase 6 Docs and Verification ❯](phase-6-docs-and-verification.md)

---

## Phase 5 Summary

Phase 5 moves file uploads from orders to proposals:

- The API moves from `/api/orders/...` to **`/api/proposals/...`**
- Files are stored under **`.local/documents/proposals/<proposalId>/`**
- **Supplier attachments** are removed. A proposal has one list of documents
- The upload helper and the documents panel get proposal names

After this phase, **`npm run build` passes** for the first time since Phase 1.

### What Changed

| Action    | Files                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------- |
| Moved     | `app/api/orders/[orderId]/` → `app/api/proposals/[proposalId]/`                                      |
| Moved     | `app/(pages)/proposal_form/OrderDocuments.tsx` → `ProposalDocuments.tsx`                             |
| Rewritten | `lib/documents/access.ts`, `.../documents/route.ts` (upload), `lib/document-uploads.ts` and its test |
| Edited    | `.../documents/[documentId]/route.ts` (download/delete), `lib/documents/storage.ts` and its test     |
| Edited    | `ProposalDocuments.tsx`, `PageBody.tsx`                                                              |
| Docs      | `AGENTS.md` file tree, this report                                                                   |

> **Note:** Small edits are shown as **diffs**: `-` lines were removed, `+` lines were added.

---

## 1. How Documents Work

Documents are split in two:

| Part          | Where it lives                                | Example                                    |
| ------------- | --------------------------------------------- | ------------------------------------------ |
| **Metadata**  | Postgres table `proposal_documents` (Phase 1) | Name, size, type, who uploaded it          |
| **The bytes** | A private folder on the server                | `.local/documents/proposals/12/6ca06eeb-…` |

The folder is **outside** `public/`, so no one can download a file just by guessing its address. Every download goes through the API, which checks the user is signed in.

### The Three Endpoints

| Method   | Address                                    | Who can use it                  |
| -------- | ------------------------------------------ | ------------------------------- |
| `POST`   | `/api/proposals/12/documents`              | Anyone who can edit proposal 12 |
| `GET`    | `/api/proposals/12/documents/<documentId>` | Any signed-in user              |
| `DELETE` | `/api/proposals/12/documents/<documentId>` | Anyone who can edit proposal 12 |

---

## 2. The Access Check

**File:** `lib/documents/access.ts`

Every endpoint calls `documentAccess()` first.

```ts
// Any signed-in user may download; changing documents needs edit permission.
export async function documentAccess(
  proposalId: number,
  editing: boolean,
  headers: Headers,
) {
  const session = await auth.api.getSession({
    headers,
    query: { disableRefresh: true },
  });
  if (!session)
    return {
      ok: false as const,
      status: 401,
      message: "Your session expired. Please sign in again.",
    };
  const [proposal] = await db
    .select({ editable: proposals.proposalManagerAccess })
    .from(proposals)
    .where(eq(proposals.sl, proposalId))
    .limit(1);
  if (!proposal)
    return { ok: false as const, status: 404, message: "Proposal not found." };
  if (editing) {
    const [profile] = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);
    if (!canEditProposal(profile?.status, proposal.editable)) {
      return {
        ok: false as const,
        status: 403,
        message: "You cannot change this proposal's documents.",
      };
    }
  }
  return { ok: true as const, user: session.user };
```

### Step by Step

1. No session → **401** "Your session expired"
2. No such proposal → **404** "Proposal not found."
3. Changing files (`editing` is `true`) → look up the user's role and run `canEditProposal()` (Phase 1). No permission → **403**
4. Otherwise, return the user

### What Changed

```diff
@@ -5,6 +5,6 @@ import { auth } from "@/lib/auth";
 import { db } from "@/lib/drizzle/drizzle-index";
-import { data, users } from "@/lib/drizzle/schema";
-import { canEditOrder } from "@/lib/drizzle/order-access";
+import { proposals, users } from "@/lib/drizzle/schema";
+import { canEditProposal } from "@/lib/drizzle/proposal-access";

-export function parseOrderId(value: string) {
+export function parseProposalId(value: string) {
   if (!/^[1-9]\d*$/.test(value)) return null;
@@ -19,4 +19,5 @@ export function hasDocumentOrigin(request: Request) {

+// Any signed-in user may download; changing documents needs edit permission.
 export async function documentAccess(
-  orderId: number,
+  proposalId: number,
   editing: boolean,
@@ -34,9 +35,9 @@ export async function documentAccess(
     };
-  const [order] = await db
-    .select({ editable: data.orderManagerAccess })
-    .from(data)
-    .where(eq(data.sl, orderId))
+  const [proposal] = await db
+    .select({ editable: proposals.proposalManagerAccess })
+    .from(proposals)
+    .where(eq(proposals.sl, proposalId))
     .limit(1);
-  if (!order)
-    return { ok: false as const, status: 404, message: "Order not found." };
+  if (!proposal)
+    return { ok: false as const, status: 404, message: "Proposal not found." };
   if (editing) {
@@ -47,3 +48,3 @@ export async function documentAccess(
       .limit(1);
-    if (!canEditOrder(profile?.status, order.editable)) {
+    if (!canEditProposal(profile?.status, proposal.editable)) {
       return {
@@ -51,3 +52,3 @@ export async function documentAccess(
         status: 403,
-        message: "You cannot change this order's documents.",
+        message: "You cannot change this proposal's documents.",
       };
```

The logic is the same as the order version. It now reads `proposals.proposalManagerAccess` and uses `canEditProposal()`, so a revoked proposal manager can still **download** but cannot upload or delete.

<details>
<summary>Full code: access.ts</summary>

```ts
import "server-only";

import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { proposals, users } from "@/lib/drizzle/schema";
import { canEditProposal } from "@/lib/drizzle/proposal-access";

export function parseProposalId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

export function hasDocumentOrigin(request: Request) {
  const expected = new URL(process.env.BETTER_AUTH_URL || request.url).origin;
  return request.headers.get("origin") === expected;
}

// Any signed-in user may download; changing documents needs edit permission.
export async function documentAccess(
  proposalId: number,
  editing: boolean,
  headers: Headers,
) {
  const session = await auth.api.getSession({
    headers,
    query: { disableRefresh: true },
  });
  if (!session)
    return {
      ok: false as const,
      status: 401,
      message: "Your session expired. Please sign in again.",
    };
  const [proposal] = await db
    .select({ editable: proposals.proposalManagerAccess })
    .from(proposals)
    .where(eq(proposals.sl, proposalId))
    .limit(1);
  if (!proposal)
    return { ok: false as const, status: 404, message: "Proposal not found." };
  if (editing) {
    const [profile] = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);
    if (!canEditProposal(profile?.status, proposal.editable)) {
      return {
        ok: false as const,
        status: 403,
        message: "You cannot change this proposal's documents.",
      };
    }
  }
  return { ok: true as const, user: session.user };
}
```

</details>

---

## 3. Uploading

**File:** `app/api/proposals/[proposalId]/documents/route.ts`

### The Flow

1. Check the request came from this site (`hasDocumentOrigin`)
2. Check the proposal ID and the user's permission
3. Read the file name, type and size from the headers, and check them
4. **Stream** the file to disk
5. Check permission **again** (it may have changed during a long upload)
6. Save the metadata row
7. If anything failed after step 4, delete the file

### The Storage Path

```ts
const storagePath = "proposals/" + proposalId + "/" + randomUUID();
```

The file name is a **random UUID**, never the user's file name. The original name is kept only in the database, so a file called `../../secret` cannot escape the folder.

### Saving the Metadata

```ts
    const document = await db.transaction(async (transaction) => {
      // Lock only after streaming, so the proposal cannot vanish mid-insert.
      const [proposal] = await transaction
        .select({ sl: proposals.sl })
        .from(proposals)
        .where(eq(proposals.sl, proposalId))
        .for("update");
      if (!proposal) throw new DocumentStorageError("Proposal not found.");
      const [saved] = await transaction
        .insert(proposalDocuments)
        .values({
          proposalId,
          storagePath,
          sizeBytes,
          title: metadata.originalName.slice(0, 120),
          originalName: metadata.originalName,
          mimeType: metadata.mimeType,
          uploadedBy: access.user.id,
        })
        .returning({
          id: proposalDocuments.id,
          title: proposalDocuments.title,
          originalName: proposalDocuments.originalName,
          sizeBytes: proposalDocuments.sizeBytes,
        });
```

`.for("update")` locks the proposal row until the insert finishes.

### What Was Removed

The order version accepted an `X-Supplier-Row-Key` header to attach a file to **one supplier row**. It then checked that row still existed on the order. All of that is gone:

```ts
// Removed
let supplierRowKey: string | null;
try {
  const header = request.headers.get("x-supplier-row-key");
  supplierRowKey = header === null ? null : decodeURIComponent(header);
} catch {
  ...
}
...
if (
  !order ||
  (supplierRowKey !== null &&
    !restoreSupplierRows(order).some((row) => row.rowKey === supplierRowKey))
) {
  throw new DocumentStorageError(
    "Save this supplier row before attaching a document.",
  );
}
```

| Before                                     | After                                            |
| ------------------------------------------ | ------------------------------------------------ |
| `"orders/" + orderId + "/" + randomUUID()` | `"proposals/" + proposalId + "/" + randomUUID()` |
| Locked the whole order row (`select()`)    | Locks only by ID (`select({ sl })`)              |
| Saved and returned `supplierRowKey`        | No supplier key                                  |
| "Invalid order."                           | "Invalid proposal."                              |
| 152 lines                                  | 124 lines                                        |

<details>
<summary>Full code: documents/route.ts</summary>

```ts
import { randomUUID } from "node:crypto";
import { db } from "@/lib/drizzle/drizzle-index";
import { eq } from "drizzle-orm";
import { proposals, proposalDocuments } from "@/lib/drizzle/schema";
import { readDocumentMetadata } from "@/lib/document-files";
import {
  documentAccess,
  hasDocumentOrigin,
  parseProposalId,
} from "@/lib/documents/access";
import {
  DocumentStorageError,
  writeDocument,
  removeDocumentFile,
} from "@/lib/documents/storage";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ proposalId: string }> },
) {
  if (!hasDocumentOrigin(request))
    return Response.json(
      { ok: false, message: "Invalid request origin." },
      { status: 403 },
    );
  const proposalId = parseProposalId((await context.params).proposalId);
  if (!proposalId)
    return Response.json(
      { ok: false, message: "Invalid proposal." },
      { status: 400 },
    );
  let savedPath: string | undefined;
  try {
    const access = await documentAccess(proposalId, true, request.headers);
    if (!access.ok) return Response.json(access, { status: access.status });
    let name: string;
    try {
      name = decodeURIComponent(request.headers.get("x-file-name") || "");
    } catch {
      return Response.json(
        { ok: false, message: "Invalid file name." },
        { status: 400 },
      );
    }
    const metadata = readDocumentMetadata({
      name,
      type: request.headers.get("content-type") || "",
      size: Number(request.headers.get("x-file-size")),
    });
    if (!metadata.ok) return Response.json(metadata, { status: 400 });
    if (!request.body)
      return Response.json(
        { ok: false, message: "Choose a file first." },
        { status: 400 },
      );
    const storagePath = "proposals/" + proposalId + "/" + randomUUID();
    const sizeBytes = await writeDocument(
      storagePath,
      request.body,
      metadata.sizeBytes,
    );
    savedPath = storagePath;
    // A role or access flag may have changed while a large file was uploading.
    const currentAccess = await documentAccess(
      proposalId,
      true,
      request.headers,
    );
    if (!currentAccess.ok)
      return Response.json(currentAccess, { status: currentAccess.status });
    const document = await db.transaction(async (transaction) => {
      // Lock only after streaming, so the proposal cannot vanish mid-insert.
      const [proposal] = await transaction
        .select({ sl: proposals.sl })
        .from(proposals)
        .where(eq(proposals.sl, proposalId))
        .for("update");
      if (!proposal) throw new DocumentStorageError("Proposal not found.");
      const [saved] = await transaction
        .insert(proposalDocuments)
        .values({
          proposalId,
          storagePath,
          sizeBytes,
          title: metadata.originalName.slice(0, 120),
          originalName: metadata.originalName,
          mimeType: metadata.mimeType,
          uploadedBy: access.user.id,
        })
        .returning({
          id: proposalDocuments.id,
          title: proposalDocuments.title,
          originalName: proposalDocuments.originalName,
          sizeBytes: proposalDocuments.sizeBytes,
        });
      return saved;
    });
    savedPath = undefined;
    return Response.json({ ok: true, document }, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentStorageError) {
      return Response.json(
        { ok: false, message: error.message },
        { status: 400 },
      );
    }
    console.error("Document upload failed", error);
    return Response.json(
      {
        ok: false,
        message: "Could not upload the document. Please try again.",
      },
      { status: 500 },
    );
  } finally {
    // Remove a finished file if permissions or its database insert failed.
    if (savedPath)
      await removeDocumentFile(savedPath).catch((error) =>
        console.error("Upload cleanup failed", error),
      );
  }
}
```

</details>

---

## 4. Downloading and Deleting

**File:** `app/api/proposals/[proposalId]/documents/[documentId]/route.ts`

Only names changed:

```diff
@@ -4 +4 @@ import { db } from "@/lib/drizzle/drizzle-index";
-import { orderDocuments } from "@/lib/drizzle/schema";
+import { proposalDocuments } from "@/lib/drizzle/schema";
@@ -8 +8 @@ import {
-  parseOrderId,
+  parseProposalId,
@@ -18 +18 @@ export const runtime = "nodejs";
-type Context = { params: Promise<{ orderId: string; documentId: string }> };
+type Context = { params: Promise<{ proposalId: string; documentId: string }> };
@@ -26 +26 @@ async function findDocument(
-  const orderId = parseOrderId(params.orderId);
+  const proposalId = parseProposalId(params.proposalId);
@@ -28 +28 @@ async function findDocument(
-    !orderId ||
+    !proposalId ||
@@ -35 +35 @@ async function findDocument(
-  const access = await documentAccess(orderId, editing, request.headers);
+  const access = await documentAccess(proposalId, editing, request.headers);
@@ -39 +39 @@ async function findDocument(
-    .from(orderDocuments)
+    .from(proposalDocuments)
@@ -42,2 +42,2 @@ async function findDocument(
-        eq(orderDocuments.id, params.documentId),
-        eq(orderDocuments.orderId, orderId),
+        eq(proposalDocuments.id, params.documentId),
+        eq(proposalDocuments.proposalId, proposalId),
@@ -99 +99 @@ export async function DELETE(request: Request, context: Context) {
-      .delete(orderDocuments)
+      .delete(proposalDocuments)
@@ -102,2 +102,2 @@ export async function DELETE(request: Request, context: Context) {
-          eq(orderDocuments.id, result.document.id),
-          eq(orderDocuments.orderId, result.document.orderId),
+          eq(proposalDocuments.id, result.document.id),
+          eq(proposalDocuments.proposalId, result.document.proposalId),
```

Downloads still send these headers:

| Header                                   | Why                                                  |
| ---------------------------------------- | ---------------------------------------------------- |
| `Content-Type: application/octet-stream` | The browser downloads the file instead of opening it |
| `Content-Disposition: attachment`        | Forces "Save as", with the original file name        |
| `Cache-Control: private, no-store`       | No shared cache keeps a copy                         |
| `X-Content-Type-Options: nosniff`        | The browser does not guess the type and run it       |

<details>
<summary>Full code: [documentId]/route.ts</summary>

```ts
import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/drizzle/drizzle-index";
import { proposalDocuments } from "@/lib/drizzle/schema";
import {
  documentAccess,
  hasDocumentOrigin,
  parseProposalId,
} from "@/lib/documents/access";
import {
  isMissingDocument,
  openDocument,
  removeDocumentFile,
} from "@/lib/documents/storage";

export const runtime = "nodejs";

type Context = { params: Promise<{ proposalId: string; documentId: string }> };

async function findDocument(
  request: Request,
  context: Context,
  editing: boolean,
) {
  const params = await context.params;
  const proposalId = parseProposalId(params.proposalId);
  if (
    !proposalId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.documentId,
    )
  ) {
    return { ok: false as const, status: 400, message: "Invalid document." };
  }
  const access = await documentAccess(proposalId, editing, request.headers);
  if (!access.ok) return access;
  const [document] = await db
    .select()
    .from(proposalDocuments)
    .where(
      and(
        eq(proposalDocuments.id, params.documentId),
        eq(proposalDocuments.proposalId, proposalId),
      ),
    )
    .limit(1);
  if (!document)
    return { ok: false as const, status: 404, message: "Document not found." };
  return { ok: true as const, document };
}

export async function GET(request: Request, context: Context) {
  try {
    const result = await findDocument(request, context, false);
    if (!result.ok) return Response.json(result, { status: result.status });
    const file = await openDocument(result.document.storagePath);
    const name = encodeURIComponent(result.document.originalName).replace(
      /['()*]/g,
      (character) => "%" + character.charCodeAt(0).toString(16).toUpperCase(),
    );
    return new Response(
      Readable.toWeb(file.stream) as ReadableStream<Uint8Array>,
      {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition":
            "attachment; filename=\"document\"; filename*=UTF-8''" + name,
          "Content-Length": String(file.size),
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    if (isMissingDocument(error))
      return Response.json(
        { ok: false, message: "Document file not found." },
        { status: 404 },
      );
    console.error("Document download failed", error);
    return Response.json(
      { ok: false, message: "Could not download the document." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!hasDocumentOrigin(request))
    return Response.json(
      { ok: false, message: "Invalid request origin." },
      { status: 403 },
    );
  try {
    const result = await findDocument(request, context, true);
    if (!result.ok) return Response.json(result, { status: result.status });
    await removeDocumentFile(result.document.storagePath);
    await db
      .delete(proposalDocuments)
      .where(
        and(
          eq(proposalDocuments.id, result.document.id),
          eq(proposalDocuments.proposalId, result.document.proposalId),
        ),
      );
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Document removal failed", error);
    return Response.json(
      {
        ok: false,
        message: "Could not remove the document. Please try again.",
      },
      { status: 500 },
    );
  }
}
```

</details>

---

## 5. The Storage Folder

**File:** `lib/documents/storage.ts`

Only the allowed path pattern changed:

```diff
@@ -11,3 +11,3 @@ export class DocumentStorageError extends Error {}
 const keyPattern =
-  /^orders\/[1-9]\d{0,9}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
+  /^proposals\/[1-9]\d{0,9}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

```

The pattern accepts **only** `proposals/<number>/<uuid>`. Anything else, such as `../secret` or an old `orders/1/…` path, is rejected before touching the disk.

### storage.test.ts

```diff
@@ -29 +29 @@ async function fixture(t: TestContext) {
-  return { directory, key: "orders/1/" + randomUUID() };
+  return { directory, key: "proposals/1/" + randomUUID() };
@@ -73 +73 @@ test("rejects incomplete, oversized and aborted uploads without keeping partial
-  assert.deepEqual(await readdir(join(directory, "orders", "1")), []);
+  assert.deepEqual(await readdir(join(directory, "proposals", "1")), []);
@@ -83 +83 @@ test("does not overwrite an existing completed file", async (t) => {
-  assert.deepEqual(await readdir(join(directory, "orders", "1")), [
+  assert.deepEqual(await readdir(join(directory, "proposals", "1")), [
@@ -92,2 +92,3 @@ test("rejects traversal and symlink escapes", async (t) => {
-    "orders/1/../../secret",
-    "orders/0/" + randomUUID(),
+    "proposals/1/../../secret",
+    "proposals/0/" + randomUUID(),
+    "orders/1/" + randomUUID(),
@@ -103,2 +104,2 @@ test("rejects traversal and symlink escapes", async (t) => {
-  await mkdir(join(directory, "orders"));
-  await symlink(outside, join(directory, "orders", "1"), "dir");
+  await mkdir(join(directory, "proposals"));
+  await symlink(outside, join(directory, "proposals", "1"), "dir");
@@ -134 +135 @@ test("does not follow symlinked document files on download", async (t) => {
-  await mkdir(join(directory, "orders", "1"), { recursive: true });
+  await mkdir(join(directory, "proposals", "1"), { recursive: true });
```

The new line proves an old `orders/…` path is now **refused**.

---

## 6. The Upload Helper

**File:** `lib/document-uploads.ts`

The browser calls this after a proposal is saved (Phase 2).

### Before

```ts
export async function uploadOrderDocument(
  orderId: number,
  file: File,
  supplierRowKey?: string,
): Promise<DocumentSummary> {
  const response = await fetch(`/api/orders/${orderId}/documents`, {
    ...
      ...(supplierRowKey
        ? { "X-Supplier-Row-Key": encodeURIComponent(supplierRowKey) }
        : {}),
```

### After

```ts
import type { DocumentSummary } from "./drizzle/schema";

// Called only after the proposal save succeeds. Files stay outside Server Action payloads.
export async function uploadProposalDocument(
  proposalId: number,
  file: File,
): Promise<DocumentSummary> {
  const response = await fetch(`/api/proposals/${proposalId}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
      "X-File-Size": String(file.size),
    },
    body: file,
  });
  const result = (await response.json()) as {
    ok: boolean;
    document?: DocumentSummary;
    message?: string;
  };
  if (!response.ok || !result.ok || !result.document)
    throw new Error(result.message || `Could not upload ${file.name}.`);
  return result.document;
}
```

| Header         | Value                                       |
| -------------- | ------------------------------------------- |
| `Content-Type` | The file's type, e.g. `application/pdf`     |
| `X-File-Name`  | The name, URL-encoded so any language works |
| `X-File-Size`  | The size in bytes, checked by the server    |

The file itself is the request **body**, so it streams instead of loading into memory.

### The Test

<details>
<summary>Full test code: document-uploads.test.ts</summary>

```ts
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
```

</details>

The first test now also checks the three headers, and that **no** supplier header is sent.

---

## 7. The Documents Panel

**File:** `app/(pages)/proposal_form/ProposalDocuments.tsx` (was `OrderDocuments.tsx`)

```diff
@@ -13,2 +13,2 @@ export type DocumentDraft = { id: number; file: File | null };
-export default function OrderDocuments({
-  orderId,
+export default function ProposalDocuments({
+  proposalId,
@@ -27 +27 @@ export default function OrderDocuments({
-  orderId?: number;
+  proposalId?: number;
@@ -85 +85 @@ export default function OrderDocuments({
-            <span className="min-w-0 flex-1 break-words text-sm">
+            <span className="min-w-0 flex-1 text-sm break-words">
@@ -94 +94,3 @@ export default function OrderDocuments({
-                  href={"/api/orders/" + orderId + "/documents/" + document.id}
+                  href={
+                    "/api/proposals/" + proposalId + "/documents/" + document.id
+                  }
@@ -111 +113 @@ export default function OrderDocuments({
-                    if (!orderId) return;
+                    if (!proposalId) return;
@@ -113 +115,4 @@ export default function OrderDocuments({
-                      "/api/orders/" + orderId + "/documents/" + document.id,
+                      "/api/proposals/" +
+                        proposalId +
+                        "/documents/" +
+                        document.id,
```

Everything else (choosing files, "Uploads on save", Download and Remove buttons) is unchanged.

### PageBody.tsx

```diff
@@ -18,2 +18,2 @@ import { type Proposal, type DocumentSummary } from "@/lib/drizzle/schema";
-import OrderDocuments, { type DocumentDraft } from "./OrderDocuments";
-import { uploadOrderDocument } from "@/lib/document-uploads";
+import ProposalDocuments, { type DocumentDraft } from "./ProposalDocuments";
+import { uploadProposalDocument } from "@/lib/document-uploads";
@@ -290 +290 @@ export default function PageBody({
-          const document = await uploadOrderDocument(savedId, draft.file);
+          const document = await uploadProposalDocument(savedId, draft.file);
@@ -628 +628 @@ export default function PageBody({
-          <OrderDocuments
+          <ProposalDocuments
@@ -630 +630 @@ export default function PageBody({
-            orderId={proposalDetails?.sl ?? createdProposalId}
+            proposalId={proposalDetails?.sl ?? createdProposalId}
```

---

## 8. Checks

### Production Build

```bash
npm run build
```

```text
✓ Compiled successfully
  Running TypeScript ...
  Finished TypeScript

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/auth/[...all]
├ ƒ /api/proposals/[proposalId]/documents
├ ƒ /api/proposals/[proposalId]/documents/[documentId]
├ ƒ /home
├ ƒ /proposal_form
├ ƒ /proposal_form/[proposalId]
├ ƒ /set-password
├ ƒ /settings
└ ƒ /summary
```

No `order` routes are left.

### Lint

```bash
npm run lint
```

No warnings or errors, across the whole project.

### Tests

```text
ℹ tests 38
ℹ pass 38
ℹ fail 0
```

### Leftover Order Code

A search for "order" in `app/`, `components/`, `lib/` and `scripts/` now finds only:

- `"order"` in `proposal-access.test.ts`, proving the old role **cannot** edit
- `"orders/1/"` in `storage.test.ts`, proving old paths are **refused**
- English phrases such as "in display order"

---

## 9. A Leftover File in Git

One old order document is **committed to the repository**:

```text
.local/documents/orders/1/6ca06eeb-335a-41aa-91b8-54ce1341431f   (100 KB)
```

It came from the original order app. Two problems:

1. Private documents should never be in git. Anyone with the repository can read it
2. The new code only reads `proposals/…` paths, so the app can no longer use it

`.local/` is also **not** in `.gitignore`, so new uploads could be committed by accident.

### The Cleanup

With your go-ahead, two changes were made:

```bash
git rm --cached .local/documents/orders/1/6ca06eeb-335a-41aa-91b8-54ce1341431f
```

`--cached` removes the file from **git only**. The copy on your disk stays, so nothing is lost.

```diff
+# private document uploads (lib/documents/storage.ts)
+/.local/
```

This line in `.gitignore` tells git to ignore the whole `.local/` folder, so future uploads can never be committed. `git check-ignore` confirms both old and new upload paths are ignored.

> **Note:** The file still exists in **past commits**. Anyone with an old copy of the repository can still read it. Erasing it from history means rewriting git history, which needs everyone with a copy to re-clone. You can also delete the local copy; the new app never reads `orders/…` paths.

---

## Exercise

Test yourself with this question.

A proposal manager's access to proposal 12 is revoked. They click **Download** on one of its documents. What happens?

- 401: session expired
- 403: cannot change documents
- 404: proposal not found
- The file downloads

<details>
<summary>Show answer</summary>

**The file downloads.** `GET` calls `documentAccess()` with `editing` set to `false`, so the role check is skipped. Revoking access only blocks **uploading** and **deleting**.

</details>

---

[❮ Phase 4 Settings, Roles and Branding](phase-4-settings-roles-branding.md) | [Phase 6 Docs and Verification ❯](phase-6-docs-and-verification.md)
