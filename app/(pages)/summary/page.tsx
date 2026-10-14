import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { data } from "@/lib/drizzle/schema";
import { asc } from "drizzle-orm";
import { expenseColumns, expenseUsdByName } from "@/lib/drizzle/expenses";
import { clsx } from "cn";

export default async function Summary() {
  await requireUser();
  const orders = await db.select().from(data).orderBy(asc(data.sl));

  const expenditureColumns = expenseColumns(orders);
  const expenditureAmounts = orders.map(expenseUsdByName);

  const cellStyling = clsx("p-2");

  return (
    <div>
      <table className="border divide-y border-spacing-4">
        <thead className="font-heading text-transform: uppercase">
          <tr className="divide-x">
            <th className={cellStyling}>SL</th>
            <th className={cellStyling}>Created by</th>
            <th className={cellStyling}>ORDER REF.</th>
            <th className={cellStyling}>PAYMENT MODE</th>
            <th className={cellStyling}>CLIENT ORDER VALUE (USD)</th>
            <th className={cellStyling}>PROJECT NAME</th>
            <th className={cellStyling}>PROJECT NOTES</th>
            <th className={cellStyling}>CLIENT NAME</th>
            <th className={cellStyling}>End User</th>
            <th className={cellStyling}>SYSTEM TYPE</th>
            <th className={cellStyling}>ORDER HANDLED BY</th>
            <th className={cellStyling}>SUPPLIERS</th>
            <th className={cellStyling}>TRANE</th>
            <th className={cellStyling}>BELIMO</th>
            <th className={cellStyling}>DANFOSS</th>
            <th className={cellStyling}>HONEYWELL</th>
            <th className={cellStyling}>REGELTECHNIK</th>
            <th className={cellStyling}>DWYER</th>
            <th className={cellStyling}>ALPS</th>
            <th className={cellStyling}>CONTROL 4</th>
            <th className={cellStyling}>LUTRON</th>
            <th className={cellStyling}>LANDIS+GYR</th>
            <th className={cellStyling}>RBH</th>
            <th className={cellStyling}>PROSTAR</th>
            <th className={cellStyling}>GISSMATIC</th>
            <th className={cellStyling}>ZKTECO</th>
            <th className={cellStyling}>ADTESHIA</th>
            <th className={cellStyling}>FIKE</th>
            <th className={cellStyling}>TECOFI</th>
            <th className={cellStyling}>SEWO</th>
            <th className={cellStyling}>EBELCO</th>
            <th className={cellStyling}>DOOYA</th>
            <th className={cellStyling}>POGO</th>
            <th className={cellStyling}>PARK HELP</th>
            <th className={cellStyling}>FOSHAN</th>
            <th className={cellStyling}>KELE</th>
            <th className={cellStyling}>MULTICABLE</th>
            <th className={cellStyling}>DEYZ</th>
            <th className={cellStyling}>SIMENS</th>
            <th className={cellStyling}>FLASH TURTLE</th>
            <th className={cellStyling}>SERVO</th>
            <th className={cellStyling}>HABOO</th>
            <th className={cellStyling}>OTHERS</th>
            {expenditureColumns.map((name) => (
              <th className={cellStyling} key={name}>{name} (USD)</th>
            ))}
            <th className={cellStyling}>PAYMENT NOTES</th>
            <th className={cellStyling}>ORDER HANDLING FEE (%)</th>
            <th className={cellStyling}>MISCELLANEOUS HANDLING FEE (%)</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders.map((e, index) => (
            <tr className="divide-x" key={e.sl}>
              <td className={cellStyling}>{e.sl}</td>
              <td className={cellStyling}>{e.createdBy}</td>
              <td className={cellStyling}>{e.felixOrderRef}</td>
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
                <td className={cellStyling} key={name}>{expenditureAmounts[index].get(name) ?? ""}</td>
              ))}
              <td className={cellStyling}>{e.paymentNotes}</td>
              <td className={cellStyling}>{e.orderHandlingFee}</td>
              <td className={cellStyling}>{e.miscellaneousHandlingFee}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
