"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { data, users } from "@/lib/drizzle/schema";

export async function saveOrderManagerAccess(
  changes: { orderId: number; access: boolean }[],
) {
  const user = await requireUser();
  const [profile] = user.email
    ? await db.select({ status: users.status }).from(users)
        .where(eq(users.email, user.email)).limit(1)
    : [];

  if (profile?.status !== "admin") {
    return { ok: false, message: "Only admins can change order editing access." };
  }
  if (
    !Array.isArray(changes) || !changes.length ||
    changes.some((change) => !change || !Number.isInteger(change.orderId) ||
      change.orderId < 1 || change.orderId > 2147483647 || typeof change.access !== "boolean") ||
    new Set(changes.map((change) => change.orderId)).size !== changes.length
  ) {
    return { ok: false, message: "Invalid order access changes." };
  }

  try {
    // Save the entire batch together; missing orders roll back every change.
    await db.transaction(async (transaction) => {
      const accessCases = changes.map((change) =>
        sql`when ${data.sl} = ${change.orderId} then ${change.access}::boolean`,
      );
      const updated = await transaction.update(data)
        .set({ orderManagerAccess: sql`case ${sql.join(accessCases, sql` `)} else ${data.orderManagerAccess} end` })
        .where(inArray(data.sl, changes.map((change) => change.orderId)))
        .returning({ sl: data.sl });
      if (updated.length !== changes.length) transaction.rollback();
    });

    revalidatePath("/home");
    revalidatePath("/summary");
    for (const { orderId } of changes) revalidatePath(`/order_form/${orderId}`);
    return {
      ok: true,
      message: "Order editing access saved.",
    };
  } catch (error) {
    console.error("Unable to change order access", error);
    return { ok: false, message: "Could not save editing access. Please refresh and try again." };
  }
}
