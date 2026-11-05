"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchQuotes, fetchTrend, mapWithConcurrency } from "@/lib/eastmoney";
import { marketOfSecid, marketProfileFor } from "@/lib/market";
import type { Quote, SessionInfo, Trend } from "@/lib/types";

type DataStatus = "loading" | "ready" | "stale" | "error";

const TREND_REFRESH_MS = 30_000;

interface MarketData {
  quotes: Record<string, Quote>;
  trends: Record<string, Trend>;
  status: DataStatus;
  error: string | null;
  lastSyncedAt: number | null;
  refresh: () => void;
}

function quotesEqual(a: Quote, b: Quote): boolean {
  return (
    a.secid === b.secid &&
    a.code === b.code &&
    a.name === b.name &&
    a.price === b.price &&
    a.pct === b.pct &&
    a.change === b.change &&
    a.amount === b.amount &&
    a.amplitude === b.amplitude &&
    a.turnover === b.turnover &&
    a.volumeRatio === b.volumeRatio &&
    a.high === b.high &&
    a.low === b.low &&
    a.open === b.open &&
    a.preClose === b.preClose
  );
}

function mergeQuotes(
  current: Record<string, Quote>,
  snapshot: Map<string, Quote>,
): Record<string, Quote> | null {
  let next: Record<string, Quote> | null = null;
  snapshot.forEach((quote, secid) => {
    const previous = current[secid];
    if (previous && quotesEqual(previous, quote)) return;
    if (!next) next = { ...current };
    next[secid] = quote;
  });
  return next;
}

function trendsEqual(a: Trend, b: Trend): boolean {
  if (
    a.tradeDate !== b.tradeDate ||
    a.preClose !== b.preClose ||
    a.market !== b.market ||
    a.points.length !== b.points.length
  ) {
    return false;
  }
  const firstA = a.points[0];
  const firstB = b.points[0];
  const lastA = a.points[a.points.length - 1];
  const lastB = b.points[b.points.length - 1];
  if (!firstA || !firstB || !lastA || !lastB) {
    return firstA === firstB && lastA === lastB;
  }
  return (
    firstA.time === firstB.time &&
    firstA.price === firstB.price &&
    lastA.time === lastB.time &&
    lastA.price === lastB.price &&
    lastA.average === lastB.average &&
    lastA.volume === lastB.volume &&
    lastA.open === lastB.open
  );
}

function mergeTrends(
  current: Record<string, Trend>,
  updates: Record<string, Trend>,
): Record<string, Trend> | null {
  let next: Record<string, Trend> | null = null;
  for (const [secid, trend] of Object.entries(updates)) {
    const previous = current[secid];
    if (previous && trendsEqual(previous, trend)) continue;
    if (!next) next = { ...current };
    next[secid] = trend;
  }
  return next;
}

function isTrendLive(secid: string, session: SessionInfo): boolean {
  switch (marketOfSecid(secid)) {
    case "hk":
      return session.isHongKongTrading;
    case "kr":
      return session.isKoreanTrading;
    case "fut":
    case "a50":
      return session.isFuturesTrading;
    case "brent":
      return session.isBrentTrading;
    default:
      return session.isTrading || session.isAuction;
  }
}

export function useMarketData(
  stockSecids: string[],
  indexSecids: string[],
  active: boolean,
  refreshMs: number,
  session: SessionInfo,
  ready: boolean,
): MarketData {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [trends, setTrends] = useState<Record<string, Trend>>({});
  const trendsRef = useRef(trends);
  trendsRef.current = trends;
  const [status, setStatus] = useState<DataStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const hasData = useRef(false);
  const quoteCache = useRef<Record<string, Quote>>({});
  const trendFetchedAt = useRef(new Map<string, number>());

  // Sort so reordering the watchlist does not restart polling for content
  // that has not changed.
  const key = useMemo(
    () => Array.from(new Set([...stockSecids, ...indexSecids])).sort().join(","),
    [stockSecids, indexSecids],
  );

  useEffect(() => {
    if (!ready || !key) return;
    const secids = key.split(",");
    const controller = new AbortController();
    let disposed = false;
    let quoteBusy = false;
    let quoteTimer: number | undefined;

    async function loadQuotes() {
      if (quoteBusy || disposed || document.visibilityState !== "visible") return;
      quoteBusy = true;
      try {
        const snapshot = await fetchQuotes(secids, controller.signal);
        if (disposed) return;
        const merged = mergeQuotes(quoteCache.current, snapshot);
        if (merged) {
          quoteCache.current = merged;
          setQuotes(merged);
          setLastSyncedAt(Date.now());
        } else if (!hasData.current) {
          setLastSyncedAt(Date.now());
        }
        hasData.current = true;
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

    void loadQuotes();
    if (active) {
      quoteTimer = window.setInterval(loadQuotes, refreshMs);
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadQuotes();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(quoteTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [ready, key, active, refreshMs, refreshNonce]);

  useEffect(() => {
    if (!ready || !key) return;
    const secids = key.split(",");
    const controller = new AbortController();
    let disposed = false;
    let trendBusy = false;
    let trendTimer: number | undefined;

    async function loadTrends(force = false) {
      if (trendBusy || disposed || document.visibilityState !== "visible") return;
      const now = Date.now();
      const targets = secids.filter((secid) => {
        if (force) return true;
        const fetchedAt = trendFetchedAt.current.get(secid);
        if (fetchedAt == null) return true;
        if (now - fetchedAt < TREND_REFRESH_MS) return false;
        if (isTrendLive(secid, session)) return true;
        // A closed market only needs one last refresh until its final minute
        // lands; after that the day's trend is final.
        const trend = trendsRef.current[secid];
        if (!trend || trend.points.length === 0) return true;
        const lastPoint = trend.points[trend.points.length - 1];
        return lastPoint.minute < marketProfileFor(trend).totalMinutes;
      });
      if (targets.length === 0) return;
      trendBusy = true;
      try {
        const results = await mapWithConcurrency(targets, 3, (secid) =>
          fetchTrend(secid, controller.signal),
        );
        if (disposed) return;
        const updates: Record<string, Trend> = {};
        const fetchedAt = Date.now();
        results.forEach((result, index) => {
          if (result.status !== "fulfilled") return;
          trendFetchedAt.current.set(targets[index], fetchedAt);
          if (result.value) updates[result.value.secid] = result.value;
        });
        if (Object.keys(updates).length === 0) return;
        setTrends((current) => mergeTrends(current, updates) ?? current);
      } catch {
        // Intraday paths are best-effort; quote data remains the source of truth.
      } finally {
        trendBusy = false;
      }
    }

    void loadTrends(true);
    if (active) {
      trendTimer = window.setInterval(() => void loadTrends(), TREND_REFRESH_MS);
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void loadTrends();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(trendTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [ready, key, active, session]);

  const refresh = useCallback(() => {
    setRefreshNonce((value) => value + 1);
  }, []);

  return { quotes, trends, status, error, lastSyncedAt, refresh };
}
