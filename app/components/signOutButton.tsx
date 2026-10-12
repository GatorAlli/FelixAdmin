"use client";

import { supabase } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  return (
    <>
      <Button
        onClick={async () => {
          setMessage("");
          const { error } = await supabase.auth.signOut();
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
