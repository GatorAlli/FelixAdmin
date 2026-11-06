BE SHORT AND CONCISE

## Project skills

Use the relevant project skill when changing these workflows:

- [felix-orders](.agents/skills/felix-orders/SKILL.md): order forms, currency calculations, references, summaries, and Settings catalogs.
- [felix-user-access](.agents/skills/felix-user-access/SKILL.md): authentication, roles, invitations, user removal, and idle sessions.
- [felix-order-documents](.agents/skills/felix-order-documents/SKILL.md): private uploads, downloads, deletion, and supplier attachments.

Paths in these skills are relative to this repository. Read the relevant source files; the skills describe current contracts and do not replace the user's requested changes. Existing Better Auth and Postgres skills remain available for library and database guidance.

## Environment variable security

- Keep `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `RESEND_API_KEY` server-side. `BETTER_AUTH_URL` and `RESEND_EMAIL` are also currently read only on the server; the browser auth client uses same-origin `/api/auth` endpoints.
- Never prefix credentials with `NEXT_PUBLIC_`, expose them through `next.config.ts` `env`, runtime configuration, or bundler replacements, or serialize them into client props, action responses, HTML, or browser logs. Public variables must contain only intentionally public values.
- Application modules that read secrets must use `import "server-only"`. Keep browser-safe helpers and types separate. Command-line tools can load environment variables directly; do not import those tools into application code. A `"use client"` import must not pull in server implementation; `"use server"` actions are the supported request boundary.
- Keep `.env*` files ignored and outside `public/`. Never print secret values in tool output, reports, logs, or tests; use variable names and redacted findings.
- When changing environment handling or client/server imports, inspect the browser dependency paths and check a fresh production build's browser assets and rendered output for configured secret values. Scan privately and report filenames and variable names only. Server bundles are not browser bundles; finding an environment variable name alone does not establish a leak.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
