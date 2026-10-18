"use client";

import { useState } from "react";
import Link from "next/link";
import type { Order } from "@/lib/drizzle/schema";
import { clsx } from "clsx";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function TableBody({ orders, currentYear }: { orders: Order[]; currentYear: number }) {
  const [orderArray, setOrderArray] = useState(orders);
  const years = Array.from({ length: currentYear - 2024 + 1 }, (_, index) => 2024 + index);

  const headerStyling = clsx(
    "px-4 py-4 text-left text-[13px] font-bold text-black uppercase whitespace-nowrap bg-white border-b border-r border-gray-200 sticky top-0 z-10"
  );
  
  const cellStyling = clsx(
    "px-4 py-3 text-sm text-black whitespace-nowrap border-b border-r border-gray-200 group-hover:bg-gray-50 transition-colors"
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
              <th className={headerStyling}></th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {orderArray.map((e) => (
              <tr className="hover:bg-gray-50 group" key={e.sl}>
                <td className={cellStyling}>{e.sl}</td>
                <td className={cellStyling}>
                  <span className="font-extrabold text-black">
                    {e.createdBy}
                  </span>
                </td>
                <td className={`${cellStyling} font-bold text-black`}>{e.felixOrderRef}</td>
                <td className={cellStyling}>{e.clientOrderValue}</td>
                <td className={cellStyling}>{e.projectName}</td>
                <td className={cellStyling}>{e.clientName}</td>
                <td className={cellStyling}>{e.endUser}</td>
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
      <div className="shrink-0 pt-4">
        {/* Filter the original list so switching years restores the matching orders. */}
        <Select
          defaultValue="all"
          items={[
            { value: "all", label: "All Years" },
            ...years.map((year) => ({
              value: String(year),
              label: String(year),
            })),
          ]}
          onValueChange={(year) => {
            if (year === null) return;
            setOrderArray(
              year === "all"
                ? orders
                : orders.filter((e) =>
                    e.felixOrderRef.startsWith(`FCL/FPO/${year}/`),
                  ),
            );
          }}
        >
          <SelectTrigger
            className="w-[180px] bg-white"
            aria-label="Select year"
          >
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
    </>
  );
}
