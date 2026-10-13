import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import PageBody from "../PageBody";
import { data, users } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

export default async function OrderForm({
  params,
}: {
  params: Promise<{ edit_slug: string }>;
}) {
  const user = await requireUser();

  let adminStatus = false;
  let username = "";

  const { edit_slug } = await params;
  const order = await db
    .select()
    .from(data)
    .where(eq(data.sl, Number(edit_slug)))
    .limit(1);

  const userArray = await db.select().from(users);

  userArray.forEach((e) => {
    if (e.email === user.email) {
      username = e.name?.trim() ?? "";
      adminStatus = e.status === "admin";
      return;
    }
  });

  return (
    <div>
      <PageBody orderDetails={order[0]} isAdmin={adminStatus} username={username} />
    </div>
  );
}
