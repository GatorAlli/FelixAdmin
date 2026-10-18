"use client";

import type { Order } from "@/lib/drizzle/schema";
import { expenseColumns, expenseUsdByName } from "@/lib/drizzle/expenses";
import { clsx } from "clsx";
import { useState } from "react";
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
}: {
  orders: Order[];
  currentYear: number;
}) {
  const years = Array.from(
    { length: currentYear - 2024 + 1 },
    (_, index) => 2024 + index,
  );
  const [orderArray, setOrderArray] = useState(orders);
  const expenditureColumns = expenseColumns(orderArray);
  const expenditureAmounts = orderArray.map(expenseUsdByName);

  const headerStyling = clsx(
    "px-4 py-4 text-left text-[13px] font-bold text-black uppercase whitespace-nowrap bg-white border-b border-r border-gray-200 sticky top-0 z-10",
  );
  const cellStyling = clsx(
    "px-4 py-3 text-sm text-black whitespace-nowrap border-b border-r border-gray-200 group-hover:bg-gray-50 transition-colors",
  );

  return (
    <>
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
                  <th className={headerStyling}>SUPPLIERS</th>
                  <th className={headerStyling}>TRANE</th>
                  <th className={headerStyling}>BELIMO</th>
                  <th className={headerStyling}>DANFOSS</th>
                  <th className={headerStyling}>HONEYWELL</th>
                  <th className={headerStyling}>REGELTECHNIK</th>
                  <th className={headerStyling}>DWYER</th>
                  <th className={headerStyling}>ALPS</th>
                  <th className={headerStyling}>CONTROL 4</th>
                  <th className={headerStyling}>LUTRON</th>
                  <th className={headerStyling}>LANDIS+GYR</th>
                  <th className={headerStyling}>RBH</th>
                  <th className={headerStyling}>PROSTAR</th>
                  <th className={headerStyling}>GISSMATIC</th>
                  <th className={headerStyling}>ZKTECO</th>
                  <th className={headerStyling}>ADTESHIA</th>
                  <th className={headerStyling}>FIKE</th>
                  <th className={headerStyling}>TECOFI</th>
                  <th className={headerStyling}>SEWO</th>
                  <th className={headerStyling}>EBELCO</th>
                  <th className={headerStyling}>DOOYA</th>
                  <th className={headerStyling}>POGO</th>
                  <th className={headerStyling}>PARK HELP</th>
                  <th className={headerStyling}>FOSHAN</th>
                  <th className={headerStyling}>KELE</th>
                  <th className={headerStyling}>MULTICABLE</th>
                  <th className={headerStyling}>DEYZ</th>
                  <th className={headerStyling}>SIMENS</th>
                  <th className={headerStyling}>FLASH TURTLE</th>
                  <th className={headerStyling}>SERVO</th>
                  <th className={headerStyling}>HABOO</th>
                  <th className={headerStyling}>OTHERS</th>
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
                    <td className={cellStyling}>{e.clientOrderValue}</td>
                    <td className={cellStyling}>{e.projectName}</td>
                    <td className={cellStyling}>{e.projectNotes}</td>
                    <td className={cellStyling}>{e.clientName}</td>
                    <td className={cellStyling}>{e.endUser}</td>
                    <td className={cellStyling}>{e.productSystem}</td>
                    <td className={cellStyling}>{e.orderHandledBy}</td>
                    <td className={cellStyling}>{e.suppliers}</td>
                    <td className={cellStyling}>{e.trane}</td>
                    <td className={cellStyling}>{e.belimo}</td>
                    <td className={cellStyling}>{e.danfoss}</td>
                    <td className={cellStyling}>{e.honeywell}</td>
                    <td className={cellStyling}>{e.regeltechnik}</td>
                    <td className={cellStyling}>{e.dwyer}</td>
                    <td className={cellStyling}>{e.alps}</td>
                    <td className={cellStyling}>{e.control4}</td>
                    <td className={cellStyling}>{e.lutron}</td>
                    <td className={cellStyling}>{e.landisGyr}</td>
                    <td className={cellStyling}>{e.rbh}</td>
                    <td className={cellStyling}>{e.prostar}</td>
                    <td className={cellStyling}>{e.gissmatic}</td>
                    <td className={cellStyling}>{e.zkteco}</td>
                    <td className={cellStyling}>{e.adteshia}</td>
                    <td className={cellStyling}>{e.fike}</td>
                    <td className={cellStyling}>{e.tecofi}</td>
                    <td className={cellStyling}>{e.sewo}</td>
                    <td className={cellStyling}>{e.ebelco}</td>
                    <td className={cellStyling}>{e.dooya}</td>
                    <td className={cellStyling}>{e.pogo}</td>
                    <td className={cellStyling}>{e.parkHelp}</td>
                    <td className={cellStyling}>{e.foshan}</td>
                    <td className={cellStyling}>{e.kele}</td>
                    <td className={cellStyling}>{e.multicable}</td>
                    <td className={cellStyling}>{e.deyz}</td>
                    <td className={cellStyling}>{e.simens}</td>
                    <td className={cellStyling}>{e.flashTurtle}</td>
                    <td className={cellStyling}>{e.servo}</td>
                    <td className={cellStyling}>{e.haboo}</td>
                    <td className={cellStyling}>{e.others}</td>
                    {expenditureColumns.map((name) => (
                      <td className={cellStyling} key={name}>
                        {expenditureAmounts[index].get(name) ?? ""}
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
