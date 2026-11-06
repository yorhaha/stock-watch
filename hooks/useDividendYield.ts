"use client";

import { useEffect, useState } from "react";
import { fetchDividendPerShare } from "@/lib/eastmoney";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const cache = new Map<string, { perShare: number | null; fetchedAt: number }>();

export function useDividendYield(
  secid: string,
  price: number | null | undefined,
  enabled: boolean,
): number | null {
  const [snapshot, setSnapshot] = useState<{ secid: string; perShare: number | null }>(
    () => ({ secid, perShare: cache.get(secid)?.perShare ?? null }),
  );

  useEffect(() => {
    if (!enabled) return;
    const cached = cache.get(secid);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setSnapshot({ secid, perShare: cached.perShare });
      return;
    }

    const controller = new AbortController();
    fetchDividendPerShare(secid, controller.signal)
      .then((perShare) => {
        cache.set(secid, { perShare, fetchedAt: Date.now() });
        setSnapshot({ secid, perShare });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSnapshot({ secid, perShare: null });
      });
    return () => controller.abort();
  }, [secid, enabled]);

  const perShare = snapshot.secid === secid ? snapshot.perShare : null;
  if (perShare == null || price == null || price <= 0) return null;
  return (perShare / price) * 100;
}
