"use client";

import { useEffect, useState } from "react";
import { getMarketSession } from "@/lib/market";
import type { SessionInfo } from "@/lib/types";

const INITIAL_SESSION: SessionInfo = {
  phase: "unknown",
  label: "—",
  isTrading: false,
  isAuction: false,
  clock: "--:--:--",
  dateLabel: "",
  weekday: "",
};

export function useMarketSession(): SessionInfo {
  const [session, setSession] = useState<SessionInfo>(INITIAL_SESSION);

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
    update();
    const timer = window.setInterval(update, 5000);
    return () => window.clearInterval(timer);
  }, []);

  return session;
}
