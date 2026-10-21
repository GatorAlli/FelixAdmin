import "server-only";
import { createClient } from "@supabase/supabase-js";

export function getStorageAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;

  createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
