"use client";

import { useTransientMessage } from "@/lib/use-transient-message";
import { authClient } from "@/lib/betterAuth/auth-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// Clears the current Better Auth session before returning to the login screen.
export function SignOutButton() {
  const router = useRouter();
  const [message, setMessage] = useTransientMessage();

  return (
    <>
      <Button
        onClick={async () => {
          setMessage("");
          const { error } = await authClient.signOut();
          if (error) {
            setMessage("Could not sign out. Please try again.");
            return;
          }
          router.replace("/");
          router.refresh();
        }}
      >
        Sign Out
      </Button>
      {message && <p role="status">{message}</p>}
    </>
  );
}
