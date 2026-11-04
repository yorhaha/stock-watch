"use client";

import { useEffect, useState } from "react";
import { getMarketSession } from "@/lib/market";
import type { SessionInfo } from "@/lib/types";

interface MarketClockProps {
  session: SessionInfo;
}

export function MarketClock({ session }: MarketClockProps) {
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const tick = () => setClock(getMarketSession().clock);
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const live = session.isTrading;
  const active = live || session.isAuction;

  return (
    <div className="market-clock">
      <span className="market-clock-time" role="timer" aria-label={`上海时间 ${clock}`}>
        {clock}
      </span>
      <span className="market-state">
        <i className={`status-dot ${active ? "is-active" : ""} ${live ? "is-trading" : ""}`} />
        <span>{session.label}</span>
        <span className="state-divider" />
        <span>
          {session.dateLabel} {session.weekday}
        </span>
      </span>
    </div>
  );
}
