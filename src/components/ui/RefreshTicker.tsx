"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface RefreshTickerProps {
  intervalMs?: number;
  enabled?: boolean;
}

/**
 * Refreshes server-rendered score data while the tab is visible. The server
 * caches upstream responses briefly, so this does not hammer ESPN.
 */
export function RefreshTicker({
  intervalMs = 60_000,
  enabled = true,
}: RefreshTickerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => window.clearInterval(interval);
  }, [enabled, intervalMs, router]);

  return null;
}
