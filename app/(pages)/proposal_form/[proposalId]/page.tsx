import { getProposalDatalists } from "@/lib/drizzle/proposal-datalists";
import { currentProposalDate } from "@/lib/drizzle/proposal-date";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import PageBody from "../PageBody";
import { proposals, users, proposalDocuments } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export const metadata = { title: "Proposal Details" };

// Load one saved proposal and its document metadata for the shared form component.
export default async function ProposalDetails({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const user = await requireUser();

  const { proposalId } = await params;
  if (
    !/^\d+$/.test(proposalId) ||
    !Number.isSafeInteger(Number(proposalId)) ||
    Number(proposalId) < 1 ||
    Number(proposalId) > 2147483647
  )
    notFound();

  const [proposal] = await db
    .select()
    .from(proposals)
    .where(eq(proposals.sl, Number(proposalId)))
    .limit(1);
  if (!proposal) notFound();

  const [documents, [profile], datalists] = await Promise.all([
    db
      .select({
        id: proposalDocuments.id,
        title: proposalDocuments.title,
        originalName: proposalDocuments.originalName,
        sizeBytes: proposalDocuments.sizeBytes,
      })
      .from(proposalDocuments)
      .where(eq(proposalDocuments.proposalId, proposal.sl))
      .orderBy(proposalDocuments.createdAt),
    user.email
      ? db
          .select({ name: users.name, status: users.status })
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1)
      : Promise.resolve([]),
    getProposalDatalists(),
  ]);

  return (
    <div>
      <PageBody
        {...datalists}
        proposalDetails={proposal}
        initialDocuments={documents}
        role={profile?.status ?? ""}
        username={profile?.name?.trim() ?? ""}
        currentDate={currentProposalDate()}
      />
    </div>
  );
}
