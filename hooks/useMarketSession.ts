"use client";

import { useEffect, useState } from "react";
import { getMarketSession } from "@/lib/market";
import type { SessionInfo } from "@/lib/types";

export function useMarketSession(): SessionInfo {
  const [session, setSession] = useState<SessionInfo>(() => getMarketSession());

  useEffect(() => {
    const update = () => {
      const next = getMarketSession();
      setSession((current) => {
        if (
          current.phase === next.phase &&
          current.label === next.label &&
          current.dateLabel === next.dateLabel &&
          current.weekday === next.weekday
        ) {
          return current;
        }
        return next;
      });
    };
    const timer = window.setInterval(update, 5000);
    return () => window.clearInterval(timer);
  }, []);

  return session;
}
