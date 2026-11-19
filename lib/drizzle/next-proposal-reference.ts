import { sql } from "drizzle-orm";
import { proposals } from "./schema";
import {
  formatProposalReference,
  referenceYearPrefix,
} from "./proposal-reference";
import type { db } from "./drizzle-index";

type ProposalTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Call inside the same transaction that inserts the proposal. The lock stays held
// until commit/rollback, so another submission cannot allocate the same number.
export async function nextProposalReference(
  transaction: ProposalTransaction,
  createdDate: string,
): Promise<string> {
  // createdDate already uses Bangladesh time, including New Year's midnight.
  const year = Number(createdDate.slice(0, 4));
  const lockNamespace = 0x465154; // "FQT"; each year gets its own lock.
  await transaction.execute(
    sql`select pg_advisory_xact_lock(${lockNamespace}::integer, ${year}::integer)`,
  );

  const [latest] = await transaction
    .select({
      lastNumber: sql<string>`coalesce(max(split_part(${proposals.referenceNumber}, '/', 4)::numeric), 0)::text`,
    })
    .from(proposals)
    .where(
      sql`${proposals.referenceNumber} ~ ${`^${referenceYearPrefix(year)}[0-9]+$`}`,
    );

  return formatProposalReference(year, BigInt(latest.lastNumber) + BigInt("1"));
}
