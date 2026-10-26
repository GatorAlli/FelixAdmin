import { redirect } from "next/navigation";
import IdleSessionMonitor from "@/components/auth/idle-session-monitor";
import { createClient } from "@/lib/supabase/server";

// Checks the session before rendering protected pages and starts their idle timer.
export default async function PagesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sessionId = data?.claims.session_id;
  if (error || typeof sessionId !== "string" || !sessionId) redirect("/");
  // A fresh login has a new session ID; token refresh keeps the same idle deadline.
  return <IdleSessionMonitor key={sessionId} sessionId={sessionId}>{children}</IdleSessionMonitor>;
}
