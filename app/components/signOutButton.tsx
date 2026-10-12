"use client";

import { supabase } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => {
        supabase.auth.signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      Sign Out
    </Button>
  );
}
