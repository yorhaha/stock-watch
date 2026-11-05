"use client";

import { useEffect, useState } from "react";
import { currentMarketClock } from "@/lib/market";
import type { SessionInfo } from "@/lib/types";

interface MarketClockProps {
  session: SessionInfo;
}

export function MarketClock({ session }: MarketClockProps) {
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const tick = () => setClock(currentMarketClock());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const active = session.isTrading || session.isAuction;

  return (
    <div className="market-clock" data-market-phase={session.phase}>
      <span
        className="market-clock-time"
        role="timer"
        aria-label={`上海时间 ${clock}，${session.label}`}
      >
        {clock}
      </span>
      <span className="market-state">
        <i className={`status-dot ${active ? "is-active" : ""} ${session.isTrading ? "is-trading" : ""}`} />
        <span>{session.label}</span>
      </span>
    </div>
  );
}
