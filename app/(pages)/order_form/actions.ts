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

// Both save actions use the signed-in profile and the same form validation.
async function prepareOrder(formData: FormData, orderId?: number) {
  const currentUser = await requireUser();
  let userProfile: { name: string | null; status: string | null } | undefined;

  if (currentUser.email) {
    [userProfile] = await db
      .select({ name: users.name, status: users.status })
      .from(users)
      .where(eq(users.email, currentUser.email))
      .limit(1);
  }

  if (!canEditOrder(userProfile?.status, true)) {
    return { ok: false as const, message: "You do not have permission to save orders." };
  }

  const username = userProfile?.name?.trim();
  if (!username) {
    return {
      ok: false as const,
      message:
        "Your account has no username. Please have your user profile name set before saving.",
    };
  }

  const supplierCatalog = await db
    .select({ name: suppliers.supplierName })
    .from(suppliers);
  const allowedSupplierNames: string[] = [];
  for (const supplier of supplierCatalog) {
    if (supplier.name) allowedSupplierNames.push(supplier.name);
  }

  // A supplier removed from Settings must still be accepted on its existing order.
  const hasValidOrderId = orderId !== undefined &&
    Number.isInteger(orderId) && orderId > 0 && orderId <= 2147483647;
  if (hasValidOrderId) {
    const [existingOrder] = await db
      .select()
      .from(data)
      .where(eq(data.sl, orderId))
      .limit(1);

    if (existingOrder) {
      for (const supplier of restoreSupplierRows(existingOrder)) {
        allowedSupplierNames.push(supplier.supplier);
      }
    }
  }

  const validatedOrder = readOrderValues(formData, username, allowedSupplierNames);
  return { ...validatedOrder, status: userProfile?.status };
}

export async function createOrder(formData: FormData) {
  const preparedOrder = await prepareOrder(formData);
  if (!preparedOrder.ok) return preparedOrder;

  // The reference and Bangladesh creation date are assigned only to new orders.
  const createdDate = currentOrderDate();
  try {
    // Allocate the reference and insert together so concurrent saves cannot reuse it.
    const orderReference = await db.transaction(async (transaction) => {
      const felixOrderRef = await nextOrderReference(transaction, createdDate);
      await transaction.insert(data).values({
        ...preparedOrder.values,
        createdDate,
        felixOrderRef,
        orderManagerAccess: true,
      });

      return felixOrderRef;
    }, { isolationLevel: "read committed" });

    // Refresh the order lists after the database write succeeds.
    revalidatePath("/home");
    revalidatePath("/summary");
    return { ok: true, message: `Order created: ${orderReference}`, createdDate };
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
  const preparedOrder = await prepareOrder(formData, orderId);
  if (!Number.isInteger(orderId) || orderId < 1 || orderId > 2147483647) {
    return { ok: false, message: "Invalid order ID." };
  }

  if (!preparedOrder.ok) return preparedOrder;

  // The authenticated saver becomes the editor; the original creator stays unchanged.
  const { createdBy: lastEditedBy, ...editableValues } = preparedOrder.values;

  try {
    const [updatedOrder] = await db
      .update(data)
      // The primary key, creator, order reference and creation date are excluded.
      .set({ ...editableValues, lastEditedBy, lastEditedAt: sql`now()` })
      // Check the flag in the UPDATE itself, including for already-open forms.
      .where(
        and(
          eq(data.sl, orderId),
          preparedOrder.status === "admin" ? undefined : eq(data.orderManagerAccess, true),
        ),
      )
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
