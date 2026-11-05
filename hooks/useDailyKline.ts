"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchDailyKline } from "@/lib/eastmoney";
import type { Candle } from "@/lib/types";

const CACHE_TTL = 60_000;
const cache = new Map<string, { at: number; candles: Candle[] }>();

interface DailyKlineState {
  candles: Candle[];
  loading: boolean;
  error: string | null;
}

export function useDailyKline(secid: string) {
  const [state, setState] = useState<DailyKlineState>(() => {
    const cached = cache.get(secid);
    return cached
      ? { candles: cached.candles, loading: false, error: null }
      : { candles: [], loading: true, error: null };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const cached = cache.get(secid);
    if (attempt === 0 && cached && Date.now() - cached.at < CACHE_TTL) {
      setState({ candles: cached.candles, loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    let disposed = false;
    setState({ candles: cached?.candles ?? [], loading: true, error: null });

    fetchDailyKline(secid, controller.signal)
      .then((candles) => {
        if (disposed) return;
        cache.set(secid, { at: Date.now(), candles });
        setState({ candles, loading: false, error: null });
      })
      .catch((reason: unknown) => {
        if (disposed || controller.signal.aborted) return;
        setState((current) => ({
          candles: current.candles,
          loading: false,
          error: reason instanceof Error ? reason.message : "日K数据暂不可用",
        }));
      });

    return () => {
      disposed = true;
      controller.abort();
    };
  }, [secid, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
