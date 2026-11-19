import "server-only";

import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { proposals, users } from "@/lib/drizzle/schema";
import { canEditProposal } from "@/lib/drizzle/proposal-access";

export function parseProposalId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

export function hasDocumentOrigin(request: Request) {
  const expected = new URL(process.env.BETTER_AUTH_URL || request.url).origin;
  return request.headers.get("origin") === expected;
}

// Any signed-in user may download; changing documents needs edit permission.
export async function documentAccess(
  proposalId: number,
  editing: boolean,
  headers: Headers,
) {
  const session = await auth.api.getSession({
    headers,
    query: { disableRefresh: true },
  });
  if (!session)
    return {
      ok: false as const,
      status: 401,
      message: "Your session expired. Please sign in again.",
    };
  const [proposal] = await db
    .select({ editable: proposals.proposalManagerAccess })
    .from(proposals)
    .where(eq(proposals.sl, proposalId))
    .limit(1);
  if (!proposal)
    return { ok: false as const, status: 404, message: "Proposal not found." };
  if (editing) {
    const [profile] = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);
    if (!canEditProposal(profile?.status, proposal.editable)) {
      return {
        ok: false as const,
        status: 403,
        message: "You cannot change this proposal's documents.",
      };
    }
  }
  return { ok: true as const, user: session.user };
}
