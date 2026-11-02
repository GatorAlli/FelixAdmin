import IdleSessionMonitor from "@/components/auth/idle-session-monitor";
import { requireSession } from "@/lib/betterAuth/session";

// Checks the session before rendering protected pages and starts their idle timer.
export default async function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await requireSession();
  const sessionId = session.id;
  // A fresh login has a new session ID; token refresh keeps the same idle deadline.
  return (
    <IdleSessionMonitor key={sessionId} sessionId={sessionId}>
      {children}
    </IdleSessionMonitor>
  );
}
