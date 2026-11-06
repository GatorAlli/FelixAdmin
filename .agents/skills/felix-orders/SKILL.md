---
name: felix-orders
description: "Change Felix Controls order forms, supplier or expense rows, currency calculations, summaries, order references, or Settings suggestion catalogs while preserving saved-order compatibility."
---

# Felix orders

Paths below are relative to the repository root. Read the current implementation before changing behavior; these notes describe existing contracts, not a replacement specification.

## Find the change

- Form state and attachment orchestration: `app/(pages)/order_form/PageBody.tsx` and its sibling components.
- Server writes and attribution: `app/(pages)/order_form/actions.ts` and `lib/drizzle/order-values.ts`.
- Money and totals: `lib/drizzle/currency.ts`, `lib/drizzle/expenses.ts`, and `lib/drizzle/order-calculations.ts`.
- Summary columns: `lib/drizzle/custom-suppliers.ts`, `lib/drizzle/expenses.ts`, and `app/(pages)/summary/TableBody.tsx`.
- Catalogs and customer addresses: `app/(pages)/settings/actions.ts`, `app/(pages)/settings/SettingsLists.tsx`, `lib/drizzle/datalist-values.ts`, and `lib/drizzle/order-datalists.ts`.
- Tables and migration settings: `lib/drizzle/schema.ts`, `drizzle.config.ts`, and `lib/drizzle/migrations/`.

## Preserve the contracts

- Money is stored as decimal strings with exact scaled-integer arithmetic. Reuse the conversion helpers rather than introducing floating-point totals. USD columns support Summary; original amounts and currencies are stored separately.
- GBP/EUR rates mean USD per foreign unit. SGD is the inverse: SGD per USD. Convert with the per-order rates, including saved display currencies.
- Fees are percentages: `5` means 5%. Commission may be negative. Keep numeric overflow and invalid-input handling consistent between validation and the calculation panel.
- Built-in suppliers map to legacy USD columns. Custom suppliers use JSON rows. Restore old orders through `restoreSupplierRows`; restore old expenses through `restoreExpenses`. For expenses, null means legacy data; an empty array means intentional removal.
- Preserve supplier `rowKey` values through rename and reorder: document relationships depend on these keys, not row positions. If attachments change, consult the project document skill.
- Suppliers removed from Settings remain valid on an order that already uses them. Summary must still include saved custom suppliers.
- `createdBy` and `lastEditedBy` come from the authenticated profile. Updates preserve the original creator, creation date, and order reference.
- New-order dates use `Asia/Dhaka`. Allocate `FCL/FPO/YYYY/NNN` references through `nextOrderReference` inside the inserting transaction; its yearly advisory lock prevents duplicate allocation.
- Admins can edit all orders. Order managers (`order`) can create orders and edit only orders with `orderManagerAccess`; enforce the flag in the database write as well as the UI. Guests cannot save orders.
- Settings saves replace a whole catalog transactionally. Customer names and addresses are parallel arrays; preserve their alignment and existing list-specific locks.

## Verify the affected behavior

Run the relevant existing tests, for example:

```sh
node --import tsx --test lib/drizzle/currency.test.ts lib/drizzle/order-calculations.test.ts lib/drizzle/order-access.test.ts
```

For changed UI or saves, also run lint, TypeScript, and a production build as appropriate. Review a legacy saved order as well as a new order when changing serialization. Load the existing Postgres skill before schema or SQL changes; use the installed Next.js docs before framework changes.
