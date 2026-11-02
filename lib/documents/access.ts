import "server-only";

import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/drizzle/drizzle-index";
import { data, users } from "@/lib/drizzle/schema";
import { canEditOrder } from "@/lib/drizzle/order-access";

export function parseOrderId(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

export function hasDocumentOrigin(request: Request) {
  const expected = new URL(process.env.BETTER_AUTH_URL || request.url).origin;
  return request.headers.get("origin") === expected;
}

export async function documentAccess(orderId: number, editing: boolean, headers: Headers) {
  const session = await auth.api.getSession({ headers, query: { disableRefresh: true } });
  if (!session) return { ok: false as const, status: 401, message: "Your session expired. Please sign in again." };
  const [order] = await db.select({ editable: data.orderManagerAccess })
    .from(data).where(eq(data.sl, orderId)).limit(1);
  if (!order) return { ok: false as const, status: 404, message: "Order not found." };
  if (editing) {
    const [profile] = await db.select({ status: users.status }).from(users)
      .where(eq(users.email, session.user.email)).limit(1);
    if (!canEditOrder(profile?.status, order.editable)) {
      return { ok: false as const, status: 403, message: "You cannot change this order's documents." };
    }
  }
  return { ok: true as const, user: session.user };
}
