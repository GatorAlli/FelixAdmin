"use server";

import { and, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import { data, users, suppliers, orderDocuments } from "@/lib/drizzle/schema";
import { revalidatePath } from "next/cache";
import { readOrderValues } from "@/lib/drizzle/order-values";
import { currentOrderDate } from "@/lib/drizzle/order-date";
import { nextOrderReference } from "@/lib/drizzle/order-reference";
import { canEditOrder } from "@/lib/drizzle/order-access";
import { removeDocumentFile } from "@/lib/documents/storage";
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
    return {
      ok: false as const,
      message: "You do not have permission to save orders.",
    };
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
  const hasValidOrderId =
    orderId !== undefined &&
    Number.isInteger(orderId) &&
    orderId > 0 &&
    orderId <= 2147483647;
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

  const validatedOrder = readOrderValues(
    formData,
    username,
    allowedSupplierNames,
  );
  return { ...validatedOrder, status: userProfile?.status };
}

export async function createOrder(formData: FormData) {
  const preparedOrder = await prepareOrder(formData);
  if (!preparedOrder.ok) return preparedOrder;

  // The reference and Bangladesh creation date are assigned only to new orders.
  const createdDate = currentOrderDate();
  try {
    // Allocate the reference and insert together so concurrent saves cannot reuse it.
    const orderReference = await db.transaction(
      async (transaction) => {
        const felixOrderRef = await nextOrderReference(
          transaction,
          createdDate,
        );
        const [created] = await transaction
          .insert(data)
          .values({
            ...preparedOrder.values,
            createdDate,
            felixOrderRef,
            orderManagerAccess: true,
          })
          .returning({ id: data.sl });

        return { reference: felixOrderRef, id: created.id };
      },
      { isolationLevel: "read committed" },
    );

    // Refresh the order lists after the database write succeeds.
    revalidatePath("/home");
    revalidatePath("/summary");
    return {
      ok: true,
      message: `Order created: ${orderReference.reference}`,
      createdDate,
      orderId: orderReference.id,
    };
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
    const saved = await db.transaction(async (transaction) => {
      const [updatedOrder] = await transaction
        .update(data)
        .set({ ...editableValues, lastEditedBy, lastEditedAt: sql`now()` })
        .where(
          and(
            eq(data.sl, orderId),
            preparedOrder.status === "admin"
              ? undefined
              : eq(data.orderManagerAccess, true),
          ),
        )
        .returning();
      if (!updatedOrder) return null;
      const retainedKeys = new Set(
        restoreSupplierRows(updatedOrder).map((row) => row.rowKey),
      );
      const documents = await transaction
        .select()
        .from(orderDocuments)
        .where(eq(orderDocuments.orderId, orderId));
      return {
        updatedOrder,
        removedDocuments: documents.filter(
          (document) =>
            document.supplierRowKey !== null &&
            !retainedKeys.has(document.supplierRowKey),
        ),
      };
    });
    const updatedOrder = saved?.updatedOrder;

    if (!updatedOrder) {
      return {
        ok: false,
        message: "Order not found or your editing access has been revoked.",
      };
    }

    // Keep metadata when filesystem cleanup fails so a subsequent save can retry.
    let cleanupFailed = false;
    for (const document of saved!.removedDocuments) {
      try {
        await removeDocumentFile(document.storagePath);
        await db
          .delete(orderDocuments)
          .where(
            and(
              eq(orderDocuments.id, document.id),
              eq(orderDocuments.orderId, orderId),
            ),
          );
      } catch (error) {
        cleanupFailed = true;
        console.error("Supplier document cleanup failed", error);
      }
    }
    revalidatePath("/summary");
    revalidatePath("/home");
    revalidatePath(`/order_form/${orderId}`);
    return {
      ok: true,
      message:
        `Order updated: ${updatedOrder.felixOrderRef}` +
        (cleanupFailed
          ? ". Some removed attachments could not be deleted. Save again to retry."
          : ""),
    };
  } catch (error) {
    console.error("Unable to update order", error);
    return {
      ok: false,
      message: "Could not update the order. Please try again.",
    };
  }
}
