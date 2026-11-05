"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_STOCKS, STORAGE_KEYS, WATCHLIST_LIMIT, isWatchlistCode } from "@/lib/market";
import type { StockRef } from "@/lib/types";

function sanitize(value: unknown): StockRef[] {
  if (!Array.isArray(value)) return DEFAULT_STOCKS;
  const seen = new Set<string>();
  const stocks: StockRef[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<StockRef>;
    const code = String(candidate.code ?? "");
    const secid = String(candidate.secid ?? "");
    if (!isWatchlistCode(code) || !/^[01]\.\d{6}$/.test(secid)) continue;
    if (seen.has(secid)) continue;
    seen.add(secid);
    stocks.push({
      secid,
      code,
      name: String(candidate.name ?? code),
    });
    if (stocks.length >= WATCHLIST_LIMIT) break;
  }
  return stocks;
}

export function useWatchlist() {
  const [stocks, setStocks] = useState<StockRef[]>(DEFAULT_STOCKS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.watchlist);
      if (raw) setStocks(sanitize(JSON.parse(raw)));
    } catch {
      // Keep the curated defaults when storage is unavailable.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify(stocks));
    } catch {
      // Persistence is a convenience, never a blocker.
    }
  }, [stocks, hydrated]);

  const add = useCallback((stock: StockRef) => {
    setStocks((current) => {
      if (current.some((item) => item.secid === stock.secid)) return current;
      if (current.length >= WATCHLIST_LIMIT) return current;
      return [...current, stock];
    });
  }, []);

  const insert = useCallback((stock: StockRef, index: number) => {
    setStocks((current) => {
      if (current.some((item) => item.secid === stock.secid)) return current;
      if (current.length >= WATCHLIST_LIMIT) return current;
      const next = [...current];
      next.splice(Math.max(0, Math.min(index, next.length)), 0, stock);
      return next;
    });
  }, []);

  const addMany = useCallback((incoming: StockRef[]) => {
    setStocks((current) => {
      const next = [...current];
      const seen = new Set(current.map((stock) => stock.secid));
      for (const stock of incoming) {
        if (next.length >= WATCHLIST_LIMIT) break;
        if (seen.has(stock.secid)) continue;
        seen.add(stock.secid);
        next.push(stock);
      }
      return next;
    });
  }, []);

  const remove = useCallback((secid: string) => {
    setStocks((current) => current.filter((stock) => stock.secid !== secid));
  }, []);

  const move = useCallback((from: number, to: number) => {
    setStocks((current) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= current.length ||
        to >= current.length
      ) {
        return current;
      }
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  return { stocks, hydrated, add, addMany, insert, remove, move };
}
