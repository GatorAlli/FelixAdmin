import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import AddIcon from "@hugeicons/core-free-icons/Add01Icon";
import { db } from "@/lib/drizzle/drizzle-index";
import { data } from "@/lib/drizzle/schema";
import { redirect } from "next/navigation";

export default async function Home() {
  const orders = await db.select().from(data);

  return (
    <div className="p-4 flex flex-col">
      <div className="flex gap-3 items-center py-4">
        <Link href="/order_form" className={buttonVariants({})}>
          <HugeiconsIcon icon={AddIcon}></HugeiconsIcon>
          Create New Order
        </Link>
        <Link href="/summary" className={buttonVariants({})}>
          Summary
        </Link>
      </div>

      <table className="border border-separate border-spacing-4">
        <thead>
          <tr>
            <th>SL</th>
            <th>CREATED BY</th>
            <th>EMI ORDER REF.</th>
            <th>CLIENT ORDER DATE</th>
            <th>CLIENT ORDER VALUE</th>
            <th>PROJECT NAME</th>
            <th>CLIENT NAME</th>
            <th>END USER</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((e) => (
            <tr key={e.sl}>
              <td>{e.sl}</td>
              <td>{e.createdBy}</td>
              <td>{e.emiOrderRef}</td>
              <td>{e.clientOrderDate}</td>
              <td>{e.clientOrderValue}</td>
              <td>{e.projectName}</td>
              <td>{e.clientName}</td>
              <td>{e.endUser}</td>
              <td>
                <Link
                  href={`/order_form/${e.sl}`}
                  className={buttonVariants({})}
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
