import Link from "next/link";

import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import AddIcon from "@hugeicons/core-free-icons/Add01Icon";

import { db } from "@/lib/drizzle/drizzle-index";
import { data } from "@/lib/drizzle/schema";
import { SignOutButton } from "@/app/components/signOutButton";
import { requireUser } from "@/lib/supabase/auth";
import { asc } from "drizzle-orm";
import { users } from "@/lib/drizzle/schema";
import { clsx } from "cn";

export default async function Home() {
  const user = await requireUser();
  let name = "";

  let adminStatus = false;

  const userArray = await db.select().from(users);

  userArray.forEach((e) => {
    if (e.email === user.email && e.status === "admin") {
      adminStatus = true;
      name = String(e.name);
      return;
    }
  });

  const orders = await db.select().from(data).orderBy(asc(data.sl));

  const tdStyling = clsx("p-4 border");

  return (
    <div className="p-4 flex flex-col">
      <div>
        <div className="flex gap-3 items-center py-4">
          {adminStatus ? (
            <Link href="/order_form" className={buttonVariants({})}>
              <HugeiconsIcon icon={AddIcon}></HugeiconsIcon>
              Create New Order
            </Link>
          ) : (
            <div></div>
          )}
          <Link href="/summary" className={buttonVariants({})}>
            Summary
          </Link>
          <SignOutButton />
        </div>
        <Label>Hello {name}</Label>
        <table className="border border-spacing-4 divide-y">
          <thead>
            <tr>
              <th className={tdStyling}>SL</th>
              <th className={tdStyling}>CREATED BY</th>
              <th className={tdStyling}>ORDER NO.</th>
              <th className={tdStyling}>EMI REF.</th>
              <th className={tdStyling}>CLIENT ORDER DATE</th>
              <th className={tdStyling}>CLIENT ORDER VALUE</th>
              <th className={tdStyling}>PROJECT NAME</th>
              <th className={tdStyling}>CLIENT NAME</th>
              <th className={tdStyling}>END USER</th>
              <th className={tdStyling}></th>
            </tr>
          </thead>
          <tbody className="border divide-y ">
            {orders.map((e) => (
              <tr key={e.sl}>
                <td className={tdStyling}>{e.sl}</td>
                <td className={tdStyling}>{e.createdBy}</td>
                <td className={tdStyling}>{e.felixOrderRef}</td>
                <td className={tdStyling}>{e.emiOrderRef}</td>
                <td className={tdStyling}>{e.clientOrderDate}</td>
                <td className={tdStyling}>{e.clientOrderValue}</td>
                <td className={tdStyling}>{e.projectName}</td>
                <td className={tdStyling}>{e.clientName}</td>
                <td className={tdStyling}>{e.endUser}</td>
                <td className={tdStyling}>
                  <Link
                    href={`/order_form/${e.sl}`}
                    className={buttonVariants()}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
