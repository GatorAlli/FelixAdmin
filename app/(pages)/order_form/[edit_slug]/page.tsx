import { getOrderDatalists } from "@/lib/drizzle/order-datalists";
import { currentOrderDate } from "@/lib/drizzle/order-date";
import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import PageBody from "../PageBody";
import { data, users, orderDocuments } from "@/lib/drizzle/schema";
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

  const documents = await db.select({
    id: orderDocuments.id,
    title: orderDocuments.title,
    originalName: orderDocuments.originalName,
    sizeBytes: orderDocuments.sizeBytes,
  }).from(orderDocuments).where(eq(orderDocuments.orderId, order[0].sl))
    .orderBy(orderDocuments.createdAt);

  const userArray = await db.select().from(users);

  userArray.forEach((e) => {
    if (e.email === user.email) {
      username = e.name?.trim() ?? "";
      adminStatus = e.status ?? "";
      return;
    }
  });

  const datalists = await getOrderDatalists();

  return (
    <div>
      <PageBody {...datalists} orderDetails={order[0]} initialDocuments={documents} isAdmin={adminStatus} username={username} currentDate={currentOrderDate()} />
    </div>
  );
}
