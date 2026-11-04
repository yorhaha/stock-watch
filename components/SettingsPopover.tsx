"use client";

import { useEffect, useRef } from "react";
import type { ColorMode, Preferences, ThemeMode } from "@/lib/types";
import { CloseIcon } from "./Icons";

interface SettingsPopoverProps {
  open: boolean;
  preferences: Preferences;
  onClose: () => void;
  onTheme: (theme: ThemeMode) => void;
  onColors: (colors: ColorMode) => void;
  onRefresh: (refreshMs: number) => void;
}

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: "auto", label: "自动" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
];

const colorOptions: { value: ColorMode; label: string }[] = [
  { value: "cn", label: "红涨绿跌" },
  { value: "intl", label: "绿涨红跌" },
];

const refreshOptions = [3000, 5000, 10000];

export function SettingsPopover({
  open,
  preferences,
  onClose,
  onTheme,
  onColors,
  onRefresh,
}: SettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      const trigger = document.querySelector("[data-settings-trigger]");
      if (trigger?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="settings-popover"
      role="dialog"
      aria-label="外观与行情设置"
      ref={popoverRef}
    >
      <div className="settings-head">
        <span>设置</span>
        <button type="button" className="icon-button compact" onClick={onClose} aria-label="关闭设置">
          <CloseIcon size={14} />
        </button>
      </div>

      <div className="settings-row">
        <div className="settings-copy">
          <span className="settings-label">外观</span>
          <span className="settings-hint">跟随系统，或固定主题</span>
        </div>
        <div className="segmented" role="group" aria-label="外观主题">
          {themeOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className={preferences.theme === option.value ? "is-selected" : ""}
              aria-pressed={preferences.theme === option.value}
              onClick={() => onTheme(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-copy">
          <span className="settings-label">涨跌颜色</span>
          <span className="settings-hint">按你的看盘习惯显示</span>
        </div>
        <div className="segmented wide" role="group" aria-label="涨跌颜色">
          {colorOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className={preferences.colors === option.value ? "is-selected" : ""}
              aria-pressed={preferences.colors === option.value}
              onClick={() => onColors(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-copy">
          <span className="settings-label">刷新频率</span>
          <span className="settings-hint">分时图约每 30 秒刷新</span>
        </div>
        <div className="segmented" role="group" aria-label="刷新频率">
          {refreshOptions.map((option) => (
            <button
              type="button"
              key={option}
              className={preferences.refreshMs === option ? "is-selected" : ""}
              aria-pressed={preferences.refreshMs === option}
              onClick={() => onRefresh(option)}
            >
              {option / 1000}s
            </button>
          ))}
        </div>
      </div>

      <div className="settings-foot">
        <span className="settings-dot" />
        <span>行情来自东方财富公开接口，可能存在延迟</span>
      </div>
    </div>
  );
}
