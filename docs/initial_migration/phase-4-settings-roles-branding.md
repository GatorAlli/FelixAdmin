# Phase 4: Settings, Roles and Branding

[❮ Phase 3 Home and Summary](phase-3-home-and-summary.md) | [Phase 5 Documents ❯](phase-5-documents.md)

---

## Phase 4 Summary

Phase 4 finishes the parts **around** proposals:

- **Settings** edits two suggestion lists: **Clients** and **Systems**
- The **Order manager** role becomes **Proposal manager** (stored as `proposal`)
- The navbar, page description and invitation email say **Proposal Workspace**

After this phase, **only the document API** still uses order names.

### What Changed

| Action    | Files                                                                                        |
| --------- | -------------------------------------------------------------------------------------------- |
| Rewritten | `app/(pages)/settings/SettingsLists.tsx`, `app/(pages)/settings/actions.ts`                  |
| Edited    | `settings/page.tsx`, `settings/UsersTable.tsx`                                               |
| Edited    | `lib/user-management/validation.ts`, `service.ts`, `service.test.ts`, `email.ts`             |
| Edited    | `scripts/create-user.ts`                                                                     |
| Edited    | `components/view/navbar/navbar.tsx`, `app/layout.tsx`, `app/page.tsx`, `lib/format-money.ts` |
| Docs      | `AGENTS.md` (file tree and roles note), this report                                          |

> **Note:** Small edits are shown as **diffs**. A line starting with `-` was removed; a line starting with `+` was added. Lines with neither are unchanged context.

---

## 1. The Settings Page

**File:** `app/(pages)/settings/page.tsx`

Only the data loader changed:

```diff
@@ -6,3 +6,3 @@ import { eq } from "drizzle-orm";
 import { redirect } from "next/navigation";
-import { getOrderDatalists } from "@/lib/drizzle/order-datalists";
+import { getProposalDatalists } from "@/lib/drizzle/proposal-datalists";
 import SettingsLists from "./SettingsLists";
@@ -19,3 +19,3 @@ const manrope = Manrope({

-// Only admins can load the editable supplier, customer and expense lists.
+// Only admins can load the editable client and system lists.
 export default async function Settings() {
@@ -32,3 +32,3 @@ export default async function Settings() {
   const [datalists, managedUsers] = await Promise.all([
-    getOrderDatalists(),
+    getProposalDatalists(),
     listManagedUsers(user.id),
```

The page still redirects anyone who is not an admin back to Home.

---

## 2. The Suggestion Lists

**File:** `app/(pages)/settings/SettingsLists.tsx`

### Before

Three lists: **Customers** (each with an optional **Address**), **Expenses** and **Suppliers**. The list worked out its label with a chain of checks:

```tsx
const itemLabel =
  kind === "suppliers"
    ? "Supplier"
    : kind === "customers"
      ? "Customer"
      : "Expense";
```

### After

Two lists: **Clients** and **Systems**. The label is passed in as a prop:

```tsx
function SuggestionList({
  kind,
  title,
  itemLabel,
  initialValues,
}: {
  kind: DatalistKind;
  title: string;
  itemLabel: string;
  initialValues: string[];
}) {
```

Each row now holds just an `id` and a `value`. The `address` field is gone:

```tsx
const [rows, setRows] = useState(
  initialValues.map((value, id) => ({ id, value })),
);
```

Saving sends only the names:

```tsx
const result = await saveDatalist(
  kind,
  rows.map((row) => row.value),
);
```

### Before

```tsx
const result = await saveDatalist(
  kind,
  rows.map((row) => row.value),
  kind === "customers" ? rows.map((row) => row.address) : undefined,
);
```

### The Empty Message

```tsx
{
  rows.length === 0 && (
    <p className="text-sm text-muted-foreground">
      No {title.toLowerCase()} added. Add one below.
    </p>
  );
}
```

It used to say "No datalist added." Now it names the list: "No clients added." or "No systems added."

### The Layout

```tsx
export default function SettingsLists({
  clientSuggestions,
  systemSuggestions,
}: {
  clientSuggestions: string[];
  systemSuggestions: string[];
}) {
  return (
    <div className="p-4">
      <section
        aria-labelledby="datalist-elements-heading"
        className="grid grid-cols-1 items-start gap-4 rounded-lg border bg-card p-5 sm:p-6 md:grid-cols-2"
      >
        <h1
          id="datalist-elements-heading"
          className="col-span-full text-2xl font-extrabold underline underline-offset-4"
        >
          Datalist Elements
        </h1>
        <SuggestionList
          kind="clients"
          title="Clients"
          itemLabel="Client"
          initialValues={clientSuggestions}
        />
        <SuggestionList
          kind="systems"
          title="Systems"
          itemLabel="System"
          initialValues={systemSuggestions}
        />
      </section>
    </div>
  );
```

The two lists sit **side by side** on wide screens (`md:grid-cols-2`) and stack on phones.

| Before                                         | After                           |
| ---------------------------------------------- | ------------------------------- |
| Customers + Expenses (left), Suppliers (right) | Clients (left), Systems (right) |
| Customer rows had an Address input             | No address                      |

<details>
<summary>Full code: SettingsLists.tsx</summary>

```tsx
"use client";

import { useTransientMessage } from "@/lib/use-transient-message";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveDatalist } from "./actions";
import type { DatalistKind } from "@/lib/drizzle/datalist-values";

// Each list keeps local edits until Save sends the full list to the server.
function SuggestionList({
  kind,
  title,
  itemLabel,
  initialValues,
}: {
  kind: DatalistKind;
  title: string;
  itemLabel: string;
  initialValues: string[];
}) {
  const nextId = useRef(initialValues.length);
  const newInput = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState(
    initialValues.map((value, id) => ({ id, value })),
  );
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useTransientMessage();
  const [error, setError] = useState(false);

  // Mark local changes so the Save button becomes available.
  function editRows(next: typeof rows) {
    setRows(next);
    setDirty(true);
    setMessage("");
  }

  return (
    <section
      className="@container w-full min-w-0 rounded-lg border bg-card p-5 sm:p-6"
      aria-labelledby={`${kind}-heading`}
    >
      <h2 id={`${kind}-heading`} className="text-[1.21em] font-extrabold">
        {title}
      </h2>
      <form
        className="mt-4 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending || !dirty) return;
          setMessage("");
          setError(false);
          startTransition(async () => {
            try {
              const result = await saveDatalist(
                kind,
                rows.map((row) => row.value),
              );
              setMessage(result.message);
              setError(!result.ok);
              if (result.ok) setDirty(false);
            } catch {
              setMessage("Could not save suggestions. Please try again.");
              setError(true);
            }
          });
        }}
      >
        <fieldset disabled={pending} className="min-w-0 space-y-4">
          <div className="flex flex-col gap-4 rounded-lg border px-4 py-2">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No {title.toLowerCase()} added. Add one below.
              </p>
            )}
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_3.5rem] items-start gap-x-4 gap-y-4 py-2"
              >
                <Label className="mt-8 h-10 justify-center text-base font-semibold tracking-normal tabular-nums">
                  {index + 1}.
                </Label>
                <div className="-ml-2 flex min-w-0 flex-col gap-2 [&>label]:min-h-6">
                  <Label
                    htmlFor={`${kind}-${row.id}`}
                    className="text-1.5xl font-bold whitespace-normal"
                  >
                    {itemLabel}
                  </Label>
                  <Input
                    id={`${kind}-${row.id}`}
                    ref={index === rows.length - 1 ? newInput : undefined}
                    className="rounded-lg p-2"
                    placeholder={itemLabel}
                    aria-label={`${itemLabel} ${index + 1}`}
                    value={row.value}
                    required
                    maxLength={200}
                    onChange={(event) =>
                      editRows(
                        rows.map((item) =>
                          item.id === row.id
                            ? { ...item, value: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  className="mt-8 h-10 w-full"
                  type="button"
                  aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
                  onClick={() =>
                    editRows(rows.filter((item) => item.id !== row.id))
                  }
                >
                  <span className="text-xl leading-none">−</span>
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              aria-label={`Add ${itemLabel.toLowerCase()}`}
              disabled={rows.length >= 500}
              onClick={() => {
                editRows([...rows, { id: nextId.current++, value: "" }]);
                // Focus the new row after React commits its input.
                requestAnimationFrame(() => newInput.current?.focus());
              }}
            >
              <span className="text-xl leading-none">+</span>
            </Button>
            <Button type="submit" disabled={!dirty || pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </fieldset>
        {message && (
          <p role={error ? "alert" : "status"} className="text-sm">
            {message}
          </p>
        )}
      </form>
    </section>
  );
}

// Display the two suggestion editors using the same list component.
export default function SettingsLists({
  clientSuggestions,
  systemSuggestions,
}: {
  clientSuggestions: string[];
  systemSuggestions: string[];
}) {
  return (
    <div className="p-4">
      <section
        aria-labelledby="datalist-elements-heading"
        className="grid grid-cols-1 items-start gap-4 rounded-lg border bg-card p-5 sm:p-6 md:grid-cols-2"
      >
        <h1
          id="datalist-elements-heading"
          className="col-span-full text-2xl font-extrabold underline underline-offset-4"
        >
          Datalist Elements
        </h1>
        <SuggestionList
          kind="clients"
          title="Clients"
          itemLabel="Client"
          initialValues={clientSuggestions}
        />
        <SuggestionList
          kind="systems"
          title="Systems"
          itemLabel="System"
          initialValues={systemSuggestions}
        />
      </section>
    </div>
  );
}
```

</details>

---

## 3. Saving a List

**File:** `app/(pages)/settings/actions.ts`

### How It Works

```ts
await db.transaction(async (transaction) => {
  // Serialize list replacements so two saves cannot combine their rows.
  await transaction.execute(
    sql`select pg_advisory_xact_lock(4604748, ${kind === "clients" ? 1 : 2})`,
  );
  if (kind === "clients") {
    await transaction.delete(clients);
    if (parsed.values.length)
      await transaction
        .insert(clients)
        .values(parsed.values.map((clientName) => ({ clientName })));
  } else {
    await transaction.delete(systems);
    if (parsed.values.length)
      await transaction
        .insert(systems)
        .values(parsed.values.map((systemName) => ({ systemName })));
  }
});
```

1. **Lock** the list, so two admins saving at once cannot mix their rows
2. **Delete** every row in the table
3. **Insert** the new list
4. All three happen in **one transaction**. If anything fails, the old list stays

### What Changed

| Before                                                                      | After                                                                  |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `saveDatalist(kind, input, addresses = [])`                                 | `saveDatalist(kind, input)`                                            |
| Kinds: `suppliers`, `customers`, `expenses`                                 | Kinds: `clients`, `systems`                                            |
| `readDatalistValues(kind, input)`                                           | `readDatalistValues(input)` (Phase 1)                                  |
| `readCustomerAddresses()`                                                   | Removed                                                                |
| Lock keys 1, 2, 3                                                           | Lock keys 1 (clients), 2 (systems)                                     |
| Refreshed `/settings`, `/summary`, `/order_form`, `/order_form/[edit_slug]` | Refreshes `/settings`, `/proposal_form`, `/proposal_form/[proposalId]` |
| "Order Form suggestions saved."                                             | "Proposal Form suggestions saved."                                     |
| `fetchSuppliersList()`, `fetchExpensesList()`                               | Removed (nothing called them)                                          |

`/summary` is no longer refreshed, because Summary does not use the lists any more (Phase 3).

> **Note:** The advisory-lock number `4604748` is the same one the order app used. Phase 1 gave the reference allocator its own number (`0x465154`), so the two never block each other.

<details>
<summary>Full code: settings/actions.ts</summary>

```ts
"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import { clients, systems, users } from "@/lib/drizzle/schema";
import {
  readDatalistValues,
  type DatalistKind,
} from "@/lib/drizzle/datalist-values";

// Validate the replacement list, then save all rows in a single transaction.
export async function saveDatalist(kind: DatalistKind, input: string[]) {
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
      message: "Only admins can change Proposal Form suggestions.",
    };
  }
  if (kind !== "clients" && kind !== "systems") {
    return { ok: false, message: "Invalid suggestion list." };
  }
  const parsed = readDatalistValues(input);
  if (!parsed.ok) return parsed;

  try {
    await db.transaction(async (transaction) => {
      // Serialize list replacements so two saves cannot combine their rows.
      await transaction.execute(
        sql`select pg_advisory_xact_lock(4604748, ${kind === "clients" ? 1 : 2})`,
      );
      if (kind === "clients") {
        await transaction.delete(clients);
        if (parsed.values.length)
          await transaction
            .insert(clients)
            .values(parsed.values.map((clientName) => ({ clientName })));
      } else {
        await transaction.delete(systems);
        if (parsed.values.length)
          await transaction
            .insert(systems)
            .values(parsed.values.map((systemName) => ({ systemName })));
      }
    });
    revalidatePath("/settings");
    revalidatePath("/proposal_form");
    revalidatePath("/proposal_form/[proposalId]", "page");
    return { ok: true, message: "Proposal Form suggestions saved." };
  } catch (error) {
    console.error("Could not save Proposal Form suggestions", error);
    return {
      ok: false,
      message: "Could not save suggestions. Please try again.",
    };
  }
}
```

</details>

---

## 4. The Proposal Manager Role

A user's role is stored as text in `users.status`. The middle role was `"order"`. It is now `"proposal"`.

| Stored value         | Label (before) | Label (after)        |
| -------------------- | -------------- | -------------------- |
| `admin`              | Admin          | Admin                |
| `order` → `proposal` | Order manager  | **Proposal manager** |
| `guest`              | Guest          | Guest                |

### validation.ts

**File:** `lib/user-management/validation.ts`

```diff
@@ -2,3 +2,3 @@ export const accessLabels = {
   admin: "Admin",
-  order: "Order manager",
+  proposal: "Proposal manager",
   guest: "Guest",
@@ -30,3 +30,3 @@ export function readInvitation(input: unknown) {
   if (typeof access !== "string" || !Object.hasOwn(accessLabels, access)) {
-    throw new Error("Choose Admin, Order manager, or Guest access.");
+    throw new Error("Choose Admin, Proposal manager, or Guest access.");
   }
```

`accessLabels` is the **single list** of roles. The Settings invite form builds its dropdown from it, and the users table reads labels from it, so changing this one object updates both:

```tsx
{Object.entries(accessLabels).map(([value, label]) => (
```

`readInvitation()` rejects any role that is not a key of `accessLabels`. After this change, an invite for `"order"` is **rejected**.

### service.ts

**File:** `lib/user-management/service.ts`

```diff
@@ -61,3 +61,3 @@ export async function listManagedUsers(
     .orderBy(
-      sql`case ${users.status} when 'admin' then 0 when 'order' then 1 when 'guest' then 2 else 3 end`,
+      sql`case ${users.status} when 'admin' then 0 when 'proposal' then 1 when 'guest' then 2 else 3 end`,
       asc(authSchema.user.name),
@@ -118,3 +118,3 @@ export async function changeManagedUser(
         );
-      // Account and session foreign keys cascade. Order attribution stays untouched.
+      // Account and session foreign keys cascade. Proposal attribution stays untouched.
       await transaction
```

The users table is sorted Admin → Proposal manager → Guest. Without this change, proposal managers would have sorted **last**, after guests.

### UsersTable.tsx

**File:** `app/(pages)/settings/UsersTable.tsx`

```diff
@@ -196,3 +196,3 @@ export default function UsersTable({
                             window.confirm(
-                              `Remove ${user.name} (${user.email})? They will lose access immediately. Existing orders will be kept.`,
+                              `Remove ${user.name} (${user.email})? They will lose access immediately. Existing proposals will be kept.`,
                             )
```

This is the confirmation shown before an admin removes a user.

### create-user.ts

**File:** `scripts/create-user.ts`

This command-line script creates a user directly in the database. It is how you create the **first** admin.

```diff
@@ -59,9 +59,9 @@ async function main() {
         value: "guest",
-        description: "View orders and download documents.",
+        description: "View proposals and download documents.",
       },
       {
-        name: "Order manager",
-        value: "order",
+        name: "Proposal manager",
+        value: "proposal",
         description:
-          "Create orders and edit orders with manager access enabled.",
+          "Create proposals and edit proposals with manager access enabled.",
       },
@@ -70,3 +70,3 @@ async function main() {
         value: "admin",
-        description: "Edit all orders, manage access and change Settings.",
+        description: "Edit all proposals, manage access and change Settings.",
       },
```

### Run it yourself

```bash
npx tsx scripts/create-user.ts
```

It asks for a **name**, **email**, **permission** and **password**, then creates the login and the profile together.

> **Note:** Phase 1's `canEditProposal()` already checks for `"proposal"`. Phase 4 makes user management create that same value, so the two now agree.

---

## 5. Wording and Branding

### navbar.tsx

**File:** `components/view/navbar/navbar.tsx`

```diff
@@ -25,3 +25,3 @@ const navigationLinks = [

-// Exact paths keep navigation links unselected on Order Form pages.
+// Exact paths keep navigation links unselected on Proposal Form pages.
 export default function Navbar() {
@@ -35,3 +35,3 @@ export default function Navbar() {
       className={cn(
-        "w-full bg-card border-b border-gray-200 px-4 sm:px-6 md:px-8 flex items-center justify-between gap-3 sticky top-0 z-50 shadow-sm h-[68px]",
+        "sticky top-0 z-50 flex h-[68px] w-full items-center justify-between gap-3 border-b border-gray-200 bg-card px-4 shadow-sm sm:px-6 md:px-8",
         manrope.className,
@@ -39,3 +39,3 @@ export default function Navbar() {
     >
-      <div className="flex min-w-0 flex-1 items-center h-full">
+      <div className="flex h-full min-w-0 flex-1 items-center">
         {/* Logo */}
@@ -43,3 +43,3 @@ export default function Navbar() {
           href="/home"
-          className="flex items-center gap-3 cursor-pointer min-w-0 md:mr-8 lg:mr-12"
+          className="flex min-w-0 cursor-pointer items-center gap-3 md:mr-8 lg:mr-12"
         >
@@ -75,5 +75,5 @@ export default function Navbar() {
           </svg>
-          <div className="min-w-0 flex flex-col border-l border-gray-200 pl-3 py-0.5 justify-center">
+          <div className="flex min-w-0 flex-col justify-center border-l border-gray-200 py-0.5 pl-3">
             <span
-              className={`truncate text-[13px] sm:text-[15px] font-extrabold leading-none text-gray-900 mb-1 ${sora.className}`}
+              className={`mb-1 truncate text-[13px] leading-none font-extrabold text-gray-900 sm:text-[15px] ${sora.className}`}
             >
@@ -81,4 +81,4 @@ export default function Navbar() {
             </span>
-            <span className="truncate text-[10px] text-gray-500 font-semibold tracking-wide leading-none">
-              Order Workspace
+            <span className="truncate text-[10px] leading-none font-semibold tracking-wide text-gray-500">
+              Proposal Workspace
             </span>
@@ -86,3 +86,3 @@ export default function Navbar() {
         </Link>
-        <div className="hidden md:flex items-center h-full gap-8 text-[15px] font-medium text-gray-600">
+        <div className="hidden h-full items-center gap-8 text-[15px] font-medium text-gray-600 md:flex">
           {navigationLinks.map(({ href, label }) => {
@@ -95,4 +95,4 @@ export default function Navbar() {
                 className={cn(
-                  "relative h-full flex items-center transition-colors group",
-                  active ? "text-primary font-semibold" : "hover:text-primary",
+                  "group relative flex h-full items-center transition-colors",
+                  active ? "font-semibold text-primary" : "hover:text-primary",
                 )}
@@ -102,3 +102,3 @@ export default function Navbar() {
                   className={cn(
-                    "absolute bottom-0 left-0 w-full h-0.75 bg-primary transition-transform duration-300 ease-out origin-left",
+                    "absolute bottom-0 left-0 h-0.75 w-full origin-left bg-primary transition-transform duration-300 ease-out",
                     active
@@ -186,3 +186,3 @@ export default function Navbar() {
           }}
-          className="flex size-10 sm:h-auto sm:w-auto items-center justify-center gap-2 text-gray-500 hover:text-black transition-colors text-[15px] font-medium disabled:cursor-wait disabled:opacity-50"
+          className="flex size-10 items-center justify-center gap-2 text-[15px] font-medium text-gray-500 transition-colors hover:text-black disabled:cursor-wait disabled:opacity-50 sm:h-auto sm:w-auto"
         >
@@ -196,3 +196,3 @@ export default function Navbar() {
             role="alert"
-            className="absolute right-4 top-full mt-2 rounded-lg border bg-card p-3 text-sm text-destructive shadow-sm"
+            className="absolute top-full right-4 mt-2 rounded-lg border bg-card p-3 text-sm text-destructive shadow-sm"
           >
```

The small grey line under "Felix Controls Limited" in the top bar now reads **Proposal Workspace**.

### layout.tsx

**File:** `app/layout.tsx`

```diff
@@ -28,3 +28,3 @@ export const metadata: Metadata = {
   },
-  description: "Felix Controls order management portal.",
+  description: "Felix Controls proposal management portal.",
   icons: {
@@ -48,3 +48,3 @@ export default function RootLayout({ children }: LayoutProps<"/">) {
     >
-      <body className="min-h-full flex flex-col">{children}</body>
+      <body className="flex min-h-full flex-col">{children}</body>
     </html>
```

This is the page description search engines and link previews show. Tab titles were already "… | Felix Controls" and stay the same.

### page.tsx (sign-in)

**File:** `app/page.tsx`

```diff
@@ -26,3 +26,3 @@ const FallingParticles = () => {
   return (
-    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
+    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
       {[...Array(30)].map((_, i) => (
@@ -30,3 +30,3 @@ const FallingParticles = () => {
           key={i}
-          className="absolute top-[-10%] w-1 h-1 bg-white/20 rounded-lg"
+          className="absolute top-[-10%] h-1 w-1 rounded-lg bg-white/20"
           style={{
@@ -61,3 +61,3 @@ export default function App() {

-  // Visitors with an existing session go straight to the order list.
+  // Visitors with an existing session go straight to the proposal list.
   useEffect(() => {
@@ -67,4 +67,4 @@ export default function App() {
   return (
-    <div className={`min-h-screen flex w-full bg-muted ${manrope.className}`}>
-      <div className="relative hidden md:flex md:w-1/2 bg-primary items-center justify-center overflow-hidden">
+    <div className={`flex min-h-screen w-full bg-muted ${manrope.className}`}>
+      <div className="relative hidden items-center justify-center overflow-hidden bg-primary md:flex md:w-1/2">
         <FallingParticles />
@@ -77,3 +77,3 @@ export default function App() {
             priority
-            className="object-contain w-full h-auto"
+            className="h-auto w-full object-contain"
           />
@@ -81,8 +81,8 @@ export default function App() {
       </div>
-      <div className="w-full md:w-1/2 flex flex-col relative bg-muted">
+      <div className="relative flex w-full flex-col bg-muted md:w-1/2">
         <div className="absolute top-6 right-8 z-20"></div>
         {/* Content */}
-        <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 max-w-2xl mx-auto w-full mt-12 md:mt-0">
+        <div className="mx-auto mt-12 flex w-full max-w-2xl flex-1 flex-col justify-center px-8 sm:px-16 md:mt-0 lg:px-24">
           {/* Logo */}
-          <div className="mb-12 relative">
+          <div className="relative mb-12">
             <Image
@@ -92,6 +92,6 @@ export default function App() {
               height={45}
-              className="object-contain mb-6 w-40 h-auto"
+              className="mb-6 h-auto w-40 object-contain"
             />
             {/* animated line */}
-            <div className="w-full h-px bg-gray-200 relative flex items-center">
+            <div className="relative flex h-px w-full items-center bg-gray-200">
               <Plus className="absolute -right-3 h-4 w-4 text-primary opacity-50" />
@@ -102,3 +102,3 @@ export default function App() {
             <h1
-              className={`text-4xl md:text-[44px] tracking-tight text-black mb-3 leading-tight ${sora.className}`}
+              className={`mb-3 text-4xl leading-tight tracking-tight text-black md:text-[44px] ${sora.className}`}
             >
@@ -132,3 +132,5 @@ export default function App() {
                 } catch {
-                  setMessage("Could not send the reset email. Please try again.");
+                  setMessage(
+                    "Could not send the reset email. Please try again.",
+                  );
                 } finally {
@@ -175,3 +177,3 @@ export default function App() {
                 htmlFor="email"
-                className="text-[13px] uppercase tracking-wide font-semibold text-gray-900"
+                className="text-[13px] font-semibold tracking-wide text-gray-900 uppercase"
               >
@@ -189,3 +191,3 @@ export default function App() {
                 }}
-                className="w-full py-6 px-4 text-base font-normal bg-white border-gray-200 rounded-lg shadow-sm focus-visible:ring-primary focus-visible:border-primary placeholder:text-gray-400"
+                className="w-full rounded-lg border-gray-200 bg-white px-4 py-6 text-base font-normal shadow-sm placeholder:text-gray-400 focus-visible:border-primary focus-visible:ring-primary"
               />
@@ -196,3 +198,3 @@ export default function App() {
                   htmlFor="password"
-                  className="text-[13px] uppercase tracking-wide font-semibold text-gray-900"
+                  className="text-[13px] font-semibold tracking-wide text-gray-900 uppercase"
                 >
@@ -208,3 +210,3 @@ export default function App() {
                   }}
-                  className="w-full py-6 px-4 text-base font-normal bg-white border-gray-200 rounded-lg shadow-sm focus-visible:ring-primary focus-visible:border-primary placeholder:text-gray-400"
+                  className="w-full rounded-lg border-gray-200 bg-white px-4 py-6 text-base font-normal shadow-sm placeholder:text-gray-400 focus-visible:border-primary focus-visible:ring-primary"
                 />
@@ -226,3 +228,3 @@ export default function App() {
             {isPasswordReset ? (
-              <div className="self-end flex items-center gap-3 -mt-3">
+              <div className="-mt-3 flex items-center gap-3 self-end">
                 <Button
@@ -234,3 +236,3 @@ export default function App() {
                   }}
-                  className="w-auto normal-case bg-primary hover:bg-primary/90 text-white h-10 px-4 gap-2 text-sm font-semibold rounded-lg transition-colors group"
+                  className="group h-10 w-auto gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white normal-case transition-colors hover:bg-primary/90"
                 >
@@ -246,3 +248,3 @@ export default function App() {
                   aria-busy={isRequestingReset}
-                  className="w-auto normal-case bg-primary hover:bg-primary/90 text-white h-10 px-4 gap-2 text-sm font-semibold rounded-lg transition-colors group"
+                  className="group h-10 w-auto gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white normal-case transition-colors hover:bg-primary/90"
                 >
@@ -260,3 +262,3 @@ export default function App() {
                 aria-busy={isSigningIn}
-                className="w-full normal-case bg-primary hover:bg-primary/90 text-white mt-4 py-7 px-6 text-[17px] font-semibold rounded-lg transition-colors group"
+                className="group mt-4 w-full rounded-lg bg-primary px-6 py-7 text-[17px] font-semibold text-white normal-case transition-colors hover:bg-primary/90"
               >
@@ -267,3 +269,3 @@ export default function App() {
                   {/* Arrow moving */}
-                  <div className="bg-black/10 p-1.5 rounded-lg group-hover:bg-black/20 transition-all duration-300 group-hover:translate-x-1 shrink-0 z-10">
+                  <div className="z-10 shrink-0 rounded-lg bg-black/10 p-1.5 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-black/20">
                     <ArrowRight
```

### email.ts

**File:** `lib/user-management/email.ts`

```diff
@@ -22 +22 @@ export async function sendInvitationEmail(invitation: {
-    text: `You have been invited to the Felix Controls Order Workspace.\n\nCreate your password using this link:\n${invitation.url}\n\nThis link expires in one hour and can be used once. If it expires, ask your administrator to resend the invitation.\n\nIf you were not expecting this invitation, you can ignore this email.`,
+    text: `You have been invited to the Felix Controls Proposal Workspace.\n\nCreate your password using this link:\n${invitation.url}\n\nThis link expires in one hour and can be used once. If it expires, ask your administrator to resend the invitation.\n\nIf you were not expecting this invitation, you can ignore this email.`,
```

The invitation email now says **Proposal Workspace**. The subject ("Create your Felix Controls password") and the password-reset email had no order wording, so they are unchanged.

### format-money.ts

**File:** `lib/format-money.ts`

```diff
@@ -4,3 +4,3 @@ const integerFormatter = new Intl.NumberFormat("en-US", {

-// Sum the displayed cents exactly, including totals larger than a single order.
+// Sum the displayed cents exactly, including totals larger than a single proposal.
 export function sumMoneyAmounts(values: (string | null | undefined)[]): string {
```

A comment only. The code is unchanged.

### Kept As-Is

| Text                                     | Where                                       | Why              |
| ---------------------------------------- | ------------------------------------------- | ---------------- |
| "Felix Controls Limited"                 | Navbar, sign-in logo, Better Auth `appName` | The company name |
| "Sign In \| Felix Controls" title        | `app/layout.tsx`                            | No order wording |
| "You can now sign in to Felix Controls." | `SetPasswordForm.tsx`                       | No order wording |

---

## 6. The User-Management Test

**File:** `lib/user-management/service.test.ts`

This test invites, signs in and removes a real user, so it needs its **own throwaway database** (`USER_MANAGEMENT_TEST_DATABASE_URL`). It checks that removing a user **keeps** the records they created.

```diff
@@ -81,3 +81,3 @@ test(
         email: " MANAGER@example.com ",
-        access: "order",
+        access: "proposal",
       };
@@ -109,3 +109,3 @@ test(
       assert.ok(manager.pending);
-      assert.equal(manager.access, "order");
+      assert.equal(manager.access, "proposal");
       assert.equal(Object.hasOwn(manager, "password"), false);
@@ -173,3 +173,3 @@ test(
       assert.ok(signedIn.token);
-      await client`insert into data ("createdBy", "felixOrderRef") values ('New Manager', 'KEEP-001')`;
+      await client`insert into proposals ("referenceNumber", "createdBy", "createdDate", "projectName", "clientName", "usdToBdtRate", "sgdToBdtRate", "eurToBdtRate", "gbpToBdtRate") values ('KEEP-001', 'New Manager', '2026-01-01', 'Kept project', 'Kept client', 125, 96.15, 150, 175)`;
       await assert.rejects(
@@ -197,4 +197,5 @@ test(
       assert.equal(
-        (await client`select * from data where "felixOrderRef" = 'KEEP-001'`)
-          .length,
+        (
+          await client`select * from proposals where "referenceNumber" = 'KEEP-001'`
+        ).length,
         1,
```

The old test inserted into `data` with two columns. `proposals` has more required columns (Phase 1), so the new insert fills them all.

> **Note:** This test was type-checked but **not run**, because no throwaway database is set up. Never point it at the Neon database: it creates and deletes users.

---

## 7. Checks

### Type Check

```bash
npx tsc --noEmit -p .
```

The **only** remaining errors are in the document API:

```text
app/api/orders/[orderId]/documents/[documentId]/route.ts
app/api/orders/[orderId]/documents/route.ts
lib/documents/access.ts
```

Phase 5 rewrites these.

### Lint

```bash
npx eslint "app/(pages)/settings" lib/user-management scripts components/view app/layout.tsx app/page.tsx lib/format-money.ts
```

No warnings or errors.

### Tests

```text
ℹ tests 38
ℹ pass 38
ℹ fail 0
```

### Leftover Order Wording

A search for "order" outside the document files now finds only:

| Match                                   | Why it stays                                  |
| --------------------------------------- | --------------------------------------------- |
| `orderId={...}` in `PageBody.tsx`       | The `OrderDocuments` prop; renamed in Phase 5 |
| `"order"` in `proposal-access.test.ts`  | Proves the old role **cannot** edit           |
| "in display order", "in order" comments | Plain English, not about orders               |

---

## Exercise

Test yourself with this question.

An admin opens Settings and invites a new user. Which roles can they pick?

- Admin, Order manager, Guest
- Admin, Proposal manager, Guest
- Admin, Order manager, Proposal manager, Guest
- Admin and Guest only

<details>
<summary>Show answer</summary>

**Admin, Proposal manager, Guest.** The dropdown is built from `accessLabels`, which now has `admin`, `proposal` and `guest`.

</details>

---

[❮ Phase 3 Home and Summary](phase-3-home-and-summary.md) | [Phase 5 Documents ❯](phase-5-documents.md)
