import Navbar from "@/components/view/navbar/navbar";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import { proposals } from "@/lib/drizzle/schema";
import { asc } from "drizzle-orm";
import { currentProposalDate } from "@/lib/drizzle/proposal-date";
import TableBody from "./TableBody";
import { Sora, Manrope } from "next/font/google";
export const metadata = { title: "Proposal Summary" };

const sora = Sora({
  subsets: ["latin"],
  weight: ["600"],
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Fetch every proposal after checking the session; the table filters by year.
export default async function Summary() {
  await requireUser();
  const proposalRows = await db
    .select()
    .from(proposals)
    .orderBy(asc(proposals.sl));
  return (
    <div
      className={`flex h-dvh min-h-0 flex-col overflow-hidden bg-muted [&>nav]:shrink-0 ${manrope.className}`}
    >
      {/* Navbar */}
      <Navbar />
      {/* Main */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-6 md:p-10">
        <TableBody
          proposals={proposalRows}
          currentYear={Number(currentProposalDate().slice(0, 4))}
          heading={
            <div>
              <h1
                className={`py-1 pr-4 text-[32px] text-black ${sora.className}`}
              >
                Proposal Workspace
              </h1>
              <p className="mt-1 text-[15px] font-medium text-black">
                Comprehensive overview of all proposals, their status and value.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
