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
