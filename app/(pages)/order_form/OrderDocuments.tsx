"use client";

import { useTransientMessage } from "@/lib/use-transient-message";
import { useId, useRef, useState } from "react";
import type { DocumentSummary } from "@/lib/drizzle/schema";
import { MAX_DOCUMENT_BYTES } from "@/lib/document-files";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Draft rows hold local files; saved documents contain metadata returned by the server.
type Draft = { id: number; file: File | null };

export default function OrderDocuments({ orderId, initialDocuments, editable, disabled }: {
  orderId?: number;
  initialDocuments: DocumentSummary[];
  editable: boolean;
  disabled: boolean;
}) {
  const inputId = useId();
  const [documents, setDocuments] = useState(initialDocuments);
  const [drafts, setDrafts] = useState<Draft[]>([{ id: 0, file: null }]);
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
    setMessage("");
    try {
      await task();
    } catch {
      setMessage("The request failed. Please check your connection and try again.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  // Private Node.js endpoints authenticate each upload, download and removal.
  return (
    <section aria-labelledby={`${inputId}-heading`} aria-busy={busy}
      className="space-y-4 rounded-lg border bg-card p-5 sm:p-6">
      <h2 id={`${inputId}-heading`} className="font-bold">Documents</h2>
      {documents.length === 0 && <p className="text-sm text-muted-foreground">No documents attached.</p>}
      <ul className="space-y-3">
        {documents.map((document) => (
          <li key={document.id} className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border p-3">
            <span className="min-w-0 flex-1 break-words text-sm">{document.originalName}</span>
            <Button nativeButton={false} variant="outline" size="sm" disabled={unavailable}
              render={<a href={"/api/orders/" + orderId + "/documents/" + document.id} download />}>
              Download
            </Button>
            {editable && <Button type="button" variant="destructive" size="sm" disabled={unavailable}
              aria-label={`Remove ${document.originalName}`}
              onClick={() => void run(async () => {
                if (!orderId) return;
                const response = await fetch("/api/orders/" + orderId + "/documents/" + document.id, {
                  method: "DELETE",
                });
                const result = await response.json() as { ok: boolean; message?: string };
                if (!response.ok || !result.ok) { setMessage(result.message || "Could not remove the document."); return; }
                setDocuments((rows) => rows.filter((row) => row.id !== document.id));
                setMessage("Document removed. You can attach a replacement below.");
                const id = nextId.current++;
                setDrafts((rows) => rows.length ? rows : [{ id, file: null }]);
              })}>Remove</Button>}
          </li>
        ))}
      </ul>
      {editable && (orderId ? <>
        {drafts.map((row, index) => (
          <div key={row.id} className="space-y-2">
            <label htmlFor={`${inputId}-${row.id}`} className="text-sm font-medium">Attach document {index + 1}</label>
            <div className="flex flex-wrap items-center gap-2">
              <Input id={`${inputId}-${row.id}`} type="file"
                className="min-w-0 flex-1 basis-48 cursor-pointer py-0 pr-3 file:mr-3 file:h-full file:cursor-pointer file:rounded-lg file:bg-primary file:px-4 file:text-xs file:font-semibold file:tracking-widest file:text-primary-foreground file:uppercase file:transition-colors hover:file:bg-primary/80 focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:file:cursor-not-allowed" disabled={unavailable}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file && file.size > MAX_DOCUMENT_BYTES) {
                    event.target.value = "";
                    setMessage("Maximum file size is 300 MB.");
                    setDrafts((rows) => rows.map((draft) => draft.id === row.id ? { ...draft, file: null } : draft));
                    return;
                  }
                  setMessage("");
                  setDrafts((rows) => rows.map((draft) => draft.id === row.id ? { ...draft, file } : draft));
                }} />
              <Button type="button" size="sm" disabled={unavailable || !row.file}
                onClick={() => void run(async () => {
                  if (!row.file) return;
                  // Send the raw file body so the server can stream it without buffering.
                  const response = await fetch("/api/orders/" + orderId + "/documents", {
                    method: "POST",
                    headers: {
                      "Content-Type": row.file.type || "application/octet-stream",
                      "X-File-Name": encodeURIComponent(row.file.name),
                      "X-File-Size": String(row.file.size),
                    },
                    body: row.file,
                  });
                  const result = await response.json() as
                    | { ok: true; document: DocumentSummary }
                    | { ok: false; message: string };
                  if (!response.ok || !result.ok) {
                    setMessage(result.ok ? "Could not upload the document." : result.message);
                    return;
                  }
                  setDocuments((rows) => [...rows, result.document]);
                  setDrafts((rows) => rows.filter((draft) => draft.id !== row.id));
                  setMessage("Document attached.");
                })}>Attach</Button>
              <Button type="button" variant="outline" size="sm" disabled={unavailable}
                aria-label={`Remove attachment row ${index + 1}`}
                onClick={() => setDrafts((rows) => rows.filter((draft) => draft.id !== row.id))}>−</Button>
            </div>
          </div>
        ))}
        <Button type="button" disabled={unavailable}
          aria-label="Add document field" onClick={() => {
            const id = nextId.current++;
            setDrafts((rows) => [...rows, { id, file: null }]);
          }}>+</Button>
      </> : <p className="text-sm text-muted-foreground">Save this order, then reopen it to attach documents.</p>)}
      <p role="status" aria-live="polite" className="text-sm">{busy ? "Working…" : message}</p>
    </section>
  );
}
