# Phase 6: Docs and Verification

[❮ Phase 5 Documents](phase-5-documents.md) | [Back to the Plan](../proposal-conversion-plan.md)

---

## Phase 6 Summary

Phase 6 makes the **instructions** match the new app, then checks the whole thing:

- The two order skills become **`felix-proposals`** and **`felix-proposal-documents`**
- `felix-user-access`, `docs/user-management.md` and `AGENTS.md` describe proposals and the **Proposal manager** role
- The reference schema `docker/postgres/schema.sql` is regenerated
- A fresh **production build**, the **secret scan**, lint, type check and tests all pass

### What Changed

| Action      | Files                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| Moved       | `.agents/skills/felix-orders/` → `felix-proposals/`                                                                      |
| Moved       | `.agents/skills/felix-order-documents/` → `felix-proposal-documents/`                                                    |
| Rewritten   | Both moved skills' `SKILL.md` and `agents/openai.yaml`                                                                   |
| Edited      | `.agents/skills/felix-user-access/SKILL.md`, `docs/user-management.md`                                                   |
| Regenerated | `docker/postgres/schema.sql`                                                                                             |
| Formatted   | The two migration `snapshot.json` files (Prettier)                                                                       |
| Edited      | `AGENTS.md` (description, skills table, file tree, architecture notes), `docs/proposal-conversion-plan.md` (status line) |

---

## 1. What a Skill Is

A **skill** is a short instruction file for AI coding agents. When an agent works on a matching task, it reads the skill first. It lists:

- **Where** the relevant code lives
- **Rules** that must not be broken (the "contracts")
- **How** to check a change

If a skill still described orders, the next agent would look for files that no longer exist, or "fix" proposals to behave like orders. That is why the skills are updated **last**, once the code is final.

---

## 2. felix-proposals

**File:** `.agents/skills/felix-proposals/SKILL.md` (was `felix-orders`)

### What Changed

| Topic           | felix-orders (before)                             | felix-proposals (after)                                         |
| --------------- | ------------------------------------------------- | --------------------------------------------------------------- |
| Base currency   | USD                                               | **BDT**                                                         |
| Rates           | GBP/EUR → USD, USD → SGD (inverse)                | Every rate is **"1 unit = X BDT"**                              |
| Rows            | Built-in and custom suppliers, expenses, `rowKey` | None: one value per proposal                                    |
| Fees            | Order and miscellaneous handling fees             | None                                                            |
| Required fields | Project Name, Customer Name                       | Project Name, Client Name, Project Status                       |
| Status          | —                                                 | Current / Secured / Lost, with a database check                 |
| References      | `FCL/FPO/YYYY/NNN` via `nextOrderReference`       | `FCL/Quote/YYYY/NNN` via `nextProposalReference`, unique        |
| Role            | `order` + `orderManagerAccess`                    | `proposal` + `proposalManagerAccess`                            |
| Catalogs        | Suppliers, customers (with addresses), expenses   | Clients, systems                                                |
| Tests           | currency, order-calculations, order-access        | currency, proposal-access, proposal-reference, proposal-summary |

It also adds two rules learned during this conversion:

- Never edit an applied migration; generate a new one, using `--hints` to answer Drizzle's rename questions
- Regenerate `docker/postgres/schema.sql` after schema changes

<details>
<summary>Full file: felix-proposals/SKILL.md</summary>

````md
---
name: felix-proposals
description: "Change Felix Controls proposal forms, BDT currency conversion, exchange rates, project status, proposal references, Home and Summary tables, or Settings client/system catalogs while preserving saved-proposal compatibility."
---

# Felix proposals

Paths below are relative to the repository root. Read the current implementation before changing behavior; these notes describe existing contracts, not a replacement specification. `docs/initial_migration/` explains how each part was converted from the original order app.

## Find the change

- Form state, BDT preview and save orchestration: `app/(pages)/proposal_form/PageBody.tsx`.
- Server writes and attribution: `app/(pages)/proposal_form/actions.ts` and `lib/drizzle/proposal-values.ts`.
- Money and rates: `lib/drizzle/currency.ts` and `lib/format-money.ts`.
- Status values: `lib/drizzle/project-status.ts` and `components/view/project-status-badge.tsx`.
- References: `lib/drizzle/proposal-reference.ts` (browser-safe format/prefix) and `lib/drizzle/next-proposal-reference.ts` (allocation).
- Home and Summary: `app/(pages)/home/`, `app/(pages)/summary/`, `lib/drizzle/proposal-summary.ts` and `components/view/year-select.tsx`.
- Catalogs: `app/(pages)/settings/actions.ts`, `app/(pages)/settings/SettingsLists.tsx`, `lib/drizzle/datalist-values.ts` and `lib/drizzle/proposal-datalists.ts`.
- Tables and migrations: `lib/drizzle/schema.ts`, `drizzle.config.ts`, `lib/drizzle/migrations/` and the reference dump `docker/postgres/schema.sql`.

## Preserve the contracts

- Money is stored as decimal strings with exact scaled-integer arithmetic. Reuse the conversion and summing helpers rather than introducing floating-point maths.
- Currencies are USD, SGD, EUR, GBP and BDT. BDT is the base: every rate means "1 unit = X BDT" (`usdToBdtRate`, `sgdToBdtRate`, `eurToBdtRate`, `gbpToBdtRate`). Rates have at most two decimal places and are saved per proposal; defaults only prefill new proposals.
- `convertToBdt` is amount × rate; `convertFromBdt` is BDT ÷ rate and is display-only. Both round halves up once and return null on invalid input or numeric(18,2) overflow.
- A proposal stores `valueOriginal`, `valueCurrency` and `valueBdt`. The server recomputes `valueBdt`; never trust a browser-supplied BDT value. A blank value stores null for all three.
- Project Name, Client Name and Project Status are required. Status is `Current`, `Secured` or `Lost` (default `Current`), also enforced by a database check constraint. Finalization Date is optional but must be a real `YYYY-MM-DD` date.
- Client and System suggest from Settings but accept free text. End User and Consultant are free text.
- `createdBy` and `lastEditedBy` come from the authenticated profile. Updates preserve the original creator, creation date and reference.
- New-proposal dates use `Asia/Dhaka`. Allocate unique `FCL/Quote/YYYY/NNN` references through `nextProposalReference` inside the inserting transaction; its yearly advisory lock (namespace `0x465154`) prevents duplicates. Year filters use `referenceYearPrefix`.
- Admins can edit every proposal. Proposal managers (`proposal`) can create proposals and edit only those with `proposalManagerAccess`; enforce the flag in the database write as well as the UI. Guests cannot save.
- Settings saves replace a whole catalog transactionally under advisory lock `(4604748, 1|2)` for clients/systems. Duplicates are compared case-insensitively.
- Summary shows every proposal column plus per-status counts and BDT totals for the selected year. Add a column by adding one entry to its `columns` list.

## Verify the affected behavior

Run the relevant existing tests, for example:

```sh
node --import tsx --test lib/drizzle/currency.test.ts lib/drizzle/proposal-access.test.ts lib/drizzle/proposal-reference.test.ts lib/drizzle/proposal-summary.test.ts
```
````

For changed UI or saves, also run lint, TypeScript and a production build. Never edit an applied migration; generate a new one (use `--hints` to answer rename prompts non-interactively) and regenerate `docker/postgres/schema.sql` with `npx drizzle-kit export --sql`. Load the existing Postgres skill before schema or SQL changes; use the installed Next.js docs before framework changes.

````

</details>

<details>
<summary>Full file: felix-proposals/agents/openai.yaml</summary>

```yaml
interface:
  display_name: "Felix Proposals"
  short_description: "Proposal forms, BDT conversion, and saved-data compatibility"
  default_prompt: "Use $felix-proposals to implement this proposal-workspace change while preserving BDT conversion and saved proposals."
````

</details>

---

## 3. felix-proposal-documents

**File:** `.agents/skills/felix-proposal-documents/SKILL.md` (was `felix-order-documents`)

| Topic           | Before                                             | After                                                           |
| --------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| Routes          | `app/api/orders/[orderId]/…`                       | `app/api/proposals/[proposalId]/…`                              |
| Storage         | `.local/documents/orders/<orderId>/<uuid>`         | `.local/documents/proposals/<proposalId>/<uuid>`                |
| Associations    | Order-level or per supplier row (`supplierRowKey`) | One flat list per proposal                                      |
| Cleanup on save | Removed supplier rows deleted their files          | Not needed                                                      |
| New rule        | —                                                  | Revoked managers can still **download**; never commit `.local/` |

<details>
<summary>Full file: felix-proposal-documents/SKILL.md</summary>

````md
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
````

Review expired-session and revoked-manager access, incomplete or oversized streams, missing files and failed cleanup when changing those paths. For schema changes, load the existing Postgres skill; for route APIs, read the installed Next.js documentation. Use temporary fixture files for checks rather than deleting application attachments.

````

</details>

<details>
<summary>Full file: felix-proposal-documents/agents/openai.yaml</summary>

```yaml
interface:
  display_name: "Felix Proposal Documents"
  short_description: "Private proposal uploads and downloads"
  default_prompt: "Use $felix-proposal-documents to implement this document change while preserving private storage and proposal permissions."
````

</details>

---

## 4. felix-user-access

**File:** `.agents/skills/felix-user-access/SKILL.md`

This skill was mostly about logins and invitations, which did not change. Only the order parts were updated:

```diff
@@ -3 +3 @@ name: felix-user-access
-description: "Change Felix Controls login, admin permissions, order-manager access, user invitation or removal, password creation, Resend delivery, or idle-session behavior using the existing Better Auth and profile model."
+description: "Change Felix Controls login, admin permissions, proposal-manager access, user invitation or removal, password creation, Resend delivery, or idle-session behavior using the existing Better Auth and profile model."
@@ -13 +13 @@ Paths below are relative to the repository root. This app uses Better Auth plus
-- Roles and order access: `lib/drizzle/schema.ts`, `lib/drizzle/order-access.ts`, `app/(pages)/home/actions.ts`, and `app/(pages)/order_form/actions.ts`.
+- Roles and proposal access: `lib/drizzle/schema.ts`, `lib/drizzle/proposal-access.ts`, `app/(pages)/home/actions.ts`, and `app/(pages)/proposal_form/actions.ts`.
@@ -22 +22 @@ Paths below are relative to the repository root. This app uses Better Auth plus
-- Status values are `admin`, `order` (Order manager), and `guest`. Roles come from the current database profile, never client fields or a cached browser session.
+- Status values are `admin`, `proposal` (Proposal manager), and `guest`. `lib/user-management/validation.ts` `accessLabels` is the single list the invite form and users table read. Roles come from the current database profile, never client fields or a cached browser session.
@@ -25 +25 @@ Paths below are relative to the repository root. This app uses Better Auth plus
-- Removal blocks self-removal and last-admin removal, deletes outstanding reset tokens, and preserves orders, documents, and attribution. Cookie caching is disabled; avoid introducing stale authorization or session caches.
+- Removal blocks self-removal and last-admin removal, deletes outstanding reset tokens, and preserves proposals, documents, and attribution. Cookie caching is disabled; avoid introducing stale authorization or session caches.
@@ -41 +41 @@ For role or session changes, run the relevant tests:
-node --import tsx --test lib/drizzle/order-access.test.ts lib/betterAuth/idle-session.test.ts
+node --import tsx --test lib/drizzle/proposal-access.test.ts lib/betterAuth/idle-session.test.ts
@@ -44 +44 @@ node --import tsx --test lib/drizzle/order-access.test.ts lib/betterAuth/idle-se
-`lib/user-management/service.test.ts` requires Node 22.15+ and an explicitly configured empty disposable database named `felix_user_management_*`; without `USER_MANAGEMENT_TEST_DATABASE_URL` it skips. Follow `docs/user-management.md`. It mocks email delivery; passing it does not verify live Resend delivery. Never point it at the configured application database.
+`lib/user-management/service.test.ts` requires Node 22.15+ and an explicitly configured empty disposable database named `felix_user_management_*`; without `USER_MANAGEMENT_TEST_DATABASE_URL` it skips. It loads `docker/postgres/schema.sql`; regenerate that dump after schema changes. Follow `docs/user-management.md`. It mocks email delivery; passing it does not verify live Resend delivery. Never point it at the configured application database.
```

---

## 5. docs/user-management.md

```diff
@@ -6 +6 @@ acquiring the shared user-management lock. Roles remain in `public.users`:
-`admin`, `order` (Order manager), and `guest`. Better Auth owns logins and sessions.
+`admin`, `proposal` (Proposal manager), and `guest`. Better Auth owns logins and sessions.
@@ -27 +27 @@ Removal atomically deletes the login, its sessions and credentials, its profile,
-and outstanding password tokens. Orders, documents, and author attribution stay
+and outstanding password tokens. Proposals, documents, and author attribution stay
@@ -51 +51 @@ password creation, expired and reused links, concurrent invitations, deletion,
-session revocation, and preserved orders. It does not send email.
+session revocation, and preserved proposals. It does not send email.
```

---

## 6. The Reference Schema

**File:** `docker/postgres/schema.sql`

This file is the **whole database structure** in one SQL file. It matters because the user-management test loads it into its throwaway database:

```ts
await client.unsafe(await readFile("docker/postgres/schema.sql", "utf8"));
```

It still described the **order** tables (`data`, `customers`, `suppliers`, `order_documents` …), so that test would have built the wrong database.

### How It Was Regenerated

```bash
npx drizzle-kit export --sql > docker/postgres/schema.sql
```

`export` prints the SQL for the **current** `schema.ts`, so it is the final shape after both migrations (170 → 123 lines).

| Tables before                                                                                                | Tables after                                                                        |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `data`, `customers`, `suppliers`, `miscellaneousExpenditures`, `order_documents`, `users`, 5 × `better_auth` | `proposals`, `clients`, `systems`, `proposal_documents`, `users`, 5 × `better_auth` |

### Schema Drift Check

```bash
npx drizzle-kit generate --name check_no_changes
```

```text
No schema changes, nothing to migrate 😴
```

This proves `schema.ts` and the two migrations agree. No file was created.

---

## 7. AGENTS.md

`AGENTS.md` is the main instruction file every agent reads.

| Section              | Change                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Project              | "proposal workspace … forked from the order-management app"                                                          |
| Project skills table | `felix-orders` → `felix-proposals`, `felix-order-documents` → `felix-proposal-documents`                             |
| File structure       | Every renamed, added and removed file from Phases 1–6                                                                |
| Architecture notes   | **Orders** → **Proposals** (BDT, rates, references, status); **Documents** paths; roles `admin`, `proposal`, `guest` |

The file tree was also kept up to date **during** each phase, as `AGENTS.md` requires.

---

## 8. Verification

### Production Build

```bash
rm -rf .next && npm run build
```

```text
✓ Compiled successfully
✓ Generating static pages using 2 workers (8/8)

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

### Secret Scan

`AGENTS.md` asks for a check that no secret ends up in what the **browser** receives. A small script loaded the five variables from `.env` and searched the fresh build for their **values** (it prints only names, never values):

```text
Configured (checked): DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY, BETTER_AUTH_URL, RESEND_EMAIL
browser assets: 45 files scanned
prerendered output: 18 files scanned
No configured secret values found.
```

| Searched                                                | Why                                            |
| ------------------------------------------------------- | ---------------------------------------------- |
| `.next/static/**`                                       | Every JavaScript and CSS file sent to browsers |
| `.next/server/app/**` `.html`, `.rsc`, `.body`, `.meta` | Pre-rendered pages and their data              |

> **Note:** Server bundles were **not** searched. They run only on the server, and finding a variable there is expected.

### Lint, Types, Tests

| Check                       | Result                                                        |
| --------------------------- | ------------------------------------------------------------- |
| `npm run lint`              | No warnings or errors                                         |
| `npx tsc --noEmit -p .`     | No errors                                                     |
| Unit tests (all test files) | 39 tests: **38 pass**, 0 fail, 1 skipped                      |
| `npm run format:check`      | 2 warnings, both in files this work never touched (see below) |

The skipped test is `lib/user-management/service.test.ts`. It needs `USER_MANAGEMENT_TEST_DATABASE_URL`, a throwaway database. It skips itself when that is not set.

### Format Check

```text
[warn] components/ui/select.tsx
[warn] lib/betterAuth/password-reset.test.ts
```

Both were already unformatted in the original repository and were not changed in any phase. The two new migration snapshots **were** flagged and have now been formatted; Drizzle still reads them correctly (see the drift check above).

---

## 9. Still To Do

These were **not** done, because each needs your decision or your hands:

| Item                                          | Why it is open                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Create the first admin                        | Needs a password: run `npx tsx scripts/create-user.ts` yourself                                         |
| Try the app in a browser                      | Needs that admin to sign in. No page has been clicked through yet                                       |
| Old order document in git                     | Removed from git and `.local/` ignored (see the Phase 5 report). It remains in past commits and on disk |
| Run the user-management test                  | Needs a throwaway database; never the Neon one                                                          |
| `docs/reports/user-management-code-report.md` | A snapshot of the original app's user-management work; left as history                                  |
| Commit                                        | Nothing is committed. You are on `main`, so a branch first is recommended                               |

---

## Exercise

Test yourself with this question.

You add a new **Probability (%)** column to `proposals` in `schema.ts`. Which steps does the `felix-proposals` skill say to take?

- Edit the latest migration file to add the column
- Generate a new migration, then regenerate `docker/postgres/schema.sql`
- Only regenerate `docker/postgres/schema.sql`
- Nothing; Drizzle updates Neon automatically

<details>
<summary>Show answer</summary>

**Generate a new migration, then regenerate `docker/postgres/schema.sql`.** Applied migrations are never edited. The new migration changes Neon (after `npx drizzle-kit migrate`), and the regenerated dump keeps the user-management test in step.

</details>

---

[❮ Phase 5 Documents](phase-5-documents.md) | [Back to the Plan](../proposal-conversion-plan.md)
