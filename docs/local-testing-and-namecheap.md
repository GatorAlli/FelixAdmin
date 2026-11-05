# Local testing and Namecheap configuration

The application uses PostgreSQL, Better Auth and private filesystem storage. It has no Supabase runtime or CLI dependency.

## Environment

Set these in your local environment file and in the hosting application's environment:

~~~dotenv
DATABASE_URL=postgresql://felix_app:felix_test_only@127.0.0.1:5433/felix_test
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-existing-secret
DOCUMENTS_DIRECTORY=/absolute/path/to/private/documents
~~~

The implementation pass configured the local document directory as .local/documents under the project, using its absolute path in .env. This folder is ignored by Git. On Namecheap, change DOCUMENTS_DIRECTORY to an absolute writable directory outside public_html and your public website directory.

Keep secrets out of Git. No Supabase environment variables are needed.

## Local database and app

~~~sh
docker compose up -d database
npm run dev
~~~

The project targets PostgreSQL 10.23. The current Drizzle Kit push introspection uses metadata that PostgreSQL 10 does not support. For a brand-new empty database, the reviewed initial SQL is in docker/postgres/schema.sql; do not rerun it on an existing database. Apply future schema changes as reviewed SQL migrations. The existing older migration history predates this PostgreSQL 10 setup and must not be replayed blindly.

Create accounts and their permission profiles with:

~~~sh
npx tsx scripts/create-user.ts
~~~

Admin can manage all orders, settings and documents. Order managers can change documents only on orders with manager access enabled. Signed-in read-only users can download documents, matching the existing order-reading permissions.

## Required order fields

Only Project Name and Customer Name have required markers and browser validation. The server rejects blank/whitespace-only values too. Blank exchange-rate fields use the existing defaults. Optional cost rows still reject inconsistent or invalid values if entered.

## Documents

Save a new order first, reopen it, and enter edit mode to attach files.

- Upload: POST /api/orders/:orderId/documents, raw file body.
- Download: GET /api/orders/:orderId/documents/:documentId.
- Remove: DELETE /api/orders/:orderId/documents/:documentId.

The browser supplies encoded X-File-Name, numeric X-File-Size and the file's content type. The server validates the session, order access, origin for mutations, metadata and actual streamed byte count. Files must be non-empty and no larger than 300 MB (300 × 1024 × 1024 bytes).

Files use generated UUID storage names; original filenames live in PostgreSQL and are restored on download. Uploads stream to private temporary files and become completed files only after their size is verified. A failed metadata insert or permission recheck removes the newly uploaded file. Incomplete or aborted writes remove their temporary files.

Downloads require a current session and are sent as attachments with private/no-store and nosniff headers. File paths reject traversal and symlink escapes. Uploads/downloads stream instead of loading the entire file into application memory.

## Moving to Namecheap

Use Node.js 24 and configure the Node application with HTTPS. Set the four environment variables above for that host, preserving the Better Auth secret when moving existing logins/sessions.

Copy both:
1. PostgreSQL application/authentication records, preserving document storage paths.
2. The entire private documents directory, preserving its internal folder structure.

Changing environment variables changes the destination; it does not transfer database records or files. Configure backups for both the database and documents.

The application enforces the 300 MB limit. Namecheap's web-server body-size limits, buffering and timeouts are separate and must be checked on the actual account. Docker testing does not reproduce cPanel's proxy or hosting limits. No application proxy is used for the file routes, so they avoid Next.js Server Action body-size limits.

Never serve the private documents directory as static web content. Only the application process should need filesystem access. Restrict database access to the application and your administration connection.

Existing remote Supabase resources have not been deleted. The code and local configuration no longer use them; this implementation did not migrate remote records or files.

## Verification performed

- All 26 unit tests passed, covering required fields, order permissions, byte-count limits, aborted/incomplete uploads, overwrite protection, private paths, symlink handling and idle sessions.
- TypeScript, ESLint and the production webpack build passed.
- Live API checks against Docker PostgreSQL 10.23 passed: authenticated upload/download/removal, anonymous rejection, origin checks, filename preservation, order-document binding, read-only permissions and revoked order-manager access.
- An exact 300 MB file was streamed up, streamed down and removed successfully.
- Browser inspection confirmed that projectName and clientName are the only required inputs, and no browser errors/warnings were recorded on the form.
- The browser file picker stalled during the attachment UI smoke check, so the complete click-through upload flow was not verified in-browser. Its HTTP endpoint and streaming behavior were verified separately.
- Temporary verification users, permission profiles, orders and document files were removed. Existing local test accounts/orders were preserved.
