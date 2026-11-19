"use client";

import { useTransientMessage } from "@/lib/use-transient-message";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/format-money";
import type { Proposal } from "@/lib/drizzle/schema";
import { clsx } from "clsx";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import YearSelect from "@/components/view/year-select";
import ProjectStatusBadge from "@/components/view/project-status-badge";
import {
  proposalsInYear,
  selectableYears,
} from "@/lib/drizzle/proposal-summary";
import {
  formatProposalDate,
  formatProposalEditDate,
} from "@/lib/drizzle/proposal-date";
import { saveProposalManagerAccess } from "./actions";

export default function TableBody({
  proposals,
  currentYear,
  role,
}: {
  proposals: Proposal[];
  currentYear: number;
  role: string;
}) {
  // Track the selected year and editing-access changes that have not been saved.
  const router = useRouter();
  const isAdmin = role === "admin";
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [isSavingAccess, startAccessTransition] = useTransition();
  const [accessMessage, setAccessMessage] = useTransientMessage();
  const [accessError, setAccessError] = useState(false);
  const [pendingAccess, setPendingAccess] = useState<Record<number, boolean>>(
    {},
  );
  const accessChanges = Object.entries(pendingAccess).map(
    ([proposalId, access]) => ({
      proposalId: Number(proposalId),
      access,
    }),
  );

  // Derive rows from fresh server props so access changes survive year filtering.
  const visibleProposals = proposalsInYear(proposals, selectedYear);

  // Only keep changes that differ from the saved proposal settings.
  function changeAccess(proposal: Proposal, revoked: boolean) {
    setAccessMessage("");
    setPendingAccess((current) => {
      const next = { ...current };
      const access = !revoked;
      if (access === proposal.proposalManagerAccess) delete next[proposal.sl];
      else next[proposal.sl] = access;
      return next;
    });
  }

  // Send the pending batch to the admin-only server action.
  function saveAccess() {
    if (!isAdmin || !accessChanges.length || isSavingAccess) return;
    setAccessMessage("");
    setAccessError(false);
    startAccessTransition(async () => {
      try {
        const result = await saveProposalManagerAccess(accessChanges);
        setAccessMessage(result.message);
        setAccessError(!result.ok);
        if (result.ok) {
          setPendingAccess({});
          router.refresh();
        }
      } catch {
        setAccessMessage("Could not save editing access. Please try again.");
        setAccessError(true);
      }
    });
  }

  const headerStyling = clsx(
    "px-4 py-4 text-left text-[13px] font-bold text-black uppercase whitespace-nowrap bg-white border-b border-r border-gray-200 sticky top-0 z-10",
  );

  const cellStyling = clsx(
    "px-4 py-3 text-left text-sm text-black whitespace-nowrap border-b border-r border-gray-200 group-hover:bg-gray-50 transition-colors",
  );

  // Render the filtered proposals, access controls and year selector.
  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className={headerStyling}>SL</th>
                <th className={headerStyling}>CREATED BY</th>
                <th className={headerStyling}>REFERENCE NO.</th>
                <th className={headerStyling}>DATE CREATED</th>
                <th className={headerStyling}>LAST EDITED</th>
                <th className={headerStyling}>PROJECT NAME</th>
                <th className={headerStyling}>CLIENT NAME</th>
                <th className={headerStyling}>STATUS</th>
                <th className={headerStyling}>VALUE (BDT)</th>
                {isAdmin && <th className={headerStyling}>REVOKE ACCESS</th>}
                <th className={headerStyling}></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {visibleProposals.map((e, key) => (
                <tr className="group hover:bg-gray-50" key={e.sl}>
                  <td className={cellStyling}>{key + 1}</td>
                  <td className={cellStyling}>
                    <span className="font-extrabold text-black">
                      {e.createdBy}
                    </span>
                  </td>
                  <td className={`${cellStyling} font-bold text-black`}>
                    {e.referenceNumber}
                  </td>
                  <td className={clsx(cellStyling, "tabular-nums")}>
                    {formatProposalDate(e.createdDate)}
                  </td>
                  <td className={clsx(cellStyling, "tabular-nums")}>
                    {e.lastEditedAt
                      ? formatProposalEditDate(e.lastEditedAt)
                      : "—"}
                  </td>
                  <td className={cellStyling}>{e.projectName}</td>
                  <td className={cellStyling}>{e.clientName}</td>
                  <td className={cellStyling}>
                    <ProjectStatusBadge status={e.projectStatus} />
                  </td>
                  <td className={clsx(cellStyling, "text-left tabular-nums")}>
                    {formatMoney(e.valueBdt)}
                  </td>
                  {isAdmin && (
                    <td className={cellStyling}>
                      <Checkbox
                        checked={
                          !(pendingAccess[e.sl] ?? e.proposalManagerAccess)
                        }
                        disabled={isSavingAccess}
                        aria-label={`Revoke access for ${e.referenceNumber}`}
                        onCheckedChange={(checked) => changeAccess(e, checked)}
                      />
                    </td>
                  )}
                  <td className={`${cellStyling} pr-6 text-left`}>
                    <Link
                      href={`/proposal_form/${e.sl}`}
                      className="inline-block rounded-lg bg-primary px-6 py-2 text-[13px] font-bold tracking-wide text-white uppercase transition-colors hover:bg-primary/90"
                    >
                      VIEW
                    </Link>
                  </td>
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

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 pt-4">
        {/* Filter the original list so switching years restores the matching proposals. */}
        <YearSelect
          value={selectedYear}
          years={selectableYears(currentYear)}
          onChange={setSelectedYear}
        />
        {isAdmin && (
          <Button
            type="button"
            className="ml-auto"
            onClick={saveAccess}
            disabled={isSavingAccess || !accessChanges.length}
          >
            {isSavingAccess ? "Saving…" : "Save Access"}
          </Button>
        )}
      </div>
      {accessMessage && (
        <p role={accessError ? "alert" : "status"} className="pt-3 text-sm">
          {accessMessage}
        </p>
      )}
    </>
  );
}
