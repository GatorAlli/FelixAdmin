---
name: felix-order-documents
description: "Change Felix Controls order or supplier document uploads, downloads, deletion, private filesystem storage, or attachment associations while preserving streaming and order-edit permissions."
---

# Felix order documents

Paths below are relative to the repository root. Files are stored locally; no object-storage provider is configured for this workflow.

## Read the relevant sources

- Browser orchestration: `lib/document-uploads.ts`, `app/(pages)/order_form/OrderDocuments.tsx`, `app/(pages)/order_form/SupplierDocument.tsx`, `app/(pages)/order_form/DocumentFileInput.tsx`, and `app/(pages)/order_form/PageBody.tsx`.
- Upload route: `app/api/orders/[orderId]/documents/route.ts`.
- Download/delete route: `app/api/orders/[orderId]/documents/[documentId]/route.ts`.
- Authorization: `lib/documents/access.ts` and `lib/drizzle/order-access.ts`.
- Storage and validation: `lib/documents/storage.ts` and `lib/document-files.ts`.
- Metadata and supplier cleanup: `lib/drizzle/schema.ts` and `app/(pages)/order_form/actions.ts`.

## Upload and association rules

- Save the order before uploading its files. Stream raw file bytes through the Node.js route; keep large files out of Server Action payloads.
- The browser sends encoded file name, declared size, optional supplier row key, and content type. Validate them server-side; the stream must also enforce actual size. The current maximum is 300 MiB (`300 * 1024 * 1024`), displayed as 300 MB.
- Uploads and deletions require same-origin requests and order-edit permission. Downloads require a valid session. Recheck editing access after a long upload before committing metadata.
- `order_documents` holds metadata; bytes live under `.local/documents/orders/<orderId>/<uuid>`. A null `supplierRowKey` means an order-level attachment. A non-null key must match a saved supplier row.
- Lock the order row when validating supplier membership and inserting upload metadata. Preserve stable supplier row keys across rename and reorder; never associate files by array index or filename.
- If metadata insertion or a post-upload access check fails, remove the completed file. Keep the existing cleanup path active on early returns.

## Private storage and deletion

- Keep documents outside `public` and `public_html`. Preserve path validation, realpath containment checks, and symlink protections; do not accept client-provided filesystem paths.
- The writer streams into a private temporary file and publishes only a complete file, without overwriting an existing destination. Preserve the declared-size check and temporary-file cleanup.
- Download through the authenticated route with attachment disposition, private/no-store caching, and nosniff headers. Do not expose storage keys as public download URLs or render arbitrary uploaded content inline.
- File deletion tolerates an already-missing file. Delete metadata after file cleanup succeeds, retaining it when cleanup fails so retry remains possible.
- Saving an order detects documents belonging to removed supplier rows. Preserve their cleanup and partial-failure message; a successful order save can still report attachment cleanup needing retry.
- Local files require persistent storage on the deployment host. Do not imply they survive an ephemeral/serverless filesystem or support multiple hosts without shared storage.

## Verification

Run the relevant existing tests:

```sh
node --import tsx --test lib/document-files.test.ts lib/document-uploads.test.ts lib/documents/storage.test.ts
```

Review expired-session and revoked-manager access, invalid supplier keys, incomplete or oversized streams, missing files, and failed cleanup when changing those paths. For schema changes, load the existing Postgres skill; for route APIs, read the installed Next.js documentation. Use temporary fixture files for checks rather than deleting application attachments.
