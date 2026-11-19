"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/betterAuth/session";
import { db } from "@/lib/drizzle/drizzle-index";
import { clients, systems, users } from "@/lib/drizzle/schema";
import {
  readDatalistValues,
  type DatalistKind,
} from "@/lib/drizzle/datalist-values";

// Validate the replacement list, then save all rows in a single transaction.
export async function saveDatalist(kind: DatalistKind, input: string[]) {
  const user = await requireUser();
  const [profile] = user.email
    ? await db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1)
    : [];
  if (profile?.status !== "admin") {
    return {
      ok: false,
      message: "Only admins can change Proposal Form suggestions.",
    };
  }
  if (kind !== "clients" && kind !== "systems") {
    return { ok: false, message: "Invalid suggestion list." };
  }
  const parsed = readDatalistValues(input);
  if (!parsed.ok) return parsed;

  try {
    await db.transaction(async (transaction) => {
      // Serialize list replacements so two saves cannot combine their rows.
      await transaction.execute(
        sql`select pg_advisory_xact_lock(4604748, ${kind === "clients" ? 1 : 2})`,
      );
      if (kind === "clients") {
        await transaction.delete(clients);
        if (parsed.values.length)
          await transaction
            .insert(clients)
            .values(parsed.values.map((clientName) => ({ clientName })));
      } else {
        await transaction.delete(systems);
        if (parsed.values.length)
          await transaction
            .insert(systems)
            .values(parsed.values.map((systemName) => ({ systemName })));
      }
    });
    revalidatePath("/settings");
    revalidatePath("/proposal_form");
    revalidatePath("/proposal_form/[proposalId]", "page");
    return { ok: true, message: "Proposal Form suggestions saved." };
  } catch (error) {
    console.error("Could not save Proposal Form suggestions", error);
    return {
      ok: false,
      message: "Could not save suggestions. Please try again.",
    };
  }
}
