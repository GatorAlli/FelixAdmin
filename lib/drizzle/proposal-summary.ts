// Browser-safe helpers shared by the Home and Summary tables.
import type { Proposal } from "./schema";
import { referenceYearPrefix } from "./proposal-reference";
import { projectStatuses, type ProjectStatus } from "./project-status";
import { sumMoneyAmounts } from "../format-money";

// The year filter offers every year from the first one up to the current year.
export const FIRST_PROPOSAL_YEAR = 2024;

export function selectableYears(currentYear: number): number[] {
  return Array.from(
    { length: Math.max(currentYear - FIRST_PROPOSAL_YEAR + 1, 1) },
    (_, index) => FIRST_PROPOSAL_YEAR + index,
  );
}

// "all" keeps every row; a year keeps rows whose reference starts with that year.
export function proposalsInYear<T extends Pick<Proposal, "referenceNumber">>(
  rows: T[],
  year: string,
): T[] {
  if (year === "all") return rows;
  const prefix = referenceYearPrefix(year);
  return rows.filter((row) => row.referenceNumber.startsWith(prefix));
}

export type StatusTotal = {
  status: ProjectStatus | "All";
  count: number;
  totalBdt: string;
};

// One entry per status, then a grand total. Blank values add nothing.
export function statusTotals(
  rows: Pick<Proposal, "projectStatus" | "valueBdt">[],
): StatusTotal[] {
  const byStatus = projectStatuses.map((status) => {
    const matching = rows.filter((row) => row.projectStatus === status);
    return {
      status,
      count: matching.length,
      totalBdt: sumMoneyAmounts(matching.map((row) => row.valueBdt)),
    };
  });
  return [
    ...byStatus,
    {
      status: "All",
      count: rows.length,
      totalBdt: sumMoneyAmounts(rows.map((row) => row.valueBdt)),
    },
  ];
}
