"use server";

import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { miscellaneousExpenditures, suppliers, users } from "@/lib/drizzle/schema";
import { readDatalistValues, type DatalistKind } from "@/lib/drizzle/datalist-values";

export async function fetchSuppliersList() {
  await requireUser();
  return db.select().from(suppliers).orderBy(asc(suppliers.sl));
}

export async function fetchExpensesList() {
  await requireUser();
  return db.select().from(miscellaneousExpenditures).orderBy(asc(miscellaneousExpenditures.sl));
}

export async function saveDatalist(kind: DatalistKind, input: string[]) {
  const user = await requireUser();
  const [profile] = user.email
    ? await db.select({ status: users.status }).from(users)
        .where(eq(users.email, user.email)).limit(1)
    : [];
  if (profile?.status !== "admin") {
    return { ok: false, message: "Only admins can change Order Form suggestions." };
  }
  if (kind !== "suppliers" && kind !== "expenses") {
    return { ok: false, message: "Invalid suggestion list." };
  }
  const parsed = readDatalistValues(kind, input);
  if (!parsed.ok) return parsed;

  try {
    await db.transaction(async (transaction) => {
      // Serialize list replacements so two saves cannot combine their rows.
      await transaction.execute(sql`select pg_advisory_xact_lock(4604748, ${kind === "suppliers" ? 1 : 2})`);
      if (kind === "suppliers") {
        await transaction.delete(suppliers);
        if (parsed.values.length) await transaction.insert(suppliers)
          .values(parsed.values.map((supplierName) => ({ supplierName })));
      } else {
        await transaction.delete(miscellaneousExpenditures);
        if (parsed.values.length) await transaction.insert(miscellaneousExpenditures)
          .values(parsed.values.map((miscellaneousExpenditureType) => ({ miscellaneousExpenditureType })));
      }
    });
    revalidatePath("/settings");
    revalidatePath("/summary");
    revalidatePath("/order_form");
    revalidatePath("/order_form/[edit_slug]", "page");
    return { ok: true, message: "Order Form suggestions saved." };
  } catch (error) {
    console.error("Could not save Order Form suggestions", error);
    return { ok: false, message: "Could not save suggestions. Please try again." };
  }
}
