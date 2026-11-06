"use client";

import { useEffect, useState } from "react";
import { fetchVolumeProfile } from "@/lib/eastmoney";
import type { VolumeProfile } from "@/lib/types";

// The opening auction skews early cumulative shares; wait for a stable shape.
const MIN_ELAPSED_MINUTES = 30;

export function useVolumeEstimate(
  secid: string,
  volume: number | null | undefined,
  tradeDate: string | null | undefined,
  elapsedMinutes: number | null,
): number | null {
  const [snapshot, setSnapshot] = useState<{ secid: string; profile: VolumeProfile } | null>(
    null,
  );
  const live = elapsedMinutes != null;

  useEffect(() => {
    if (!live) return;
    const controller = new AbortController();
    fetchVolumeProfile(secid, controller.signal)
      .then((profile) => {
        if (!controller.signal.aborted && profile != null) setSnapshot({ secid, profile });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSnapshot(null);
      });
    return () => controller.abort();
  }, [secid, live]);

  const profile = snapshot?.secid === secid ? snapshot.profile : null;
  if (
    profile == null ||
    elapsedMinutes == null ||
    volume == null ||
    volume <= 0 ||
    tradeDate == null ||
    profile.tradeDate !== tradeDate
  ) {
    return null;
  }
  const minute = Math.min(240, Math.max(0, Math.round(elapsedMinutes)));
  if (minute < MIN_ELAPSED_MINUTES || minute >= 240) return null;
  const fraction = profile.fractions[minute];
  if (!Number.isFinite(fraction) || fraction < 0.05) return null;
  return volume / fraction;
}
