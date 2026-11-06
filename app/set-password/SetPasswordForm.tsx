"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/betterAuth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SetPasswordForm({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section className="w-full max-w-md space-y-5 rounded-lg border bg-card p-6 sm:p-8">
      <h1 className="text-2xl font-bold">Create your password</h1>
      {complete ? <><p>Your password is ready. You can now sign in to Felix Controls.</p><Link href="/" className="text-primary underline">Go to sign in</Link></> : !token ? <p role="alert">This invitation is invalid or has expired. Ask your administrator to resend it.</p> : (
        <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault();
          if (pending) return;
          const values = new FormData(event.currentTarget);
          const password = String(values.get("password") ?? "");
          if (password !== values.get("confirmation")) { setMessage("Passwords do not match."); return; }
          if (password.length < 8 || new TextEncoder().encode(password).length > 72) { setMessage("Use at least 8 characters and at most 72 bytes."); return; }
          setPending(true);
          setMessage("");
          try {
            const { error } = await authClient.resetPassword({ token, newPassword: password });
            if (error) setMessage(error.status === 429 ? "Too many attempts. Wait one minute and try again." : "Could not create your password. The invitation may have expired or already been used. Ask your administrator to resend it.");
            else setComplete(true);
          } catch { setMessage("Could not connect. Please try again."); }
          finally { setPending(false); }
        }}>
          <p className="text-sm text-muted-foreground">Use at least 8 characters to secure your account.</p>
          <fieldset disabled={pending} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="new-password">Password</Label><Input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></div>
            <div className="space-y-2"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></div>
            <Button type="submit" className="w-full">{pending ? "Saving…" : "Create password"}</Button>
          </fieldset>
          {message && <p role="alert" className="text-sm">{message}</p>}
        </form>
      )}
    </section>
  );
}
