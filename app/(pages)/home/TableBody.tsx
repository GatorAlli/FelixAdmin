"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/format-money";
import type { Order } from "@/lib/drizzle/schema";
import { clsx } from "clsx";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { saveOrderManagerAccess } from "./actions";

export default function TableBody({
  orders,
  currentYear,
  adminStatus,
}: {
  orders: Order[];
  currentYear: number;
  adminStatus: string;
}) {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [isSavingAccess, startAccessTransition] = useTransition();
  const [accessMessage, setAccessMessage] = useState("");
  const [accessError, setAccessError] = useState(false);
  const [pendingAccess, setPendingAccess] = useState<Record<number, boolean>>(
    {},
  );
  const accessChanges = Object.entries(pendingAccess).map(
    ([orderId, access]) => ({
      orderId: Number(orderId),
      access,
    }),
  );

  useEffect(() => {
    if (!accessMessage) return;
    const timer = window.setTimeout(() => setAccessMessage(""), 5000);
    return () => window.clearTimeout(timer);
  }, [accessMessage]);
  // Derive rows from fresh server props so access changes survive year filtering.
  const orderArray =
    selectedYear === "all"
      ? orders
      : orders.filter((order) =>
          order.felixOrderRef.startsWith(`FCL/FPO/${selectedYear}/`),
        );

  function changeAccess(order: Order, revoked: boolean) {
    setAccessMessage("");
    setPendingAccess((current) => {
      const next = { ...current };
      const access = !revoked;
      if (access === order.orderManagerAccess) delete next[order.sl];
      else next[order.sl] = access;
      return next;
    });
  }

  function saveAccess() {
    if (adminStatus !== "admin" || !accessChanges.length || isSavingAccess)
      return;
    setAccessMessage("");
    setAccessError(false);
    startAccessTransition(async () => {
      try {
        const result = await saveOrderManagerAccess(accessChanges);
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
  const years = Array.from(
    { length: currentYear - 2024 + 1 },
    (_, index) => 2024 + index,
  );

  const headerStyling = clsx(
    "px-4 py-4 text-left text-[13px] font-bold text-black uppercase whitespace-nowrap bg-white border-b border-r border-gray-200 sticky top-0 z-10",
  );

  const cellStyling = clsx(
    "px-4 py-3 text-sm text-black whitespace-nowrap border-b border-r border-gray-200 group-hover:bg-gray-50 transition-colors",
  );

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className={headerStyling}>SL</th>
                <th className={headerStyling}>CREATED BY</th>
                <th className={headerStyling}>ORDER NO.</th>
                <th className={headerStyling}>CLIENT ORDER VALUE</th>
                <th className={headerStyling}>PROJECT NAME</th>
                <th className={headerStyling}>CLIENT NAME</th>
                <th className={headerStyling}>END USER</th>
                {adminStatus === "admin" ? (
                  <th className={headerStyling}>REVOKE ACCESS</th>
                ) : (
                  <></>
                )}
                <th className={headerStyling}></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {orderArray.map((e, key) => (
                <tr className="hover:bg-gray-50 group" key={e.sl}>
                  <td className={cellStyling}>{key + 1}</td>
                  <td className={cellStyling}>
                    <span className="font-extrabold text-black">
                      {e.createdBy}
                    </span>
                  </td>
                  <td className={`${cellStyling} font-bold text-black`}>
                    {e.felixOrderRef}
                  </td>
                  <td className={clsx(cellStyling, "text-right tabular-nums")}>{formatMoney(e.clientOrderValue)}</td>
                  <td className={cellStyling}>{e.projectName}</td>
                  <td className={cellStyling}>{e.clientName}</td>
                  <td className={cellStyling}>{e.endUser}</td>
                  {adminStatus === "admin" ? (
                    <td className={`${cellStyling}`}>
                      <Checkbox
                        checked={!(pendingAccess[e.sl] ?? e.orderManagerAccess)}
                        disabled={isSavingAccess}
                        aria-label={`Revoke access for ${e.felixOrderRef}`}
                        onCheckedChange={(checked) => changeAccess(e, checked)}
                      />
                    </td>
                  ) : (
                    <></>
                  )}
                  <td className={`${cellStyling} text-right pr-6`}>
                    <Link
                      href={`/order_form/${e.sl}`}
                      className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-[13px] font-bold uppercase tracking-wide transition-colors inline-block"
                    >
                      VIEW
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 pt-4">
        <div>
          {/* Filter the original list so switching years restores the matching orders. */}
          <Select
            value={selectedYear}
            items={[
              { value: "all", label: "All Years" },
              ...years.map((year) => ({
                value: String(year),
                label: String(year),
              })),
            ]}
            onValueChange={(year) => {
              if (year === null) return;
              setSelectedYear(year);
            }}
          >
            <SelectTrigger className="w-45 bg-white" aria-label="Select year">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {adminStatus === "admin" && (
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
