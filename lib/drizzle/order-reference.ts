import { sql } from "drizzle-orm";
import { data } from "./schema";
import type { db } from "./drizzle-index";

type OrderTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function formatOrderReference(year: number, sequence: bigint): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999 || sequence < BigInt("1")) {
    throw new RangeError("Invalid order reference year or sequence.");
  }
  return `FCL/FPO/${year}/${sequence.toString().padStart(3, "0")}`;
}

// Call inside the same transaction that inserts the order. The lock stays held
// until commit/rollback, so another submission cannot allocate the same number.
export async function nextOrderReference(
  transaction: OrderTransaction,
  createdDate: string,
): Promise<string> {
  // createdDate already uses Bangladesh time, including New Year's midnight.
  const year = Number(createdDate.slice(0, 4));
  const lockNamespace = 0x46434c; // "FCL"; each year gets its own lock.
  await transaction.execute(
    sql`select pg_advisory_xact_lock(${lockNamespace}::integer, ${year}::integer)`,
  );

  const [latest] = await transaction
    .select({
      lastNumber: sql<string>`coalesce(max(split_part(${data.felixOrderRef}, '/', 4)::numeric), 0)::text`,
    })
    .from(data)
    .where(sql`${data.felixOrderRef} ~ ${`^FCL/FPO/${year}/[0-9]+$`}`);

  return formatOrderReference(year, BigInt(latest.lastNumber) + BigInt("1"));
}
