// Browser-safe reference helpers. Allocation lives in next-proposal-reference.ts.
export const REFERENCE_PREFIX = "FCL/Quote";

// Used by year filters: every 2026 proposal starts with "FCL/Quote/2026/".
export function referenceYearPrefix(year: number | string): string {
  return `${REFERENCE_PREFIX}/${year}/`;
}

export function formatProposalReference(
  year: number,
  sequence: bigint,
): string {
  if (
    !Number.isInteger(year) ||
    year < 1000 ||
    year > 9999 ||
    sequence < BigInt("1")
  ) {
    throw new RangeError("Invalid proposal reference year or sequence.");
  }
  return `${referenceYearPrefix(year)}${sequence.toString().padStart(3, "0")}`;
}
