"use server";

import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { data, users } from "@/lib/drizzle/schema";
import { revalidatePath } from "next/cache";
import { readOrderValues } from "@/lib/drizzle/order-values";
import { currentOrderDate } from "@/lib/drizzle/order-date";
import { nextOrderReference } from "@/lib/drizzle/order-reference";

// Resolve attribution on every save. Never trust a name sent by the browser.
async function readAuthenticatedOrderValues(formData: FormData) {
  const user = await requireUser();
  const [profile] = user.email
    ? await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)
    : [];
  const username = profile?.name?.trim();
  if (!username) {
    return {
      ok: false as const,
      message:
        "Your account has no username. Please have your user profile name set before saving.",
    };
  }
  return readOrderValues(formData, username);
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
      });

      return felixOrderRef;
    }, { isolationLevel: "read committed" });

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
  const parsed = await readAuthenticatedOrderValues(formData);
  if (!Number.isInteger(orderId) || orderId < 1) {
    return { ok: false, message: "Invalid order ID." };
  }

  if (!parsed.ok) return parsed;

  // The authenticated saver becomes the editor; the original creator stays unchanged.
  const { createdBy: lastEditedBy, ...editableValues } = parsed.values;

  try {
    const [updatedOrder] = await db
      .update(data)
      // The primary key, creator, order reference and creation date are excluded.
      .set({ ...editableValues, lastEditedBy })
      .where(eq(data.sl, orderId))
      .returning({ felixOrderRef: data.felixOrderRef });

    if (!updatedOrder) {
      return { ok: false, message: "Order not found." };
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
