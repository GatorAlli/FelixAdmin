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

For changed UI or saves, also run lint, TypeScript and a production build. Never edit an applied migration; generate a new one (use `--hints` to answer rename prompts non-interactively) and regenerate `docker/postgres/schema.sql` with `npx drizzle-kit export --sql`. Load the existing Postgres skill before schema or SQL changes; use the installed Next.js docs before framework changes.
