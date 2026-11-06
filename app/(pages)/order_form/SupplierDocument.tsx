"use client";

import { useId, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import DocumentFileInput from "./DocumentFileInput";
import { MAX_DOCUMENT_BYTES } from "@/lib/document-files";
import type { DocumentSummary } from "@/lib/drizzle/schema";

export default function SupplierDocument({
  orderId,
  documents,
  editable,
  disabled,
  onRemoved,
  onBusyChange,
  pendingFiles = [],
  onFilesChange,
}: {
  pendingFiles?: File[];
  onFilesChange: (files: File[]) => void;
  orderId?: number;
  documents: DocumentSummary[];
  editable: boolean;
  disabled: boolean;
  onRemoved: (id: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const id = useId();
  const locked = useRef(false);
  const nextRowId = useRef(1);
  const [emptyRows, setEmptyRows] = useState<number[]>([0]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const count = documents.length + pendingFiles.length;
  const unavailable = busy || disabled;

  async function remove(document: DocumentSummary) {
    if (locked.current || disabled) return;
    locked.current = true;
    setBusy(true);
    onBusyChange(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/orders/${orderId}/documents/${document.id}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setMessage(result.message || "Could not remove the document.");
        return;
      }
      onRemoved(document.id);
    } catch {
      setMessage("The request failed. Please try again.");
    } finally {
      locked.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger
        render={
          <Button
            type="button"
            variant="outline"
            className={editable ? "h-10 px-3" : "h-8 px-3"}
            disabled={disabled}
          />
        }
      >
        Documents ({count})
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 data-[closed]:hidden" />
        <Dialog.Popup
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-xl border bg-card p-5 sm:p-6 text-card-foreground shadow-xl data-[closed]:hidden"
          aria-busy={busy}
        >
          <Dialog.Title className="text-[1.21em] font-extrabold underline underline-offset-4">
            Documents
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            {editable
              ? "Attach documents for this supplier addition. New files upload when you save the order."
              : "Documents attached to this supplier addition."}
          </Dialog.Description>
          {count === 0 && !editable && (
            <p className="text-sm text-muted-foreground">
              No documents attached.
            </p>
          )}
          <ul className="space-y-3">
            {documents.map((document, index) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border p-3"
              >
                <span className="flex w-6 shrink-0 items-center justify-center text-base font-semibold tracking-normal tabular-nums">
                  {index + 1}.
                </span>
                <span className="min-w-0 flex-1 break-words text-sm">
                  {document.originalName}
                </span>
                <Button
                  nativeButton={false}
                  className="h-10 w-32 px-4"
                  disabled={unavailable}
                  render={
                    <a
                      href={`/api/orders/${orderId}/documents/${document.id}`}
                      download
                    />
                  }
                >
                  Download
                </Button>
                {editable && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-10"
                    disabled={unavailable}
                    aria-label={`Remove ${document.originalName}`}
                    onClick={() => void remove(document)}
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
            {pendingFiles.map((file, index) => (
              <li
                key={index}
                className="flex flex-wrap items-center gap-2 rounded-lg border p-3"
              >
                <span className="flex w-6 shrink-0 items-center justify-center text-base font-semibold tracking-normal tabular-nums">
                  {documents.length + index + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploads on save
                  </p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-10"
                  disabled={unavailable}
                  aria-label={`Remove pending ${file.name}`}
                  onClick={() =>
                    onFilesChange(pendingFiles.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          {editable && (
            <>
              {emptyRows.map((rowId, index) => (
                <div
                  key={rowId}
                  className="flex min-w-0 items-center gap-2 rounded-lg border p-3"
                >
                  <label
                    htmlFor={`${id}-${rowId}`}
                    className="flex h-10 w-6 shrink-0 items-center justify-center text-base font-semibold tracking-normal tabular-nums"
                  >
                    <span aria-hidden="true">{count + index + 1}.</span>
                    <span className="sr-only">
                      Attach document {count + index + 1}
                    </span>
                  </label>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <DocumentFileInput
                      id={`${id}-${rowId}`}
                      disabled={unavailable}
                      className="min-w-0 flex-1 basis-48"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (!file.size || file.size > MAX_DOCUMENT_BYTES) {
                          event.target.value = "";
                          setMessage(
                            "Choose a non-empty file no larger than 300 MB.",
                          );
                          return;
                        }
                        setMessage("");
                        onFilesChange([...pendingFiles, file]);
                        setEmptyRows((rows) =>
                          rows.filter((row) => row !== rowId),
                        );
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-10"
                      disabled={unavailable}
                      aria-label={`Remove attachment row ${count + index + 1}`}
                      onClick={() =>
                        setEmptyRows((rows) =>
                          rows.filter((row) => row !== rowId),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                className="self-start"
                disabled={unavailable}
                aria-label="Add document field"
                onClick={() => {
                  const rowId = nextRowId.current++;
                  setEmptyRows((rows) => [...rows, rowId]);
                }}
              >
                <span className="text-xl leading-none">+</span>
              </Button>
            </>
          )}
          <p role="status" className="text-sm">
            {busy ? "Working…" : message}
          </p>
          <Dialog.Close
            render={
              <Button type="button" className="self-end" disabled={busy} />
            }
          >
            Done
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
