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
    <div className="flex flex-col">
       <div className="bg-gray-50 p-3 flex items-center border-1 border-gray-200">
       <img src="/logo.svg" 
       alt="Felix Controls Limited"
       width={60}
       height={60}
       className="mx-4" />
       <h1 className="font-sans font-medium text-md">
        Felix Controls
        <p className="font-sans font-light text-xs">
          Order Workspace
        </p>
       </h1>
       </div>
      <div className="p-4">
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
