"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_DOCUMENT_BYTES } from "@/lib/document-files";
import type { DocumentSummary } from "@/lib/drizzle/schema";

export default function SupplierDocument({ orderId, rowKey, document, editable, disabled, onChange, onBusyChange }: {
  orderId?: number;
  rowKey?: string;
  document?: DocumentSummary;
  editable: boolean;
  disabled: boolean;
  onChange: (document: DocumentSummary | null) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const id = useId();
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run(task: () => Promise<void>) {
    if (locked.current || disabled) return;
    locked.current = true;
    setBusy(true);
    onBusyChange(true);
    setMessage("");
    try { await task(); }
    catch { setMessage("The request failed. Please try again."); }
    finally {
      locked.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  return <div className="flex min-w-0 flex-col gap-2" aria-busy={busy}>
    <label htmlFor={id} className="min-h-6 font-bold">Document</label>
    {document ? <div className="flex min-h-10 min-w-0 flex-wrap items-center gap-2">
      <a className="min-w-0 break-all text-sm underline" href={`/api/orders/${orderId}/documents/${document.id}`} download>
        {document.originalName}
      </a>
      {editable && <Button type="button" variant="outline" size="sm" disabled={busy || disabled}
        aria-label={`Remove ${document.originalName}`} onClick={() => void run(async () => {
          const response = await fetch(`/api/orders/${orderId}/documents/${document.id}`, { method: "DELETE" });
          const result = await response.json();
          if (!response.ok || !result.ok) { setMessage(result.message || "Could not remove the document."); return; }
          onChange(null);
        })}>Remove</Button>}
    </div> : editable ? <>
      <Input id={id} type="file" disabled={busy || disabled || !orderId || !rowKey}
        className="min-w-0 cursor-pointer py-0 file:mr-2 file:h-full file:cursor-pointer file:bg-primary file:px-3 file:text-primary-foreground"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (!file.size || file.size > MAX_DOCUMENT_BYTES) { setMessage("Choose a non-empty file no larger than 300 MB."); return; }
          void run(async () => {
            const response = await fetch(`/api/orders/${orderId}/documents`, {
              method: "POST",
              headers: {
                "Content-Type": file.type || "application/octet-stream",
                "X-File-Name": encodeURIComponent(file.name),
                "X-File-Size": String(file.size),
                "X-Supplier-Row-Key": encodeURIComponent(rowKey!),
              },
              body: file,
            });
            const result = await response.json();
            if (!response.ok || !result.ok) { setMessage(result.message || "Could not upload the document."); return; }
            onChange(result.document);
          });
        }} />
      {(!orderId || !rowKey) && <p className="text-xs text-muted-foreground">Save this row to attach a document.</p>}
    </> : <span className="text-sm text-muted-foreground">No document</span>}
    {(busy || message) && <p role="status" className="text-xs">{busy ? "Working…" : message}</p>}
  </div>;
}
