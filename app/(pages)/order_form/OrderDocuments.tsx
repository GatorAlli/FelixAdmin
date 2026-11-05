"use client";

import { useTransientMessage } from "@/lib/use-transient-message";
import { useId, useRef, useState } from "react";
import type { DocumentSummary } from "@/lib/drizzle/schema";
import { MAX_DOCUMENT_BYTES } from "@/lib/document-files";
import DocumentFileInput from "./DocumentFileInput";
import { Button } from "@/components/ui/button";

// Draft rows hold local files; saved documents contain metadata returned by the server.
export type DocumentDraft = { id: number; file: File | null };

export default function OrderDocuments({ orderId, initialDocuments, editable, disabled, drafts, setDrafts, onUploadedDocumentRemoved, onBusyChange }: {
  drafts: DocumentDraft[];
  setDrafts: React.Dispatch<React.SetStateAction<DocumentDraft[]>>;
  onUploadedDocumentRemoved: (id: string) => void;
  onBusyChange: (busy: boolean) => void;
  orderId?: number;
  initialDocuments: DocumentSummary[];
  editable: boolean;
  disabled: boolean;
}) {
  const inputId = useId();
  const documents = initialDocuments;
  const nextId = useRef(1);
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useTransientMessage();
  const unavailable = busy || disabled;

  // Serialize document operations and share their loading/error state.
  async function run(task: () => Promise<void>) {
    if (locked.current || disabled) return;
    locked.current = true;
    setBusy(true);
    onBusyChange(true);
    setMessage("");
    try {
      await task();
    } catch {
      setMessage("The request failed. Please check your connection and try again.");
    } finally {
      locked.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  // Private Node.js endpoints authenticate each upload, download and removal.
  return (
    <section aria-labelledby={`${inputId}-heading`} aria-busy={busy}
      className="space-y-4 rounded-lg border bg-card p-5 sm:p-6">
      <h2 id={`${inputId}-heading`} className="text-[1.21em] font-extrabold underline underline-offset-4">Documents</h2>
      {documents.length === 0 && <p className="text-sm text-muted-foreground">No documents attached.</p>}
      <ul className="space-y-3">
        {documents.map((document, index) => (
          <li key={document.id} className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border p-3">
            <span className="flex w-6 shrink-0 items-center justify-center text-base font-semibold tracking-normal tabular-nums">{index + 1}.</span>
            <span className="min-w-0 flex-1 break-words text-sm">{document.originalName}</span>
            <Button nativeButton={false} className="h-10 w-32 px-4" disabled={unavailable}
              render={<a href={"/api/orders/" + orderId + "/documents/" + document.id} download />}>
              Download
            </Button>
            {editable && <Button type="button" variant="destructive" size="sm" className="h-10" disabled={unavailable}
              aria-label={`Remove ${document.originalName}`}
              onClick={() => void run(async () => {
                if (!orderId) return;
                const response = await fetch("/api/orders/" + orderId + "/documents/" + document.id, {
                  method: "DELETE",
                });
                const result = await response.json() as { ok: boolean; message?: string };
                if (!response.ok || !result.ok) { setMessage(result.message || "Could not remove the document."); return; }
                onUploadedDocumentRemoved(document.id);
                setMessage("Document removed. You can attach a replacement below.");
                const id = nextId.current++;
                setDrafts((rows) => rows.length ? rows : [{ id, file: null }]);
              })}>Remove</Button>}
          </li>
        ))}
      </ul>
      {editable && <>
        {drafts.map((row, index) => (
          <div key={row.id} className="flex min-w-0 items-center gap-2 rounded-lg border p-3">
            <label htmlFor={`${inputId}-${row.id}`} className="flex h-10 w-6 shrink-0 items-center justify-center text-base font-semibold tracking-normal tabular-nums"><span aria-hidden="true">{documents.length + index + 1}.</span><span className="sr-only">Attach document {documents.length + index + 1}</span></label>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <DocumentFileInput id={`${inputId}-${row.id}`}
                className="min-w-0 flex-1 basis-48" disabled={unavailable}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file && (!file.size || file.size > MAX_DOCUMENT_BYTES)) {
                    event.target.value = "";
                    setMessage("Choose a non-empty file no larger than 300 MB.");
                    setDrafts((rows) => rows.map((draft) => draft.id === row.id ? { ...draft, file: null } : draft));
                    return;
                  }
                  setMessage("");
                  setDrafts((rows) => rows.map((draft) => draft.id === row.id ? { ...draft, file } : draft));
                }} />
              {row.file && <span className="text-xs text-muted-foreground">Uploads on save</span>}
              <Button type="button" variant="destructive" size="sm" className="h-10" disabled={unavailable}
                aria-label={`Remove attachment row ${documents.length + index + 1}`}
                onClick={() => setDrafts((rows) => rows.filter((draft) => draft.id !== row.id))}>Remove</Button>
            </div>
          </div>
        ))}
        <Button type="button" disabled={unavailable}
          aria-label="Add document field" onClick={() => {
            const id = nextId.current++;
            setDrafts((rows) => [...rows, { id, file: null }]);
          }}><span className="text-xl leading-none">+</span></Button>
      </>}
      <p role="status" aria-live="polite" className="text-sm">{busy ? "Working…" : message}</p>
    </section>
  );
}
