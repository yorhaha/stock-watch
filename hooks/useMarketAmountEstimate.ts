"use client";

import { useEffect, useState } from "react";
import { fetchMarketAmountProfile } from "@/lib/eastmoney";
import type { AmountProfile } from "@/lib/types";

// Early in the session the shape of the remaining day dominates the error;
// wait until an average session has printed most of its turnover so the
// projection stays within roughly ten percent.
const MIN_ELAPSED_MINUTES = 180;

export function useMarketAmountEstimate(
  amount: number | null | undefined,
  tradeDate: string | null | undefined,
  elapsedMinutes: number | null,
): number | null {
  const [profile, setProfile] = useState<AmountProfile | null>(null);
  const minute =
    elapsedMinutes == null ? null : Math.min(240, Math.max(0, Math.round(elapsedMinutes)));
  const active = minute != null && minute >= MIN_ELAPSED_MINUTES && minute < 240;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    fetchMarketAmountProfile(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted && next != null) setProfile(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfile(null);
      });
    return () => controller.abort();
  }, [active]);

  if (
    !active ||
    minute == null ||
    profile == null ||
    amount == null ||
    amount <= 0 ||
    tradeDate == null ||
    profile.tradeDate !== tradeDate
  ) {
    return null;
  }
  const fraction = profile.fractions[minute];
  if (!Number.isFinite(fraction) || fraction < 0.7) return null;
  return amount / fraction;
}
