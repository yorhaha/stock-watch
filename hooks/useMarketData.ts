"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchQuotes, fetchTrend, mapWithConcurrency } from "@/lib/eastmoney";
import type { Quote, Trend } from "@/lib/types";

type DataStatus = "loading" | "ready" | "stale" | "error";

interface MarketData {
  quotes: Record<string, Quote>;
  trends: Record<string, Trend>;
  status: DataStatus;
  error: string | null;
  lastSyncedAt: number | null;
  refresh: () => void;
}

export function useMarketData(
  stockSecids: string[],
  indexSecids: string[],
  active: boolean,
  refreshMs: number,
): MarketData {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [trends, setTrends] = useState<Record<string, Trend>>({});
  const [status, setStatus] = useState<DataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const hasData = useRef(false);

  const allSecids = useMemo(
    () => Array.from(new Set([...stockSecids, ...indexSecids])),
    [stockSecids, indexSecids],
  );
  const key = allSecids.join(",");

  useEffect(() => {
    if (allSecids.length === 0) return;
    const controller = new AbortController();
    let disposed = false;
    let quoteBusy = false;
    let trendBusy = false;
    let quoteTimer: number | undefined;
    let trendTimer: number | undefined;

    async function loadQuotes() {
      if (quoteBusy || disposed || document.visibilityState !== "visible") return;
      quoteBusy = true;
      try {
        const snapshot = await fetchQuotes(allSecids, controller.signal);
        if (disposed) return;
        setQuotes((current) => {
          const next = { ...current };
          snapshot.forEach((quote, secid) => {
            next[secid] = quote;
          });
          return next;
        });
        hasData.current = true;
        setLastSyncedAt(Date.now());
        setStatus("ready");
        setError(null);
      } catch (reason) {
        if (disposed || controller.signal.aborted) return;
        setStatus(hasData.current ? "stale" : "error");
        setError(
          reason instanceof TypeError
            ? "行情接口连接失败"
            : reason instanceof Error
              ? reason.message
              : "行情连接中断",
        );
      } finally {
        quoteBusy = false;
      }
    }

    async function loadTrends() {
      if (trendBusy || disposed || document.visibilityState !== "visible") return;
      trendBusy = true;
      try {
        const results = await mapWithConcurrency(allSecids, 3, (secid) =>
          fetchTrend(secid, controller.signal),
        );
        if (disposed) return;
        const updates: Record<string, Trend> = {};
        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            updates[result.value.secid] = result.value;
          }
        }
        if (Object.keys(updates).length > 0) {
          setTrends((current) => ({ ...current, ...updates }));
        }
      } catch {
        // Intraday paths are best-effort; quote data remains the source of truth.
      } finally {
        trendBusy = false;
      }
    }

    void loadQuotes();
    void loadTrends();

    if (active) {
      quoteTimer = window.setInterval(loadQuotes, refreshMs);
      trendTimer = window.setInterval(loadTrends, 30000);
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadQuotes();
        void loadTrends();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(quoteTimer);
      window.clearInterval(trendTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [key, allSecids, active, refreshMs, refreshNonce]);

  const refresh = useCallback(() => {
    setRefreshNonce((value) => value + 1);
  }, []);

  return { quotes, trends, status, error, lastSyncedAt, refresh };
}
