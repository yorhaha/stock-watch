"use client";

import { useEffect, useState } from "react";
import { fetchMarketBreadth } from "@/lib/eastmoney";
import type { MarketBreadth } from "@/lib/types";

const REFRESH_MS = 60_000;

export function useMarketBreadth(active: boolean): MarketBreadth | null {
  const [breadth, setBreadth] = useState<MarketBreadth | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let busy = false;

    async function load() {
      if (busy || disposed || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const snapshot = await fetchMarketBreadth(controller.signal);
        if (!disposed) setBreadth(snapshot);
      } catch {
        // Market breadth is best-effort; keep the last snapshot on failure.
      } finally {
        busy = false;
      }
    }

    void load();
    const timer = active ? window.setInterval(load, REFRESH_MS) : undefined;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [active]);

  return breadth;
}
