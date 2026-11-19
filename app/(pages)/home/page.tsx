import Navbar from "@/components/view/navbar/navbar";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import { proposals, users } from "@/lib/drizzle/schema";
import { asc, eq } from "drizzle-orm";
import TableBody from "./TableBody";
import { Manrope } from "next/font/google";
import Link from "next/link";
import { Plus } from "lucide-react";
import { canEditProposal } from "@/lib/drizzle/proposal-access";
import { currentProposalDate } from "@/lib/drizzle/proposal-date";

export const metadata = { title: "Home" };

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Loads the signed-in profile and proposals; the client table handles filtering.
export default async function Home() {
  const user = await requireUser();
  const [[profile], proposalRows] = await Promise.all([
    user.email
      ? db
          .select({ name: users.name, status: users.status })
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1)
      : Promise.resolve([]),
    db.select().from(proposals).orderBy(asc(proposals.sl)),
  ]);
  const role = profile?.status ?? "";

  return (
    <div className={`flex min-h-screen flex-col bg-muted ${manrope.className}`}>
      {/* Navbar */}
      <Navbar />

      {/* Content  */}
      <div className="mx-auto w-full max-w-[1600px] flex-1 px-6 pt-4 pb-6 md:px-10 md:pb-10">
        {/* header */}
        <div className="mb-4 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-left text-[18px] font-normal tracking-wide text-black uppercase">
              HELLO{" "}
              <span className="font-extrabold">
                {profile?.name?.trim() || "USER"}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {canEditProposal(role, true) && (
              <Link
                href="/proposal_form"
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-bold tracking-wide text-white uppercase shadow-sm transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4.5 w-4.5" strokeWidth={2.5} />
                CREATE NEW PROPOSAL
              </Link>
            )}
          </div>
        </div>

        {/* Table*/}
        <TableBody
          proposals={proposalRows}
          role={role}
          currentYear={Number(currentProposalDate().slice(0, 4))}
        />
      </div>
    </div>
  );
}
