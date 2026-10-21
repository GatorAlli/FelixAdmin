"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/actions";
import { IdleSession, IdleSignOut, IDLE_STORAGE_PREFIX, type IdleRecord, type IdleView } from "@/lib/supabase/idle-session";

export default function IdleSessionMonitor({ sessionId, children }: { sessionId: string; children: ReactNode }) {
  const [view, setView] = useState<IdleView | null>(null);
  const [signOutError, setSignOutError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<IdleSession | null>(null);
  const retrySignOut = useRef<() => void>(() => {});
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let disposed = false;
    const key = IDLE_STORAGE_PREFIX + sessionId;
    let channel: BroadcastChannel | undefined;
    try { channel = new BroadcastChannel(key); } catch { /* Storage events remain available. */ }

    function redirectToLogin() {
      if (!disposed) window.location.replace("/");
    }
    const logout = new IdleSignOut({
      signOut: () => supabase.auth.signOut({ scope: "local" }),
      onSuccess: redirectToLogin,
      onError: failed => { if (!disposed) setSignOutError(failed); },
      schedule: (retry, delay) => {
        const timer = setTimeout(retry, delay);
        return () => clearTimeout(timer);
      },
    });
    const idle = new IdleSession({
      now: Date.now,
      read: () => {
        try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; }
      },
      write: (record: IdleRecord) => {
        try { localStorage.setItem(key, JSON.stringify(record)); } catch { /* Still use channel and local clock. */ }
        channel?.postMessage(record);
      },
      onChange: next => { if (!disposed) setView(next); },
      onExpire: () => { void logout.run(); },
    });
    controller.current = idle;
    retrySignOut.current = () => { void logout.run(); };

    const activity = (event: Event) => { if (event.isTrusted) idle.activity(); };
    const check = () => idle.check();
    const storage = (event: StorageEvent) => {
      if (event.key !== key) return;
      try { idle.receive(JSON.parse(event.newValue ?? "null")); } catch { /* Ignore malformed shared state. */ }
    };
    const events = ["pointerdown", "pointermove", "keydown", "scroll", "wheel", "touchstart", "click"];
    events.forEach(name => window.addEventListener(name, activity, { capture: true, passive: true }));
    window.addEventListener("storage", storage);
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    if (channel) channel.onmessage = event => idle.receive(event.data);
    const timer = setInterval(check, 1000);
    // Supabase broadcasts session-scoped sign-out to the other tabs as well.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT" && !idle.isExpired()) redirectToLogin();
    });
    return () => {
      disposed = true;
      clearInterval(timer);
      logout.dispose();
      subscription.unsubscribe();
      channel?.close();
      events.forEach(name => window.removeEventListener(name, activity, true));
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", check);
      controller.current = null;
    };
  }, [sessionId]);

  const open = view !== null && view.status !== "active";
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      element.showModal();
    }
    return () => {
      element?.close();
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
    };
  }, [open]);

  if (!view) return null;
  const expired = view.status === "expired";
  return (
    <>
      {!expired && children}
      {open && (
        <dialog
          ref={dialog}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="idle-session-title"
          aria-describedby="idle-session-description"
          onCancel={event => event.preventDefault()}
          className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-lg backdrop:bg-black/50"
        >
          <h2 id="idle-session-title" className="text-xl font-semibold">
            {expired ? "Session expired" : "Are you still there?"}
          </h2>
          <p id="idle-session-description" className="mt-3 text-sm text-muted-foreground">
            {expired
              ? "You have been inactive for 15 minutes. Signing you out…"
              : "You will be signed out after 15 minutes of inactivity. Unsaved changes will be lost."}
          </p>
          {!expired && (
            <>
              <p role="timer" aria-live="off" className="mt-3 text-sm tabular-nums">
                Signing out in {view.remainingSeconds} seconds.
              </p>
              <Button type="button" autoFocus className="mt-5 normal-case" onClick={() => controller.current?.activity()}>
                Stay signed in
              </Button>
            </>
          )}
          {expired && signOutError && (
            <>
              <p role="alert" className="mt-3 text-sm text-destructive">Could not sign out. Retrying automatically. Please keep this page open.</p>
              <Button type="button" autoFocus className="mt-5 normal-case" onClick={() => retrySignOut.current()}>Retry sign out</Button>
            </>
          )}
        </dialog>
      )}
    </>
  );
}
