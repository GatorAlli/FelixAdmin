# Proposal App Conversion Plan

**Status:** All six phases are complete. Each phase has a report in [`initial_migration/`](initial_migration/phase-1-data-and-helpers.md).

Convert the forked Felix Controls order-management app into a proposal-management app, reusing as much as possible.

## What stays

Auth and sessions, idle monitor, user management, Settings list editor, document storage, year filter, per-record access lock, exact money formatting, and advisory-lock reference allocation.

## What goes

Built-in supplier columns, supplier/expense rows, payment mode, handling fees, calculation panel, and supplier attachments. `PageBody.tsx` shrinks from ~2,200 lines to ~600.

## Decisions

| Topic                    | Decision                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Reference number         | Auto-generated `FCL/Quote/YYYY/NNN`, sequential per year (same allocation logic as orders).                                        |
| Value currencies         | USD, SGD, EUR, GBP, BDT. Original amount + currency stored, plus a BDT equivalent.                                                 |
| Exchange rates           | Saved per proposal, prefilled and editable.                                                                                        |
| Default rates            | 1 unit = X BDT: USD 125, SGD 96.15, EUR 150, GBP 175. Values in other currencies are shown by dividing the BDT amount by the rate. |
| Required fields          | Project Name, Client Name, Project Status. Everything else optional, including Finalization Date.                                  |
| Project Status           | Current, Secured, Lost. Defaults to Current.                                                                                       |
| Client and System        | Suggestions from Settings; free text allowed.                                                                                      |
| End User and Consultant  | Free text.                                                                                                                         |
| Roles                    | Admin / Proposal manager / Guest. Stored role value `order` becomes `proposal`.                                                    |
| Per-proposal access lock | Kept (admin Revoke Access column on Home).                                                                                         |
| Documents                | Proposal-level uploads kept; supplier attachments removed.                                                                         |
| Summary                  | All fields, plus count and BDT total per status for the selected year.                                                             |
| Database                 | Fresh Neon database. Delete the 25 order migrations and generate one baseline migration.                                           |
| Customer addresses       | Dropped (proposals have no address field).                                                                                         |

## Data model

- **`proposals`** (replaces `data`): `sl`, `referenceNumber` (unique), `createdBy`, `createdDate`, `lastEditedBy`, `lastEditedAt`, `proposalManagerAccess`, `projectName` (required), `clientName` (required), `endUser`, `consultant`, `system`, `valueOriginal`, `valueCurrency`, `valueBdt`, `usdToBdtRate`, `sgdToBdtRate`, `eurToBdtRate`, `gbpToBdtRate`, `projectStatus` (required, check constraint, default `Current`), `finalizationDate`, `proposalNotes`.
- **`clients`** (replaces `customers`, no address column).
- **`systems`** (new Settings list).
- **`proposal_documents`** (replaces `order_documents`, no `supplierRowKey`).
- **`users`** unchanged. `suppliers` and `miscellaneousExpenditures` removed.

## Phases (one commit each)

1. **Data and helpers**
   - Rewrite `lib/drizzle/schema.ts` per the data model.
   - Trim `lib/drizzle/currency.ts`: remove supplier code, add `BDT` to `Currency`, add `convertToBdt` (amount × rate) and `convertFromBdt` (BDT ÷ rate), with every rate stored as "1 unit = X BDT".
   - Rename order helpers to proposal ones: `proposal-reference.ts` (`FCL/Quote/` prefix, new lock namespace, shared prefix helper for year filters), `proposal-access.ts`, `proposal-values.ts`, `proposal-date.ts`, `proposal-datalists.ts`, `datalist-values.ts` (clients/systems).
   - Delete `order-calculations.ts`, `expenses.ts`, `custom-suppliers.ts` and their tests.
   - Delete old migrations; `npx drizzle-kit generate` a baseline. Confirm before applying to Neon.
   - Update tests: currency (BDT cases), access, reference format.
2. **Proposal form**
   - Routes `/proposal_form` and `/proposal_form/[id]`; server actions `createProposal` / `updateProposal`.
   - Sections: Project (Name, Client, End User, Consultant, System), Value (amount, currency, rates, live BDT equivalent), Status and Finalization Date, Proposal Notes, Documents.
   - Side panel: Created By, Date Created, Last Edited By/At, Reference Number.
3. **Home and Summary**
   - Home columns: SL, Created By, Reference No., Date Created, Last Edited, Project Name, Client, Status, Value (BDT), Revoke Access, View. Button "Create New Proposal".
   - Summary: every field, plus status totals (count + BDT) for the selected year.
4. **Settings, roles and branding**
   - Settings lists: Clients and Systems. Users table unchanged apart from the role label.
   - Role `order` → `proposal` across `lib/user-management/*`, `proposal-access.ts`, `scripts/create-user.ts`.
   - Navbar, metadata and email copy: "Proposal Workspace".
5. **Documents**
   - Rename API routes to `app/api/proposals/[proposalId]/documents/...`, storage path to `.local/documents/proposals/<proposalId>/<uuid>`.
   - Delete `SupplierDocument.tsx` and supplier-key handling.
6. **Docs and verification**
   - Rewrite `felix-orders` → `felix-proposals` and `felix-order-documents` → `felix-proposal-documents` skills; update `felix-user-access`, `docs/user-management.md`, `docker/postgres/schema.sql`, AGENTS.md and its file tree.
   - Run tests (`node --import tsx --test`), `npm run lint`, `npm run build`, and the browser-asset secret scan from AGENTS.md.
