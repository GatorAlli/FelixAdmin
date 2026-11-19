"use client";

import { formatMoney } from "@/lib/format-money";
import type { Proposal } from "@/lib/drizzle/schema";
import { clsx } from "clsx";
import { useState, type ReactNode } from "react";
import YearSelect from "@/components/view/year-select";
import ProjectStatusBadge from "@/components/view/project-status-badge";
import {
  proposalsInYear,
  selectableYears,
  statusTotals,
} from "@/lib/drizzle/proposal-summary";
import {
  formatProposalDate,
  formatProposalEditDate,
} from "@/lib/drizzle/proposal-date";

// Every column in the summary, in order. Each reads one value from a proposal.
const columns: {
  heading: string;
  cell: (proposal: Proposal) => ReactNode;
  numeric?: boolean;
}[] = [
  { heading: "CREATED BY", cell: (p) => <strong>{p.createdBy}</strong> },
  {
    heading: "REFERENCE NO.",
    cell: (p) => <strong>{p.referenceNumber}</strong>,
  },
  {
    heading: "DATE CREATED",
    cell: (p) => formatProposalDate(p.createdDate),
    numeric: true,
  },
  { heading: "LAST EDITED BY", cell: (p) => p.lastEditedBy ?? "—" },
  {
    heading: "LAST EDITED AT",
    cell: (p) =>
      p.lastEditedAt ? formatProposalEditDate(p.lastEditedAt) : "—",
    numeric: true,
  },
  { heading: "PROJECT NAME", cell: (p) => p.projectName },
  { heading: "CLIENT NAME", cell: (p) => p.clientName },
  { heading: "END USER", cell: (p) => p.endUser },
  { heading: "CONSULTANT", cell: (p) => p.consultant },
  { heading: "SYSTEM", cell: (p) => p.system },
  {
    heading: "VALUE",
    cell: (p) => formatMoney(p.valueOriginal),
    numeric: true,
  },
  { heading: "CURRENCY", cell: (p) => p.valueCurrency },
  {
    heading: "VALUE (BDT)",
    cell: (p) => formatMoney(p.valueBdt),
    numeric: true,
  },
  {
    heading: "STATUS",
    cell: (p) => <ProjectStatusBadge status={p.projectStatus} />,
  },
  {
    heading: "FINALIZATION DATE",
    cell: (p) =>
      p.finalizationDate ? formatProposalDate(p.finalizationDate) : "",
    numeric: true,
  },
  { heading: "PROPOSAL NOTES", cell: (p) => p.proposalNotes },
  { heading: "USD TO BDT", cell: (p) => p.usdToBdtRate, numeric: true },
  { heading: "SGD TO BDT", cell: (p) => p.sgdToBdtRate, numeric: true },
  { heading: "EURO TO BDT", cell: (p) => p.eurToBdtRate, numeric: true },
  { heading: "GBP TO BDT", cell: (p) => p.gbpToBdtRate, numeric: true },
];

export default function TableBody({
  proposals,
  currentYear,
  heading,
}: {
  proposals: Proposal[];
  currentYear: number;
  heading: ReactNode;
}) {
  // Year filtering drives both the rows and the status totals.
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const visibleProposals = proposalsInYear(proposals, selectedYear);
  const totals = statusTotals(visibleProposals);

  const headerStyling = clsx(
    "px-4 py-4 text-left text-[13px] font-bold text-black uppercase whitespace-nowrap bg-white border-b border-r border-gray-200 sticky top-0 z-10",
  );
  const cellStyling = clsx(
    "px-4 py-3 text-left text-sm text-black whitespace-nowrap border-b border-r border-gray-200 group-hover:bg-gray-50 transition-colors",
  );

  // Render the year selector, scrollable table and compact status totals.
  return (
    <>
      <div className="mb-6 flex shrink-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        {heading}
        {/* Filter the original list so switching years restores the matching proposals. */}
        <YearSelect
          value={selectedYear}
          years={selectableYears(currentYear)}
          onChange={setSelectedYear}
          className="shrink-0"
        />
      </div>
      <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
        <div className="h-1.5 w-full shrink-0 bg-primary" />
        <div>
          <div
            className="summary-table-scroll min-h-0 w-full overflow-x-scroll overflow-y-auto focus-visible:outline-2 focus-visible:outline-ring"
            role="region"
            aria-label="Proposal summary table"
            tabIndex={0}
          >
            <table className="w-full border-collapse text-left">
              <thead className="bg-white">
                <tr>
                  <th className={headerStyling}>SL</th>
                  {columns.map((column) => (
                    <th className={headerStyling} key={column.heading}>
                      {column.heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {visibleProposals.map((proposal, index) => (
                  <tr className="group hover:bg-gray-50" key={proposal.sl}>
                    <td className={cellStyling}>{index + 1}</td>
                    {columns.map((column) => (
                      <td
                        key={column.heading}
                        className={clsx(
                          cellStyling,
                          column.numeric && "tabular-nums",
                        )}
                      >
                        {column.cell(proposal)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleProposals.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No proposals for this year yet.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex min-w-0 shrink-0 items-center gap-4 pt-4">
        <div
          className="h-10 w-max min-w-0 shrink [scrollbar-width:thin] overflow-x-auto overflow-y-hidden rounded-lg border border-input bg-white focus-visible:outline-2 focus-visible:outline-ring"
          role="region"
          aria-label="Proposal totals in BDT for selected year"
          tabIndex={0}
        >
          <div className="flex h-full w-max items-center divide-x divide-border text-sm whitespace-nowrap">
            {totals.map(({ status, count, totalBdt }) => (
              <div
                key={status}
                className="flex shrink-0 items-center gap-2 px-4"
              >
                <span className="font-semibold">
                  {status === "All" ? "Total" : status}
                </span>
                <span className="text-muted-foreground">({count})</span>
                <span className="tabular-nums">
                  {formatMoney(totalBdt)} BDT
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
