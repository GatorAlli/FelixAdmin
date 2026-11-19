import { getProposalDatalists } from "@/lib/drizzle/proposal-datalists";
import { currentProposalDate } from "@/lib/drizzle/proposal-date";
import { requireUser } from "@/lib/betterAuth/session";
import PageBody from "./PageBody";
import { db } from "@/lib/drizzle/drizzle-index";
import { users } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { canEditProposal } from "@/lib/drizzle/proposal-access";

export const metadata = { title: "New Proposal" };

// Prepare a new proposal with the current profile, suggestions and Bangladesh date.
export default async function ProposalForm() {
  const user = await requireUser();
  const [profile] = user.email
    ? await db
        .select({ name: users.name, status: users.status })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)
    : [];
  const role = profile?.status ?? "";

  if (!canEditProposal(role, true)) redirect("/home");

  const datalists = await getProposalDatalists();

  return (
    <div>
      <PageBody
        {...datalists}
        role={role}
        username={profile?.name?.trim() ?? ""}
        currentDate={currentProposalDate()}
      />
    </div>
  );
}
