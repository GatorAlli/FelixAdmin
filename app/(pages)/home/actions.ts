"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import { proposals, users } from "@/lib/drizzle/schema";

// Checks admin permission, validates the batch and saves proposal editing access.
export async function saveProposalManagerAccess(
  changes: { proposalId: number; access: boolean }[],
) {
  const user = await requireUser();
  const [profile] = user.email
    ? await db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)
    : [];

  if (profile?.status !== "admin") {
    return {
      ok: false,
      message: "Only admins can change proposal editing access.",
    };
  }
  if (
    !Array.isArray(changes) ||
    !changes.length ||
    changes.some(
      (change) =>
        !change ||
        !Number.isInteger(change.proposalId) ||
        change.proposalId < 1 ||
        change.proposalId > 2147483647 ||
        typeof change.access !== "boolean",
    ) ||
    new Set(changes.map((change) => change.proposalId)).size !== changes.length
  ) {
    return { ok: false, message: "Invalid proposal access changes." };
  }

  try {
    // Save the entire batch together; missing proposals roll back every change.
    await db.transaction(async (transaction) => {
      const accessCases = changes.map(
        (change) =>
          sql`when ${proposals.sl} = ${change.proposalId} then ${change.access}::boolean`,
      );
      const updated = await transaction
        .update(proposals)
        .set({
          proposalManagerAccess: sql`case ${sql.join(accessCases, sql` `)} else ${proposals.proposalManagerAccess} end`,
        })
        .where(
          inArray(
            proposals.sl,
            changes.map((change) => change.proposalId),
          ),
        )
        .returning({ sl: proposals.sl });
      if (updated.length !== changes.length) transaction.rollback();
    });

    revalidatePath("/home");
    revalidatePath("/summary");
    for (const { proposalId } of changes)
      revalidatePath(`/proposal_form/${proposalId}`);
    return {
      ok: true,
      message: "Proposal editing access saved.",
    };
  } catch (error) {
    console.error("Unable to change proposal access", error);
    return {
      ok: false,
      message: "Could not save editing access. Please refresh and try again.",
    };
  }
}
