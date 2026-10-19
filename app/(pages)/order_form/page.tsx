import { currentOrderDate } from "@/lib/drizzle/order-date";
import { requireUser } from "@/lib/supabase/auth";
import PageBody from "./PageBody";
import { db } from "@/lib/drizzle/drizzle-index";
import { users } from "@/lib/drizzle/schema";
import { redirect } from "next/navigation";
import { canEditOrder } from "@/lib/drizzle/order-access";

export default async function OrderForm() {
  const user = await requireUser();

  let adminStatus = "";
  let username = "";

  const userArray = await db.select().from(users);

  userArray.forEach((e) => {
    if (e.email === user.email) {
      username = e.name?.trim() ?? "";
      adminStatus = String(e.status);
      return;
    }
  });

  if (!canEditOrder(adminStatus, true)) redirect("/home");

  return (
    <div>
      <PageBody
        isAdmin={adminStatus}
        username={username}
        currentDate={currentOrderDate()}
      />
    </div>
  );
}
