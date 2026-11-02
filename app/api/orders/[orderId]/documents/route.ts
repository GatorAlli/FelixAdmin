import { randomUUID } from "node:crypto";
import { db } from "@/lib/drizzle/drizzle-index";
import { orderDocuments } from "@/lib/drizzle/schema";
import { readDocumentMetadata } from "@/lib/document-files";
import { documentAccess, hasDocumentOrigin, parseOrderId } from "@/lib/documents/access";
import { DocumentStorageError, writeDocument, removeDocumentFile } from "@/lib/documents/storage";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  if (!hasDocumentOrigin(request)) return Response.json({ ok: false, message: "Invalid request origin." }, { status: 403 });
  const orderId = parseOrderId((await context.params).orderId);
  if (!orderId) return Response.json({ ok: false, message: "Invalid order." }, { status: 400 });
  let savedPath: string | undefined;
  try {
    const access = await documentAccess(orderId, true, request.headers);
    if (!access.ok) return Response.json(access, { status: access.status });
    let name: string;
    try { name = decodeURIComponent(request.headers.get("x-file-name") || ""); }
    catch { return Response.json({ ok: false, message: "Invalid file name." }, { status: 400 }); }
    const metadata = readDocumentMetadata({
      name,
      type: request.headers.get("content-type") || "",
      size: Number(request.headers.get("x-file-size")),
    });
    if (!metadata.ok) return Response.json(metadata, { status: 400 });
    if (!request.body) return Response.json({ ok: false, message: "Choose a file first." }, { status: 400 });
    const storagePath = "orders/" + orderId + "/" + randomUUID();
    const sizeBytes = await writeDocument(storagePath, request.body, metadata.sizeBytes);
    savedPath = storagePath;
    // A role or access flag may have changed while a large file was uploading.
    const currentAccess = await documentAccess(orderId, true, request.headers);
    if (!currentAccess.ok) return Response.json(currentAccess, { status: currentAccess.status });
    const [document] = await db.insert(orderDocuments).values({
      orderId, storagePath, sizeBytes,
      title: metadata.originalName.slice(0, 120),
      originalName: metadata.originalName,
      mimeType: metadata.mimeType,
      uploadedBy: access.user.id,
    }).returning({
      id: orderDocuments.id, title: orderDocuments.title,
      originalName: orderDocuments.originalName, sizeBytes: orderDocuments.sizeBytes,
    });
    savedPath = undefined;
    return Response.json({ ok: true, document }, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentStorageError) {
      return Response.json({ ok: false, message: error.message }, { status: 400 });
    }
    console.error("Document upload failed", error);
    return Response.json({ ok: false, message: "Could not upload the document. Please try again." }, { status: 500 });
  } finally {
    // Remove a finished file if permissions or its database insert failed.
    if (savedPath) await removeDocumentFile(savedPath).catch(error => console.error("Upload cleanup failed", error));
  }
}
