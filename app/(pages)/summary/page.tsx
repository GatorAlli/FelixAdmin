import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { data } from "@/lib/drizzle/schema";
import { asc } from "drizzle-orm";

export default async function Summary() {
  await requireUser();
  const orders = await db.select().from(data).orderBy(asc(data.sl));

  return (
    <div>
      <table className="border border-separate border-spacing-4">
        <thead className="font-heading text-transform: uppercase">
          <tr>
            <th>SL</th>
            <th>Created by</th>
            <th>ORDER REF.</th>
            <th>SO No</th>
            <th>SO DATE</th>
            <th>EMI Order Ref</th>
            <th>PAYMENT MODE</th>
            <th>CLIENT ORDER REF</th>
            <th>CLIENT ORDER DATE</th>
            <th>CLIENT ORDER VALUE</th>
            <th>PROJECT NAME</th>
            <th>CLIENT NAME</th>
            <th>End User</th>
            <th>PRODUCT/ SYSTEM</th>
            <th>TT or L/C REF.</th>
            <th>LC DATE</th>
            <th>LATEST DATE OF SHIPMENT</th>
            <th>DATE OF EXPAIRY</th>
            <th>CONSIGNEE</th>
            <th>ORDER HANDLED BY</th>
            <th>SUPPLIERS</th>
            <th>TRANE</th>
            <th>BELIMO</th>
            <th>DANFOSS</th>
            <th>HONEYWELL</th>
            <th>REGELTECHNIK</th>
            <th>DWYER</th>
            <th>ALPS</th>
            <th>CONTROL 4</th>
            <th>LUTRON</th>
            <th>LANDIS+GYR</th>
            <th>RBH</th>
            <th>PROSTAR</th>
            <th>GISSMATIC</th>
            <th>ZKTECO</th>
            <th>ADTESHIA</th>
            <th>FIKE</th>
            <th>TECOFI</th>
            <th>SEWO</th>
            <th>EBELCO</th>
            <th>DOOYA</th>
            <th>POGO</th>
            <th>PARK HELP</th>
            <th>FOSHAN</th>
            <th>KELE</th>
            <th>MULTICABLE</th>
            <th>DEYZ</th>
            <th>SIMENS</th>
            <th>FLASH TURTLE</th>
            <th>SERVO</th>
            <th>HABOO</th>
            <th>OTHERS</th>
            <th>EMI COST</th>
            <th>MIS. COST</th>
            <th>TOTAL ORDER COST</th>
            <th>PAYMENT RECEIVED</th>
            <th>FELIX OH & PROFIT</th>
            <th>REMARKS</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((e) => (
            <tr key={e.sl}>
              <td>{e.sl}</td>
              <td>{e.createdBy}</td>
              <td>{e.felixOrderRef}</td>
              <td>{e.felixSoNo}</td>
              <td>{e.felixSoDate}</td>
              <td>{e.emiOrderRef}</td>
              <td>{e.paymentMode}</td>
              <td>{e.clientOrderRef}</td>
              <td>{e.clientOrderDate}</td>
              <td>{e.clientOrderValue}</td>
              <td>{e.projectName}</td>
              <td>{e.clientName}</td>
              <td>{e.endUser}</td>
              <td>{e.productSystem}</td>
              <td>{e.ttOrLcRef}</td>
              <td>{e.lcDate}</td>
              <td>{e.latestDateOfShipment}</td>
              <td>{e.dateOfExpiry}</td>
              <td>{e.consignee}</td>
              <td>{e.orderHandledBy}</td>
              <td>{e.suppliers}</td>
              <td>{e.trane}</td>
              <td>{e.belimo}</td>
              <td>{e.danfoss}</td>
              <td>{e.honeywell}</td>
              <td>{e.regeltechnik}</td>
              <td>{e.dwyer}</td>
              <td>{e.alps}</td>
              <td>{e.control4}</td>
              <td>{e.lutron}</td>
              <td>{e.landisGyr}</td>
              <td>{e.rbh}</td>
              <td>{e.prostar}</td>
              <td>{e.gissmatic}</td>
              <td>{e.zkteco}</td>
              <td>{e.adteshia}</td>
              <td>{e.fike}</td>
              <td>{e.tecofi}</td>
              <td>{e.sewo}</td>
              <td>{e.ebelco}</td>
              <td>{e.dooya}</td>
              <td>{e.pogo}</td>
              <td>{e.parkHelp}</td>
              <td>{e.foshan}</td>
              <td>{e.kele}</td>
              <td>{e.multicable}</td>
              <td>{e.deyz}</td>
              <td>{e.simens}</td>
              <td>{e.flashTurtle}</td>
              <td>{e.servo}</td>
              <td>{e.haboo}</td>
              <td>{e.others}</td>
              <td>{e.emiCost}</td>
              <td>{e.misCost}</td>
              <td>{e.totalOrderCost}</td>
              <td>{e.paymentReceived}</td>
              <td>{e.felixOhAndProfit}</td>
              <td>{e.remarks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
