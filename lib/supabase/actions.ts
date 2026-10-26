"use client";

import { createBrowserClient } from "@supabase/ssr";

// Store the browser session in cookies so server pages can verify the same login.
// Browser client for login, logout and direct document uploads.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);
