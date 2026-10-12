"use server";

import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { data, type NewOrder } from "@/lib/drizzle/schema";
import { revalidatePath } from "next/cache";

const supplierColumns = {
  TRANE: "trane",
  BELIMO: "belimo",
  DANFOSS: "danfoss",
  HONEYWELL: "honeywell",
  REGELTECHNIK: "regeltechnik",
  DWYER: "dwyer",
  ALPS: "alps",
  "CONTROL 4": "control4",
  LUTRON: "lutron",
  "LANDIS+GYR": "landisGyr",
  RBH: "rbh",
  PROSTAR: "prostar",
  GISSMATIC: "gissmatic",
  ZKTECO: "zkteco",
  ADTESHIA: "adteshia",
  FIKE: "fike",
  TECOFI: "tecofi",
  SEWO: "sewo",
  EBELCO: "ebelco",
  DOOYA: "dooya",
  POGO: "pogo",
  "PARK HELP": "parkHelp",
  FOSHAN: "foshan",
  KELE: "kele",
  MULTICABLE: "multicable",
  DEYZ: "deyz",
  SIMENS: "simens",
  "FLASH TURTLE": "flashTurtle",
  SERVO: "servo",
  HABOO: "haboo",
  OTHERS: "others",
} as const;

type SupplierKey = (typeof supplierColumns)[keyof typeof supplierColumns];

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalNumber(formData: FormData, name: string) {
  const value = readText(formData, name);
  if (!value) return { value: null, error: null };

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return { value: null, error: `${name} must be a non-negative number.` };
  }

  // Drizzle/Postgres numeric fields accept decimal values as strings.
  return { value, error: null };
}

function readOptionalDate(formData: FormData, name: string) {
  const value = readText(formData, name);
  if (!value) return { value: null, error: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { value: null, error: `${name} must be a valid date.` };
  }
  return { value, error: null };
}

// Both creating and editing use the same field validation and conversion.
function readOrderValues(formData: FormData):
  | { ok: true; values: Omit<NewOrder, "sl" | "felixOrderRef"> }
  | { ok: false; message: string } {
  const createdBy = readText(formData, "createdBy");
  if (!createdBy) {
    return { ok: false, message: "Created by is required." };
  }

  const numericFields = {
    clientOrderValue: readOptionalNumber(formData, "clientOrderValue"),
    emiCost: readOptionalNumber(formData, "emiCost"),
    misCost: readOptionalNumber(formData, "misCost"),
    payBack: readOptionalNumber(formData, "payBack"),
    totalOrderCost: readOptionalNumber(formData, "totalOrderCost"),
    paymentReceived: readOptionalNumber(formData, "paymentReceived"),
    felixOhAndProfit: readOptionalNumber(formData, "felixOhAndProfit"),
  };
  const numericError = Object.values(numericFields).find(
    (field) => field.error,
  );
  if (numericError?.error) {
    return { ok: false, message: numericError.error };
  }

  const dateFields = {
    felixSoDate: readOptionalDate(formData, "felixSoDate"),
    clientOrderDate: readOptionalDate(formData, "clientOrderDate"),
    lcDate: readOptionalDate(formData, "lcDate"),
    latestDateOfShipment: readOptionalDate(formData, "latestDateOfShipment"),
    dateOfExpiry: readOptionalDate(formData, "dateOfExpiry"),
  };
  const dateError = Object.values(dateFields).find((field) => field.error);
  if (dateError?.error) {
    return { ok: false, message: dateError.error };
  }

  const supplierNames = formData.getAll("supplier");
  const supplierAmounts = formData.getAll("supplierAmount");
  const supplierValues: Partial<Record<SupplierKey, string>> = {};
  const selectedSuppliers: string[] = [];

  for (let index = 0; index < supplierNames.length; index++) {
    const supplierName = supplierNames[index];
    const supplierAmount = supplierAmounts[index];
    const name = typeof supplierName === "string" ? supplierName.trim() : "";
    const amount =
      typeof supplierAmount === "string" ? supplierAmount.trim() : "";

    // The initial blank supplier row is optional; partially filled rows are not.
    if (!name && !amount) continue;
    if (!name || !amount) {
      return {
        ok: false,
        message: "Complete both supplier and amount for each row.",
      };
    }

    const column = supplierColumns[name as keyof typeof supplierColumns];
    if (!column) {
      return { ok: false, message: `Unknown supplier: ${name}.` };
    }
    if (supplierValues[column] !== undefined) {
      return { ok: false, message: `${name} can only be entered once.` };
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return { ok: false, message: `Enter a valid amount for ${name}.` };
    }

    supplierValues[column] = amount;
    selectedSuppliers.push(name);
  }

  const values = {
    createdBy,
    felixSoNo: readText(formData, "felixSoNo") || null,
    felixSoDate: dateFields.felixSoDate.value,
    emiOrderRef: readText(formData, "emiOrderRef") || null,
    paymentMode: readText(formData, "paymentMode") || null,
    clientOrderRef: readText(formData, "clientOrderRef") || null,
    clientOrderDate: dateFields.clientOrderDate.value,
    clientOrderValue: numericFields.clientOrderValue.value,
    projectName: readText(formData, "projectName") || null,
    clientName: readText(formData, "clientName") || null,
    endUser: readText(formData, "endUser") || null,
    productSystem: readText(formData, "productSystem") || null,
    ttOrLcRef: readText(formData, "ttOrLcRef") || null,
    lcDate: dateFields.lcDate.value,
    latestDateOfShipment: dateFields.latestDateOfShipment.value,
    dateOfExpiry: dateFields.dateOfExpiry.value,
    consignee: readText(formData, "consignee") || null,
    orderHandledBy: readText(formData, "orderHandledBy") || null,
    suppliers: selectedSuppliers.length ? selectedSuppliers.join(", ") : null,
    // Clear amounts for suppliers that were removed from the form during editing.
    ...(Object.fromEntries(
      Object.values(supplierColumns).map((column) => [column, null]),
    ) as Record<SupplierKey, null>),
    ...supplierValues,
    emiCost: numericFields.emiCost.value,
    misCost: numericFields.misCost.value,
    payBack: numericFields.payBack.value,
    totalOrderCost: numericFields.totalOrderCost.value,
    paymentReceived: numericFields.paymentReceived.value,
    felixOhAndProfit: numericFields.felixOhAndProfit.value,
    remarks: readText(formData, "remarks") || null,
  };

  return { ok: true, values };
}

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
