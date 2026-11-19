BE SHORT AND CONCISE

## Project

Felix Controls Limited admin page: internal order-management and user-administration app. Stack: React, TypeScript, Next.js, Tailwind CSS, Drizzle ORM, Postgres, Better Auth.

## Working agreements (all agents)

- Run `npx prettier --write <file>` on every file you create or edit, immediately after writing it. Claude Code does this automatically via `.claude/hooks/format.mjs`; every other agent must run it manually.
- Whenever a file or folder is added, removed, renamed, or repurposed, update the "Project file structure" section below in the same change.
- AGENTS.md is canonical. CLAUDE.md only imports it — never duplicate shared content into CLAUDE.md.
- If anything is even remotely unclear, ask before acting.
- Commit messages follow Conventional Commits (see the `conventional-commit` skill).

## Project skills

| Skill                                                                                                        | Source                       | When to use                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [felix-orders](.agents/skills/felix-orders/SKILL.md)                                                         | project                      | Order forms, supplier/expense rows, currency calculations, references, summaries, Settings catalogs.                                                                                                      |
| [felix-user-access](.agents/skills/felix-user-access/SKILL.md)                                               | project                      | Authentication, roles, invitations, user removal, idle sessions.                                                                                                                                          |
| [felix-order-documents](.agents/skills/felix-order-documents/SKILL.md)                                       | project                      | Private uploads, downloads, deletion, supplier attachments.                                                                                                                                               |
| [better-auth-best-practices](.agents/skills/better-auth-best-practices/SKILL.md)                             | better-auth/skills           | General Better Auth configuration guidance.                                                                                                                                                               |
| [better-auth-security-best-practices](.agents/skills/better-auth-security-best-practices/SKILL.md)           | better-auth/skills           | Better Auth security hardening.                                                                                                                                                                           |
| [create-auth](.agents/skills/create-auth/SKILL.md)                                                           | better-auth/skills           | Scaffolding a new Better Auth instance.                                                                                                                                                                   |
| [email-and-password-best-practices](.agents/skills/email-and-password-best-practices/SKILL.md)               | better-auth/skills           | Email/password auth flows.                                                                                                                                                                                |
| [organization-best-practices](.agents/skills/organization-best-practices/SKILL.md)                           | better-auth/skills           | Better Auth organization plugin (not currently used, kept for reference).                                                                                                                                 |
| [two-factor-authentication-best-practices](.agents/skills/two-factor-authentication-best-practices/SKILL.md) | better-auth/skills           | Better Auth 2FA plugin (not currently used, kept for reference).                                                                                                                                          |
| [postgres-drizzle](.agents/skills/postgres-drizzle/SKILL.md)                                                 | ccheney/robust-skills        | PostgreSQL and Drizzle schemas, queries, migrations, relations, and performance.                                                                                                                          |
| [supabase](.agents/skills/supabase/SKILL.md)                                                                 | supabase/agent-skills        | General Supabase guidance.                                                                                                                                                                                |
| [supabase-postgres-best-practices](.agents/skills/supabase-postgres-best-practices/SKILL.md)                 | supabase/agent-skills        | Postgres schema/query/indexing/locking guidance; use for any schema or SQL change.                                                                                                                        |
| [frontend-design](.agents/skills/frontend-design/SKILL.md)                                                   | vercel-labs/agent-eval       | Building polished, non-generic UI.                                                                                                                                                                        |
| [tailwind-v4](.agents/skills/tailwind-v4/SKILL.md)                                                           | mastra-ai/mastra             | Writing/reviewing/refactoring Tailwind classes; v3→v4 cleanup. Note: requested as "tailwind-best-practices", but mastra-ai/mastra only ships this skill as `tailwind-v4` — installed under its real name. |
| [tailwind-4-docs](.agents/skills/tailwind-4-docs/SKILL.md)                                                   | lombiq/tailwind-agent-skills | Tailwind v4 documentation lookup and migration checks.                                                                                                                                                    |
| [conventional-commit](.agents/skills/conventional-commit/SKILL.md)                                           | github/awesome-copilot       | Writing commit messages.                                                                                                                                                                                  |
| [create-readme](.agents/skills/create-readme/SKILL.md)                                                       | github/awesome-copilot       | Writing/updating README.md.                                                                                                                                                                               |

Paths above are relative to this repository. Read the relevant source files; skills describe current contracts and do not replace the user's requested changes.

## Commands

| Command                | Purpose                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Start the Next.js dev server.                                                                     |
| `npm run build`        | Production build.                                                                                 |
| `npm run start`        | Run the production build.                                                                         |
| `npm run lint`         | ESLint.                                                                                           |
| `npm run format`       | Prettier, write mode, whole repo.                                                                 |
| `npm run format:check` | Prettier, check mode, whole repo.                                                                 |
| tests                  | No `npm test` script; run `node --import tsx --test <file>.test.ts` per the relevant skill above. |

## Environment variable security

- Keep `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `RESEND_API_KEY` server-side. `BETTER_AUTH_URL` and `RESEND_EMAIL` are also currently read only on the server; the browser auth client uses same-origin `/api/auth` endpoints.
- Never prefix credentials with `NEXT_PUBLIC_`, expose them through `next.config.ts` `env`, runtime configuration, or bundler replacements, or serialize them into client props, action responses, HTML, or browser logs. Public variables must contain only intentionally public values.
- Application modules that read secrets must use `import "server-only"`. Keep browser-safe helpers and types separate. Command-line tools can load environment variables directly; do not import those tools into application code. A `"use client"` import must not pull in server implementation; `"use server"` actions are the supported request boundary.
- Keep `.env*` files ignored and outside `public/`. Never print secret values in tool output, reports, logs, or tests; use variable names and redacted findings.
- When changing environment handling or client/server imports, inspect the browser dependency paths and check a fresh production build's browser assets and rendered output for configured secret values. Scan privately and report filenames and variable names only. Server bundles are not browser bundles; finding an environment variable name alone does not establish a leak.

## Project file structure

```text
.
├── .agents/skills/                          # Installed agent skills (canonical source; symlinked into .claude/skills and .aider-desk/skills)
│   ├── better-auth-best-practices/SKILL.md  # Better Auth general best practices
│   ├── better-auth-security-best-practices/SKILL.md  # Better Auth security best practices
│   ├── conventional-commit/SKILL.md         # Conventional Commits message format
│   ├── create-auth/SKILL.md                 # Scaffolding a new Better Auth instance
│   ├── create-readme/SKILL.md               # Writing/updating README.md
│   ├── email-and-password-best-practices/SKILL.md  # Better Auth email/password flows
│   ├── felix-order-documents/               # Project skill: order/supplier document uploads
│   │   ├── SKILL.md                         # Contract description
│   │   └── agents/openai.yaml               # OpenAI-agent skill metadata
│   ├── felix-orders/                        # Project skill: order forms and currency calculations
│   │   ├── SKILL.md                         # Contract description
│   │   └── agents/openai.yaml               # OpenAI-agent skill metadata
│   ├── felix-user-access/                   # Project skill: auth, roles, invitations
│   │   ├── SKILL.md                         # Contract description
│   │   └── agents/openai.yaml               # OpenAI-agent skill metadata
│   ├── frontend-design/                     # Non-generic UI design guidance
│   ├── organization-best-practices/SKILL.md # Better Auth organization plugin (unused, reference)
│   ├── postgres-drizzle/                    # PostgreSQL and Drizzle ORM guidance
│   │   ├── SKILL.md                         # Workflow and reference index
│   │   └── references/                     # Schema, migrations, queries, and performance guides
│   ├── supabase/                            # Supabase general guidance
│   ├── supabase-postgres-best-practices/     # Postgres schema/query/index/lock guidance
│   ├── tailwind-4-docs/                     # Tailwind v4 documentation lookup, with a docs-sync script
│   ├── tailwind-v4/SKILL.md                 # Tailwind v4 usage and v3→v4 migration guide
│   └── two-factor-authentication-best-practices/SKILL.md  # Better Auth 2FA plugin (unused, reference)
├── .aider-desk/skills/                      # Symlinks into .agents/skills for Aider
├── .claude/
│   ├── hooks/format.mjs                     # PostToolUse hook: prettier --write on the edited file
│   ├── settings.json                        # Registers the format hook for Edit/Write/MultiEdit
│   └── skills/                              # Symlinks into .agents/skills for Claude Code
├── .local/documents/orders/<orderId>/<uuid> # Private order-document bytes (see lib/documents/storage.ts)
├── .vscode/settings.json                    # Editor Tailwind IntelliSense config
├── app/
│   ├── (pages)/                             # Authenticated routes, wrapped by layout.tsx's session check
│   │   ├── home/
│   │   │   ├── TableBody.tsx                # Orders list table, client-side row actions
│   │   │   ├── actions.ts                   # Server actions: delete/bulk-manage orders
│   │   │   └── page.tsx                     # Orders list page
│   │   ├── layout.tsx                       # Requires a session, mounts the idle-session monitor
│   │   ├── order_form/
│   │   │   ├── [edit_slug]/page.tsx         # Edit-existing-order route
│   │   │   ├── DocumentFileInput.tsx        # File picker control for document uploads
│   │   │   ├── OrderDocuments.tsx           # Order-level document list/upload UI
│   │   │   ├── PageBody.tsx                 # Order form state, calculations, save orchestration
│   │   │   ├── SupplierDocument.tsx         # Per-supplier attachment dialog
│   │   │   ├── actions.ts                   # Server actions: save/validate orders
│   │   │   └── page.tsx                     # New-order route
│   │   ├── settings/
│   │   │   ├── SettingsLists.tsx            # Supplier/customer/expense catalog editor UI
│   │   │   ├── UsersTable.tsx               # User management table UI
│   │   │   ├── actions.ts                   # Server actions: save catalogs
│   │   │   ├── page.tsx                     # Settings route, admin-only redirect
│   │   │   └── user-actions.ts              # Server actions: invite/edit/remove users
│   │   └── summary/
│   │       ├── TableBody.tsx                # Aggregated summary table
│   │       └── page.tsx                     # Summary route
│   ├── api/
│   │   ├── auth/[...all]/route.ts           # Better Auth catch-all handler
│   │   └── orders/[orderId]/documents/
│   │       ├── [documentId]/route.ts        # Download/delete a single document
│   │       └── route.ts                     # Upload a document
│   ├── components/signOutButton.tsx         # Sign-out action button
│   ├── globals.css                          # Tailwind entry point and theme tokens
│   ├── layout.tsx                           # Root layout: fonts, shared styles
│   ├── page.tsx                             # Public sign-in page
│   └── set-password/
│       ├── SetPasswordForm.tsx              # Password-creation/reset form
│       └── page.tsx                         # Set-password route (invitation/reset callback)
├── components/
│   ├── auth/idle-session-monitor.tsx        # Client idle-timeout warning/logout
│   ├── ui/                                  # shadcn-style primitives (base-ui wrappers)
│   │   ├── button.tsx                       # Button + buttonVariants
│   │   ├── checkbox.tsx                     # Checkbox
│   │   ├── input.tsx                        # Input
│   │   ├── label.tsx                        # Label
│   │   ├── money-input.tsx                  # Currency-aware numeric input
│   │   ├── select.tsx                       # Select
│   │   └── textarea.tsx                     # Textarea
│   └── view/navbar/navbar.tsx               # Top navigation bar
├── docker/postgres/
│   ├── init.sql                             # Local dev role/database bootstrap
│   └── schema.sql                           # Reference schema dump for local Postgres
├── docs/
│   ├── proposal-conversion-plan.md          # Plan for converting the order app into the proposal app
│   ├── reports/user-management-code-report.md  # Snapshot report of user-management change set
│   └── user-management.md                   # User-management contract/behavior notes
├── lib/
│   ├── auth.ts                              # Better Auth server instance (app-wide)
│   ├── betterAuth/
│   │   ├── auth-cli.ts                      # Standalone Better Auth instance for CLI scripts
│   │   ├── auth-client.ts                   # Browser Better Auth client
│   │   ├── auth-options.ts                  # Shared Better Auth config (hashing, app name, etc.)
│   │   ├── idle-session.test.ts             # Tests for idle-session timing logic
│   │   ├── idle-session.ts                  # Idle warning/logout timing constants and state
│   │   ├── password-reset.test.ts           # Tests for password-reset token flow
│   │   └── session.ts                       # requireUser/requireSession helpers
│   ├── document-files.test.ts               # Tests for document metadata/validation helpers
│   ├── document-files.ts                    # Document size limit and metadata types
│   ├── document-uploads.test.ts             # Tests for client upload orchestration
│   ├── document-uploads.ts                  # Browser-side document upload helper
│   ├── documents/
│   │   ├── access.ts                        # Authorization checks for document routes
│   │   ├── storage.test.ts                  # Tests for private filesystem storage
│   │   └── storage.ts                       # Private filesystem read/write/delete for document bytes
│   ├── drizzle/
│   │   ├── auth-schema.ts                   # Better Auth's Drizzle tables (better_auth schema)
│   │   ├── currency.test.ts                 # Tests for currency conversion helpers
│   │   ├── currency.ts                      # Supplier columns, currency conversion
│   │   ├── custom-suppliers.ts              # Custom (non-built-in) supplier row helpers
│   │   ├── datalist-values.ts               # Default suggestion lists for Settings catalogs
│   │   ├── drizzle-index.ts                 # Drizzle db client instance
│   │   ├── expenses.ts                      # Miscellaneous expense row helpers
│   │   ├── migrations/                      # Drizzle-generated SQL migrations + snapshots, one pair per change
│   │   ├── order-access.test.ts             # Tests for canEditOrder
│   │   ├── order-access.ts                  # Role/order-manager-access edit-permission check
│   │   ├── order-calculations.test.ts       # Tests for order totals/panel calculations
│   │   ├── order-calculations.ts            # Order totals and calculation-panel fields
│   │   ├── order-date.ts                    # Asia/Dhaka current-date helper for new orders
│   │   ├── order-datalists.ts               # Server loader for Settings suggestion lists
│   │   ├── order-reference.ts               # FCL/FPO/YYYY/NNN reference allocation (advisory lock)
│   │   ├── order-values.ts                  # Order row serialization/defaults for save
│   │   └── schema.ts                        # Drizzle table definitions (orders, users, documents, etc.)
│   ├── format-money.ts                      # Money string formatting/summation helpers
│   ├── use-transient-message.ts             # Client hook: short-lived success/error message state
│   ├── user-management/
│   │   ├── email.ts                         # Resend invitation/reset email config and sending
│   │   ├── service.test.ts                  # Tests for user-management service (needs disposable DB)
│   │   ├── service.ts                       # Invite/edit/remove user transactions
│   │   └── validation.ts                    # Role labels and managed-user types
│   └── utils.ts                             # Re-exports cn()
├── public/                                   # Static assets (logo, default Next.js icons)
├── scripts/create-user.ts                   # CLI: provision an initial admin user directly
├── .prettierignore                          # Paths Prettier skips
├── .prettierrc                              # Prettier config (Tailwind plugin, tailwindFunctions)
├── AGENTS.md                                # This file: canonical agent instructions
├── CLAUDE.md                                # Imports AGENTS.md; Claude Code-only notes
├── README.md                                # create-next-app boilerplate readme
├── components.json                          # shadcn CLI config
├── compose.yaml                             # Local Postgres dev container
├── drizzle.config.ts                        # Drizzle Kit config (migrations, schema path)
├── eslint.config.mjs                        # ESLint flat config (next core-web-vitals + ts)
├── next.config.ts                           # Next.js config (experimental cpu setting)
├── package.json                             # Dependencies and npm scripts
├── postcss.config.mjs                       # PostCSS config (Tailwind plugin)
├── server.js                                # Custom production HTTP server entry
├── skills-lock.json                         # Installed-skill versions/hashes for `npx skills`
└── tsconfig.json                            # TypeScript compiler config
```

## Architecture notes

- **Auth model**: Better Auth (`better_auth.*` tables) owns login/session identity; `public.users` owns the application profile (name, role). The two link by email, not a foreign key — see the `felix-user-access` skill. Roles (`admin`, `order`, `guest`) are always read from the current database profile, never from the client or a cached session.
- **Orders**: money is stored as decimal strings with exact scaled-integer arithmetic (no floats). Built-in suppliers use fixed USD columns; custom suppliers use JSON rows keyed by a stable `rowKey` that survives rename/reorder and is what document attachments reference. See the `felix-orders` skill.
- **Documents**: metadata lives in Postgres (`order_documents`); bytes live on the local filesystem under `.local/documents/orders/<orderId>/<uuid>`, outside `public/`. Uploads/downloads stream through Node.js API routes, not Server Actions, with private/no-store/attachment headers. See the `felix-order-documents` skill.
- **Database**: Drizzle ORM against Postgres. Migrations are generated pairs (`migration.sql` + `snapshot.json`) under `lib/drizzle/migrations/`; schema lives in `lib/drizzle/schema.ts` (app tables) and `lib/drizzle/auth-schema.ts` (Better Auth tables).
- **Styling**: Tailwind CSS v4, CSS-first config via `app/globals.css`, with `cn`/`cva` for conditional classes (see `components/ui/`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
