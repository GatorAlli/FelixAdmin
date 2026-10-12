import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "./server";

// Call before reading or changing orders. A failed check returns to the login page.
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/");
  }

  return data.user;
}
