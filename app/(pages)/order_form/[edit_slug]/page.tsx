import { db } from "@/lib/drizzle/drizzle-index";
import PageBody from "../PageBody";
import { data } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

export default async function OrderForm({
  params,
}: {
  params: Promise<{ edit_slug: string }>;
}) {
  const { edit_slug } = await params;
  const order = await db
    .select()
    .from(data)
    .where(eq(data.sl, Number(edit_slug)))
    .limit(1);
  return (
    <div>
      <PageBody orderDetails={order[0]} />
    </div>
  );
}
