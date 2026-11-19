# Phase 3: Home and Summary

[❮ Phase 2 Proposal Form](phase-2-proposal-form.md) | [Phase 4 Settings, Roles and Branding ❯](phase-4-settings-roles-branding.md)

---

## Phase 3 Summary

Phase 3 rebuilds the two list pages:

- **Home** lists proposals, with a year filter and the admin **Revoke Access** column
- **Summary** shows **every** proposal field, plus a count and BDT total for **Current**, **Secured** and **Lost**

Both pages now share their year filter and status badge instead of copying the code.

> **Note:** Settings and the document API still use the old names, so `npm run build` still fails. Phases 4 and 5 fix them. Home and Summary type-check and lint clean.

### What Changed

| Action    | Files                                                                         |
| --------- | ----------------------------------------------------------------------------- |
| Rewritten | `app/(pages)/home/page.tsx`, `home/TableBody.tsx`, `home/actions.ts`          |
| Rewritten | `app/(pages)/summary/page.tsx`, `summary/TableBody.tsx`                       |
| New       | `lib/drizzle/proposal-summary.ts`, `lib/drizzle/proposal-summary.test.ts`     |
| New       | `components/view/year-select.tsx`, `components/view/project-status-badge.tsx` |
| Docs      | `AGENTS.md` file tree, this report, link from the Phase 2 report              |

---

## 1. Shared Helpers

**File:** `lib/drizzle/proposal-summary.ts` (new)

Home and Summary both filter by year. Before, each page had its **own copy** of that code. Now both call the same functions.

### The Year List

```ts
// The year filter offers every year from the first one up to the current year.
export const FIRST_PROPOSAL_YEAR = 2024;

export function selectableYears(currentYear: number): number[] {
  return Array.from(
    { length: Math.max(currentYear - FIRST_PROPOSAL_YEAR + 1, 1) },
    (_, index) => FIRST_PROPOSAL_YEAR + index,
  );
```

```ts
selectableYears(2026); // [2024, 2025, 2026]
```

`Math.max(..., 1)` makes sure there is always at least one year, even if the clock is wrong.

> **Note:** The list still starts at **2024**, the same as the order app. Proposals start in 2026, so 2024 and 2025 will be empty unless older proposals are added. Changing `FIRST_PROPOSAL_YEAR` changes both pages.

### The Year Filter

```ts
// "all" keeps every row; a year keeps rows whose reference starts with that year.
export function proposalsInYear<T extends Pick<Proposal, "referenceNumber">>(
  rows: T[],
  year: string,
): T[] {
  if (year === "all") return rows;
  const prefix = referenceYearPrefix(year);
  return rows.filter((row) => row.referenceNumber.startsWith(prefix));
```

### Before

Both order tables typed the prefix by hand:

```ts
orders.filter((order) =>
  order.felixOrderRef.startsWith(`FCL/FPO/${selectedYear}/`),
);
```

### After

The prefix comes from `referenceYearPrefix()` (Phase 1), so it can never disagree with the real reference format.

`<T extends Pick<Proposal, "referenceNumber">>` is a **generic**. It means "any list of objects that have a `referenceNumber`". The function gives back the same kind of objects it was given.

### Status Totals

```ts
export type StatusTotal = {
  status: ProjectStatus | "All";
  count: number;
  totalBdt: string;
};

// One entry per status, then a grand total. Blank values add nothing.
export function statusTotals(
  rows: Pick<Proposal, "projectStatus" | "valueBdt">[],
): StatusTotal[] {
  const byStatus = projectStatuses.map((status) => {
    const matching = rows.filter((row) => row.projectStatus === status);
    return {
      status,
      count: matching.length,
      totalBdt: sumMoneyAmounts(matching.map((row) => row.valueBdt)),
    };
  });
  return [
    ...byStatus,
    {
      status: "All",
      count: rows.length,
      totalBdt: sumMoneyAmounts(rows.map((row) => row.valueBdt)),
    },
  ];
```

| Step | What happens                                                           |
| ---- | ---------------------------------------------------------------------- |
| 1    | For each status (Current, Secured, Lost), keep the matching rows       |
| 2    | Count them                                                             |
| 3    | Add their `valueBdt` with `sumMoneyAmounts()` (exact cents, no floats) |
| 4    | Add an **All** entry for the grand total                               |

Proposals with no value count towards the number but add `0.00` to the total.

### Example

```ts
statusTotals(rows);
// [
//   { status: "Current", count: 2, totalBdt: "12500.00" },
//   { status: "Secured", count: 0, totalBdt: "0.00" },
//   { status: "Lost",    count: 1, totalBdt: "0.10" },
//   { status: "All",     count: 3, totalBdt: "12500.10" },
// ]
```

> **Note:** This file only does maths on data it is given. It never touches the database, so it is safe to use in the browser.

<details>
<summary>Full code: proposal-summary.ts</summary>

```ts
// Browser-safe helpers shared by the Home and Summary tables.
import type { Proposal } from "./schema";
import { referenceYearPrefix } from "./proposal-reference";
import { projectStatuses, type ProjectStatus } from "./project-status";
import { sumMoneyAmounts } from "../format-money";

// The year filter offers every year from the first one up to the current year.
export const FIRST_PROPOSAL_YEAR = 2024;

export function selectableYears(currentYear: number): number[] {
  return Array.from(
    { length: Math.max(currentYear - FIRST_PROPOSAL_YEAR + 1, 1) },
    (_, index) => FIRST_PROPOSAL_YEAR + index,
  );
}

// "all" keeps every row; a year keeps rows whose reference starts with that year.
export function proposalsInYear<T extends Pick<Proposal, "referenceNumber">>(
  rows: T[],
  year: string,
): T[] {
  if (year === "all") return rows;
  const prefix = referenceYearPrefix(year);
  return rows.filter((row) => row.referenceNumber.startsWith(prefix));
}

export type StatusTotal = {
  status: ProjectStatus | "All";
  count: number;
  totalBdt: string;
};

// One entry per status, then a grand total. Blank values add nothing.
export function statusTotals(
  rows: Pick<Proposal, "projectStatus" | "valueBdt">[],
): StatusTotal[] {
  const byStatus = projectStatuses.map((status) => {
    const matching = rows.filter((row) => row.projectStatus === status);
    return {
      status,
      count: matching.length,
      totalBdt: sumMoneyAmounts(matching.map((row) => row.valueBdt)),
    };
  });
  return [
    ...byStatus,
    {
      status: "All",
      count: rows.length,
      totalBdt: sumMoneyAmounts(rows.map((row) => row.valueBdt)),
    },
  ];
}
```

</details>

---

## 2. Shared Components

### YearSelect

**File:** `components/view/year-select.tsx` (new)

The two order tables each had the **same 30-line dropdown**. It is now one component:

```tsx
export default function YearSelect({
  value,
  years,
  onChange,
  className,
}: {
  value: string;
  years: number[];
  onChange: (year: string) => void;
  className?: string;
}) {
  return (
    <Select
      value={value}
      items={[
        { value: "all", label: "All Years" },
        ...years.map((year) => ({ value: String(year), label: String(year) })),
      ]}
      onValueChange={(year) => {
        if (year !== null) onChange(year);
      }}
    >
      <SelectTrigger
        className={cn("w-45 bg-white", className)}
        aria-label="Select year"
      >
        <SelectValue placeholder="Select year" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Years</SelectItem>
        {years.map((year) => (
          <SelectItem key={year} value={String(year)}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
```

Using it takes three lines:

```tsx
<YearSelect
  value={selectedYear}
  years={selectableYears(currentYear)}
  onChange={setSelectedYear}
/>
```

The `className` prop lets Summary add `shrink-0` without changing Home.

### ProjectStatusBadge

**File:** `components/view/project-status-badge.tsx` (new)

```tsx
import type { ProjectStatus } from "@/lib/drizzle/project-status";
import { cn } from "@/lib/utils";

// Colour-coded so statuses are easy to scan in a long table.
const statusStyling: Record<ProjectStatus, string> = {
  Current: "border-primary/30 bg-primary/10 text-primary",
  Secured: "border-emerald-300 bg-emerald-50 text-emerald-800",
  Lost: "border-red-300 bg-red-50 text-red-800",
};

export default function ProjectStatusBadge({
  status,
}: {
  status: ProjectStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold",
        statusStyling[status],
      )}
    >
      {status}
    </span>
  );
}
```

| Status  | Colour                     |
| ------- | -------------------------- |
| Current | The app's blue (`primary`) |
| Secured | Green                      |
| Lost    | Red                        |

`Record<ProjectStatus, string>` makes TypeScript check that **every** status has a colour. If a fourth status were added in Phase 1's list, this file would fail to compile until it got one.

---

## 3. The Home Page

**File:** `app/(pages)/home/page.tsx`

### Before

The order page loaded every user and looped to find the signed-in one, then loaded the orders **afterwards**.

### After

```tsx
const user = await requireUser();
const [[profile], proposalRows] = await Promise.all([
  user.email
    ? db
        .select({ name: users.name, status: users.status })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)
    : Promise.resolve([]),
  db.select().from(proposals).orderBy(asc(proposals.sl)),
]);
const role = profile?.status ?? "";
```

- One user is looked up by email, like the Phase 2 pages
- The profile and the proposals load **at the same time** with `Promise.all`

The button now reads **CREATE NEW PROPOSAL** and links to `/proposal_form`:

```tsx
{
  canEditProposal(role, true) && (
    <Link
      href="/proposal_form"
      className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-bold tracking-wide text-white uppercase shadow-sm transition-colors hover:bg-primary/90"
    >
      <Plus className="h-4.5 w-4.5" strokeWidth={2.5} />
      CREATE NEW PROPOSAL
    </Link>
  );
}
```

### The Current Year

```tsx
          currentYear={Number(currentProposalDate().slice(0, 4))}
```

The order page used `new Date().getFullYear()`, which uses the **server's** time zone. References use **Bangladesh** time. Between midnight in Dhaka and midnight on the server, the page could open on the wrong year. Now both use `currentProposalDate()`.

<details>
<summary>Full code: home/page.tsx</summary>

```tsx
import Navbar from "@/components/view/navbar/navbar";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import { proposals, users } from "@/lib/drizzle/schema";
import { asc, eq } from "drizzle-orm";
import TableBody from "./TableBody";
import { Manrope } from "next/font/google";
import Link from "next/link";
import { Plus } from "lucide-react";
import { canEditProposal } from "@/lib/drizzle/proposal-access";
import { currentProposalDate } from "@/lib/drizzle/proposal-date";

export const metadata = { title: "Home" };

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Loads the signed-in profile and proposals; the client table handles filtering.
export default async function Home() {
  const user = await requireUser();
  const [[profile], proposalRows] = await Promise.all([
    user.email
      ? db
          .select({ name: users.name, status: users.status })
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1)
      : Promise.resolve([]),
    db.select().from(proposals).orderBy(asc(proposals.sl)),
  ]);
  const role = profile?.status ?? "";

  return (
    <div className={`flex min-h-screen flex-col bg-muted ${manrope.className}`}>
      {/* Navbar */}
      <Navbar />

      {/* Content  */}
      <div className="mx-auto w-full max-w-[1600px] flex-1 px-6 pt-4 pb-6 md:px-10 md:pb-10">
        {/* header */}
        <div className="mb-4 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-left text-[18px] font-normal tracking-wide text-black uppercase">
              HELLO{" "}
              <span className="font-extrabold">
                {profile?.name?.trim() || "USER"}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {canEditProposal(role, true) && (
              <Link
                href="/proposal_form"
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-bold tracking-wide text-white uppercase shadow-sm transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4.5 w-4.5" strokeWidth={2.5} />
                CREATE NEW PROPOSAL
              </Link>
            )}
          </div>
        </div>

        {/* Table*/}
        <TableBody
          proposals={proposalRows}
          role={role}
          currentYear={Number(currentProposalDate().slice(0, 4))}
        />
      </div>
    </div>
  );
}
```

</details>

---

## 4. The Home Table

**File:** `app/(pages)/home/TableBody.tsx`

### Columns

| Before (orders)       | After (proposals)       |
| --------------------- | ----------------------- |
| SL                    | SL                      |
| CREATED BY            | CREATED BY              |
| ORDER NO.             | **REFERENCE NO.**       |
| —                     | **DATE CREATED**        |
| —                     | **LAST EDITED**         |
| CLIENT ORDER VALUE    | Replaced by VALUE (BDT) |
| PROJECT NAME          | PROJECT NAME            |
| CLIENT NAME           | CLIENT NAME             |
| END USER              | Summary only            |
| —                     | **STATUS**              |
| —                     | **VALUE (BDT)**         |
| REVOKE ACCESS (admin) | REVOKE ACCESS (admin)   |
| VIEW                  | VIEW                    |

The new cells:

```tsx
                  <td className={clsx(cellStyling, "tabular-nums")}>
                    {formatProposalDate(e.createdDate)}
                  </td>
                  <td className={clsx(cellStyling, "tabular-nums")}>
                    {e.lastEditedAt
                      ? formatProposalEditDate(e.lastEditedAt)
                      : "—"}
                  </td>
                  <td className={cellStyling}>{e.projectName}</td>
                  <td className={cellStyling}>{e.clientName}</td>
                  <td className={cellStyling}>
                    <ProjectStatusBadge status={e.projectStatus} />
                  </td>
                  <td className={clsx(cellStyling, "text-left tabular-nums")}>
                    {formatMoney(e.valueBdt)}
```

`tabular-nums` makes every digit the same width, so dates and amounts line up in a column.

### Filtering

```tsx
// Derive rows from fresh server props so access changes survive year filtering.
const visibleProposals = proposalsInYear(proposals, selectedYear);
```

### Before

```tsx
const orderArray =
  selectedYear === "all"
    ? orders
    : orders.filter((order) =>
        order.felixOrderRef.startsWith(`FCL/FPO/${selectedYear}/`),
      );
```

### Admin Check

```tsx
const isAdmin = role === "admin";
```

The order table compared `adminStatus === "admin"` in four places. It is now worked out **once**. The empty `<></>` branches it used are gone too:

```tsx
// Before
{
  adminStatus === "admin" ? (
    <th className={headerStyling}>REVOKE ACCESS</th>
  ) : (
    <></>
  );
}

// After
{
  isAdmin && <th className={headerStyling}>REVOKE ACCESS</th>;
}
```

### Empty State (new)

```tsx
{
  visibleProposals.length === 0 && (
    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
      No proposals for this year yet.
    </p>
  );
}
```

The order table showed only the headers when a year had no rows. Now it says so.

### Revoking Access

The logic is the same as the order app. Names changed:

| Before                                 | After                                    |
| -------------------------------------- | ---------------------------------------- |
| `order.orderManagerAccess`             | `proposal.proposalManagerAccess`         |
| `orderId`                              | `proposalId`                             |
| `saveOrderManagerAccess()`             | `saveProposalManagerAccess()`            |
| `Revoke access for ${e.felixOrderRef}` | `Revoke access for ${e.referenceNumber}` |

<details>
<summary>Full code: home/TableBody.tsx</summary>

```tsx
"use client";

import { useTransientMessage } from "@/lib/use-transient-message";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/format-money";
import type { Proposal } from "@/lib/drizzle/schema";
import { clsx } from "clsx";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import YearSelect from "@/components/view/year-select";
import ProjectStatusBadge from "@/components/view/project-status-badge";
import {
  proposalsInYear,
  selectableYears,
} from "@/lib/drizzle/proposal-summary";
import {
  formatProposalDate,
  formatProposalEditDate,
} from "@/lib/drizzle/proposal-date";
import { saveProposalManagerAccess } from "./actions";

export default function TableBody({
  proposals,
  currentYear,
  role,
}: {
  proposals: Proposal[];
  currentYear: number;
  role: string;
}) {
  // Track the selected year and editing-access changes that have not been saved.
  const router = useRouter();
  const isAdmin = role === "admin";
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [isSavingAccess, startAccessTransition] = useTransition();
  const [accessMessage, setAccessMessage] = useTransientMessage();
  const [accessError, setAccessError] = useState(false);
  const [pendingAccess, setPendingAccess] = useState<Record<number, boolean>>(
    {},
  );
  const accessChanges = Object.entries(pendingAccess).map(
    ([proposalId, access]) => ({
      proposalId: Number(proposalId),
      access,
    }),
  );

  // Derive rows from fresh server props so access changes survive year filtering.
  const visibleProposals = proposalsInYear(proposals, selectedYear);

  // Only keep changes that differ from the saved proposal settings.
  function changeAccess(proposal: Proposal, revoked: boolean) {
    setAccessMessage("");
    setPendingAccess((current) => {
      const next = { ...current };
      const access = !revoked;
      if (access === proposal.proposalManagerAccess) delete next[proposal.sl];
      else next[proposal.sl] = access;
      return next;
    });
  }

  // Send the pending batch to the admin-only server action.
  function saveAccess() {
    if (!isAdmin || !accessChanges.length || isSavingAccess) return;
    setAccessMessage("");
    setAccessError(false);
    startAccessTransition(async () => {
      try {
        const result = await saveProposalManagerAccess(accessChanges);
        setAccessMessage(result.message);
        setAccessError(!result.ok);
        if (result.ok) {
          setPendingAccess({});
          router.refresh();
        }
      } catch {
        setAccessMessage("Could not save editing access. Please try again.");
        setAccessError(true);
      }
    });
  }

  const headerStyling = clsx(
    "px-4 py-4 text-left text-[13px] font-bold text-black uppercase whitespace-nowrap bg-white border-b border-r border-gray-200 sticky top-0 z-10",
  );

  const cellStyling = clsx(
    "px-4 py-3 text-left text-sm text-black whitespace-nowrap border-b border-r border-gray-200 group-hover:bg-gray-50 transition-colors",
  );

  // Render the filtered proposals, access controls and year selector.
  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className={headerStyling}>SL</th>
                <th className={headerStyling}>CREATED BY</th>
                <th className={headerStyling}>REFERENCE NO.</th>
                <th className={headerStyling}>DATE CREATED</th>
                <th className={headerStyling}>LAST EDITED</th>
                <th className={headerStyling}>PROJECT NAME</th>
                <th className={headerStyling}>CLIENT NAME</th>
                <th className={headerStyling}>STATUS</th>
                <th className={headerStyling}>VALUE (BDT)</th>
                {isAdmin && <th className={headerStyling}>REVOKE ACCESS</th>}
                <th className={headerStyling}></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {visibleProposals.map((e, key) => (
                <tr className="group hover:bg-gray-50" key={e.sl}>
                  <td className={cellStyling}>{key + 1}</td>
                  <td className={cellStyling}>
                    <span className="font-extrabold text-black">
                      {e.createdBy}
                    </span>
                  </td>
                  <td className={`${cellStyling} font-bold text-black`}>
                    {e.referenceNumber}
                  </td>
                  <td className={clsx(cellStyling, "tabular-nums")}>
                    {formatProposalDate(e.createdDate)}
                  </td>
                  <td className={clsx(cellStyling, "tabular-nums")}>
                    {e.lastEditedAt
                      ? formatProposalEditDate(e.lastEditedAt)
                      : "—"}
                  </td>
                  <td className={cellStyling}>{e.projectName}</td>
                  <td className={cellStyling}>{e.clientName}</td>
                  <td className={cellStyling}>
                    <ProjectStatusBadge status={e.projectStatus} />
                  </td>
                  <td className={clsx(cellStyling, "text-left tabular-nums")}>
                    {formatMoney(e.valueBdt)}
                  </td>
                  {isAdmin && (
                    <td className={cellStyling}>
                      <Checkbox
                        checked={
                          !(pendingAccess[e.sl] ?? e.proposalManagerAccess)
                        }
                        disabled={isSavingAccess}
                        aria-label={`Revoke access for ${e.referenceNumber}`}
                        onCheckedChange={(checked) => changeAccess(e, checked)}
                      />
                    </td>
                  )}
                  <td className={`${cellStyling} pr-6 text-left`}>
                    <Link
                      href={`/proposal_form/${e.sl}`}
                      className="inline-block rounded-lg bg-primary px-6 py-2 text-[13px] font-bold tracking-wide text-white uppercase transition-colors hover:bg-primary/90"
                    >
                      VIEW
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleProposals.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No proposals for this year yet.
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 pt-4">
        {/* Filter the original list so switching years restores the matching proposals. */}
        <YearSelect
          value={selectedYear}
          years={selectableYears(currentYear)}
          onChange={setSelectedYear}
        />
        {isAdmin && (
          <Button
            type="button"
            className="ml-auto"
            onClick={saveAccess}
            disabled={isSavingAccess || !accessChanges.length}
          >
            {isSavingAccess ? "Saving…" : "Save Access"}
          </Button>
        )}
      </div>
      {accessMessage && (
        <p role={accessError ? "alert" : "status"} className="pt-3 text-sm">
          {accessMessage}
        </p>
      )}
    </>
  );
}
```

</details>

---

## 5. The Access Action

**File:** `app/(pages)/home/actions.ts`

This Server Action saves the **Revoke Access** checkboxes. Only admins can use it.

```ts
await db.transaction(async (transaction) => {
  const accessCases = changes.map(
    (change) =>
      sql`when ${proposals.sl} = ${change.proposalId} then ${change.access}::boolean`,
  );
  const updated = await transaction
    .update(proposals)
    .set({
      proposalManagerAccess: sql`case ${sql.join(accessCases, sql` `)} else ${proposals.proposalManagerAccess} end`,
    })
    .where(
      inArray(
        proposals.sl,
        changes.map((change) => change.proposalId),
      ),
    )
    .returning({ sl: proposals.sl });
  if (updated.length !== changes.length) transaction.rollback();
});
```

### How It Works

1. One `UPDATE` changes **all** the ticked proposals at once
2. `case when sl = 12 then false when sl = 15 then true ... end` picks each row's new value
3. `.returning()` lists the rows that were actually changed
4. If any proposal is missing, `rollback()` cancels **every** change in the batch

Only names changed from the order version:

| Before                                         | After                                                          |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `data`, `data.sl`, `data.orderManagerAccess`   | `proposals`, `proposals.sl`, `proposals.proposalManagerAccess` |
| `changes: { orderId, access }[]`               | `changes: { proposalId, access }[]`                            |
| ``revalidatePath(`/order_form/${orderId}`)``   | ``revalidatePath(`/proposal_form/${proposalId}`)``             |
| "Only admins can change order editing access." | "Only admins can change proposal editing access."              |

> **Note:** AGENTS.md described this file as able to "delete/bulk-manage orders". It never deleted anything; the description now says what it does.

<details>
<summary>Full code: home/actions.ts</summary>

```ts
"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import { proposals, users } from "@/lib/drizzle/schema";

// Checks admin permission, validates the batch and saves proposal editing access.
export async function saveProposalManagerAccess(
  changes: { proposalId: number; access: boolean }[],
) {
  const user = await requireUser();
  const [profile] = user.email
    ? await db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)
    : [];

  if (profile?.status !== "admin") {
    return {
      ok: false,
      message: "Only admins can change proposal editing access.",
    };
  }
  if (
    !Array.isArray(changes) ||
    !changes.length ||
    changes.some(
      (change) =>
        !change ||
        !Number.isInteger(change.proposalId) ||
        change.proposalId < 1 ||
        change.proposalId > 2147483647 ||
        typeof change.access !== "boolean",
    ) ||
    new Set(changes.map((change) => change.proposalId)).size !== changes.length
  ) {
    return { ok: false, message: "Invalid proposal access changes." };
  }

  try {
    // Save the entire batch together; missing proposals roll back every change.
    await db.transaction(async (transaction) => {
      const accessCases = changes.map(
        (change) =>
          sql`when ${proposals.sl} = ${change.proposalId} then ${change.access}::boolean`,
      );
      const updated = await transaction
        .update(proposals)
        .set({
          proposalManagerAccess: sql`case ${sql.join(accessCases, sql` `)} else ${proposals.proposalManagerAccess} end`,
        })
        .where(
          inArray(
            proposals.sl,
            changes.map((change) => change.proposalId),
          ),
        )
        .returning({ sl: proposals.sl });
      if (updated.length !== changes.length) transaction.rollback();
    });

    revalidatePath("/home");
    revalidatePath("/summary");
    for (const { proposalId } of changes)
      revalidatePath(`/proposal_form/${proposalId}`);
    return {
      ok: true,
      message: "Proposal editing access saved.",
    };
  } catch (error) {
    console.error("Unable to change proposal access", error);
    return {
      ok: false,
      message: "Could not save editing access. Please refresh and try again.",
    };
  }
}
```

</details>

---

## 6. The Summary Page

**File:** `app/(pages)/summary/page.tsx`

```tsx
export default async function Summary() {
  await requireUser();
  const proposalRows = await db
    .select()
    .from(proposals)
    .orderBy(asc(proposals.sl));
```

The order page also loaded the **supplier catalog**, to decide which supplier columns to show. Proposals have no suppliers, so that query is gone.

The heading changed:

| Before                                                               | After                                                            |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Order Workspace                                                      | Proposal Workspace                                               |
| Comprehensive overview of all engineering orders and supplier costs. | Comprehensive overview of all proposals, their status and value. |

<details>
<summary>Full code: summary/page.tsx</summary>

```tsx
import Navbar from "@/components/view/navbar/navbar";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import { proposals } from "@/lib/drizzle/schema";
import { asc } from "drizzle-orm";
import { currentProposalDate } from "@/lib/drizzle/proposal-date";
import TableBody from "./TableBody";
import { Sora, Manrope } from "next/font/google";
export const metadata = { title: "Proposal Summary" };

const sora = Sora({
  subsets: ["latin"],
  weight: ["600"],
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Fetch every proposal after checking the session; the table filters by year.
export default async function Summary() {
  await requireUser();
  const proposalRows = await db
    .select()
    .from(proposals)
    .orderBy(asc(proposals.sl));
  return (
    <div
      className={`flex h-dvh min-h-0 flex-col overflow-hidden bg-muted [&>nav]:shrink-0 ${manrope.className}`}
    >
      {/* Navbar */}
      <Navbar />
      {/* Main */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-6 md:p-10">
        <TableBody
          proposals={proposalRows}
          currentYear={Number(currentProposalDate().slice(0, 4))}
          heading={
            <div>
              <h1
                className={`py-1 pr-4 text-[32px] text-black ${sora.className}`}
              >
                Proposal Workspace
              </h1>
              <p className="mt-1 text-[15px] font-medium text-black">
                Comprehensive overview of all proposals, their status and value.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
```

</details>

---

## 7. The Summary Table

**File:** `app/(pages)/summary/TableBody.tsx`

### Before

The order summary built columns **at runtime**: one per supplier that had a value, one per custom supplier, and one per expense type. It needed four helper modules to do this.

### After

Proposals always have the same fields, so the columns are a fixed list:

```tsx
// Every column in the summary, in order. Each reads one value from a proposal.
const columns: {
  heading: string;
  cell: (proposal: Proposal) => ReactNode;
  numeric?: boolean;
}[] = [
  { heading: "CREATED BY", cell: (p) => <strong>{p.createdBy}</strong> },
  {
    heading: "REFERENCE NO.",
    cell: (p) => <strong>{p.referenceNumber}</strong>,
  },
  {
    heading: "DATE CREATED",
    cell: (p) => formatProposalDate(p.createdDate),
    numeric: true,
  },
  { heading: "LAST EDITED BY", cell: (p) => p.lastEditedBy ?? "—" },
  {
    heading: "LAST EDITED AT",
    cell: (p) =>
      p.lastEditedAt ? formatProposalEditDate(p.lastEditedAt) : "—",
    numeric: true,
  },
  { heading: "PROJECT NAME", cell: (p) => p.projectName },
  { heading: "CLIENT NAME", cell: (p) => p.clientName },
  { heading: "END USER", cell: (p) => p.endUser },
  { heading: "CONSULTANT", cell: (p) => p.consultant },
  { heading: "SYSTEM", cell: (p) => p.system },
  {
    heading: "VALUE",
    cell: (p) => formatMoney(p.valueOriginal),
    numeric: true,
  },
  { heading: "CURRENCY", cell: (p) => p.valueCurrency },
  {
    heading: "VALUE (BDT)",
    cell: (p) => formatMoney(p.valueBdt),
    numeric: true,
  },
  {
    heading: "STATUS",
    cell: (p) => <ProjectStatusBadge status={p.projectStatus} />,
  },
  {
    heading: "FINALIZATION DATE",
    cell: (p) =>
      p.finalizationDate ? formatProposalDate(p.finalizationDate) : "",
    numeric: true,
  },
  { heading: "PROPOSAL NOTES", cell: (p) => p.proposalNotes },
  { heading: "USD TO BDT", cell: (p) => p.usdToBdtRate, numeric: true },
  { heading: "SGD TO BDT", cell: (p) => p.sgdToBdtRate, numeric: true },
  { heading: "EURO TO BDT", cell: (p) => p.eurToBdtRate, numeric: true },
  { heading: "GBP TO BDT", cell: (p) => p.gbpToBdtRate, numeric: true },
];
```

Each column is an object with:

| Key       | Meaning                                                     |
| --------- | ----------------------------------------------------------- |
| `heading` | The text in the table header                                |
| `cell`    | A function that takes one proposal and returns what to show |
| `numeric` | `true` lines digits up with `tabular-nums`                  |

### The Columns

SL, Created By, Reference No., Date Created, Last Edited By, Last Edited At, Project Name, Client Name, End User, Consultant, System, Value, Currency, Value (BDT), Status, Finalization Date, Proposal Notes, and the four rates.

That is **every** column in the `proposals` table except `proposalManagerAccess`, which is on Home. (`sl` is shown as the row number.)

### Drawing the Table

The header and each row loop over the **same** list, so they can never get out of step:

```tsx
                <tr>
                  <th className={headerStyling}>SL</th>
                  {columns.map((column) => (
                    <th className={headerStyling} key={column.heading}>
                      {column.heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {visibleProposals.map((proposal, index) => (
                  <tr className="group hover:bg-gray-50" key={proposal.sl}>
                    <td className={cellStyling}>{index + 1}</td>
                    {columns.map((column) => (
                      <td
                        key={column.heading}
                        className={clsx(
                          cellStyling,
                          column.numeric && "tabular-nums",
                        )}
                      >
                        {column.cell(proposal)}
                      </td>
                    ))}
                  </tr>
                ))}
```

To add a column later, add **one** object to `columns`. Nothing else changes.

### Status Totals

```tsx
const [selectedYear, setSelectedYear] = useState(String(currentYear));
const visibleProposals = proposalsInYear(proposals, selectedYear);
const totals = statusTotals(visibleProposals);
```

```tsx
{
  totals.map(({ status, count, totalBdt }) => (
    <div key={status} className="flex shrink-0 items-center gap-2 px-4">
      <span className="font-semibold">
        {status === "All" ? "Total" : status}
      </span>
      <span className="text-muted-foreground">({count})</span>
      <span className="tabular-nums">{formatMoney(totalBdt)} BDT</span>
    </div>
  ));
}
```

The bar at the bottom of the page shows:

```text
Current (2) 12,500.00 BDT | Secured (0) 0.00 BDT | Lost (1) 0.10 BDT | Total (3) 12,500.10 BDT
```

It replaces the order app's **supplier totals in USD**. It follows the year filter, so picking 2025 shows 2025's totals.

### Removed

| Removed                                                      | Why                                 |
| ------------------------------------------------------------ | ----------------------------------- |
| `supplierColumns`, `visibleSuppliers`, `additionalSuppliers` | Supplier columns                    |
| `expenseColumns`, `expenseUsdByName`                         | Expense columns                     |
| `customSupplierColumns`, `customSupplierUsdByName`           | Custom supplier columns             |
| `supplierSuggestions` prop                                   | Only used to order supplier columns |
| Payment Mode, Order Handled By, Payment Notes, fee columns   | Not proposal fields                 |

<details>
<summary>Full code: summary/TableBody.tsx</summary>

```tsx
"use client";

import { formatMoney } from "@/lib/format-money";
import type { Proposal } from "@/lib/drizzle/schema";
import { clsx } from "clsx";
import { useState, type ReactNode } from "react";
import YearSelect from "@/components/view/year-select";
import ProjectStatusBadge from "@/components/view/project-status-badge";
import {
  proposalsInYear,
  selectableYears,
  statusTotals,
} from "@/lib/drizzle/proposal-summary";
import {
  formatProposalDate,
  formatProposalEditDate,
} from "@/lib/drizzle/proposal-date";

// Every column in the summary, in order. Each reads one value from a proposal.
const columns: {
  heading: string;
  cell: (proposal: Proposal) => ReactNode;
  numeric?: boolean;
}[] = [
  { heading: "CREATED BY", cell: (p) => <strong>{p.createdBy}</strong> },
  {
    heading: "REFERENCE NO.",
    cell: (p) => <strong>{p.referenceNumber}</strong>,
  },
  {
    heading: "DATE CREATED",
    cell: (p) => formatProposalDate(p.createdDate),
    numeric: true,
  },
  { heading: "LAST EDITED BY", cell: (p) => p.lastEditedBy ?? "—" },
  {
    heading: "LAST EDITED AT",
    cell: (p) =>
      p.lastEditedAt ? formatProposalEditDate(p.lastEditedAt) : "—",
    numeric: true,
  },
  { heading: "PROJECT NAME", cell: (p) => p.projectName },
  { heading: "CLIENT NAME", cell: (p) => p.clientName },
  { heading: "END USER", cell: (p) => p.endUser },
  { heading: "CONSULTANT", cell: (p) => p.consultant },
  { heading: "SYSTEM", cell: (p) => p.system },
  {
    heading: "VALUE",
    cell: (p) => formatMoney(p.valueOriginal),
    numeric: true,
  },
  { heading: "CURRENCY", cell: (p) => p.valueCurrency },
  {
    heading: "VALUE (BDT)",
    cell: (p) => formatMoney(p.valueBdt),
    numeric: true,
  },
  {
    heading: "STATUS",
    cell: (p) => <ProjectStatusBadge status={p.projectStatus} />,
  },
  {
    heading: "FINALIZATION DATE",
    cell: (p) =>
      p.finalizationDate ? formatProposalDate(p.finalizationDate) : "",
    numeric: true,
  },
  { heading: "PROPOSAL NOTES", cell: (p) => p.proposalNotes },
  { heading: "USD TO BDT", cell: (p) => p.usdToBdtRate, numeric: true },
  { heading: "SGD TO BDT", cell: (p) => p.sgdToBdtRate, numeric: true },
  { heading: "EURO TO BDT", cell: (p) => p.eurToBdtRate, numeric: true },
  { heading: "GBP TO BDT", cell: (p) => p.gbpToBdtRate, numeric: true },
];

export default function TableBody({
  proposals,
  currentYear,
  heading,
}: {
  proposals: Proposal[];
  currentYear: number;
  heading: ReactNode;
}) {
  // Year filtering drives both the rows and the status totals.
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const visibleProposals = proposalsInYear(proposals, selectedYear);
  const totals = statusTotals(visibleProposals);

  const headerStyling = clsx(
    "px-4 py-4 text-left text-[13px] font-bold text-black uppercase whitespace-nowrap bg-white border-b border-r border-gray-200 sticky top-0 z-10",
  );
  const cellStyling = clsx(
    "px-4 py-3 text-left text-sm text-black whitespace-nowrap border-b border-r border-gray-200 group-hover:bg-gray-50 transition-colors",
  );

  // Render the year selector, scrollable table and compact status totals.
  return (
    <>
      <div className="mb-6 flex shrink-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        {heading}
        {/* Filter the original list so switching years restores the matching proposals. */}
        <YearSelect
          value={selectedYear}
          years={selectableYears(currentYear)}
          onChange={setSelectedYear}
          className="shrink-0"
        />
      </div>
      <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
        <div className="h-1.5 w-full shrink-0 bg-primary" />
        <div>
          <div
            className="summary-table-scroll min-h-0 w-full overflow-x-scroll overflow-y-auto focus-visible:outline-2 focus-visible:outline-ring"
            role="region"
            aria-label="Proposal summary table"
            tabIndex={0}
          >
            <table className="w-full border-collapse text-left">
              <thead className="bg-white">
                <tr>
                  <th className={headerStyling}>SL</th>
                  {columns.map((column) => (
                    <th className={headerStyling} key={column.heading}>
                      {column.heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {visibleProposals.map((proposal, index) => (
                  <tr className="group hover:bg-gray-50" key={proposal.sl}>
                    <td className={cellStyling}>{index + 1}</td>
                    {columns.map((column) => (
                      <td
                        key={column.heading}
                        className={clsx(
                          cellStyling,
                          column.numeric && "tabular-nums",
                        )}
                      >
                        {column.cell(proposal)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleProposals.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No proposals for this year yet.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex min-w-0 shrink-0 items-center gap-4 pt-4">
        <div
          className="h-10 w-max min-w-0 shrink overflow-x-auto overflow-y-hidden rounded-lg border border-input bg-white [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-ring"
          role="region"
          aria-label="Proposal totals in BDT for selected year"
          tabIndex={0}
        >
          <div className="flex h-full w-max items-center divide-x divide-border text-sm whitespace-nowrap">
            {totals.map(({ status, count, totalBdt }) => (
              <div
                key={status}
                className="flex shrink-0 items-center gap-2 px-4"
              >
                <span className="font-semibold">
                  {status === "All" ? "Total" : status}
                </span>
                <span className="text-muted-foreground">({count})</span>
                <span className="tabular-nums">
                  {formatMoney(totalBdt)} BDT
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
```

</details>

---

## 8. Tests

**File:** `lib/drizzle/proposal-summary.test.ts` (new)

| Test                                                         | Proves                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| The year filter keeps only that year's references            | `"all"` keeps everything; `"2026"` drops 2025 rows        |
| Selectable years run from the first year to the current year | Including a clock set before 2024                         |
| Status totals count every proposal and add exact BDT cents   | A blank value counts but adds nothing; `0.10` is not lost |

<details>
<summary>Full test code: proposal-summary.test.ts</summary>

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  proposalsInYear,
  selectableYears,
  statusTotals,
} from "./proposal-summary";

const rows = [
  {
    referenceNumber: "FCL/Quote/2025/001",
    projectStatus: "Secured" as const,
    valueBdt: "1000.00",
  },
  {
    referenceNumber: "FCL/Quote/2026/001",
    projectStatus: "Current" as const,
    valueBdt: "12500.00",
  },
  {
    referenceNumber: "FCL/Quote/2026/002",
    projectStatus: "Current" as const,
    valueBdt: null,
  },
  {
    referenceNumber: "FCL/Quote/2026/003",
    projectStatus: "Lost" as const,
    valueBdt: "0.10",
  },
];

test("the year filter keeps only that year's references", () => {
  assert.equal(proposalsInYear(rows, "all").length, 4);
  assert.deepEqual(
    proposalsInYear(rows, "2026").map((row) => row.referenceNumber),
    ["FCL/Quote/2026/001", "FCL/Quote/2026/002", "FCL/Quote/2026/003"],
  );
  assert.equal(proposalsInYear(rows, "2024").length, 0);
});

test("selectable years run from the first year to the current year", () => {
  assert.deepEqual(selectableYears(2026), [2024, 2025, 2026]);
  assert.deepEqual(selectableYears(2024), [2024]);
  assert.deepEqual(selectableYears(2020), [2024]);
});

test("status totals count every proposal and add exact BDT cents", () => {
  assert.deepEqual(statusTotals(proposalsInYear(rows, "2026")), [
    { status: "Current", count: 2, totalBdt: "12500.00" },
    { status: "Secured", count: 0, totalBdt: "0.00" },
    { status: "Lost", count: 1, totalBdt: "0.10" },
    { status: "All", count: 3, totalBdt: "12500.10" },
  ]);
  assert.deepEqual(statusTotals([]).at(-1), {
    status: "All",
    count: 0,
    totalBdt: "0.00",
  });
});
```

</details>

### Run them yourself

```bash
node --import tsx --test lib/drizzle/*.test.ts lib/document-files.test.ts lib/document-uploads.test.ts lib/documents/storage.test.ts lib/betterAuth/idle-session.test.ts
```

```text
ℹ tests 38
ℹ pass 38
ℹ fail 0
```

---

## 9. Checks

### Type Check

```bash
npx tsc --noEmit -p .
```

No errors in Home, Summary, `components/view/` or `lib/drizzle/`. The remaining errors are in Settings (Phase 4) and the document API (Phase 5).

### Lint

```bash
npx eslint "app/(pages)/home" "app/(pages)/summary" components/view lib/drizzle/proposal-summary.ts
```

No warnings or errors.

> **Note:** These pages have **not** been opened in a browser yet. Signing in needs a user, and the first admin is created after Phase 4 renames the roles.

---

## 10. What Still Points at the Old App

| File                                          | What                                 | Fixed in |
| --------------------------------------------- | ------------------------------------ | -------- |
| `settings/*`                                  | Supplier, customer and expense lists | Phase 4  |
| `settings/actions.ts`                         | `revalidatePath("/order_form")`      | Phase 4  |
| `navbar.tsx`                                  | "Order Workspace" subtitle           | Phase 4  |
| `app/api/orders/*`, `lib/documents/access.ts` | Document routes                      | Phase 5  |

---

## Exercise

Test yourself with this question.

Summary is set to **2026**. These proposals exist:

| Reference          | Status  | Value (BDT) |
| ------------------ | ------- | ----------- |
| FCL/Quote/2025/004 | Secured | 50,000.00   |
| FCL/Quote/2026/001 | Secured | 20,000.00   |
| FCL/Quote/2026/002 | Secured | (blank)     |

What does the **Secured** total show?

- `Secured (3) 70,000.00 BDT`
- `Secured (2) 20,000.00 BDT`
- `Secured (1) 20,000.00 BDT`
- `Secured (2) 70,000.00 BDT`

<details>
<summary>Show answer</summary>

**`Secured (2) 20,000.00 BDT`**. The 2025 proposal is filtered out by the year. Both 2026 proposals count, but the blank one adds nothing to the total.

</details>

---

[❮ Phase 2 Proposal Form](phase-2-proposal-form.md) | [Phase 4 Settings, Roles and Branding ❯](phase-4-settings-roles-branding.md)
