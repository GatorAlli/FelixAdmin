"use server";

import { and, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { data, users, suppliers } from "@/lib/drizzle/schema";
import { revalidatePath } from "next/cache";
import { readOrderValues } from "@/lib/drizzle/order-values";
import { currentOrderDate } from "@/lib/drizzle/order-date";
import { nextOrderReference } from "@/lib/drizzle/order-reference";
import { canEditOrder } from "@/lib/drizzle/order-access";

import { restoreSupplierRows } from "@/lib/drizzle/currency";

// Resolve attribution on every save. Never trust a name sent by the browser.
async function readAuthenticatedOrderValues(formData: FormData, orderId?: number) {
  const user = await requireUser();
  const [profile] = user.email
    ? await db
        .select({ name: users.name, status: users.status })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)
    : [];
  if (!canEditOrder(profile?.status, true)) {
    return { ok: false as const, message: "You do not have permission to save orders." };
  }
  const username = profile?.name?.trim();
  if (!username) {
    return {
      ok: false as const,
      message:
        "Your account has no username. Please have your user profile name set before saving.",
    };
  }
  const catalog = await db.select({ name: suppliers.supplierName }).from(suppliers);
  const historicalOrders = orderId && Number.isInteger(orderId) && orderId > 0 && orderId <= 2147483647
    ? await db.select().from(data).where(eq(data.sl, orderId)).limit(1) : [];
  const historicalNames = historicalOrders.flatMap(order => restoreSupplierRows(order).map(row => row.supplier));
  const allowedNames = [...catalog.flatMap(row => row.name ? [row.name] : []), ...historicalNames];
  return { ...readOrderValues(formData, username, allowedNames), status: profile?.status };
}

export async function createOrder(formData: FormData) {
  const parsed = await readAuthenticatedOrderValues(formData);
  if (!parsed.ok) return parsed;

  // Set only during creation. Updates never include this column.
  const createdDate = currentOrderDate();
  try {
    const result = await db.transaction(async (transaction) => {
      const felixOrderRef = await nextOrderReference(transaction, createdDate);
      await transaction.insert(data).values({
        ...parsed.values,
        createdDate,
        felixOrderRef,
        orderManagerAccess: true,
      });

      return felixOrderRef;
    }, { isolationLevel: "read committed" });

    revalidatePath("/home");
    revalidatePath("/summary");
    return { ok: true, message: `Order created: ${result}`, createdDate };
  } catch (error) {
    console.error("Unable to create order", error);
    return {
      ok: false,
      message: "Could not save the order. Please try again.",
    };
  }
}

// Update only the existing row identified by its primary key.
export async function updateOrder(orderId: number, formData: FormData) {
  // Authentication is checked even when the supplied order ID is invalid.
  const parsed = await readAuthenticatedOrderValues(formData, orderId);
  if (!Number.isInteger(orderId) || orderId < 1 || orderId > 2147483647) {
    return { ok: false, message: "Invalid order ID." };
  }

  if (!parsed.ok) return parsed;

  // The authenticated saver becomes the editor; the original creator stays unchanged.
  const { createdBy: lastEditedBy, ...editableValues } = parsed.values;

  try {
    const [updatedOrder] = await db
      .update(data)
      // The primary key, creator, order reference and creation date are excluded.
      .set({ ...editableValues, lastEditedBy, lastEditedAt: sql`now()` })
      // Check the flag in the UPDATE itself, including for already-open forms.
      .where(and(
        eq(data.sl, orderId),
        parsed.status === "admin" ? undefined : eq(data.orderManagerAccess, true),
      ))
      .returning({ felixOrderRef: data.felixOrderRef });

    if (!updatedOrder) {
      return { ok: false, message: "Order not found or your editing access has been revoked." };
    }

    revalidatePath("/summary");
    revalidatePath("/home");
    revalidatePath(`/order_form/${orderId}`);
    return {
      ok: true,
      message: `Order updated: ${updatedOrder.felixOrderRef}`,
    };
  } catch (error) {
    console.error("Unable to update order", error);
    return {
      ok: false,
      message: "Could not update the order. Please try again.",
    };
  }
}
