import { Readable } from "node:stream";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/drizzle/drizzle-index";
import { proposalDocuments } from "@/lib/drizzle/schema";
import {
  documentAccess,
  hasDocumentOrigin,
  parseProposalId,
} from "@/lib/documents/access";
import {
  isMissingDocument,
  openDocument,
  removeDocumentFile,
} from "@/lib/documents/storage";

export const runtime = "nodejs";

type Context = { params: Promise<{ proposalId: string; documentId: string }> };

async function findDocument(
  request: Request,
  context: Context,
  editing: boolean,
) {
  const params = await context.params;
  const proposalId = parseProposalId(params.proposalId);
  if (
    !proposalId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.documentId,
    )
  ) {
    return { ok: false as const, status: 400, message: "Invalid document." };
  }
  const access = await documentAccess(proposalId, editing, request.headers);
  if (!access.ok) return access;
  const [document] = await db
    .select()
    .from(proposalDocuments)
    .where(
      and(
        eq(proposalDocuments.id, params.documentId),
        eq(proposalDocuments.proposalId, proposalId),
      ),
    )
    .limit(1);
  if (!document)
    return { ok: false as const, status: 404, message: "Document not found." };
  return { ok: true as const, document };
}

export async function GET(request: Request, context: Context) {
  try {
    const result = await findDocument(request, context, false);
    if (!result.ok) return Response.json(result, { status: result.status });
    const file = await openDocument(result.document.storagePath);
    const name = encodeURIComponent(result.document.originalName).replace(
      /['()*]/g,
      (character) => "%" + character.charCodeAt(0).toString(16).toUpperCase(),
    );
    return new Response(
      Readable.toWeb(file.stream) as ReadableStream<Uint8Array>,
      {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition":
            "attachment; filename=\"document\"; filename*=UTF-8''" + name,
          "Content-Length": String(file.size),
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    if (isMissingDocument(error))
      return Response.json(
        { ok: false, message: "Document file not found." },
        { status: 404 },
      );
    console.error("Document download failed", error);
    return Response.json(
      { ok: false, message: "Could not download the document." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!hasDocumentOrigin(request))
    return Response.json(
      { ok: false, message: "Invalid request origin." },
      { status: 403 },
    );
  try {
    const result = await findDocument(request, context, true);
    if (!result.ok) return Response.json(result, { status: result.status });
    await removeDocumentFile(result.document.storagePath);
    await db
      .delete(proposalDocuments)
      .where(
        and(
          eq(proposalDocuments.id, result.document.id),
          eq(proposalDocuments.proposalId, result.document.proposalId),
        ),
      );
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Document removal failed", error);
    return Response.json(
      {
        ok: false,
        message: "Could not remove the document. Please try again.",
      },
      { status: 500 },
    );
  }
}
