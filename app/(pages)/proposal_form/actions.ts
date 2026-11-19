"use server";

import { and, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import { proposals, users } from "@/lib/drizzle/schema";
import { revalidatePath } from "next/cache";
import { readProposalValues } from "@/lib/drizzle/proposal-values";
import { currentProposalDate } from "@/lib/drizzle/proposal-date";
import { nextProposalReference } from "@/lib/drizzle/next-proposal-reference";
import { canEditProposal } from "@/lib/drizzle/proposal-access";

// Both save actions use the signed-in profile and the same form validation.
async function prepareProposal(formData: FormData) {
  const currentUser = await requireUser();
  const [userProfile] = currentUser.email
    ? await db
        .select({ name: users.name, status: users.status })
        .from(users)
        .where(eq(users.email, currentUser.email))
        .limit(1)
    : [];

  if (!canEditProposal(userProfile?.status, true)) {
    return {
      ok: false as const,
      message: "You do not have permission to save proposals.",
    };
  }

  const username = userProfile?.name?.trim();
  if (!username) {
    return {
      ok: false as const,
      message:
        "Your account has no username. Please have your user profile name set before saving.",
    };
  }

  const validatedProposal = readProposalValues(formData, username);
  return { ...validatedProposal, status: userProfile?.status };
}

export async function createProposal(formData: FormData) {
  const preparedProposal = await prepareProposal(formData);
  if (!preparedProposal.ok) return preparedProposal;

  // The reference and Bangladesh creation date are assigned only to new proposals.
  const createdDate = currentProposalDate();
  try {
    // Allocate the reference and insert together so concurrent saves cannot reuse it.
    const created = await db.transaction(
      async (transaction) => {
        const referenceNumber = await nextProposalReference(
          transaction,
          createdDate,
        );
        const [row] = await transaction
          .insert(proposals)
          .values({
            ...preparedProposal.values,
            createdDate,
            referenceNumber,
            proposalManagerAccess: true,
          })
          .returning({ id: proposals.sl });

        return { reference: referenceNumber, id: row.id };
      },
      { isolationLevel: "read committed" },
    );

    // Refresh the proposal lists after the database write succeeds.
    revalidatePath("/home");
    revalidatePath("/summary");
    return {
      ok: true,
      message: `Proposal created: ${created.reference}`,
      createdDate,
      proposalId: created.id,
    };
  } catch (error) {
    console.error("Unable to create proposal", error);
    return {
      ok: false,
      message: "Could not save the proposal. Please try again.",
    };
  }
}

// Update only the existing row identified by its primary key.
export async function updateProposal(proposalId: number, formData: FormData) {
  // Authentication is checked even when the supplied proposal ID is invalid.
  const preparedProposal = await prepareProposal(formData);
  if (
    !Number.isInteger(proposalId) ||
    proposalId < 1 ||
    proposalId > 2147483647
  ) {
    return { ok: false, message: "Invalid proposal ID." };
  }

  if (!preparedProposal.ok) return preparedProposal;

  // The authenticated saver becomes the editor; the original creator stays unchanged.
  const { createdBy: lastEditedBy, ...editableValues } =
    preparedProposal.values;

  try {
    const [updatedProposal] = await db
      .update(proposals)
      .set({ ...editableValues, lastEditedBy, lastEditedAt: sql`now()` })
      .where(
        and(
          eq(proposals.sl, proposalId),
          preparedProposal.status === "admin"
            ? undefined
            : eq(proposals.proposalManagerAccess, true),
        ),
      )
      .returning({ referenceNumber: proposals.referenceNumber });

    if (!updatedProposal) {
      return {
        ok: false,
        message: "Proposal not found or your editing access has been revoked.",
      };
    }

    revalidatePath("/summary");
    revalidatePath("/home");
    revalidatePath(`/proposal_form/${proposalId}`);
    return {
      ok: true,
      message: `Proposal updated: ${updatedProposal.referenceNumber}`,
    };
  } catch (error) {
    console.error("Unable to update proposal", error);
    return {
      ok: false,
      message: "Could not update the proposal. Please try again.",
    };
  }
}
