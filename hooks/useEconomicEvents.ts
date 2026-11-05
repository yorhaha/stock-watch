"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { beijingDay, fetchEconomicEvents, upcomingEconomicEvents } from "@/lib/events";
import { STORAGE_KEYS } from "@/lib/market";
import type { EconomicEvent } from "@/lib/types";

interface CachedEvents {
  day: string;
  fetchedAt: number;
  events: EconomicEvent[];
}

let pending: Promise<EconomicEvent[]> | null = null;

function loadEvents(): Promise<EconomicEvent[]> {
  if (!pending) {
    pending = fetchEconomicEvents().finally(() => {
      pending = null;
    });
  }
  return pending;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readCache(): CachedEvents | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.events);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      !isRecord(parsed) ||
      typeof parsed.day !== "string" ||
      typeof parsed.fetchedAt !== "number" ||
      !Number.isFinite(parsed.fetchedAt) ||
      !Array.isArray(parsed.events)
    ) {
      return null;
    }

    const events: EconomicEvent[] = [];
    for (const value of parsed.events.slice(0, 100)) {
      if (!isRecord(value)) continue;
      const kind = value.kind;
      if (kind !== "fed" && kind !== "nonfarm" && kind !== "cpi" && kind !== "delivery") {
        continue;
      }
      if (
        typeof value.name !== "string" ||
        typeof value.startsAt !== "number" ||
        !Number.isFinite(value.startsAt) ||
        typeof value.date !== "string" ||
        typeof value.time !== "string"
      ) {
        continue;
      }
      events.push({
        kind,
        name: value.name,
        startsAt: value.startsAt,
        date: value.date,
        time: value.time,
      });
    }

    if (events.length === 0) return null;
    return { day: parsed.day, fetchedAt: parsed.fetchedAt, events };
  } catch {
    return null;
  }
}

function writeCache(cache: CachedEvents): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(cache));
  } catch {
    // Storage may be unavailable in private browsing; the fetched events remain in memory.
  }
}

export function useEconomicEvents(): {
  events: EconomicEvent[];
  fetchedAt: number | null;
} {
  const [allEvents, setAllEvents] = useState<EconomicEvent[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [refreshNonce, setRefreshNonce] = useState(0);
  const attemptedDay = useRef<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const cached = readCache();
    if (cached) {
      setAllEvents(cached.events);
      setFetchedAt(cached.fetchedAt);
    }

    const today = beijingDay(Date.now());
    if (cached?.day === today || attemptedDay.current === today) return;

    void loadEvents()
      .then((events) => {
        if (disposed || events.length === 0) return;
        const stamp = Date.now();
        setAllEvents(events);
        setFetchedAt(stamp);
        writeCache({ day: beijingDay(stamp), fetchedAt: stamp, events });
      })
      .catch(() => {
        // Keep the last successful cache; the next day will try again.
      })
      .finally(() => {
        attemptedDay.current = today;
      });

    return () => {
      disposed = true;
    };
  }, [refreshNonce]);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const stamp = Date.now();
      setNow(stamp);

      const today = beijingDay(stamp);
      if (attemptedDay.current === today) return;
      if (readCache()?.day === today) return;
      setRefreshNonce((value) => value + 1);
    };

    const timer = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  const events = useMemo(() => upcomingEconomicEvents(allEvents, now), [allEvents, now]);

  return { events, fetchedAt };
}
