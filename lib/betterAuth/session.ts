import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Deduplicate checks during one render, never across visitors or requests.
export const requireSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
    // Server Components cannot write cookies. The browser client renews sessions.
    query: { disableRefresh: true },
  });

  if (!session) redirect("/");
  return session;
});

// Pages and actions still check the session before reading or changing data.
export async function requireUser() {
  return (await requireSession()).user;
}
