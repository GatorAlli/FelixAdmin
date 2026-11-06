import type { DocumentSummary } from "./drizzle/schema";

// Called only after the order save succeeds. Files stay outside Server Action payloads.
export async function uploadOrderDocument(
  orderId: number,
  file: File,
  supplierRowKey?: string,
): Promise<DocumentSummary> {
  const response = await fetch(`/api/orders/${orderId}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
      "X-File-Size": String(file.size),
      ...(supplierRowKey
        ? { "X-Supplier-Row-Key": encodeURIComponent(supplierRowKey) }
        : {}),
    },
    body: file,
  });
  const result = (await response.json()) as {
    ok: boolean;
    document?: DocumentSummary;
    message?: string;
  };
  if (!response.ok || !result.ok || !result.document)
    throw new Error(result.message || `Could not upload ${file.name}.`);
  return result.document;
}
