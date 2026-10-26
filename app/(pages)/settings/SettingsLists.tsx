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
  initialValues,
  initialAddresses = [],
}: {
  kind: DatalistKind;
  title: string;
  initialValues: string[];
  initialAddresses?: string[];
}) {
  const itemLabel =
    kind === "suppliers"
      ? "Supplier"
      : kind === "customers"
        ? "Customer"
        : "Expense";
  const nextId = useRef(initialValues.length);
  const newInput = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState(
    initialValues.map((value, id) => ({
      id,
      value,
      address: initialAddresses[id] ?? "",
    })),
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
      className="@container min-w-0 w-full rounded-lg border bg-card p-5 sm:p-6"
      aria-labelledby={`${kind}-heading`}
    >
      <h1
        id={`${kind}-heading`}
        className="font-bold text-1.5xl tracking-wide whitespace-normal"
      >
        {title}
      </h1>
      <form
        className="mt-4 flex flex-col gap-8"
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
                kind === "customers"
                  ? rows.map((row) => row.address)
                  : undefined,
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
                No datalist added. Add one below.
              </p>
            )}
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-4 py-2"
              >
                <Label className="h-10 justify-center normal-case">
                  {index + 1}.
                </Label>
                <div className="min-w-0 flex-1 space-y-2">
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
                  {kind === "customers" && (
                    <div className="space-y-2">
                      <Input
                        id={`customer-address-${row.id}`}
                        className="rounded-lg p-2"
                        placeholder="Address"
                        aria-label={`Customer address ${index + 1}`}
                        value={row.address}
                        maxLength={1000}
                        onChange={(event) =>
                          editRows(
                            rows.map((item) =>
                              item.id === row.id
                                ? { ...item, address: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                  )}
                </div>
                <Button
                  className="h-10"
                  type="button"
                  aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
                  onClick={() =>
                    editRows(rows.filter((item) => item.id !== row.id))
                  }
                >
                  −
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
                editRows([
                  ...rows,
                  { id: nextId.current++, value: "", address: "" },
                ]);
                // Focus the new row after React commits its input.
                requestAnimationFrame(() => newInput.current?.focus());
              }}
            >
              +
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

// Display the three suggestion editors using the same list component.
export default function SettingsLists({
  supplierSuggestions,
  customerSuggestions,
  customerAddresses,
  expenseSuggestions,
}: {
  supplierSuggestions: string[];
  customerSuggestions: string[];
  customerAddresses: string[];
  expenseSuggestions: string[];
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 p-4 md:grid-cols-2">
      <div className="grid min-w-0 grid-cols-1 gap-4">
        <SuggestionList
          kind="customers"
          title="Customers"
          initialValues={customerSuggestions}
          initialAddresses={customerAddresses}
        />
        <SuggestionList
          kind="expenses"
          title="Expenses"
          initialValues={expenseSuggestions}
        />
      </div>
      <SuggestionList
        kind="suppliers"
        title="Suppliers"
        initialValues={supplierSuggestions}
      />
    </div>
  );
}
