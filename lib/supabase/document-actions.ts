"use server";

import { randomUUID } from "node:crypto";
import { signDocumentUpload, verifyDocumentUpload } from "@/lib/document-upload-ticket";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/drizzle/drizzle-index";
import { data, users, orderDocuments } from "@/lib/drizzle/schema";
import { canEditOrder } from "@/lib/drizzle/order-access";
import { readDocumentMetadata, type DocumentUploadMetadata } from "@/lib/document-files";
import { requireUser } from "./auth";
import { getStorageAdmin } from "./storage-admin";

const BUCKET = "order-documents";
const documentFields = {
  id: orderDocuments.id,
  title: orderDocuments.title,
  originalName: orderDocuments.originalName,
  sizeBytes: orderDocuments.sizeBytes,
};

// Downloads require a session; uploads and removals also check editing permission.
async function requireOrderAccess(orderId: number, editing: boolean) {
  const user = await requireUser();

  if (!Number.isInteger(orderId) || orderId < 1 || orderId > 2147483647) {
    return { ok: false as const, message: "Invalid order." };
  }

  const [order] = await db.select({ editable: data.orderManagerAccess })
    .from(data).where(eq(data.sl, orderId)).limit(1);
  if (!order) return { ok: false as const, message: "Order not found." };

  if (editing) {
    const [profile] = user.email
      ? await db.select({ status: users.status }).from(users)
          .where(eq(users.email, user.email)).limit(1)
      : [];
    if (!canEditOrder(profile?.status, order.editable)) {
      return { ok: false as const, message: "You cannot change this order's documents." };
    }
  }
  return { ok: true as const, user };
}

async function findDocument(orderId: number, documentId: string) {
  if (typeof documentId !== "string" ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(documentId)) return;
  const [document] = await db.select().from(orderDocuments).where(and(
    eq(orderDocuments.id, documentId), eq(orderDocuments.orderId, orderId),
  )).limit(1);
  return document;
}

function ticketSecret() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Supabase Storage environment variables are missing.");
  return secret;
}

// Authorize the upload and issue a Storage URL plus a signed completion ticket.
export async function prepareDocumentUpload(orderId: number, metadata: DocumentUploadMetadata) {
  const access = await requireOrderAccess(orderId, true);
  if (!access.ok) return access;
  const parsed = readDocumentMetadata(metadata);
  if (!parsed.ok) return parsed;
  const storagePath = `orders/${orderId}/${randomUUID()}`;
  const { data: signed, error } = await getStorageAdmin().storage.from(BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });
  if (error || !signed) {
    console.error("Document upload preparation failed", error);
    return { ok: false as const, message: "Could not prepare the upload. Please try again." };
  }
  // The ticket binds completion to the authorized user, order, path and file size.
  const ticket = signDocumentUpload({
    orderId, userId: access.user.id, storagePath,
    originalName: parsed.originalName, mimeType: parsed.mimeType,
    sizeBytes: parsed.sizeBytes, expiresAt: Date.now() + 2 * 60 * 60 * 1000,
  }, ticketSecret());
  return { ok: true as const, storagePath, token: signed.token, ticket, mimeType: parsed.mimeType };
}

// Verify the uploaded object before adding its metadata to the order.
export async function completeDocumentUpload(orderId: number, ticket: string) {
  const access = await requireOrderAccess(orderId, true);
  if (!access.ok) return access;
  const upload = verifyDocumentUpload(ticket, ticketSecret(), orderId, access.user.id);
  if (!upload) return { ok: false as const, message: "The upload expired or is invalid. Please attach the file again." };
  const [existing] = await db.select(documentFields).from(orderDocuments)
    .where(and(eq(orderDocuments.storagePath, upload.storagePath), eq(orderDocuments.orderId, orderId))).limit(1);
  if (existing) return { ok: true as const, document: existing };

  // Read actual object size from Storage rather than trusting browser metadata.
  const { data: info, error } = await getStorageAdmin().storage.from(BUCKET).info(upload.storagePath);
  if (error || !info || info.size !== upload.sizeBytes) {
    console.error("Document upload verification failed", error);
    return { ok: false as const, message: "Could not verify the uploaded file. Please try again." };
  }
  try {
    const [saved] = await db.insert(orderDocuments).values({
      orderId, title: upload.originalName.slice(0, 120), originalName: upload.originalName,
      storagePath: upload.storagePath, mimeType: upload.mimeType,
      sizeBytes: info.size, uploadedBy: access.user.id,
    }).onConflictDoNothing({ target: orderDocuments.storagePath }).returning(documentFields);
    const [document] = saved ? [saved] : await db.select(documentFields).from(orderDocuments)
      .where(and(eq(orderDocuments.storagePath, upload.storagePath), eq(orderDocuments.orderId, orderId))).limit(1);
    if (!document) throw new Error("Document metadata was not saved.");
    return { ok: true as const, document };
  } catch (error) {
    console.error("Document metadata save failed", error);
    return { ok: false as const, message: "Could not save this attachment. Please try again." };
  }
}

export async function cancelDocumentUpload(orderId: number, ticket: string) {
  // A user may clean up their own unfinished upload even if editing was revoked.
  const access = await requireOrderAccess(orderId, false);
  if (!access.ok) return access;
  const upload = verifyDocumentUpload(ticket, ticketSecret(), orderId, access.user.id);
  if (!upload) return { ok: false as const, message: "Invalid upload." };
  const [saved] = await db.select({ id: orderDocuments.id }).from(orderDocuments)
    .where(eq(orderDocuments.storagePath, upload.storagePath)).limit(1);
  // Never delete a completed document when a completion response was lost.
  if (saved) return { ok: true as const };
  const { error } = await getStorageAdmin().storage.from(BUCKET).remove([upload.storagePath]);
  if (error) console.error("Unfinished document cleanup failed", error);
  return error ? { ok: false as const, message: "Could not clean up the unfinished upload." }
    : { ok: true as const };
}

// Return a temporary download URL after checking access to the order.
export async function getDocumentDownload(orderId: number, documentId: string) {
  const access = await requireOrderAccess(orderId, false);
  if (!access.ok) return access;
  const document = await findDocument(orderId, documentId);
  if (!document) return { ok: false as const, message: "Document not found." };
  const { data: signed, error } = await getStorageAdmin().storage.from(BUCKET)
    .createSignedUrl(document.storagePath, 60, { download: document.originalName });
  if (error || !signed) {
    console.error("Document download failed", error);
    return { ok: false as const, message: "Could not prepare the download." };
  }
  return { ok: true as const, url: signed.signedUrl };
}

export async function removeDocument(orderId: number, documentId: string) {
  const access = await requireOrderAccess(orderId, true);
  if (!access.ok) return access;
  const document = await findDocument(orderId, documentId);
  if (!document) return { ok: false as const, message: "Document not found. Reload the page." };
  const { error } = await getStorageAdmin().storage.from(BUCKET).remove([document.storagePath]);
  if (error) {
    console.error("Document removal failed", error);
    return { ok: false as const, message: "Could not remove this attachment. Please try again." };
  }
  try {
    await db.delete(orderDocuments).where(and(
      eq(orderDocuments.id, documentId), eq(orderDocuments.orderId, orderId),
    ));
    return { ok: true as const };
  } catch (error) {
    console.error("Document record removal failed", error);
    return { ok: false as const, message: "The file was removed, but its record could not be cleared. Please retry removal." };
  }
}
