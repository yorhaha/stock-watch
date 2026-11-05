"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_INDICES,
  INDEX_LIMIT,
  STORAGE_KEYS,
  isSupportedIndex,
} from "@/lib/market";
import type { StockRef } from "@/lib/types";

function sanitize(value: unknown): StockRef[] {
  if (!Array.isArray(value)) return DEFAULT_INDICES;
  const seen = new Set<string>();
  const indices: StockRef[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<StockRef>;
    const code = String(candidate.code ?? "");
    const secid = String(candidate.secid ?? "");
    if (!isSupportedIndex(secid, code)) continue;
    if (seen.has(secid)) continue;
    seen.add(secid);
    indices.push({
      secid,
      code,
      name: String(candidate.name ?? code),
    });
    if (indices.length >= INDEX_LIMIT) break;
  }
  return indices;
}

export function useIndices() {
  const [indices, setIndices] = useState<StockRef[]>(DEFAULT_INDICES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.indices);
      if (raw) setIndices(sanitize(JSON.parse(raw)));
    } catch {
      // Keep the default market indices when storage is unavailable.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.indices, JSON.stringify(indices));
    } catch {
      // Persistence is a convenience, never a blocker.
    }
  }, [indices, hydrated]);

  const add = useCallback((index: StockRef) => {
    setIndices((current) => {
      if (current.some((item) => item.secid === index.secid)) return current;
      if (current.length >= INDEX_LIMIT) return current;
      return [...current, index];
    });
  }, []);

  const remove = useCallback((secid: string) => {
    setIndices((current) => current.filter((index) => index.secid !== secid));
  }, []);

  const move = useCallback((from: number, to: number) => {
    setIndices((current) => {
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

  const replace = useCallback((next: StockRef[]) => {
    setIndices(next.slice(0, INDEX_LIMIT));
  }, []);

  return { indices, hydrated, add, remove, move, replace };
}
