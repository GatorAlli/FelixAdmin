"use client";

import { useCallback, useEffect, useState } from "react";

export function useTransientMessage() {
  // A new object restarts the timer even when the same message appears again.
  const [notice, setNotice] = useState({ text: "" });
  const setMessage = useCallback((text: string) => setNotice({ text }), []);

  useEffect(() => {
    if (!notice.text) return;
    const timer = window.setTimeout(() => {
      // An older timer must never dismiss a newer message.
      setNotice((current) => current === notice ? { text: "" } : current);
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return [notice.text, setMessage] as const;
}
