"use client";

import { useEffect, useRef } from "react";
import type { Preferences, SortMode, ThemeMode } from "@/lib/types";
import { ChevronRightIcon } from "./Icons";

interface SettingsPopoverProps {
  open: boolean;
  preferences: Preferences;
  sortLocked?: boolean;
  onClose: () => void;
  onTheme: (theme: ThemeMode) => void;
  onRefresh: (refreshMs: number) => void;
  onShowPrice: (showPrice: boolean) => void;
  onSort: (sort: SortMode) => void;
  onPinHeld: (pin: boolean) => void;
  onShowIndexValue: (show: boolean) => void;
  onManageIndices: () => void;
  indexCount: number;
}

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: "auto", label: "自动" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
];

const refreshOptions = [3000, 5000, 10000];

const sortOptions: { value: SortMode; label: string; hint: string }[] = [
  { value: "manual", label: "自选", hint: "按自选顺序" },
  { value: "change-desc", label: "涨跌幅 ↓", hint: "按涨跌幅从高到低" },
  { value: "change-asc", label: "涨跌幅 ↑", hint: "按涨跌幅从低到高" },
];

export function SettingsPopover({
  open,
  preferences,
  sortLocked = false,
  onClose,
  onTheme,
  onRefresh,
  onShowPrice,
  onSort,
  onPinHeld,
  onShowIndexValue,
  onManageIndices,
  indexCount,
}: SettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
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
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="settings-popover"
      role="dialog"
      aria-label="设置"
      ref={popoverRef}
    >
      <div className="settings-row">
        <span className="settings-label">主题</span>
        <div className="segmented" role="group" aria-label="主题">
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
        <span className="settings-label">价格</span>
        <div className="segmented" role="group" aria-label="价格显示">
          <button
            type="button"
            className={preferences.showPrice ? "is-selected" : ""}
            aria-pressed={preferences.showPrice}
            onClick={() => onShowPrice(true)}
          >
            显示
          </button>
          <button
            type="button"
            className={!preferences.showPrice ? "is-selected" : ""}
            aria-pressed={!preferences.showPrice}
            onClick={() => onShowPrice(false)}
          >
            隐藏
          </button>
        </div>
      </div>

      <div className="settings-row">
        <span className="settings-label">指数</span>
        <div className="settings-combo">
          <div className="segmented" role="group" aria-label="指数数值显示">
            <button
              type="button"
              className={preferences.showIndexValue ? "is-selected" : ""}
              aria-pressed={preferences.showIndexValue}
              onClick={() => onShowIndexValue(true)}
            >
              显示
            </button>
            <button
              type="button"
              className={!preferences.showIndexValue ? "is-selected" : ""}
              aria-pressed={!preferences.showIndexValue}
              onClick={() => onShowIndexValue(false)}
            >
              隐藏
            </button>
          </div>
          <button
            type="button"
            className="settings-manage"
            onClick={onManageIndices}
            aria-label={`管理指数，当前 ${indexCount} 个`}
          >
            管理
            <ChevronRightIcon size={12} />
          </button>
        </div>
      </div>

      <div className="settings-row">
        <span className="settings-label">排序</span>
        <div className="segmented" role="group" aria-label="自选排序">
          {sortOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className={preferences.sort === option.value ? "is-selected" : ""}
              aria-label={option.hint}
              aria-pressed={preferences.sort === option.value}
              disabled={sortLocked}
              onClick={() => onSort(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-row">
        <span className="settings-label">持有</span>
        <div className="segmented" role="group" aria-label="持有置顶">
          <button
            type="button"
            className={preferences.pinHeld ? "is-selected" : ""}
            aria-pressed={preferences.pinHeld}
            disabled={sortLocked}
            onClick={() => onPinHeld(true)}
          >
            置顶
          </button>
          <button
            type="button"
            className={!preferences.pinHeld ? "is-selected" : ""}
            aria-pressed={!preferences.pinHeld}
            disabled={sortLocked}
            onClick={() => onPinHeld(false)}
          >
            不置顶
          </button>
        </div>
      </div>

      <div className="settings-row">
        <span className="settings-label">刷新</span>
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
    </div>
  );
}
