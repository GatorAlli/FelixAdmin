# Phase 1: Data and Helpers

[❮ Plan](../proposal-conversion-plan.md) | Next: Phase 2 Proposal Form ❯

---

## Phase 1 Summary

Phase 1 changes the **foundation** of the app: the database tables and the helper functions that every page uses.

After this phase:

- The database stores **proposals** instead of orders
- Values are converted to **BDT**
- References look like **FCL/Quote/2026/001**
- Only **Project Name**, **Client Name** and **Project Status** are required

> **Note:** The pages (`app/`) still use the old order names, so `npm run build` fails until Phases 2–5 update them. This is expected. The helpers and their tests work today.

### What Changed

| Action    | Files                                                                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rewritten | `schema.ts`, `currency.ts`, `datalist-values.ts`, `currency.test.ts`                                                                                                                            |
| Renamed   | `order-access` → `proposal-access`, `order-date` → `proposal-date`, `order-values` → `proposal-values`, `order-datalists` → `proposal-datalists`, `order-reference` → `next-proposal-reference` |
| New       | `project-status.ts`, `proposal-reference.ts`, `proposal-reference.test.ts`                                                                                                                      |
| Deleted   | `order-calculations.ts`, `order-calculations.test.ts`, `expenses.ts`, `custom-suppliers.ts`, all 25 old migrations                                                                              |
| Generated | `migrations/20261119135308_initial_proposals/`                                                                                                                                                  |
| Docs      | `AGENTS.md` file tree, this report                                                                                                                                                              |

All files are in `lib/drizzle/` unless stated otherwise.

---

## 1. The Database Schema

**File:** `lib/drizzle/schema.ts`

The schema describes every table in the database. Drizzle reads it to create the tables.

### Before

The old `data` table had **over 60 columns**: one per built-in supplier (`trane`, `belimo`, `danfoss` …), plus payment mode, handling fees, expenses and calculation-panel currencies.

```ts
export const data = p.pgTable.withRLS("data", {
  sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
  felixOrderRef: p.varchar().notNull(),
  paymentMode: p.varchar(),
  trane: p.numeric({ precision: 18, scale: 2 }),
  belimo: p.numeric({ precision: 18, scale: 2 }),
  // … 29 more supplier columns, expenses, fees …
});
```

### After

The new `proposals` table has **22 columns**, one for each proposal field.

Example

```ts
export const proposals = p.pgTable.withRLS(
  "proposals",
  {
    sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
    referenceNumber: p.varchar().notNull().unique(),
    createdBy: p.varchar().notNull(),
    createdDate: p.date().notNull(),
    lastEditedBy: p.varchar(),
    lastEditedAt: p.timestamp({ withTimezone: true }),
    proposalManagerAccess: p.boolean().notNull().default(true),

    projectName: p.varchar().notNull(),
    clientName: p.varchar().notNull(),
    endUser: p.varchar(),
    consultant: p.varchar(),
    system: p.varchar(),

    valueOriginal: p.numeric({ precision: 18, scale: 2 }),
    valueCurrency: p.varchar().$type<Currency>(),
    valueBdt: p.numeric({ precision: 18, scale: 2 }),
    gbpToUsdRate: p.numeric({ precision: 18, scale: 2 }).notNull(),
    eurToUsdRate: p.numeric({ precision: 18, scale: 2 }).notNull(),
    usdToSgdRate: p.numeric({ precision: 18, scale: 2 }).notNull(),
    usdToBdtRate: p.numeric({ precision: 18, scale: 2 }).notNull(),

    projectStatus: p
      .varchar()
      .$type<ProjectStatus>()
      .notNull()
      .default("Current"),
    finalizationDate: p.date(),
    proposalNotes: p.text(),
  },
  (table) => [
    // The database rejects values the application would never save.
    p.check(
      "proposals_project_status_check",
      sql`${table.projectStatus} in ('Current', 'Secured', 'Lost')`,
    ),
    p.check(
      "proposals_value_currency_check",
      sql`${table.valueCurrency} in ('USD', 'SGD', 'EUR', 'GBP', 'BDT')`,
    ),
  ],
);
```

### Column Groups Explained

| Group    | Columns                                                        | Purpose                                                      |
| -------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| Identity | `sl`, `referenceNumber`                                        | Row number and the `FCL/Quote/YYYY/NNN` reference            |
| Audit    | `createdBy`, `createdDate`, `lastEditedBy`, `lastEditedAt`     | Who made it, when, and who last changed it                   |
| Access   | `proposalManagerAccess`                                        | `false` means an admin revoked editing for proposal managers |
| Project  | `projectName`, `clientName`, `endUser`, `consultant`, `system` | The proposal's details                                       |
| Value    | `valueOriginal`, `valueCurrency`, `valueBdt`                   | What the user typed, its currency, and the BDT equivalent    |
| Rates    | `gbpToUsdRate`, `eurToUsdRate`, `usdToSgdRate`, `usdToBdtRate` | The rates saved with this proposal                           |
| Outcome  | `projectStatus`, `finalizationDate`, `proposalNotes`           | Current / Secured / Lost, the date, and notes                |

### Key Words Explained

| Code                  | Meaning                                                             |
| --------------------- | ------------------------------------------------------------------- |
| `.notNull()`          | The column must always have a value                                 |
| `.unique()`           | No two rows can share this value                                    |
| `.default("Current")` | Used when no value is given                                         |
| `numeric(18, 2)`      | An exact decimal with 2 decimal places. No floating-point errors    |
| `$type<Currency>()`   | Tells TypeScript which strings are allowed                          |
| `p.check(...)`        | A rule inside Postgres. Bad data is rejected even if code has a bug |

> **Note:** `referenceNumber` was not unique in the order app. It is now, so a duplicate reference can never be saved.

### The Other Tables

The supplier and expense lists are gone. **Clients** replaces customers (without the address column), and **Systems** is new.

Example

```ts
// Suggestion catalogs used by Settings and the proposal form.
export const clients = p.pgTable.withRLS("clients", {
  sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
  clientName: p.varchar().notNull(),
});
export const systems = p.pgTable.withRLS("systems", {
  sl: p.integer().primaryKey().generatedAlwaysAsIdentity(),
  systemName: p.varchar().notNull(),
});
```

Documents keep the same columns, except `supplierRowKey` is removed and `orderId` becomes `proposalId`:

Example

```ts
export const proposalDocuments = p.pgTable.withRLS(
  "proposal_documents",
  {
    id: p
      .uuid()
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    proposalId: p
      .integer()
      .notNull()
      .references(() => proposals.sl),
    title: p.varchar({ length: 120 }).notNull(),
    originalName: p.varchar({ length: 255 }).notNull(),
    storagePath: p.text().notNull().unique(),
    mimeType: p.varchar({ length: 100 }).notNull(),
    sizeBytes: p.integer().notNull(),
    uploadedBy: p.uuid().notNull(),
    createdAt: p.timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Makes "find documents for this proposal" efficient.
    p.index("proposal_documents_proposal_id_idx").on(table.proposalId),
  ],
);
```

The `users` table is **unchanged**.

### Exported Types

```ts
export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type System = typeof systems.$inferSelect;
export type DocumentSummary = Pick<
  typeof proposalDocuments.$inferSelect,
  "id" | "title" | "originalName" | "sizeBytes"
>;
```

`Order`, `NewOrder`, `Supplier`, `NewSupplier`, `Expense` and `NewExpense` were removed.

---

## 2. Project Status

**File:** `lib/drizzle/project-status.ts` (new)

This small file lists the three allowed statuses in **one place**. The form, the validator and the summary will all read from it.

Example

```ts
// The three stages a proposal can be in. New proposals start as "Current".
export const projectStatuses = ["Current", "Secured", "Lost"] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const DEFAULT_PROJECT_STATUS: ProjectStatus = "Current";

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return projectStatuses.includes(value as ProjectStatus);
}
```

### How It Works

- `as const` makes the array read-only, so TypeScript knows the exact three strings
- `(typeof projectStatuses)[number]` turns the array into the type `"Current" | "Secured" | "Lost"`
- `isProjectStatus()` checks a value from the form. If it returns `true`, TypeScript treats the value as a `ProjectStatus`

```ts
isProjectStatus("Secured"); // true
isProjectStatus("Pending"); // false
```

---

## 3. Currency Conversion

**File:** `lib/drizzle/currency.ts`

### Before

The file held the 31 built-in supplier columns, supplier row types, and two converters: `convertToUsd()` and `convertFromUsd()`. Everything was totalled in **USD**.

```ts
export type Currency = "USD" | "EUR" | "GBP" | "SGD";
```

### After

All supplier code is removed. BDT is added, and BDT is the new base currency.

Example

```ts
// Currencies a proposal value can be entered in. BDT is the base for totals.
export const currencies = ["USD", "SGD", "EUR", "GBP", "BDT"] as const;

export type Currency = (typeof currencies)[number];
```

### Exchange Rates

The four rates are grouped into one object type, so functions take **one argument** instead of four.

Example

```ts
// Each proposal saves its own rates; these prefill new proposals.
export type ExchangeRates = {
  gbpToUsdRate: string;
  eurToUsdRate: string;
  usdToSgdRate: string;
  usdToBdtRate: string;
};

export const DEFAULT_GBP_TO_USD = "1.40";
export const DEFAULT_EUR_TO_USD = "1.20";
export const DEFAULT_USD_TO_SGD = "1.30";
export const DEFAULT_USD_TO_BDT = "125.00";

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  gbpToUsdRate: DEFAULT_GBP_TO_USD,
  eurToUsdRate: DEFAULT_EUR_TO_USD,
  usdToSgdRate: DEFAULT_USD_TO_SGD,
  usdToBdtRate: DEFAULT_USD_TO_BDT,
};
```

The first three defaults are the **same as the order app**. `USD → BDT = 125` is new.

`isCurrency()` now reads from the array instead of listing each currency:

```ts
export function isCurrency(value: unknown): value is Currency {
  return currencies.includes(value as Currency);
}
```

`scaledDecimal()` and `isValidRate()` are **unchanged**.

### The convertToBdt() Function

This replaces `convertToUsd()` and `convertFromUsd()`.

Example

```ts
export function convertToBdt(
  amount: string,
  currency: Currency,
  rates: ExchangeRates,
): string | null {
  const cents = scaledDecimal(amount, 2, 16);
  if (cents === null) return null;

  const rate = (text: string) => {
    const parsed = scaledDecimal(text, 8, 10);
    return parsed !== null && parsed > BigInt(0) ? parsed : null;
  };
  const scale = BigInt(100000000);
  const usdToBdt = rate(rates.usdToBdtRate);
  if (usdToBdt === null) return null;

  // bdtCents = cents × numerator ÷ denominator
  let numerator = BigInt(1);
  let denominator = BigInt(1);
  if (currency === "USD") {
    numerator = usdToBdt;
    denominator = scale;
  } else if (currency === "GBP" || currency === "EUR") {
    const toUsd = rate(
      currency === "GBP" ? rates.gbpToUsdRate : rates.eurToUsdRate,
    );
    if (toUsd === null) return null;
    numerator = toUsd * usdToBdt;
    denominator = scale * scale;
  } else if (currency === "SGD") {
    // SGD uses the inverse rate: 1 USD = rate SGD.
    const usdToSgd = rate(rates.usdToSgdRate);
    if (usdToSgd === null) return null;
    numerator = usdToBdt;
    denominator = usdToSgd;
  }

  const bdtCents = (cents * numerator + denominator / BigInt(2)) / denominator;
  if (bdtCents >= BigInt("1000000000000000000")) return null;
  const text = bdtCents.toString().padStart(3, "0");
  return `${text.slice(0, -2)}.${text.slice(-2)}`;
}
```

### Step by Step

1. **Turn the amount into whole cents.** `"12.50"` becomes `1250n`. A `BigInt` never loses precision
2. **Turn each rate into a whole number.** Rates are multiplied by 100,000,000 (`scale`), so `"1.40"` becomes `140000000n`
3. **Build one fraction** for the whole conversion:

| Currency | Formula                 | Numerator      | Denominator   |
| -------- | ----------------------- | -------------- | ------------- |
| BDT      | amount × 1              | 1              | 1             |
| USD      | amount × USD→BDT        | USD→BDT        | scale         |
| GBP, EUR | amount × →USD × →BDT    | →USD × USD→BDT | scale × scale |
| SGD      | amount ÷ USD→SGD × →BDT | USD→BDT        | USD→SGD       |

4. **Divide once and round.** Adding half the denominator before dividing rounds `.5` up, the same way Postgres does
5. **Check the limit.** `numeric(18, 2)` holds up to 9,999,999,999,999,999.99. Larger results return `null`
6. **Put the decimal point back.** `1250n` becomes `"12.50"`

> **Note:** GBP, EUR and SGD go through USD, but the result is rounded **only once**. Rounding to USD cents first and then to BDT would add a small error.

### Examples

With the default rates:

```ts
convertToBdt("100", "BDT", rates); // "100.00"
convertToBdt("100", "USD", rates); // "12500.00"   100 × 125
convertToBdt("100", "GBP", rates); // "17500.00"   100 × 1.40 × 125
convertToBdt("100", "EUR", rates); // "15000.00"   100 × 1.20 × 125
convertToBdt("130", "SGD", rates); // "12500.00"   130 ÷ 1.30 × 125
convertToBdt("-1", "USD", rates); //  null         negative amounts are rejected
```

### Removed From currency.ts

| Removed                                                                        | Why                                      |
| ------------------------------------------------------------------------------ | ---------------------------------------- |
| `supplierColumns` (31 suppliers)                                               | Proposals have no suppliers              |
| `SupplierKey`, `SupplierCurrencyDetail`, `CustomSupplierDetail`, `SupplierRow` | Supplier types                           |
| `restoreSupplierRows()`, `legacySupplierRowKey()`                              | Rebuilt supplier rows for the order form |
| `convertToUsd()`, `convertFromUsd()`                                           | Replaced by `convertToBdt()`             |

---

## 4. Reference Numbers

The order app had one file that did both **formatting** and **allocating** references. It is now split in two.

### Why Split It?

The Home and Summary pages run in the **browser** and need the year prefix to filter by year. The allocator imports the database schema, which should not be sent to the browser. So:

| File                         | Runs in            | Job                                            |
| ---------------------------- | ------------------ | ---------------------------------------------- |
| `proposal-reference.ts`      | Browser and server | Formats references and year prefixes           |
| `next-proposal-reference.ts` | Server only        | Picks the next free number inside the database |

### proposal-reference.ts (new)

Example

```ts
// Browser-safe reference helpers. Allocation lives in next-proposal-reference.ts.
export const REFERENCE_PREFIX = "FCL/Quote";

// Used by year filters: every 2026 proposal starts with "FCL/Quote/2026/".
export function referenceYearPrefix(year: number | string): string {
  return `${REFERENCE_PREFIX}/${year}/`;
}

export function formatProposalReference(
  year: number,
  sequence: bigint,
): string {
  if (
    !Number.isInteger(year) ||
    year < 1000 ||
    year > 9999 ||
    sequence < BigInt("1")
  ) {
    throw new RangeError("Invalid proposal reference year or sequence.");
  }
  return `${referenceYearPrefix(year)}${sequence.toString().padStart(3, "0")}`;
}
```

```ts
formatProposalReference(2026, 1n); //    "FCL/Quote/2026/001"
formatProposalReference(2026, 1234n); // "FCL/Quote/2026/1234"
referenceYearPrefix(2026); //            "FCL/Quote/2026/"
```

Before, the prefix `FCL/FPO/` was typed out in three places (the allocator, Home and Summary). Now it lives in **one constant**.

### next-proposal-reference.ts (renamed from order-reference.ts)

Example

```ts
import { sql } from "drizzle-orm";
import { proposals } from "./schema";
import {
  formatProposalReference,
  referenceYearPrefix,
} from "./proposal-reference";
import type { db } from "./drizzle-index";

type ProposalTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Call inside the same transaction that inserts the proposal. The lock stays held
// until commit/rollback, so another submission cannot allocate the same number.
export async function nextProposalReference(
  transaction: ProposalTransaction,
  createdDate: string,
): Promise<string> {
  // createdDate already uses Bangladesh time, including New Year's midnight.
  const year = Number(createdDate.slice(0, 4));
  const lockNamespace = 0x465154; // "FQT"; each year gets its own lock.
  await transaction.execute(
    sql`select pg_advisory_xact_lock(${lockNamespace}::integer, ${year}::integer)`,
  );

  const [latest] = await transaction
    .select({
      lastNumber: sql<string>`coalesce(max(split_part(${proposals.referenceNumber}, '/', 4)::numeric), 0)::text`,
    })
    .from(proposals)
    .where(
      sql`${proposals.referenceNumber} ~ ${`^${referenceYearPrefix(year)}[0-9]+$`}`,
    );

  return formatProposalReference(year, BigInt(latest.lastNumber) + BigInt("1"));
}
```

### What Changed Line by Line

| Before                                | After                                        | Why                                                    |
| ------------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `import { data } from "./schema"`     | `import { proposals } from "./schema"`       | Table renamed                                          |
| `formatOrderReference()` defined here | Imported from `proposal-reference.ts`        | The browser-safe split                                 |
| `OrderTransaction`                    | `ProposalTransaction`                        | Naming                                                 |
| `lockNamespace = 0x46434c` ("FCL")    | `lockNamespace = 0x465154` ("FQT")           | The old number was also used by the Settings save lock |
| `data.felixOrderRef`                  | `proposals.referenceNumber`                  | Column renamed                                         |
| `` `^FCL/FPO/${year}/[0-9]+$` ``      | `` `^${referenceYearPrefix(year)}[0-9]+$` `` | Uses the shared prefix                                 |

### How the Lock Works

Two people might click **Save** at the same moment. Without a lock, both could read "last number is 7" and both save `008`.

`pg_advisory_xact_lock` makes the second save **wait** until the first one commits. Then the second save reads `008` and picks `009`.

> **Note:** `split_part(ref, '/', 4)` still works because `FCL/Quote/2026/009` has the number in the 4th part, the same as `FCL/FPO/2026/009`.

---

## 5. Edit Access

**File:** `lib/drizzle/proposal-access.ts` (renamed from `order-access.ts`)

### Before

```ts
export function canEditOrder(
  status: string | null | undefined,
  orderManagerAccess: boolean,
) {
  return status === "admin" || (status === "order" && orderManagerAccess);
}
```

### After

```ts
// Roles come from the authenticated user's database profile, never from FormData.
export function canEditProposal(
  status: string | null | undefined,
  proposalManagerAccess: boolean,
) {
  return status === "admin" || (status === "proposal" && proposalManagerAccess);
}
```

The logic is the same. The role value `"order"` became `"proposal"`.

| Role         | Access not revoked | Access revoked |
| ------------ | ------------------ | -------------- |
| `"admin"`    | Can edit           | Can edit       |
| `"proposal"` | Can edit           | Cannot edit    |
| `"guest"`    | Cannot edit        | Cannot edit    |

> **Note:** User management still creates `"order"` users until Phase 4 renames the role there. The new database has no users yet, so nothing breaks.

---

## 6. Dates

**File:** `lib/drizzle/proposal-date.ts` (renamed from `order-date.ts`)

Three functions were renamed. Their code is **unchanged**:

| Before                  | After                      |
| ----------------------- | -------------------------- |
| `currentOrderDate()`    | `currentProposalDate()`    |
| `formatOrderDate()`     | `formatProposalDate()`     |
| `formatOrderEditDate()` | `formatProposalEditDate()` |

One function is **new**. It checks the optional Finalization Date:

Example

```ts
// Accept only real calendar dates in Postgres's YYYY-MM-DD format.
export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
```

### How It Works

1. The regular expression checks the shape: four digits, dash, two digits, dash, two digits
2. JavaScript builds a date from the numbers
3. JavaScript quietly "fixes" impossible dates. February 30 becomes March 2
4. If the year, month or day changed, the input was not a real date

```ts
isIsoDate("2026-01-30"); // true
isIsoDate("2026-02-30"); // false  (no February 30)
isIsoDate("30/01/2026"); // false  (wrong format)
```

---

## 7. Form Validation

**File:** `lib/drizzle/proposal-values.ts` (renamed from `order-values.ts`)

This function reads the submitted form and returns either **clean values** to save or an **error message**.

The order version was 336 lines because it validated supplier rows, expense rows, fees and panel currencies. The proposal version is about 120 lines.

### The Full Function

Example

```ts
import type { NewProposal } from "./schema";
import {
  DEFAULT_EXCHANGE_RATES,
  convertToBdt,
  isCurrency,
  isValidRate,
  type ExchangeRates,
} from "./currency";
import { isProjectStatus } from "./project-status";
import { isIsoDate } from "./proposal-date";

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// Both creating and editing use the same field validation and conversion.
export function readProposalValues(
  formData: FormData,
  authenticatedUsername: string,
):
  | {
      ok: true;
      values: Omit<
        NewProposal,
        | "sl"
        | "referenceNumber"
        | "createdDate"
        | "proposalManagerAccess"
        | "lastEditedBy"
        | "lastEditedAt"
      >;
    }
  | { ok: false; message: string } {
  // The server supplies this name after authentication; FormData cannot override it.
  const createdBy = authenticatedUsername.trim();
  if (!createdBy) {
    return { ok: false, message: "Created by is required." };
  }

  // Project Name, Client Name and Project Status are the only required fields.
  const projectName = readText(formData, "projectName");
  const clientName = readText(formData, "clientName");
  const projectStatus = readText(formData, "projectStatus");
  if (!projectName) return { ok: false, message: "Project Name is required." };
  if (!clientName) return { ok: false, message: "Client Name is required." };
  if (!isProjectStatus(projectStatus)) {
    return {
      ok: false,
      message: "Choose Current, Secured or Lost for Project Status.",
    };
  }

  // Blank rates fall back to the defaults, matching the prefilled form.
  const rates: ExchangeRates = {
    gbpToUsdRate:
      readText(formData, "gbpToUsdRate") || DEFAULT_EXCHANGE_RATES.gbpToUsdRate,
    eurToUsdRate:
      readText(formData, "eurToUsdRate") || DEFAULT_EXCHANGE_RATES.eurToUsdRate,
    usdToSgdRate:
      readText(formData, "usdToSgdRate") || DEFAULT_EXCHANGE_RATES.usdToSgdRate,
    usdToBdtRate:
      readText(formData, "usdToBdtRate") || DEFAULT_EXCHANGE_RATES.usdToBdtRate,
  };
  if (!Object.values(rates).every(isValidRate)) {
    return {
      ok: false,
      message:
        "All four exchange rates must be positive decimals with at most 2 decimal places.",
    };
  }

  // Value is optional. When present, keep the input and recompute BDT on the server.
  const valueOriginal = readText(formData, "value");
  let valueCurrency: NewProposal["valueCurrency"] = null;
  let valueBdt: string | null = null;
  if (valueOriginal) {
    const currency = formData.get("valueCurrency");
    if (!isCurrency(currency)) {
      return { ok: false, message: "Choose a valid currency for the value." };
    }
    valueCurrency = currency;
    valueBdt = convertToBdt(valueOriginal, currency, rates);
    if (valueBdt === null) {
      return {
        ok: false,
        message:
          "Enter a valid value (up to 2 decimal places and within the supported range).",
      };
    }
  }

  const finalizationDate = readText(formData, "finalizationDate");
  if (finalizationDate && !isIsoDate(finalizationDate)) {
    return { ok: false, message: "Enter a valid Finalization Date." };
  }

  // Build the database fields explicitly; unrelated browser fields are ignored.
  const values = {
    createdBy,
    projectName,
    clientName,
    endUser: readText(formData, "endUser") || null,
    consultant: readText(formData, "consultant") || null,
    system: readText(formData, "system") || null,
    valueOriginal: valueOriginal || null,
    valueCurrency,
    valueBdt,
    ...rates,
    projectStatus,
    finalizationDate: finalizationDate || null,
    proposalNotes: readText(formData, "proposalNotes") || null,
  };

  return { ok: true, values };
}
```

### The Checks, in Order

| #   | Check                                      | Error message                                       |
| --- | ------------------------------------------ | --------------------------------------------------- |
| 1   | Signed-in user has a name                  | Created by is required.                             |
| 2   | Project Name is not blank                  | Project Name is required.                           |
| 3   | Client Name is not blank                   | Client Name is required.                            |
| 4   | Status is Current, Secured or Lost         | Choose Current, Secured or Lost for Project Status. |
| 5   | All four rates are positive, ≤ 2 decimals  | All four exchange rates must be positive decimals … |
| 6   | If a value is given, its currency is valid | Choose a valid currency for the value.              |
| 7   | If a value is given, it converts to BDT    | Enter a valid value …                               |
| 8   | If a date is given, it is a real date      | Enter a valid Finalization Date.                    |

### Security Rules Kept From the Order App

- **`createdBy` comes from the server**, not the form. A user cannot pretend to be someone else
- **`valueBdt` is recalculated on the server.** A user who edits the page's HTML cannot save a fake BDT amount
- **Only named fields are copied** into `values`. Extra form fields like `referenceNumber` or `proposalManagerAccess` are ignored

> **Note:** Blank optional fields are saved as `null`, not `""`. This keeps "not filled in" clear in the database.

### Removed From This File

`readOptionalFee()`, supplier-row validation, expense-row validation, panel-currency validation, `importedBy`, `paymentMode`, `orderHandledBy` and the per-supplier column clearing.

---

## 8. Settings Lists

### proposal-datalists.ts (renamed from order-datalists.ts)

Before, it loaded suppliers, customers (with addresses) and expenses. Now it loads clients and systems.

Example

```ts
import "server-only";

import { asc } from "drizzle-orm";
import { db } from "@/lib/drizzle/drizzle-index";
import { clients, systems } from "./schema";

// Called only after the page has authenticated its visitor.
export async function getProposalDatalists() {
  const [clientRows, systemRows] = await Promise.all([
    db.select().from(clients).orderBy(asc(clients.sl)),
    db.select().from(systems).orderBy(asc(systems.sl)),
  ]);
  return {
    clientSuggestions: clientRows.map((row) => row.clientName),
    systemSuggestions: systemRows.map((row) => row.systemName),
  };
}
```

`Promise.all` runs both database queries **at the same time** instead of one after the other.

### datalist-values.ts

Example

```ts
export type DatalistKind = "clients" | "systems";

// Trim suggestions and reject duplicates before Settings replaces the stored list.
export function readDatalistValues(
  input: unknown,
): { ok: true; values: string[] } | { ok: false; message: string } {
  // … same checks as before: at most 500 items, 1–200 characters, no duplicates …
  values.push(trimmed);
}
```

| Before                                                    | After                                   |
| --------------------------------------------------------- | --------------------------------------- |
| `DatalistKind = "suppliers" \| "customers" \| "expenses"` | `DatalistKind = "clients" \| "systems"` |
| `readDatalistValues(kind, input)`                         | `readDatalistValues(input)`             |
| Supplier names were forced to UPPERCASE                   | Every list keeps the text as typed      |
| `defaultSupplierSuggestions`, `defaultExpenseSuggestions` | Removed (they were not used anywhere)   |
| `readCustomerAddresses()`                                 | Removed (no address column)             |

Duplicates are still checked **without case**, so "Acme" and "ACME" count as the same client.

---

## 9. Deleted Files

| File                         | Lines   | What it did                                        |
| ---------------------------- | ------- | -------------------------------------------------- |
| `order-calculations.ts`      | 124     | Order totals, commission and the calculation panel |
| `order-calculations.test.ts` | 80      | Tests for the above                                |
| `expenses.ts`                | 70      | Miscellaneous expense rows                         |
| `custom-suppliers.ts`        | 47      | Suppliers added in Settings                        |
| `migrations/` (25 folders)   | ~28,000 | Order database history (mostly snapshot JSON)      |

To see any deleted code, run:

```bash
git show HEAD:lib/drizzle/order-calculations.ts
```

---

## 10. The Baseline Migration

**Folder:** `lib/drizzle/migrations/20261119135308_initial_proposals/`

A **migration** is a SQL file that creates or changes tables. The app now starts on a fresh Neon database, so the 25 order migrations were deleted and **one** new migration was generated:

```bash
npx drizzle-kit generate --name initial_proposals
```

It creates:

- The `better_auth` schema and its 5 tables (`user`, `session`, `account`, `verification`, `rate_limit`). Unchanged from the order app
- `proposals`, `clients`, `systems`, `proposal_documents`, `users`
- Row Level Security on every app table
- The index and foreign key on `proposal_documents`

Example (the proposals table)

```sql
CREATE TABLE "proposals" (
	"sl" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (...),
	"referenceNumber" varchar NOT NULL UNIQUE,
	"createdBy" varchar NOT NULL,
	"createdDate" date NOT NULL,
	...
	"projectStatus" varchar DEFAULT 'Current' NOT NULL,
	"finalizationDate" date,
	"proposalNotes" text,
	CONSTRAINT "proposals_project_status_check" CHECK ("projectStatus" in ('Current', 'Secured', 'Lost')),
	CONSTRAINT "proposals_value_currency_check" CHECK ("valueCurrency" in ('USD', 'SGD', 'EUR', 'GBP', 'BDT'))
);
```

> **Note:** Generating only writes the file. Applying it changes the real database.

### Applying the Migration

The migration was applied to Neon with:

```bash
npx drizzle-kit migrate
```

Drizzle records each applied migration in `drizzle.__drizzle_migrations`, so running the command again does nothing.

### Checking the Result

A query against Neon's `information_schema` confirmed every table:

| Schema        | Table                  | Columns | Row Level Security |
| ------------- | ---------------------- | ------- | ------------------ |
| `public`      | `proposals`            | 22      | On                 |
| `public`      | `clients`              | 2       | On                 |
| `public`      | `systems`              | 2       | On                 |
| `public`      | `proposal_documents`   | 9       | On                 |
| `public`      | `users`                | 4       | On                 |
| `better_auth` | `user`                 | 7       | Off                |
| `better_auth` | `session`              | 8       | Off                |
| `better_auth` | `account`              | 13      | Off                |
| `better_auth` | `verification`         | 6       | Off                |
| `better_auth` | `rate_limit`           | 4       | Off                |
| `drizzle`     | `__drizzle_migrations` | 5       | Off                |

The `proposals` table also has its three rules:

```text
proposals_project_status_check
proposals_referenceNumber_key
proposals_value_currency_check
```

> **Note:** Row Level Security is off on the `better_auth` tables. That is the same as the order app: Better Auth manages those tables itself.

> **Note:** The database is empty. Create the first admin with `scripts/create-user.ts` after Phase 4 renames the roles.

---

## 11. Tests

Three test files cover Phase 1. They run with Node's built-in test runner.

### Run them yourself

```bash
node --import tsx --test lib/drizzle/currency.test.ts lib/drizzle/proposal-access.test.ts lib/drizzle/proposal-reference.test.ts
```

### Result

```text
ℹ tests 17
ℹ pass 17
ℹ fail 0
```

The existing document and idle-session tests also still pass (17 of 17).

### What Each Test Proves

| File                         | Test                                                                |
| ---------------------------- | ------------------------------------------------------------------- |
| `currency.test.ts`           | Every currency converts to BDT with the proposal's rates            |
|                              | Rounding happens once; bad amounts, rates and overflow are rejected |
|                              | Only the five currencies are accepted                               |
|                              | Money totals add exact cents                                        |
|                              | Saving recalculates BDT on the server, ignoring a fake value        |
|                              | A blank value stores no currency                                    |
|                              | An unsupported currency or bad rate is rejected                     |
| `proposal-access.test.ts`    | Revoking access keeps admins able to edit                           |
|                              | Guests, the old `"order"` role and unknown roles cannot edit        |
|                              | A forged form cannot change access or the reference number          |
|                              | A forged form cannot change `createdBy`                             |
|                              | Project Name, Client Name and Project Status are required           |
|                              | Optional fields are trimmed; blanks become `null`                   |
|                              | Finalization Date must be a real date                               |
| `proposal-reference.test.ts` | References use `FCL/Quote/YYYY/NNN`                                 |
|                              | The year prefix only matches that year                              |
|                              | Invalid years or sequences throw an error                           |

<details>
<summary>Full test code: currency.test.ts</summary>

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { convertToBdt, isCurrency, type ExchangeRates } from "./currency";
import { readProposalValues } from "./proposal-values";
import { sumMoneyAmounts } from "../format-money";

const rates: ExchangeRates = {
  gbpToUsdRate: "1.40",
  eurToUsdRate: "1.20",
  usdToSgdRate: "1.30",
  usdToBdtRate: "125.00",
};

// Money stays in decimal strings so large amounts do not lose cents.
test("every currency converts to BDT using the proposal's rates", () => {
  assert.equal(convertToBdt("100", "BDT", rates), "100.00");
  assert.equal(convertToBdt("100", "USD", rates), "12500.00");
  assert.equal(convertToBdt("100", "GBP", rates), "17500.00");
  assert.equal(convertToBdt("100", "EUR", rates), "15000.00");
  assert.equal(convertToBdt("130", "SGD", rates), "12500.00");
});

test("conversion rounds once and rejects invalid amounts, rates or overflow", () => {
  // 1 SGD = 125 / 1.3 = 96.153846… BDT
  assert.equal(convertToBdt("1", "SGD", rates), "96.15");
  // 0.01 GBP = 0.01 × 1.4 × 125 = 1.75 BDT, with no intermediate USD rounding.
  assert.equal(convertToBdt("0.01", "GBP", rates), "1.75");
  assert.equal(
    convertToBdt("9999999999999999.99", "BDT", rates),
    "9999999999999999.99",
  );
  assert.equal(convertToBdt("9999999999999999.99", "USD", rates), null);
  assert.equal(convertToBdt("-1", "USD", rates), null);
  assert.equal(convertToBdt("1.234", "USD", rates), null);
  assert.equal(
    convertToBdt("10", "USD", { ...rates, usdToBdtRate: "0" }),
    null,
  );
  assert.equal(
    convertToBdt("10", "SGD", { ...rates, usdToSgdRate: "0" }),
    null,
  );
});

test("only the five supported currencies are accepted", () => {
  for (const currency of ["USD", "SGD", "EUR", "GBP", "BDT"]) {
    assert.equal(isCurrency(currency), true);
  }
  for (const currency of ["usd", "INR", "", null, undefined]) {
    assert.equal(isCurrency(currency), false);
  }
});

test("money totals add exact cents and ignore empty amounts", () => {
  assert.equal(sumMoneyAmounts(["0.10", "0.20", null, undefined, ""]), "0.30");
  assert.equal(
    sumMoneyAmounts(["9999999999999999.99", "0.02"]),
    "10000000000000000.01",
  );
  assert.equal(sumMoneyAmounts(["1.00", "-2.25"]), "-1.25");
  assert.equal(sumMoneyAmounts([]), "0.00");
});

test("saving a value keeps the original amount and recalculates BDT on the server", () => {
  const form = new FormData();
  form.set("projectName", "Test project");
  form.set("clientName", "Test client");
  form.set("projectStatus", "Current");
  form.set("value", "130");
  form.set("valueCurrency", "SGD");
  form.set("valueBdt", "999999");

  const result = readProposalValues(form, "Test user");
  assert.ok(result.ok);
  assert.equal(result.values.valueOriginal, "130");
  assert.equal(result.values.valueCurrency, "SGD");
  assert.equal(result.values.valueBdt, "12500.00");
  assert.equal(result.values.usdToBdtRate, "125.00");
});

test("a blank value stores no currency or BDT amount", () => {
  const form = new FormData();
  form.set("projectName", "Test project");
  form.set("clientName", "Test client");
  form.set("projectStatus", "Current");
  form.set("valueCurrency", "USD");
  const result = readProposalValues(form, "Test user");
  assert.ok(result.ok);
  assert.equal(result.values.valueOriginal, null);
  assert.equal(result.values.valueCurrency, null);
  assert.equal(result.values.valueBdt, null);
});

test("a value with an unsupported currency or bad rate is rejected", () => {
  const form = new FormData();
  form.set("projectName", "Test project");
  form.set("clientName", "Test client");
  form.set("projectStatus", "Current");
  form.set("value", "100");
  form.set("valueCurrency", "INR");
  assert.equal(readProposalValues(form, "Test user").ok, false);
  form.set("valueCurrency", "USD");
  form.set("usdToBdtRate", "0");
  assert.equal(readProposalValues(form, "Test user").ok, false);
});
```

</details>

<details>
<summary>Full test code: proposal-access.test.ts</summary>

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { canEditProposal } from "./proposal-access";
import { readProposalValues } from "./proposal-values";

function validForm() {
  const form = new FormData();
  form.set("projectName", "Test project");
  form.set("clientName", "Test client");
  form.set("projectStatus", "Current");
  return form;
}

test("revoking proposal-manager access keeps admins able to edit", () => {
  assert.equal(canEditProposal("admin", true), true);
  assert.equal(canEditProposal("admin", false), true);
  assert.equal(canEditProposal("proposal", true), true);
  assert.equal(canEditProposal("proposal", false), false);
});

test("guests, old order roles and unknown profiles cannot edit", () => {
  for (const status of [
    "guest",
    "order",
    "",
    "ADMIN",
    "unknown",
    null,
    undefined,
  ]) {
    assert.equal(canEditProposal(status, true), false);
    assert.equal(canEditProposal(status, false), false);
  }
});

test("a forged proposal form cannot grant or revoke manager access", () => {
  for (const access of ["true", "false"]) {
    const form = validForm();
    form.set("proposalManagerAccess", access);
    form.set("referenceNumber", "FCL/Quote/1999/001");
    const parsed = readProposalValues(form, "Proposal manager");
    assert.ok(parsed.ok);
    assert.equal(Object.hasOwn(parsed.values, "proposalManagerAccess"), false);
    assert.equal(Object.hasOwn(parsed.values, "referenceNumber"), false);
  }
});

// Attribution is supplied by the server, even when the browser submits a name.
test("the form cannot impersonate another creator", () => {
  const form = validForm();
  form.set("createdBy", "Forged name");
  const result = readProposalValues(form, "Current user");
  assert.ok(result.ok);
  assert.equal(result.values.createdBy, "Current user");
  assert.equal(readProposalValues(form, "").ok, false);
});

test("Project Name, Client Name and Project Status are required", () => {
  const form = new FormData();
  assert.equal(readProposalValues(form, "Current user").ok, false);
  form.set("projectName", "   ");
  form.set("clientName", "Client");
  form.set("projectStatus", "Current");
  assert.equal(readProposalValues(form, "Current user").ok, false);
  form.set("projectName", "Project");
  form.set("clientName", "  ");
  assert.equal(readProposalValues(form, "Current user").ok, false);
  form.set("clientName", "Client");
  form.delete("projectStatus");
  assert.equal(readProposalValues(form, "Current user").ok, false);
  form.set("projectStatus", "Pending");
  assert.equal(readProposalValues(form, "Current user").ok, false);
  form.set("projectStatus", "Secured");
  const result = readProposalValues(form, "Current user");
  assert.ok(result.ok);
  assert.equal(result.values.projectName, "Project");
  assert.equal(result.values.clientName, "Client");
  assert.equal(result.values.projectStatus, "Secured");
});

test("optional fields are trimmed, and blanks are saved as null", () => {
  const form = validForm();
  form.set("endUser", "  End user  ");
  form.set("consultant", "   ");
  form.set("system", " BMS ");
  form.set("proposalNotes", "");
  const result = readProposalValues(form, "Current user");
  assert.ok(result.ok);
  assert.equal(result.values.endUser, "End user");
  assert.equal(result.values.consultant, null);
  assert.equal(result.values.system, "BMS");
  assert.equal(result.values.proposalNotes, null);
  assert.equal(result.values.finalizationDate, null);
});

test("Finalization Date is optional but must be a real date", () => {
  const form = validForm();
  form.set("finalizationDate", "2026-02-30");
  assert.equal(readProposalValues(form, "Current user").ok, false);
  form.set("finalizationDate", "30/01/2026");
  assert.equal(readProposalValues(form, "Current user").ok, false);
  form.set("finalizationDate", "2026-01-30");
  const result = readProposalValues(form, "Current user");
  assert.ok(result.ok);
  assert.equal(result.values.finalizationDate, "2026-01-30");
});
```

</details>

<details>
<summary>Full test code: proposal-reference.test.ts</summary>

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatProposalReference,
  referenceYearPrefix,
} from "./proposal-reference";

test("references use FCL/Quote/YYYY/NNN with at least three digits", () => {
  assert.equal(formatProposalReference(2026, BigInt(1)), "FCL/Quote/2026/001");
  assert.equal(formatProposalReference(2026, BigInt(42)), "FCL/Quote/2026/042");
  assert.equal(
    formatProposalReference(2026, BigInt(1234)),
    "FCL/Quote/2026/1234",
  );
});

test("the year prefix matches references from that year only", () => {
  const prefix = referenceYearPrefix(2026);
  assert.equal(prefix, "FCL/Quote/2026/");
  assert.ok(formatProposalReference(2026, BigInt(7)).startsWith(prefix));
  assert.ok(!formatProposalReference(2025, BigInt(7)).startsWith(prefix));
});

test("invalid years or sequences are rejected", () => {
  assert.throws(() => formatProposalReference(999, BigInt(1)), RangeError);
  assert.throws(() => formatProposalReference(10000, BigInt(1)), RangeError);
  assert.throws(() => formatProposalReference(2026.5, BigInt(1)), RangeError);
  assert.throws(() => formatProposalReference(2026, BigInt(0)), RangeError);
});
```

</details>

---

## 12. What Still Uses the Old Names

TypeScript reports errors in these files. Each is fixed in a later phase:

| Files                                         | Fixed in |
| --------------------------------------------- | -------- |
| `app/(pages)/order_form/*`                    | Phase 2  |
| `app/(pages)/home/*`, `app/(pages)/summary/*` | Phase 3  |
| `app/(pages)/settings/*`                      | Phase 4  |
| `app/api/orders/*`, `lib/documents/access.ts` | Phase 5  |

---

## Exercise

Test yourself with this question.

With the default rates, what does this return?

```ts
convertToBdt("10", "GBP", DEFAULT_EXCHANGE_RATES);
```

- `"14.00"`
- `"1250.00"`
- `"1750.00"`
- `null`

<details>
<summary>Show answer</summary>

**`"1750.00"`**. 10 GBP × 1.40 = 14 USD, and 14 USD × 125 = 1,750 BDT.

</details>

---

[❮ Plan](../proposal-conversion-plan.md) | Next: Phase 2 Proposal Form ❯
