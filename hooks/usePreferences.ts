"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PREFERENCES, STORAGE_KEYS } from "@/lib/market";
import type { ColorMode, LayoutMode, Preferences, ThemeMode } from "@/lib/types";

function readPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.prefs);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      theme:
        parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "auto"
          ? parsed.theme
          : DEFAULT_PREFERENCES.theme,
      colors: parsed.colors === "intl" ? "intl" : "cn",
      refreshMs: [3000, 5000, 10000].includes(Number(parsed.refreshMs))
        ? Number(parsed.refreshMs)
        : DEFAULT_PREFERENCES.refreshMs,
      showPrice: parsed.showPrice !== false,
      changeBackground: parsed.changeBackground === true,
      layout: parsed.layout === "double" ? "double" : "single",
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  const applyTheme = useCallback((prefs: Preferences) => {
    const systemDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = prefs.theme === "auto" ? (systemDark ? "dark" : "light") : prefs.theme;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.colors = prefs.colors;
    document.documentElement.dataset.showPrice = prefs.showPrice ? "true" : "false";
    document.documentElement.dataset.changeBg = prefs.changeBackground ? "true" : "false";
    document.documentElement.dataset.layout = prefs.layout;
    document.documentElement.style.colorScheme = resolved;
  }, []);

  useEffect(() => {
    const stored = readPreferences();
    setPreferences(stored);
    setReady(true);
    applyTheme(stored);
  }, [applyTheme]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(preferences));
    } catch {
      // Storage can be unavailable in private browsing; the app still works.
    }
    applyTheme(preferences);
  }, [preferences, ready, applyTheme]);

  useEffect(() => {
    if (!ready || preferences.theme !== "auto") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(preferences);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preferences, ready, applyTheme]);

  const setTheme = useCallback((theme: ThemeMode) => {
    setPreferences((current) => ({ ...current, theme }));
  }, []);

  const setColors = useCallback((colors: ColorMode) => {
    setPreferences((current) => ({ ...current, colors }));
  }, []);

  const setRefreshMs = useCallback((refreshMs: number) => {
    setPreferences((current) => ({ ...current, refreshMs }));
  }, []);

  const setShowPrice = useCallback((showPrice: boolean) => {
    setPreferences((current) => ({ ...current, showPrice }));
  }, []);

  const setChangeBackground = useCallback((changeBackground: boolean) => {
    setPreferences((current) => ({ ...current, changeBackground }));
  }, []);

  const setLayout = useCallback((layout: LayoutMode) => {
    setPreferences((current) => ({ ...current, layout }));
  }, []);

  return {
    preferences,
    setTheme,
    setColors,
    setRefreshMs,
    setShowPrice,
    setChangeBackground,
    setLayout,
  };
}
