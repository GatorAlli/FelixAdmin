---
name: felix-proposal-documents
description: "Change Felix Controls proposal document uploads, downloads, deletion, or private filesystem storage while preserving streaming and proposal-edit permissions."
---

# Felix proposal documents

Paths below are relative to the repository root. Files are stored locally; no object-storage provider is configured for this workflow.

## Read the relevant sources

- Browser orchestration: `lib/document-uploads.ts`, `app/(pages)/proposal_form/ProposalDocuments.tsx`, `app/(pages)/proposal_form/DocumentFileInput.tsx` and `app/(pages)/proposal_form/PageBody.tsx`.
- Upload route: `app/api/proposals/[proposalId]/documents/route.ts`.
- Download/delete route: `app/api/proposals/[proposalId]/documents/[documentId]/route.ts`.
- Authorization: `lib/documents/access.ts` and `lib/drizzle/proposal-access.ts`.
- Storage and validation: `lib/documents/storage.ts` and `lib/document-files.ts`.
- Metadata: `proposalDocuments` in `lib/drizzle/schema.ts`.

## Upload rules

- Save the proposal before uploading its files. Stream raw file bytes through the Node.js route; keep large files out of Server Action payloads.
- The browser sends the encoded file name, declared size and content type. Validate them server-side; the stream must also enforce actual size. The current maximum is 300 MiB (`300 * 1024 * 1024`), displayed as 300 MB.
- Uploads and deletions require same-origin requests and proposal-edit permission. Downloads require only a valid session, so a revoked proposal manager can still download. Recheck editing access after a long upload before committing metadata.
- `proposal_documents` holds metadata; bytes live under `.local/documents/proposals/<proposalId>/<uuid>`. Proposals have one flat document list; there are no supplier attachments.
- Lock the proposal row when inserting upload metadata. Never derive storage paths from the client file name.
- If metadata insertion or a post-upload access check fails, remove the completed file. Keep the existing cleanup path active on early returns.

## Private storage and deletion

- Keep documents outside `public` and `public_html`. Preserve the `proposals/<id>/<uuid>` key pattern, realpath containment checks and symlink protections; do not accept client-provided filesystem paths.
- The writer streams into a private temporary file and publishes only a complete file, without overwriting an existing destination. Preserve the declared-size check and temporary-file cleanup.
- Download through the authenticated route with attachment disposition, private/no-store caching and nosniff headers. Do not expose storage keys as public download URLs or render uploaded content inline.
- File deletion tolerates an already-missing file. Delete metadata after file cleanup succeeds, retaining it when cleanup fails so retry remains possible.
- Local files require persistent storage on the deployment host. Do not imply they survive an ephemeral/serverless filesystem or support multiple hosts without shared storage.
- Never commit `.local/` contents to git.

## Verification

Run the relevant existing tests:

```sh
node --import tsx --test lib/document-files.test.ts lib/document-uploads.test.ts lib/documents/storage.test.ts
```

Review expired-session and revoked-manager access, incomplete or oversized streams, missing files and failed cleanup when changing those paths. For schema changes, load the existing Postgres skill; for route APIs, read the installed Next.js documentation. Use temporary fixture files for checks rather than deleting application attachments.
