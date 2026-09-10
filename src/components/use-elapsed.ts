"use client";

import { useEffect, useState } from "react";

/**
 * Seconds elapsed since `startedAt`, recomputed from the clock on every tick so
 * it never drifts while the tab is backgrounded or the phone is asleep.
 * Pass null to stop the timer.
 */
export function useElapsed(startedAt: number | null) {
  const [seconds, setSeconds] = useState(() =>
    startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0,
  );

  useEffect(() => {
    if (!startedAt) {
      setSeconds(0);
      return;
    }
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    // Coming back from the background must not show a stale time for a second.
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [startedAt]);

  return seconds;
}
