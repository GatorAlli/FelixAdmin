# Phase 2: Proposal Form

[❮ Phase 1 Data and Helpers](phase-1-data-and-helpers.md) | Next: Phase 3 Home and Summary ❯

---

## Phase 2 Summary

Phase 2 builds the **proposal form**: the page where people create, view and edit a proposal.

After this phase:

- The form lives at **`/proposal_form`** (new) and **`/proposal_form/[proposalId]`** (view and edit)
- It has the proposal fields: Project Name, Client Name, End User, Consultant, System, Value, Project Status, Finalization Date and Proposal Notes
- The BDT value updates **as you type**
- A **Value In** selector shows the BDT value in any of the five currencies
- The four exchange rates are all **"1 unit = X BDT"**

> **Note:** Home, Summary, Settings and the document API still use the old names, so `npm run build` still fails. Phases 3–5 fix them. The proposal form itself type-checks and lints clean.

### What Changed

| Action    | Files                                                                                 |
| --------- | ------------------------------------------------------------------------------------- |
| Moved     | `app/(pages)/order_form/` → `app/(pages)/proposal_form/`                              |
| Moved     | `[edit_slug]/page.tsx` → `[proposalId]/page.tsx`                                      |
| Rewritten | `PageBody.tsx` (2,207 → 846 lines), `actions.ts`, `page.tsx`, `[proposalId]/page.tsx` |
| Deleted   | `SupplierDocument.tsx` (251 lines)                                                    |
| Unchanged | `OrderDocuments.tsx`, `DocumentFileInput.tsx` (Phase 5 renames them)                  |
| Docs      | `AGENTS.md` file tree, this report                                                    |

All files are in `app/(pages)/proposal_form/` unless stated otherwise.

---

## 1. The Routes

Next.js turns **folders** into **web addresses**. Renaming a folder changes the address.

| Folder                                    | Address             | Page             |
| ----------------------------------------- | ------------------- | ---------------- |
| `app/(pages)/proposal_form/`              | `/proposal_form`    | New Proposal     |
| `app/(pages)/proposal_form/[proposalId]/` | `/proposal_form/12` | Proposal Details |

The square brackets make `[proposalId]` a **dynamic segment**. Whatever is in the address (`12`) arrives in the page as `params.proposalId`.

> **Note:** The old segment was called `[edit_slug]`. The new name says what the value actually is.

`(pages)` has round brackets, so it is **not** part of the address. It only groups the pages that need a signed-in user.

---

## 2. The New Proposal Page

**File:** `page.tsx`

This page runs on the **server**. It checks who is signed in, then sends the form to the browser.

### Before

The order page loaded **every** user, then looped to find the signed-in one:

```tsx
const userArray = await db.select().from(users);

userArray.forEach((e) => {
  if (e.email === user.email) {
    username = e.name?.trim() ?? "";
    adminStatus = String(e.status);
    return;
  }
});
```

### After

The proposal page asks the database for **one** user, by email:

```tsx
const user = await requireUser();
const [profile] = user.email
  ? await db
      .select({ name: users.name, status: users.status })
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1)
  : [];
const role = profile?.status ?? "";

if (!canEditProposal(role, true)) redirect("/home");
```

| Line                                  | What it does                                             |
| ------------------------------------- | -------------------------------------------------------- |
| `requireUser()`                       | Sends visitors who are not signed in to the sign-in page |
| `.where(eq(users.email, user.email))` | Finds only the signed-in user's profile                  |
| `.limit(1)`                           | Stops after the first match                              |
| `canEditProposal(role, true)`         | Admins and proposal managers may create proposals        |
| `redirect("/home")`                   | Everyone else goes back to Home                          |

Then it loads the Settings suggestions and renders the form:

```tsx
const datalists = await getProposalDatalists();

return (
  <div>
    <PageBody
      {...datalists}
      role={role}
      username={profile?.name?.trim() ?? ""}
      currentDate={currentProposalDate()}
    />
  </div>
);
```

### Renamed Props

| Before                                                             | After                                    | Why                                                              |
| ------------------------------------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------- |
| `isAdmin={adminStatus}`                                            | `role={role}`                            | The value is a role (`admin`, `proposal`, `guest`), not a yes/no |
| `currentOrderDate()`                                               | `currentProposalDate()`                  | Renamed in Phase 1                                               |
| `supplierSuggestions`, `customerSuggestions`, `expenseSuggestions` | `clientSuggestions`, `systemSuggestions` | Come from `getProposalDatalists()`                               |

<details>
<summary>Full code: page.tsx</summary>

```tsx
import { getProposalDatalists } from "@/lib/drizzle/proposal-datalists";
import { currentProposalDate } from "@/lib/drizzle/proposal-date";
import { requireUser } from "@/lib/betterAuth/session";
import PageBody from "./PageBody";
import { db } from "@/lib/drizzle/drizzle-index";
import { users } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { canEditProposal } from "@/lib/drizzle/proposal-access";

export const metadata = { title: "New Proposal" };

// Prepare a new proposal with the current profile, suggestions and Bangladesh date.
export default async function ProposalForm() {
  const user = await requireUser();
  const [profile] = user.email
    ? await db
        .select({ name: users.name, status: users.status })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)
    : [];
  const role = profile?.status ?? "";

  if (!canEditProposal(role, true)) redirect("/home");

  const datalists = await getProposalDatalists();

  return (
    <div>
      <PageBody
        {...datalists}
        role={role}
        username={profile?.name?.trim() ?? ""}
        currentDate={currentProposalDate()}
      />
    </div>
  );
}
```

</details>

---

## 3. The Proposal Details Page

**File:** `[proposalId]/page.tsx`

This page loads one saved proposal.

### Step 1: Check the Address

```tsx
const { proposalId } = await params;
if (
  !/^\d+$/.test(proposalId) ||
  !Number.isSafeInteger(Number(proposalId)) ||
  Number(proposalId) < 1 ||
  Number(proposalId) > 2147483647
)
  notFound();
```

The ID must be **digits only** and fit in a Postgres `integer`. Anything else (like `/proposal_form/abc`) shows the 404 page.

> **Note:** `params` is a **Promise** in this version of Next.js, so it needs `await`.

### Step 2: Load the Proposal

```tsx
const [proposal] = await db
  .select()
  .from(proposals)
  .where(eq(proposals.sl, Number(proposalId)))
  .limit(1);
if (!proposal) notFound();
```

### Step 3: Load Everything Else at Once

```tsx
const [documents, [profile], datalists] = await Promise.all([
  db
    .select({
      id: proposalDocuments.id,
      title: proposalDocuments.title,
      originalName: proposalDocuments.originalName,
      sizeBytes: proposalDocuments.sizeBytes,
    })
    .from(proposalDocuments)
    .where(eq(proposalDocuments.proposalId, proposal.sl))
    .orderBy(proposalDocuments.createdAt),
  user.email
    ? db
        .select({ name: users.name, status: users.status })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)
    : Promise.resolve([]),
  getProposalDatalists(),
]);
```

`Promise.all` runs the three queries **at the same time**. The order page ran them one after another.

| Query             | Before                                    | After                                           |
| ----------------- | ----------------------------------------- | ----------------------------------------------- |
| Documents         | Also selected `supplierRowKey`            | Only `id`, `title`, `originalName`, `sizeBytes` |
| Signed-in profile | Loaded every user and looped              | One user, by email                              |
| Suggestions       | Suppliers, customers, addresses, expenses | Clients and systems                             |

<details>
<summary>Full code: [proposalId]/page.tsx</summary>

```tsx
import { getProposalDatalists } from "@/lib/drizzle/proposal-datalists";
import { currentProposalDate } from "@/lib/drizzle/proposal-date";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import PageBody from "../PageBody";
import { proposals, users, proposalDocuments } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export const metadata = { title: "Proposal Details" };

// Load one saved proposal and its document metadata for the shared form component.
export default async function ProposalDetails({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const user = await requireUser();

  const { proposalId } = await params;
  if (
    !/^\d+$/.test(proposalId) ||
    !Number.isSafeInteger(Number(proposalId)) ||
    Number(proposalId) < 1 ||
    Number(proposalId) > 2147483647
  )
    notFound();

  const [proposal] = await db
    .select()
    .from(proposals)
    .where(eq(proposals.sl, Number(proposalId)))
    .limit(1);
  if (!proposal) notFound();

  const [documents, [profile], datalists] = await Promise.all([
    db
      .select({
        id: proposalDocuments.id,
        title: proposalDocuments.title,
        originalName: proposalDocuments.originalName,
        sizeBytes: proposalDocuments.sizeBytes,
      })
      .from(proposalDocuments)
      .where(eq(proposalDocuments.proposalId, proposal.sl))
      .orderBy(proposalDocuments.createdAt),
    user.email
      ? db
          .select({ name: users.name, status: users.status })
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1)
      : Promise.resolve([]),
    getProposalDatalists(),
  ]);

  return (
    <div>
      <PageBody
        {...datalists}
        proposalDetails={proposal}
        initialDocuments={documents}
        role={profile?.status ?? ""}
        username={profile?.name?.trim() ?? ""}
        currentDate={currentProposalDate()}
      />
    </div>
  );
}
```

</details>

---

## 4. The Server Actions

**File:** `actions.ts`

A **Server Action** is a function marked `"use server"`. The browser calls it like a normal function, but it runs on the server.

### Shared Preparation

Both actions start the same way:

```ts
async function prepareProposal(formData: FormData) {
  const currentUser = await requireUser();
  const [userProfile] = currentUser.email
    ? await db
        .select({ name: users.name, status: users.status })
        .from(users)
        .where(eq(users.email, currentUser.email))
        .limit(1)
    : [];

  if (!canEditProposal(userProfile?.status, true)) {
    return {
      ok: false as const,
      message: "You do not have permission to save proposals.",
    };
  }

  const username = userProfile?.name?.trim();
  if (!username) {
    return {
      ok: false as const,
      message:
        "Your account has no username. Please have your user profile name set before saving.",
    };
  }

  const validatedProposal = readProposalValues(formData, username);
  return { ...validatedProposal, status: userProfile?.status };
```

1. Find the signed-in user's profile
2. Stop if they are not an admin or proposal manager
3. Stop if their profile has no name (it is saved as Created By)
4. Validate the form with `readProposalValues()` from Phase 1

### What Was Removed

The order version also loaded the **supplier catalog** and the order's existing suppliers, so a supplier removed from Settings still passed validation. Proposals have no suppliers, so that code (about 30 lines) is gone.

### createProposal()

```ts
export async function createProposal(formData: FormData) {
  const preparedProposal = await prepareProposal(formData);
  if (!preparedProposal.ok) return preparedProposal;

  // The reference and Bangladesh creation date are assigned only to new proposals.
  const createdDate = currentProposalDate();
```

```ts
    const created = await db.transaction(
      async (transaction) => {
        const referenceNumber = await nextProposalReference(
          transaction,
          createdDate,
        );
        const [row] = await transaction
          .insert(proposals)
          .values({
            ...preparedProposal.values,
            createdDate,
            referenceNumber,
            proposalManagerAccess: true,
          })
          .returning({ id: proposals.sl });

        return { reference: referenceNumber, id: row.id };
      },
      { isolationLevel: "read committed" },
```

The reference is picked and the row is inserted in **one transaction**. The lock from `nextProposalReference()` (Phase 1) means two people saving at once get different numbers.

The reply tells the browser the new ID, so it can open the saved proposal:

```ts
return {
  ok: true,
  message: `Proposal created: ${created.reference}`,
  createdDate,
  proposalId: created.id,
};
```

### updateProposal()

```ts
  const { createdBy: lastEditedBy, ...editableValues } =
    preparedProposal.values;

  try {
    const [updatedProposal] = await db
      .update(proposals)
      .set({ ...editableValues, lastEditedBy, lastEditedAt: sql`now()` })
      .where(
        and(
          eq(proposals.sl, proposalId),
          preparedProposal.status === "admin"
            ? undefined
            : eq(proposals.proposalManagerAccess, true),
        ),
      )
      .returning({ referenceNumber: proposals.referenceNumber });
```

| Code                                                   | Meaning                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `const { createdBy: lastEditedBy, ...editableValues }` | The saver's name becomes **Last Edited By**. Created By never changes             |
| `lastEditedAt: sql\`now()\``                           | The database clock sets the edit time                                             |
| `eq(proposals.sl, proposalId)`                         | Only this proposal                                                                |
| `eq(proposals.proposalManagerAccess, true)`            | Proposal managers can only save if access was not revoked. Admins skip this check |

If no row matches, the proposal does not exist **or** access was revoked:

```ts
message: "Proposal not found or your editing access has been revoked.",
```

### Simpler Than Before

The order version ran a transaction to delete **supplier attachments** whose supplier row was removed, then cleaned up files on disk. Proposals have no supplier rows, so the update is now a single `UPDATE` statement.

<details>
<summary>Full code: actions.ts</summary>

```ts
"use server";

import { and, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import { proposals, users } from "@/lib/drizzle/schema";
import { revalidatePath } from "next/cache";
import { readProposalValues } from "@/lib/drizzle/proposal-values";
import { currentProposalDate } from "@/lib/drizzle/proposal-date";
import { nextProposalReference } from "@/lib/drizzle/next-proposal-reference";
import { canEditProposal } from "@/lib/drizzle/proposal-access";

// Both save actions use the signed-in profile and the same form validation.
async function prepareProposal(formData: FormData) {
  const currentUser = await requireUser();
  const [userProfile] = currentUser.email
    ? await db
        .select({ name: users.name, status: users.status })
        .from(users)
        .where(eq(users.email, currentUser.email))
        .limit(1)
    : [];

  if (!canEditProposal(userProfile?.status, true)) {
    return {
      ok: false as const,
      message: "You do not have permission to save proposals.",
    };
  }

  const username = userProfile?.name?.trim();
  if (!username) {
    return {
      ok: false as const,
      message:
        "Your account has no username. Please have your user profile name set before saving.",
    };
  }

  const validatedProposal = readProposalValues(formData, username);
  return { ...validatedProposal, status: userProfile?.status };
}

export async function createProposal(formData: FormData) {
  const preparedProposal = await prepareProposal(formData);
  if (!preparedProposal.ok) return preparedProposal;

  // The reference and Bangladesh creation date are assigned only to new proposals.
  const createdDate = currentProposalDate();
  try {
    // Allocate the reference and insert together so concurrent saves cannot reuse it.
    const created = await db.transaction(
      async (transaction) => {
        const referenceNumber = await nextProposalReference(
          transaction,
          createdDate,
        );
        const [row] = await transaction
          .insert(proposals)
          .values({
            ...preparedProposal.values,
            createdDate,
            referenceNumber,
            proposalManagerAccess: true,
          })
          .returning({ id: proposals.sl });

        return { reference: referenceNumber, id: row.id };
      },
      { isolationLevel: "read committed" },
    );

    // Refresh the proposal lists after the database write succeeds.
    revalidatePath("/home");
    revalidatePath("/summary");
    return {
      ok: true,
      message: `Proposal created: ${created.reference}`,
      createdDate,
      proposalId: created.id,
    };
  } catch (error) {
    console.error("Unable to create proposal", error);
    return {
      ok: false,
      message: "Could not save the proposal. Please try again.",
    };
  }
}

// Update only the existing row identified by its primary key.
export async function updateProposal(proposalId: number, formData: FormData) {
  // Authentication is checked even when the supplied proposal ID is invalid.
  const preparedProposal = await prepareProposal(formData);
  if (
    !Number.isInteger(proposalId) ||
    proposalId < 1 ||
    proposalId > 2147483647
  ) {
    return { ok: false, message: "Invalid proposal ID." };
  }

  if (!preparedProposal.ok) return preparedProposal;

  // The authenticated saver becomes the editor; the original creator stays unchanged.
  const { createdBy: lastEditedBy, ...editableValues } =
    preparedProposal.values;

  try {
    const [updatedProposal] = await db
      .update(proposals)
      .set({ ...editableValues, lastEditedBy, lastEditedAt: sql`now()` })
      .where(
        and(
          eq(proposals.sl, proposalId),
          preparedProposal.status === "admin"
            ? undefined
            : eq(proposals.proposalManagerAccess, true),
        ),
      )
      .returning({ referenceNumber: proposals.referenceNumber });

    if (!updatedProposal) {
      return {
        ok: false,
        message: "Proposal not found or your editing access has been revoked.",
      };
    }

    revalidatePath("/summary");
    revalidatePath("/home");
    revalidatePath(`/proposal_form/${proposalId}`);
    return {
      ok: true,
      message: `Proposal updated: ${updatedProposal.referenceNumber}`,
    };
  } catch (error) {
    console.error("Unable to update proposal", error);
    return {
      ok: false,
      message: "Could not update the proposal. Please try again.",
    };
  }
}
```

</details>

---

## 5. The Form Component

**File:** `PageBody.tsx`

This is the page people see. It runs in the **browser** (`"use client"`).

### Before and After

| Part                      | Order form                                                        | Proposal form                                           |
| ------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| Lines                     | 2,207                                                             | 846                                                     |
| Top fields                | Order Handled By, Reference Number, Import By                     | (none)                                                  |
| Project section           | System Type, Project Name, Customer Name, End User, Project Notes | Project Name, Client Name, End User, Consultant, System |
| Value section             | Client Order Value, Currency, Payment Mode, Payment Notes         | Value, Currency, Value (BDT)                            |
| Status section            | (none)                                                            | Project Status, Finalization Date                       |
| Notes                     | Project Notes, Payment Notes                                      | Proposal Notes                                          |
| Material / expense tables | Yes                                                               | Removed                                                 |
| Calculation panel         | 8 totals with their own currencies                                | Value (BDT) and Value In                                |
| Settings panel            | 3 rates + 2 handling fees                                         | 4 "→ BDT" rates                                         |
| Supplier attachments      | Yes                                                               | Removed                                                 |

### Small Helpers

Two helpers are new:

```tsx
// "EUR" is shown as "Euro"; every other code is shown as-is.
function currencyLabel(currency: Currency) {
  return currency === "EUR" ? "Euro" : currency;
```

```tsx
// The four rates the form edits, in display order. Each is "1 unit = X BDT".
const rateFields = [
  ["usdToBdtRate", "USD To BDT"],
  ["sgdToBdtRate", "SGD To BDT"],
  ["eurToBdtRate", "Euro To BDT"],
  ["gbpToBdtRate", "GBP To BDT"],
] as const satisfies readonly (readonly [keyof ExchangeRates, string])[];
```

`rateFields` lists the four rate inputs **once**. The Exchange Rates panel loops over it, instead of repeating almost the same 30 lines four times like the order form did.

`satisfies` makes TypeScript check every key is a real `ExchangeRates` key. A typo like `"usdToBtdRate"` is caught before the app runs.

```tsx
// Saved rates come back from Postgres as "125.00"; keep them as two-decimal text.
function ratesFrom(proposal: Proposal): ExchangeRates {
  return {
    usdToBdtRate: proposal.usdToBdtRate,
    sgdToBdtRate: proposal.sgdToBdtRate,
    eurToBdtRate: proposal.eurToBdtRate,
    gbpToBdtRate: proposal.gbpToBdtRate,
  };
```

Repeated class names became constants, so every section looks the same:

```tsx
const sectionStyling =
  "grid grid-cols-1 gap-x-8 gap-y-3 rounded-lg border p-4 @xl:grid-cols-2";
const sectionHeadingStyling =
  "col-span-full text-[1.21em] font-extrabold underline underline-offset-4";
const fieldStyling =
  "flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6";
const readOnlyTextStyling = "min-w-0 whitespace-pre-wrap wrap-break-words";
```

`titleCaseLabel()`, `PaymentModeField`, `systemTypes`, `orderHandlers` and the handling-fee defaults were removed.

### Props

```tsx
export default function PageBody({
  proposalDetails,
  role,
  username,
  currentDate,
  clientSuggestions,
  systemSuggestions,
  initialDocuments = EMPTY_DOCUMENTS,
}: {
  proposalDetails?: Proposal;
  role: string;
  username: string;
  currentDate: string;
  clientSuggestions: string[];
  systemSuggestions: string[];
  initialDocuments?: DocumentSummary[];
}) {
```

### State

Each input keeps its value in **state** until the form is submitted:

```tsx
const [referenceNumber, setReferenceNumber] = useState("");
const [projectName, setProjectName] = useState("");
const [clientName, setClientName] = useState("");
const [endUser, setEndUser] = useState("");
const [consultant, setConsultant] = useState("");
const [system, setSystem] = useState("");
const [value, setValue] = useState("");
const [valueCurrency, setValueCurrency] = useState<Currency>("USD");
const [projectStatus, setProjectStatus] = useState<ProjectStatus>(
  DEFAULT_PROJECT_STATUS,
);
const [finalizationDate, setFinalizationDate] = useState("");
const [proposalNotes, setProposalNotes] = useState("");
const [rates, setRates] = useState<ExchangeRates>({
  ...DEFAULT_EXCHANGE_RATES,
});
// Display-only choice for the side panel; never saved.
const [displayCurrency, setDisplayCurrency] = useState<Currency>("USD");
```

| State             | Starts as         | Notes                                              |
| ----------------- | ----------------- | -------------------------------------------------- |
| `valueCurrency`   | `"USD"`           | Same default as the order form                     |
| `projectStatus`   | `"Current"`       | From `DEFAULT_PROJECT_STATUS`                      |
| `rates`           | The four defaults | One object instead of three separate states        |
| `displayCurrency` | `"USD"`           | Only changes the side panel. It is **never saved** |

The order form had 36 `useState` calls. The proposal form has 13 for its fields.

### Who Can Edit

```tsx
const canEdit = canEditProposal(
  role,
  proposalDetails?.proposalManagerAccess ?? true,
);
const [editingRequested, setIsEditing] = useState(!proposalDetails);
const isEditing = canEdit && editingRequested;
const busy = isSubmitting || documentBusy;
```

- A **new** proposal opens in edit mode
- A **saved** proposal opens read-only, with an **Edit** button if `canEdit` is true
- `busy` is new. It replaces `isSubmitting || documentBusy`, which the order form repeated 14 times

### Detecting Changes

The **Submit** button stays disabled until something changes. The form turns its values into a text "snapshot" and compares it with the saved one:

```tsx
const formSnapshot = JSON.stringify({
  projectName: projectName.trim(),
  clientName: clientName.trim(),
  endUser: endUser.trim(),
  consultant: consultant.trim(),
  system: system.trim(),
  value: normalizeNumber(value),
  valueCurrency: value.trim() ? valueCurrency : null,
  projectStatus,
  finalizationDate,
  proposalNotes: proposalNotes.trim(),
  rates: Object.fromEntries(
    Object.entries(rates).map(([key, rate]) => [key, normalizeNumber(rate)]),
  ),
});
```

- `normalizeNumber()` makes `"125"` and `"125.00"` count as the same rate
- `valueCurrency` only counts when there is a value. Changing the currency of an empty value is not a change
- Picking a file to upload also counts as a change

### Loading a Saved Proposal

```tsx
  if (proposalDetails && proposalDetails !== loadedProposal) {
    setSavedFormSnapshot(null);
    setLoadedProposal(proposalDetails);
    setCreatedDate(proposalDetails.createdDate);
    setReferenceNumber(proposalDetails.referenceNumber);
    // Database nulls become empty strings so the inputs can display them.
    setProjectName(proposalDetails.projectName);
    setClientName(proposalDetails.clientName);
    setEndUser(proposalDetails.endUser ?? "");
    setConsultant(proposalDetails.consultant ?? "");
    setSystem(proposalDetails.system ?? "");
    setValue(proposalDetails.valueOriginal ?? "");
    setValueCurrency(proposalDetails.valueCurrency ?? "USD");
    setProjectStatus(proposalDetails.projectStatus);
    setFinalizationDate(proposalDetails.finalizationDate ?? "");
    setProposalNotes(proposalDetails.proposalNotes ?? "");
    setRates(ratesFrom(proposalDetails));
    setIsEditing(false);
```

This runs **during rendering**, not in an effect. The `loadedProposal` check makes sure it runs **once** per proposal. Without it, each `set...()` would cause another render, forever.

Optional fields that are `null` in the database become `""`, because inputs cannot show `null`.

### The Live BDT Value

```tsx
const valueBdt = value.trim()
  ? convertToBdt(value, valueCurrency, rates)
  : null;
const displayValue =
  valueBdt === null ? null : convertFromBdt(valueBdt, displayCurrency, rates);
```

These are **calculated**, not stored in state. Every time an input changes, React renders again and the numbers update.

| Variable       | Formula (Phase 1)               | Example (100 USD, defaults) |
| -------------- | ------------------------------- | --------------------------- |
| `valueBdt`     | `convertToBdt()`: amount × rate | `"12500.00"`                |
| `displayValue` | `convertFromBdt()`: BDT ÷ rate  | Value In GBP: `"71.43"`     |

> **Note:** The server recalculates `valueBdt` when saving (Phase 1). The browser's number is only a preview.

### Saving

```tsx
  async function submitProposal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges || submissionInProgress.current || documentBusyRef.current)
      return;
    submissionInProgress.current = true;
    setIsSubmitting(true);
    setSubmissionMessage("");
    // The server action validates these fields and recomputes the BDT value.
    const formData = new FormData(event.currentTarget);
    try {
      const existingId = proposalDetails?.sl ?? createdProposalId;
      const result = existingId
        ? await updateProposal(existingId, formData)
        : await createProposal(formData);
      setSubmissionMessage(result.message);
      if (!result.ok) return;
      const savedId =
        existingId ??
        ("proposalId" in result && typeof result.proposalId === "number"
          ? result.proposalId
          : undefined);
      if (!savedId) throw new Error("The saved proposal ID is missing.");
      // Retain the new ID even if an upload fails, so retry updates this proposal.
      if (!proposalDetails) setCreatedProposalId(savedId);
      if ("createdDate" in result && typeof result.createdDate === "string")
```

1. `event.preventDefault()` stops the browser reloading the page
2. The `ref` blocks a second click before React has re-rendered
3. `new FormData(...)` collects every input that has a `name`
4. A saved proposal calls `updateProposal()`; a new one calls `createProposal()`
5. The new ID is remembered, so if an upload fails, clicking Submit again **updates** instead of creating a duplicate

Then documents are uploaded:

```tsx
// Files upload only after the proposal exists, through the document API.
const failures: string[] = [];
for (const draft of documentDrafts) {
  if (!draft.file) continue;
  try {
    const document = await uploadOrderDocument(savedId, draft.file);
    setDocuments((rows) => [...rows, document]);
    setDocumentDrafts((rows) => rows.filter((row) => row.id !== draft.id));
  } catch (error) {
    failures.push(
      `${draft.file.name}: ${error instanceof Error ? error.message : "Upload failed."}`,
    );
  }
}
if (failures.length) {
  setSubmissionMessage(
    `${result.message}. Proposal saved, but some documents failed to upload. Submit again to retry. ${failures.join(" ")}`,
  );
  return;
}
setIsEditing(false);
if (proposalDetails) router.refresh();
else router.push(`/proposal_form/${savedId}`);
```

Files go through the document API, not the Server Action, so large files never pass through the action. The order form also uploaded **per-supplier** files here; that loop is gone.

Before, the handler was written inline inside the `<form>` tag (about 120 lines deep in the JSX). It is now a named function, `submitProposal`, so the form tag reads simply:

```tsx
<form id="proposal-form" onSubmit={submitProposal} className="flex flex-col gap-8">
```

---

## 6. The Form Sections

### Project Information

```tsx
                    <Label
                      className={headingStyling}
                      required
                      htmlFor="clientName"
                    >
                      Client Name
                    </Label>
                    <Input
                      className={inputStyling}
                      id="clientName"
                      name="clientName"
                      required
                      list="client-options"
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                    <datalist id="client-options">
                      {clientSuggestions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
```

`list="client-options"` connects the input to the `<datalist>`. The browser shows the Settings clients as suggestions, but the user can still **type any name**. This matches your choice of "suggestions + free text". System works the same way with `system-options`.

> **Note:** The order form's System Type was a fixed dropdown (BMS, FDAS, CCTV …) with an "Other" box. System now uses the Settings list instead.

`required` on Project Name and Client Name makes the browser stop an empty submit. The server checks again (Phase 1), because browser checks can be bypassed.

### Proposal Value

```tsx
                      <Select
                        value={valueCurrency}
                        onValueChange={(currency) => {
                          if (isCurrency(currency)) setValueCurrency(currency);
                        }}
                      >
                        <SelectTrigger id="valueCurrency">
                          <SelectValue>
                            {currencyLabel(valueCurrency)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currencyLabel(currency)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <input
                      type="hidden"
                      name="valueCurrency"
                      value={valueCurrency}
                    />
```

The `<Select>` is a styled dropdown, not a real form input. The hidden `<input name="valueCurrency">` is what actually gets submitted.

`currencies.map(...)` builds the options from the Phase 1 list, so **BDT** appears automatically. The order form typed out four `<SelectItem>`s by hand.

When the currency is not BDT, a read-only box shows the BDT equivalent:

```tsx
{
  valueCurrency !== "BDT" && (
    <div className="flex min-w-0 flex-wrap items-center gap-3 @xl:col-span-2">
      <Label className={headingStyling} htmlFor="valueBdt">
        Value (BDT)
      </Label>
      <Input
        className={inputStyling}
        id="valueBdt"
        value={formatMoney(valueBdt, "")}
        placeholder="Enter an amount and valid rate"
        readOnly
      />
    </div>
  );
}
```

### Status

```tsx
                    <Select
                      value={projectStatus}
                      onValueChange={(status) => {
                        if (isProjectStatus(status)) setProjectStatus(status);
                      }}
                    >
                      <SelectTrigger id="projectStatus">
                        <SelectValue>{projectStatus}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {projectStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      type="hidden"
                      name="projectStatus"
                      value={projectStatus}
                    />
```

```tsx
<Input
  className={inputStyling}
  id="finalizationDate"
  name="finalizationDate"
  type="date"
  value={finalizationDate}
  onChange={(e) => setFinalizationDate(e.target.value)}
/>
```

`type="date"` shows the browser's date picker. It always submits `YYYY-MM-DD`, which is what Postgres and `isIsoDate()` expect.

### Read-Only View

When not editing, the same sections show plain text. Empty optional fields are hidden:

```tsx
{
  [
    ["Project Name", projectName],
    ["Client Name", clientName],
    ["End User", endUser],
    ["Consultant", consultant],
    ["System", system],
  ]
    .filter(([, text]) => text.trim() !== "")
    .map(([label, text]) => (
      <p key={label} className={readOnlyTextStyling}>
        <strong>{label}:</strong> {text}
      </p>
    ));
}
```

The order form wrote a separate block for each field. Here, a list of `[label, text]` pairs is filtered and looped.

---

## 7. The Side Panel

### Record Details

```tsx
{
  [
    ["Created By:", proposalDetails?.createdBy ?? username],
    ["Date Created:", formatProposalDate(createdDate)],
    ["Last Edited By:", proposalDetails?.lastEditedBy ?? "Not edited yet"],
    [
      "Last Edited At:",
      proposalDetails?.lastEditedAt
        ? formatProposalEditDate(proposalDetails.lastEditedAt)
        : "Not edited yet",
    ],
    ...(referenceNumber ? [["Reference Number:", referenceNumber]] : []),
  ].map(([label, text]) => (
    <div
      key={label}
      className="grid min-h-10 grid-cols-[minmax(0,1fr)_max-content] items-center gap-4"
    >
      <Label className={headingStyling}>{label}</Label>
      <Label className="justify-end text-right font-bold whitespace-nowrap">
        {text}
      </Label>
    </div>
  ));
}
```

**Date Created** now shows **alongside** Last Edited By and Last Edited At, as you asked. **Reference Number** appears once the proposal is saved.

### Value In (new)

```tsx
            {/* Shows the BDT value in another currency; the choice is not saved. */}
            <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_max-content] items-center gap-4">
              <Label className={headingStyling}>Value In:</Label>
              <div className="flex items-center justify-end gap-2">
                <Label
                  className="font-bold whitespace-nowrap tabular-nums"
                  aria-live="polite"
                >
                  {formatMoney(displayValue, "—")}
                </Label>
                <Select
                  value={displayCurrency}
                  onValueChange={(currency) => {
                    if (isCurrency(currency)) setDisplayCurrency(currency);
                  }}
                >
                  <SelectTrigger
                    aria-label="Show value in currency"
                    className="w-24 bg-white text-foreground"
                  >
                    <SelectValue>{currencyLabel(displayCurrency)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currencyLabel(currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
```

This uses `convertFromBdt()` from the Phase 1 revision. Pick a currency and the BDT value is shown in it. It replaces the order form's calculation panel, where each of eight totals had its own currency dropdown that **was** saved.

`aria-live="polite"` makes screen readers announce the new number when it changes.

### Discard Changes

```tsx
if (createdProposalId && !proposalDetails) {
  router.push(`/proposal_form/${createdProposalId}`);
  return;
}
// A new, unsaved proposal has nothing to return to.
if (!proposalDetails) {
  router.push("/home");
  return;
}
// Restore saved fields before leaving edit mode.
setLoadedProposal(undefined);
setIsEditing(false);
```

| Situation                               | Order form                     | Proposal form         |
| --------------------------------------- | ------------------------------ | --------------------- |
| Saved, then discarded                   | Restore saved values           | Same                  |
| Created, upload failed, then discarded  | Open the saved record          | Same                  |
| **New and never saved**, then discarded | Showed an empty read-only page | **Goes back to Home** |

### Exchange Rates

```tsx
            <div className="grid grid-cols-1 items-end gap-6 @xl:grid-cols-2">
              {rateFields.map(([key, label]) => (
                <div key={key} className={fieldStyling}>
                  <Label
                    className={headingStyling}
                    htmlFor={isEditing ? key : undefined}
                  >
                    {label}
                  </Label>
                  {isEditing ? (
                    // Explicit form ownership keeps these sidebar fields in the submission.
                    <Input
                      form="proposal-form"
                      disabled={busy}
                      className={cn(
                        inputStyling,
                        "border-white/30 bg-white text-foreground",
                      )}
                      id={key}
                      name={key}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={rates[key]}
                      onChange={(e) => {
                        const text = e.target.value;
                        if (/^\d*(?:\.\d{0,2})?$/.test(text))
                          setRates((current) => ({ ...current, [key]: text }));
                      }}
                      onBlur={() => {
                        const rate = Number(rates[key]);
                        if (rates[key] !== "" && rate > 0)
                          setRates((current) => ({
                            ...current,
                            [key]: rate.toFixed(2),
                          }));
                      }}
                    />
                  ) : (
                    <Label className="font-bold">
                      {Number(rates[key]).toFixed(2)}
                    </Label>
                  )}
                </div>
              ))}
```

- `form="proposal-form"` attaches these inputs to the form, even though they sit **outside** the `<form>` tag
- The regular expression `/^\d*(?:\.\d{0,2})?$/` blocks typing more than 2 decimal places
- `onBlur` (leaving the box) tidies `125` into `125.00`
- `[key]: text` updates only the rate that changed

The order form's "Order Handling Fee" and "Miscellaneous Handling Fee" inputs were removed.

<details>
<summary>Full code: PageBody.tsx</summary>

```tsx
"use client";

import { useTransientMessage } from "@/lib/use-transient-message";
import { formatMoney } from "@/lib/format-money";
import Navbar from "@/components/view/navbar/navbar";

import { useRef, useState } from "react";
import { Label as FormLabel } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Manrope } from "next/font/google";
import { cn } from "@/lib/utils";
import { clsx } from "clsx";
import Link from "next/link";
import { createProposal, updateProposal } from "./actions";
import { type Proposal, type DocumentSummary } from "@/lib/drizzle/schema";
import OrderDocuments, { type DocumentDraft } from "./OrderDocuments";
import { uploadOrderDocument } from "@/lib/document-uploads";
import { useRouter } from "next/navigation";
import { canEditProposal } from "@/lib/drizzle/proposal-access";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_EXCHANGE_RATES,
  convertFromBdt,
  convertToBdt,
  currencies,
  isCurrency,
  type Currency,
  type ExchangeRates,
} from "@/lib/drizzle/currency";
import {
  DEFAULT_PROJECT_STATUS,
  isProjectStatus,
  projectStatuses,
  type ProjectStatus,
} from "@/lib/drizzle/project-status";
import {
  formatProposalDate,
  formatProposalEditDate,
} from "@/lib/drizzle/proposal-date";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Override the shared uppercase label style only within this form.
function Label({
  required = false,
  children,
  ...props
}: React.ComponentProps<typeof FormLabel> & { required?: boolean }) {
  return (
    <FormLabel
      {...props}
      className={cn("wrap-break-words min-w-0", props.className, "normal-case")}
    >
      {children}
      {required && (
        <>
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </>
      )}
    </FormLabel>
  );
}

// "EUR" is shown as "Euro"; every other code is shown as-is.
function currencyLabel(currency: Currency) {
  return currency === "EUR" ? "Euro" : currency;
}

// The four rates the form edits, in display order. Each is "1 unit = X BDT".
const rateFields = [
  ["usdToBdtRate", "USD To BDT"],
  ["sgdToBdtRate", "SGD To BDT"],
  ["eurToBdtRate", "Euro To BDT"],
  ["gbpToBdtRate", "GBP To BDT"],
] as const satisfies readonly (readonly [keyof ExchangeRates, string])[];

// Saved rates come back from Postgres as "125.00"; keep them as two-decimal text.
function ratesFrom(proposal: Proposal): ExchangeRates {
  return {
    usdToBdtRate: proposal.usdToBdtRate,
    sgdToBdtRate: proposal.sgdToBdtRate,
    eurToBdtRate: proposal.eurToBdtRate,
    gbpToBdtRate: proposal.gbpToBdtRate,
  };
}

const inputStyling = clsx("rounded-lg p-2");
const headingStyling = clsx("font-bold text-1.5xl whitespace-normal");
const sectionStyling =
  "grid grid-cols-1 gap-x-8 gap-y-3 rounded-lg border p-4 @xl:grid-cols-2";
const sectionHeadingStyling =
  "col-span-full text-[1.21em] font-extrabold underline underline-offset-4";
const fieldStyling =
  "flex min-w-0 flex-col gap-2 [&>label:first-child]:min-h-6";
const readOnlyTextStyling = "min-w-0 whitespace-pre-wrap wrap-break-words";

// Shared by all panel actions, including the Back link.
const actionButtonStyling =
  "rounded-lg normal-case bg-white text-primary hover:bg-border";

const EMPTY_DOCUMENTS: DocumentSummary[] = [];

export default function PageBody({
  proposalDetails,
  role,
  username,
  currentDate,
  clientSuggestions,
  systemSuggestions,
  initialDocuments = EMPTY_DOCUMENTS,
}: {
  proposalDetails?: Proposal;
  role: string;
  username: string;
  currentDate: string;
  clientSuggestions: string[];
  systemSuggestions: string[];
  initialDocuments?: DocumentSummary[];
}) {
  const router = useRouter();

  // Saved document metadata; refreshed whenever the server sends a new list.
  const [documents, setDocuments] = useState(() => initialDocuments);
  const [loadedDocuments, setLoadedDocuments] = useState(initialDocuments);
  if (initialDocuments !== loadedDocuments) {
    setLoadedDocuments(initialDocuments);
    setDocuments(initialDocuments);
  }
  const [documentBusy, setDocumentBusy] = useState(false);
  const documentBusyRef = useRef(false);
  function setDocumentBusyState(busy: boolean) {
    documentBusyRef.current = busy;
    setDocumentBusy(busy);
  }
  const [documentDrafts, setDocumentDrafts] = useState<DocumentDraft[]>([
    { id: 0, file: null },
  ]);
  const [createdProposalId, setCreatedProposalId] = useState<number>();

  // Existing proposals retain their recorded date; new proposals display today's date.
  const [createdDate, setCreatedDate] = useState<string>(
    proposalDetails ? proposalDetails.createdDate : currentDate,
  );

  // Editable field values are kept here until the form is submitted.
  const [referenceNumber, setReferenceNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [endUser, setEndUser] = useState("");
  const [consultant, setConsultant] = useState("");
  const [system, setSystem] = useState("");
  const [value, setValue] = useState("");
  const [valueCurrency, setValueCurrency] = useState<Currency>("USD");
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>(
    DEFAULT_PROJECT_STATUS,
  );
  const [finalizationDate, setFinalizationDate] = useState("");
  const [proposalNotes, setProposalNotes] = useState("");
  const [rates, setRates] = useState<ExchangeRates>({
    ...DEFAULT_EXCHANGE_RATES,
  });
  // Display-only choice for the side panel; never saved.
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("USD");

  const [submissionMessage, setSubmissionMessage] = useTransientMessage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A ref blocks a second submit immediately, before React renders disabled buttons.
  const submissionInProgress = useRef(false);
  const [loadedProposal, setLoadedProposal] = useState<Proposal>();

  // The role and per-proposal flag decide whether editing controls are available.
  const canEdit = canEditProposal(
    role,
    proposalDetails?.proposalManagerAccess ?? true,
  );
  const [editingRequested, setIsEditing] = useState(!proposalDetails);
  const isEditing = canEdit && editingRequested;
  const busy = isSubmitting || documentBusy;

  const normalizeNumber = (text: string) => {
    const trimmed = text.trim();
    return trimmed && Number.isFinite(Number(trimmed))
      ? String(Number(trimmed))
      : trimmed;
  };
  // Compare submitted information only, so Submit stays disabled until something changes.
  const formSnapshot = JSON.stringify({
    projectName: projectName.trim(),
    clientName: clientName.trim(),
    endUser: endUser.trim(),
    consultant: consultant.trim(),
    system: system.trim(),
    value: normalizeNumber(value),
    valueCurrency: value.trim() ? valueCurrency : null,
    projectStatus,
    finalizationDate,
    proposalNotes: proposalNotes.trim(),
    rates: Object.fromEntries(
      Object.entries(rates).map(([key, rate]) => [key, normalizeNumber(rate)]),
    ),
  });
  const [savedFormSnapshot, setSavedFormSnapshot] = useState<string | null>(
    null,
  );
  if (
    savedFormSnapshot === null &&
    (!proposalDetails || proposalDetails === loadedProposal)
  ) {
    setSavedFormSnapshot(formSnapshot);
  }
  const hasChanges =
    (savedFormSnapshot !== null && formSnapshot !== savedFormSnapshot) ||
    documentDrafts.some((draft) => draft.file !== null);

  // Only load a new proposal once. Without this guard, the setters cause a render loop.
  if (proposalDetails && proposalDetails !== loadedProposal) {
    setSavedFormSnapshot(null);
    setLoadedProposal(proposalDetails);
    setCreatedDate(proposalDetails.createdDate);
    setReferenceNumber(proposalDetails.referenceNumber);
    // Database nulls become empty strings so the inputs can display them.
    setProjectName(proposalDetails.projectName);
    setClientName(proposalDetails.clientName);
    setEndUser(proposalDetails.endUser ?? "");
    setConsultant(proposalDetails.consultant ?? "");
    setSystem(proposalDetails.system ?? "");
    setValue(proposalDetails.valueOriginal ?? "");
    setValueCurrency(proposalDetails.valueCurrency ?? "USD");
    setProjectStatus(proposalDetails.projectStatus);
    setFinalizationDate(proposalDetails.finalizationDate ?? "");
    setProposalNotes(proposalDetails.proposalNotes ?? "");
    setRates(ratesFrom(proposalDetails));
    setIsEditing(false);
  }

  // Recalculated on every render, so the preview always matches the inputs.
  const valueBdt = value.trim()
    ? convertToBdt(value, valueCurrency, rates)
    : null;
  const displayValue =
    valueBdt === null ? null : convertFromBdt(valueBdt, displayCurrency, rates);

  async function submitProposal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasChanges || submissionInProgress.current || documentBusyRef.current)
      return;
    submissionInProgress.current = true;
    setIsSubmitting(true);
    setSubmissionMessage("");
    // The server action validates these fields and recomputes the BDT value.
    const formData = new FormData(event.currentTarget);
    try {
      const existingId = proposalDetails?.sl ?? createdProposalId;
      const result = existingId
        ? await updateProposal(existingId, formData)
        : await createProposal(formData);
      setSubmissionMessage(result.message);
      if (!result.ok) return;
      const savedId =
        existingId ??
        ("proposalId" in result && typeof result.proposalId === "number"
          ? result.proposalId
          : undefined);
      if (!savedId) throw new Error("The saved proposal ID is missing.");
      // Retain the new ID even if an upload fails, so retry updates this proposal.
      if (!proposalDetails) setCreatedProposalId(savedId);
      if ("createdDate" in result && typeof result.createdDate === "string")
        setCreatedDate(result.createdDate);

      // Files upload only after the proposal exists, through the document API.
      const failures: string[] = [];
      for (const draft of documentDrafts) {
        if (!draft.file) continue;
        try {
          const document = await uploadOrderDocument(savedId, draft.file);
          setDocuments((rows) => [...rows, document]);
          setDocumentDrafts((rows) =>
            rows.filter((row) => row.id !== draft.id),
          );
        } catch (error) {
          failures.push(
            `${draft.file.name}: ${error instanceof Error ? error.message : "Upload failed."}`,
          );
        }
      }
      if (failures.length) {
        setSubmissionMessage(
          `${result.message}. Proposal saved, but some documents failed to upload. Submit again to retry. ${failures.join(" ")}`,
        );
        return;
      }
      setIsEditing(false);
      if (proposalDetails) router.refresh();
      else router.push(`/proposal_form/${savedId}`);
    } catch {
      setSubmissionMessage("Could not save the proposal. Please try again.");
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  }

  // The page switches between editable fields and a read-only proposal summary.
  return (
    <div className={manrope.className}>
      <Navbar />
      <div className="flex flex-col gap-4 px-4 pt-4 lg:flex-row lg:items-center lg:justify-between">
        {proposalDetails && (
          <div className="flex min-w-0 flex-wrap items-center gap-4">
            <Label className="text-2xl">{proposalDetails.projectName}</Label>
            <Label className="text-4xl font-thin">|</Label>
            <Label className="text-2xl">{proposalDetails.clientName}</Label>
          </div>
        )}
        <div className="shrink-0">
          <Label className="text-2xl whitespace-nowrap">
            {proposalDetails?.referenceNumber}
          </Label>
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 p-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          {isEditing ? (
            <div className="@container w-full min-w-0 rounded-lg border bg-card p-5 sm:p-6">
              <form
                id="proposal-form"
                onSubmit={submitProposal}
                className="flex flex-col gap-8"
              >
                {/* Project information */}
                <div className={sectionStyling}>
                  <h2 className={sectionHeadingStyling}>Project Information</h2>
                  <div className={fieldStyling}>
                    <Label
                      className={headingStyling}
                      required
                      htmlFor="projectName"
                    >
                      Project Name
                    </Label>
                    <Input
                      id="projectName"
                      name="projectName"
                      required
                      type="text"
                      value={projectName}
                      className={inputStyling}
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </div>
                  <div className={fieldStyling}>
                    <Label
                      className={headingStyling}
                      required
                      htmlFor="clientName"
                    >
                      Client Name
                    </Label>
                    <Input
                      className={inputStyling}
                      id="clientName"
                      name="clientName"
                      required
                      list="client-options"
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                    <datalist id="client-options">
                      {clientSuggestions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                  <div className={fieldStyling}>
                    <Label className={headingStyling} htmlFor="endUser">
                      End User
                    </Label>
                    <Input
                      className={inputStyling}
                      id="endUser"
                      name="endUser"
                      type="text"
                      value={endUser}
                      onChange={(e) => setEndUser(e.target.value)}
                    />
                  </div>
                  <div className={fieldStyling}>
                    <Label className={headingStyling} htmlFor="consultant">
                      Consultant
                    </Label>
                    <Input
                      className={inputStyling}
                      id="consultant"
                      name="consultant"
                      type="text"
                      value={consultant}
                      onChange={(e) => setConsultant(e.target.value)}
                    />
                  </div>
                  <div className={fieldStyling}>
                    <Label className={headingStyling} htmlFor="system">
                      System
                    </Label>
                    <Input
                      className={inputStyling}
                      id="system"
                      name="system"
                      list="system-options"
                      type="text"
                      value={system}
                      onChange={(e) => setSystem(e.target.value)}
                    />
                    <datalist id="system-options">
                      {systemSuggestions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Proposal value */}
                <div className={sectionStyling}>
                  <h2 className={sectionHeadingStyling}>Proposal Value</h2>
                  <div className="col-span-full grid grid-cols-1 items-end gap-4 @xl:grid-cols-[minmax(0,1fr)_8rem]">
                    <div className="flex min-w-0 flex-col gap-2 [&>label]:min-h-6">
                      <Label className={headingStyling} htmlFor="value">
                        Value
                      </Label>
                      <MoneyInput
                        className={inputStyling}
                        id="value"
                        name="value"
                        value={value}
                        onValueChange={setValue}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-2 [&_[data-slot=select-trigger]]:w-full [&>label]:min-h-6">
                      <Label className={headingStyling} htmlFor="valueCurrency">
                        Currency
                      </Label>
                      <Select
                        value={valueCurrency}
                        onValueChange={(currency) => {
                          if (isCurrency(currency)) setValueCurrency(currency);
                        }}
                      >
                        <SelectTrigger id="valueCurrency">
                          <SelectValue>
                            {currencyLabel(valueCurrency)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currencyLabel(currency)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <input
                      type="hidden"
                      name="valueCurrency"
                      value={valueCurrency}
                    />
                    {valueCurrency !== "BDT" && (
                      <div className="flex min-w-0 flex-wrap items-center gap-3 @xl:col-span-2">
                        <Label className={headingStyling} htmlFor="valueBdt">
                          Value (BDT)
                        </Label>
                        <Input
                          className={inputStyling}
                          id="valueBdt"
                          value={formatMoney(valueBdt, "")}
                          placeholder="Enter an amount and valid rate"
                          readOnly
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className={sectionStyling}>
                  <h2 className={sectionHeadingStyling}>Status</h2>
                  <div
                    className={cn(
                      fieldStyling,
                      "[&_[data-slot=select-trigger]]:w-full",
                    )}
                  >
                    <Label
                      className={headingStyling}
                      required
                      htmlFor="projectStatus"
                    >
                      Project Status
                    </Label>
                    <Select
                      value={projectStatus}
                      onValueChange={(status) => {
                        if (isProjectStatus(status)) setProjectStatus(status);
                      }}
                    >
                      <SelectTrigger id="projectStatus">
                        <SelectValue>{projectStatus}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {projectStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      type="hidden"
                      name="projectStatus"
                      value={projectStatus}
                    />
                  </div>
                  <div className={fieldStyling}>
                    <Label
                      className={headingStyling}
                      htmlFor="finalizationDate"
                    >
                      Finalization Date
                    </Label>
                    <Input
                      className={inputStyling}
                      id="finalizationDate"
                      name="finalizationDate"
                      type="date"
                      value={finalizationDate}
                      onChange={(e) => setFinalizationDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className={fieldStyling}>
                  <Label className={headingStyling} htmlFor="proposalNotes">
                    Proposal Notes
                  </Label>
                  <textarea
                    className={cn(inputStyling, "min-h-32 border")}
                    id="proposalNotes"
                    name="proposalNotes"
                    value={proposalNotes}
                    onChange={(e) => setProposalNotes(e.target.value)}
                  />
                </div>
              </form>
            </div>
          ) : (
            <div className="@container w-full min-w-0 rounded-lg border bg-card p-5 sm:p-6">
              <div className="flex flex-col gap-8">
                <div className={sectionStyling}>
                  <h2 className={sectionHeadingStyling}>Project Information</h2>
                  {[
                    ["Project Name", projectName],
                    ["Client Name", clientName],
                    ["End User", endUser],
                    ["Consultant", consultant],
                    ["System", system],
                  ]
                    .filter(([, text]) => text.trim() !== "")
                    .map(([label, text]) => (
                      <p key={label} className={readOnlyTextStyling}>
                        <strong>{label}:</strong> {text}
                      </p>
                    ))}
                </div>
                {value.trim() !== "" && (
                  <div className={sectionStyling}>
                    <h2 className={sectionHeadingStyling}>Proposal Value</h2>
                    <p className={readOnlyTextStyling}>
                      <strong>Value ({currencyLabel(valueCurrency)}):</strong>{" "}
                      {formatMoney(value)}
                    </p>
                    {valueCurrency !== "BDT" && (
                      <p className={readOnlyTextStyling}>
                        <strong>Value (BDT):</strong>{" "}
                        {formatMoney(valueBdt, "—")}
                      </p>
                    )}
                  </div>
                )}
                <div className={sectionStyling}>
                  <h2 className={sectionHeadingStyling}>Status</h2>
                  <p className={readOnlyTextStyling}>
                    <strong>Project Status:</strong> {projectStatus}
                  </p>
                  {finalizationDate && (
                    <p className={readOnlyTextStyling}>
                      <strong>Finalization Date:</strong>{" "}
                      {formatProposalDate(finalizationDate)}
                    </p>
                  )}
                </div>
                {proposalNotes.trim() !== "" && (
                  <p className={readOnlyTextStyling}>
                    <strong>Proposal Notes:</strong>
                    <br />
                    {proposalNotes}
                  </p>
                )}
              </div>
            </div>
          )}
          {/* File selections are staged here and uploaded by the form submit handler. */}
          <OrderDocuments
            key={proposalDetails?.sl ?? "new"}
            orderId={proposalDetails?.sl ?? createdProposalId}
            initialDocuments={documents}
            drafts={documentDrafts}
            setDrafts={setDocumentDrafts}
            onBusyChange={setDocumentBusyState}
            onUploadedDocumentRemoved={(id) =>
              setDocuments((rows) => rows.filter((row) => row.id !== id))
            }
            editable={isEditing}
            disabled={busy}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {/* Record details, value preview and actions */}
          <div className="flex flex-col gap-4 rounded-lg bg-primary p-5 text-white sm:p-6">
            {[
              ["Created By:", proposalDetails?.createdBy ?? username],
              ["Date Created:", formatProposalDate(createdDate)],
              [
                "Last Edited By:",
                proposalDetails?.lastEditedBy ?? "Not edited yet",
              ],
              [
                "Last Edited At:",
                proposalDetails?.lastEditedAt
                  ? formatProposalEditDate(proposalDetails.lastEditedAt)
                  : "Not edited yet",
              ],
              ...(referenceNumber
                ? [["Reference Number:", referenceNumber]]
                : []),
            ].map(([label, text]) => (
              <div
                key={label}
                className="grid min-h-10 grid-cols-[minmax(0,1fr)_max-content] items-center gap-4"
              >
                <Label className={headingStyling}>{label}</Label>
                <Label className="justify-end text-right font-bold whitespace-nowrap">
                  {text}
                </Label>
              </div>
            ))}
            <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_max-content] items-center gap-4">
              <Label className={headingStyling}>Value (BDT):</Label>
              <Label className="justify-end text-right font-bold whitespace-nowrap tabular-nums">
                {formatMoney(valueBdt, "—")}
              </Label>
            </div>
            {/* Shows the BDT value in another currency; the choice is not saved. */}
            <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_max-content] items-center gap-4">
              <Label className={headingStyling}>Value In:</Label>
              <div className="flex items-center justify-end gap-2">
                <Label
                  className="font-bold whitespace-nowrap tabular-nums"
                  aria-live="polite"
                >
                  {formatMoney(displayValue, "—")}
                </Label>
                <Select
                  value={displayCurrency}
                  onValueChange={(currency) => {
                    if (isCurrency(currency)) setDisplayCurrency(currency);
                  }}
                >
                  <SelectTrigger
                    aria-label="Show value in currency"
                    className="w-24 bg-white text-foreground"
                  >
                    <SelectValue>{currencyLabel(displayCurrency)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currencyLabel(currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-4">
              {isEditing ? (
                <>
                  <Button
                    key="submit-proposal"
                    type="submit"
                    disabled={!hasChanges || busy}
                    form="proposal-form"
                    className={cn(
                      actionButtonStyling,
                      "disabled:bg-gray-200 disabled:text-gray-500 disabled:opacity-100",
                    )}
                  >
                    {isSubmitting ? "Saving…" : "Submit"}
                  </Button>
                  <Button
                    type="button"
                    className={actionButtonStyling}
                    key="discard-proposal"
                    disabled={busy}
                    onClick={() => {
                      setSubmissionMessage("");
                      setDocumentDrafts([{ id: 0, file: null }]);
                      if (createdProposalId && !proposalDetails) {
                        router.push(`/proposal_form/${createdProposalId}`);
                        return;
                      }
                      // A new, unsaved proposal has nothing to return to.
                      if (!proposalDetails) {
                        router.push("/home");
                        return;
                      }
                      // Restore saved fields before leaving edit mode.
                      setLoadedProposal(undefined);
                      setIsEditing(false);
                    }}
                  >
                    Discard Changes
                  </Button>
                </>
              ) : (
                <>
                  {canEdit && (
                    <Button
                      type="button"
                      className={actionButtonStyling}
                      key="edit-proposal"
                      onClick={(event) => {
                        event.preventDefault();
                        setSubmissionMessage("");
                        setIsEditing(true);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                  <Link
                    href="/home"
                    className={cn(buttonVariants(), actionButtonStyling)}
                  >
                    Back
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Rates are saved with this proposal. Each one is "1 unit = X BDT". */}
          <section
            aria-labelledby="exchange-rates-heading"
            className="@container flex flex-col gap-4 rounded-lg bg-primary p-5 text-white sm:p-6"
          >
            <h2
              id="exchange-rates-heading"
              className={cn(headingStyling, "text-lg")}
            >
              Exchange Rates
            </h2>
            <div className="grid grid-cols-1 items-end gap-6 @xl:grid-cols-2">
              {rateFields.map(([key, label]) => (
                <div key={key} className={fieldStyling}>
                  <Label
                    className={headingStyling}
                    htmlFor={isEditing ? key : undefined}
                  >
                    {label}
                  </Label>
                  {isEditing ? (
                    // Explicit form ownership keeps these sidebar fields in the submission.
                    <Input
                      form="proposal-form"
                      disabled={busy}
                      className={cn(
                        inputStyling,
                        "border-white/30 bg-white text-foreground",
                      )}
                      id={key}
                      name={key}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={rates[key]}
                      onChange={(e) => {
                        const text = e.target.value;
                        if (/^\d*(?:\.\d{0,2})?$/.test(text))
                          setRates((current) => ({ ...current, [key]: text }));
                      }}
                      onBlur={() => {
                        const rate = Number(rates[key]);
                        if (rates[key] !== "" && rate > 0)
                          setRates((current) => ({
                            ...current,
                            [key]: rate.toFixed(2),
                          }));
                      }}
                    />
                  ) : (
                    <Label className="font-bold">
                      {Number(rates[key]).toFixed(2)}
                    </Label>
                  )}
                </div>
              ))}
            </div>
          </section>

          {submissionMessage && (
            <p role="status" className="mt-3 text-black">
              {submissionMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

</details>

---

## 8. Deleted and Unchanged Files

| File                    | Status    | Why                                                                     |
| ----------------------- | --------- | ----------------------------------------------------------------------- |
| `SupplierDocument.tsx`  | Deleted   | The per-supplier attachment dialog. No suppliers, no dialog             |
| `OrderDocuments.tsx`    | Unchanged | Still works for proposal documents; Phase 5 renames it and its API path |
| `DocumentFileInput.tsx` | Unchanged | The file picker; nothing order-specific in it                           |

`SupplierDocument.tsx` was planned for Phase 5, but only the old form used it, so it was removed with the form.

To see any deleted code, run:

```bash
git show HEAD:"app/(pages)/order_form/SupplierDocument.tsx"
```

---

## 9. Checks

### Type Check

```bash
npx tsc --noEmit -p .
```

No errors in `app/(pages)/proposal_form/` or `lib/`. The remaining errors are in the Home, Summary, Settings and document files that Phases 3–5 rewrite.

### Lint

```bash
npx eslint "app/(pages)/proposal_form"
```

No warnings or errors.

### Tests

```bash
node --import tsx --test lib/drizzle/*.test.ts lib/document-files.test.ts lib/document-uploads.test.ts lib/documents/storage.test.ts lib/betterAuth/idle-session.test.ts
```

```text
ℹ tests 35
ℹ pass 35
ℹ fail 0
```

> **Note:** The form has **not** been tried in a browser yet. Signing in needs a user, and the first admin can only be created after Phase 4 renames the roles. Phase 2's checks are type-checking, linting and the unit tests.

---

## 10. Links Still Pointing at /order_form

These still link to the old address. Each is fixed in a later phase:

| File                  | Link                                    | Fixed in |
| --------------------- | --------------------------------------- | -------- |
| `home/page.tsx`       | "Create New Order" → `/order_form`      | Phase 3  |
| `home/TableBody.tsx`  | "View" → `/order_form/${id}`            | Phase 3  |
| `home/actions.ts`     | `revalidatePath(\`/order_form/${id}\`)` | Phase 3  |
| `settings/actions.ts` | `revalidatePath("/order_form")`         | Phase 4  |

---

## Exercise

Test yourself with this question.

A proposal manager's access to a proposal was revoked by an admin. They open the proposal. What do they see?

- The form in edit mode
- The read-only view with an **Edit** button
- The read-only view **without** an Edit button
- A 404 page

<details>
<summary>Show answer</summary>

**The read-only view without an Edit button.** `canEditProposal("proposal", false)` is `false`, so `canEdit` is `false` and the button is hidden. Even if they forced a save, `updateProposal()` only updates rows where `proposalManagerAccess` is `true`.

</details>

---

[❮ Phase 1 Data and Helpers](phase-1-data-and-helpers.md) | Next: Phase 3 Home and Summary ❯
