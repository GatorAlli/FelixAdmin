import { currentOrderDate } from "@/lib/drizzle/order-date";
import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import PageBody from "../PageBody";
import { data, users } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function OrderForm({
  params,
}: {
  params: Promise<{ edit_slug: string }>;
}) {
  const user = await requireUser();

  let adminStatus = "";
  let username = "";

  const { edit_slug } = await params;
  if (
    !/^\d+$/.test(edit_slug) || !Number.isSafeInteger(Number(edit_slug)) ||
    Number(edit_slug) < 1 || Number(edit_slug) > 2147483647
  ) notFound();
  const order = await db
    .select()
    .from(data)
    .where(eq(data.sl, Number(edit_slug)))
    .limit(1);
  if (!order[0]) notFound();

  const userArray = await db.select().from(users);

  userArray.forEach((e) => {
    if (e.email === user.email) {
      username = e.name?.trim() ?? "";
      adminStatus = e.status ?? "";
      return;
    }
  });

  return (
    <div>
      <PageBody orderDetails={order[0]} isAdmin={adminStatus} username={username} currentDate={currentOrderDate()} />
    </div>
  );
}
