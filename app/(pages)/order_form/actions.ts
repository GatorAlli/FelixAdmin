"use server";

import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { data } from "@/lib/drizzle/schema";
import { revalidatePath } from "next/cache";
import { readOrderValues } from "@/lib/drizzle/order-values";


export async function createOrder(formData: FormData) {
  await requireUser();
  const parsed = readOrderValues(formData);
  if (!parsed.ok) return parsed;

  try {
    const result = await db.transaction(async (transaction) => {
      const [insertedOrder] = await transaction
        .insert(data)
        .values({
          ...parsed.values,
          // The generated primary key is needed before building the final reference.
          felixOrderRef: "FCL/FPO/2024/PENDING",
        })
        .returning({ sl: data.sl });

      if (!insertedOrder)
        throw new Error("Order insert returned no primary key.");

      const felixOrderRef = `FCL/FPO/2024/${String(insertedOrder.sl).padStart(3, "0")}`;
      await transaction
        .update(data)
        .set({ felixOrderRef })
        .where(eq(data.sl, insertedOrder.sl));

      return felixOrderRef;
    });

    return { ok: true, message: `Order created: ${result}` };
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
  await requireUser();
  if (!Number.isInteger(orderId) || orderId < 1) {
    return { ok: false, message: "Invalid order ID." };
  }

  const parsed = readOrderValues(formData);
  if (!parsed.ok) return parsed;

  try {
    const [updatedOrder] = await db
      .update(data)
      // The primary key and Felix order reference are excluded from these values.
      .set(parsed.values)
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
    return { ok: false, message: "Could not update the order. Please try again." };
  }
}
