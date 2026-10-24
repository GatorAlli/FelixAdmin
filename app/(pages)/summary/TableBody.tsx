"use client";

import { formatMoney, sumMoneyAmounts } from "@/lib/format-money";
import { supplierColumns } from "@/lib/drizzle/currency";
import type { Order } from "@/lib/drizzle/schema";
import { expenseColumns, expenseUsdByName } from "@/lib/drizzle/expenses";
import {
  customSupplierColumns,
  customSupplierUsdByName,
} from "@/lib/drizzle/custom-suppliers";
import { clsx } from "clsx";
import { useState, type ReactNode } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function TableBody({
  orders,
  currentYear,
  supplierSuggestions,
  heading,
}: {
  orders: Order[];
  currentYear: number;
  supplierSuggestions: string[];
  heading: ReactNode;
}) {
  const years = Array.from(
    { length: currentYear - 2024 + 1 },
    (_, index) => 2024 + index,
  );
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const orderArray =
    selectedYear === "all"
      ? orders
      : orders.filter((order) =>
          order.felixOrderRef.startsWith(`FCL/FPO/${selectedYear}/`),
        );
  // Use the filtered rows for both headers and cells. Zero is a recorded value.
  const visibleSuppliers = Object.entries(supplierColumns).filter(([, key]) =>
    orderArray.some((order) => formatMoney(order[key]) !== ""),
  );
  const supplierAmounts = orderArray.map(customSupplierUsdByName);
  const additionalSuppliers = customSupplierColumns(
    orderArray,
    supplierSuggestions,
  ).filter((name) =>
    supplierAmounts.some((amounts) => formatMoney(amounts.get(name)) !== ""),
  );
  const expenditureColumns = expenseColumns(orderArray);
  const expenditureAmounts = orderArray.map(expenseUsdByName);
  const supplierTotals = [
    ...visibleSuppliers.map(([name, key]) => ({
      name,
      total: sumMoneyAmounts(orderArray.map((order) => order[key])),
    })),
    ...additionalSuppliers.map((name) => ({
      name,
      total: sumMoneyAmounts(supplierAmounts.map((amounts) => amounts.get(name))),
    })),
  ];

  const headerStyling = clsx(
    "px-4 py-4 text-left text-[13px] font-bold text-black uppercase whitespace-nowrap bg-white border-b border-r border-gray-200 sticky top-0 z-10",
  );
  const cellStyling = clsx(
    "px-4 py-3 text-sm text-black whitespace-nowrap border-b border-r border-gray-200 group-hover:bg-gray-50 transition-colors",
  );

  return (
    <>
      <div className="mb-6 flex shrink-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        {heading}
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
          <SelectTrigger className="w-45 shrink-0 bg-white" aria-label="Select year">
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
      <div className="min-h-0 bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden flex flex-col">
        <div className="h-1.5 w-full shrink-0 bg-primary" />
        <div>
          <div
            className="summary-table-scroll min-h-0 overflow-x-scroll overflow-y-auto w-full focus-visible:outline-2 focus-visible:outline-ring"
            role="region"
            aria-label="Order summary table"
            tabIndex={0}
          >
            <table className="w-full text-left border-collapse">
              <thead className="bg-white">
                <tr>
                  <th className={headerStyling}>SL</th>
                  <th className={headerStyling}>CREATED BY</th>
                  <th className={headerStyling}>ORDER REF.</th>
                  <th className={headerStyling}>PAYMENT MODE</th>
                  <th className={headerStyling}>CLIENT ORDER VALUE (USD)</th>
                  <th className={headerStyling}>PROJECT NAME</th>
                  <th className={headerStyling}>PROJECT NOTES</th>
                  <th className={headerStyling}>CLIENT NAME</th>
                  <th className={headerStyling}>END USER</th>
                  <th className={headerStyling}>SYSTEM TYPE</th>
                  <th className={headerStyling}>ORDER HANDLED BY</th>
                  {visibleSuppliers.map(([name, key]) => (
                    <th className={headerStyling} key={key}>
                      {name}
                    </th>
                  ))}
                  {additionalSuppliers.map((name) => (
                    <th className={headerStyling} key={`supplier-${name}`}>
                      {name} (USD)
                    </th>
                  ))}
                  {expenditureColumns.map((name) => (
                    <th className={headerStyling} key={name}>
                      {name} (USD)
                    </th>
                  ))}
                  <th className={headerStyling}>PAYMENT NOTES</th>
                  <th className={headerStyling}>ORDER HANDLING FEE (%)</th>
                  <th className={headerStyling}>
                    MISCELLANEOUS HANDLING FEE (%)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {orderArray.map((e, index) => (
                  <tr className="hover:bg-gray-50 group" key={e.sl}>
                    <td className={cellStyling}>{index + 1}</td>
                    <td className={cellStyling}>
                      <span className="font-extrabold text-black">
                        {e.createdBy}
                      </span>
                    </td>
                    <td className={`${cellStyling} font-bold text-black`}>
                      {e.felixOrderRef}
                    </td>
                    <td className={cellStyling}>{e.paymentMode}</td>
                    <td className={clsx(cellStyling, "text-right tabular-nums")}>{formatMoney(e.clientOrderValue)}</td>
                    <td className={cellStyling}>{e.projectName}</td>
                    <td className={cellStyling}>{e.projectNotes}</td>
                    <td className={cellStyling}>{e.clientName}</td>
                    <td className={cellStyling}>{e.endUser}</td>
                    <td className={cellStyling}>{e.productSystem}</td>
                    <td className={cellStyling}>{e.orderHandledBy}</td>
                    {visibleSuppliers.map(([, key]) => (
                      <td
                        className={clsx(cellStyling, "text-right tabular-nums")}
                        key={key}
                      >
                        {formatMoney(e[key])}
                      </td>
                    ))}
                    {additionalSuppliers.map((name) => (
                      <td className={cellStyling} key={`supplier-${name}`}>
                        {formatMoney(supplierAmounts[index].get(name))}
                      </td>
                    ))}
                    {expenditureColumns.map((name) => (
                      <td className={cellStyling} key={name}>
                        {formatMoney(expenditureAmounts[index].get(name))}
                      </td>
                    ))}
                    <td className={cellStyling}>{e.paymentNotes}</td>
                    <td className={cellStyling}>{e.orderHandlingFee}</td>
                    <td className={cellStyling}>
                      {e.miscellaneousHandlingFee}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="flex min-w-0 shrink-0 items-center gap-4 pt-4">

        <div
          className="h-10 w-max min-w-0 shrink overflow-x-auto overflow-y-hidden rounded-lg border border-input bg-white focus-visible:outline-2 focus-visible:outline-ring [scrollbar-width:thin]"
          role="region"
          aria-label="Supplier totals in USD for selected year"
          tabIndex={0}
        >
          <div className="flex h-full w-max items-center divide-x divide-border whitespace-nowrap text-sm">
            {supplierTotals.length ? supplierTotals.map(({ name, total }) => (
              <div key={name} className="flex shrink-0 items-center gap-2 px-4">
                <span className="font-semibold">{name}</span>
                <span className="tabular-nums">{formatMoney(total)} USD</span>
              </div>
            )) : (
              <span className="px-4 text-muted-foreground">No supplier totals</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
