"use client";

import { useEffect, useRef } from "react";
import type { ColorMode, LayoutMode, Preferences, ThemeMode } from "@/lib/types";
import { ChevronRightIcon } from "./Icons";

interface SettingsPopoverProps {
  open: boolean;
  preferences: Preferences;
  onClose: () => void;
  onTheme: (theme: ThemeMode) => void;
  onColors: (colors: ColorMode) => void;
  onRefresh: (refreshMs: number) => void;
  onShowPrice: (showPrice: boolean) => void;
  onChangeBackground: (enabled: boolean) => void;
  onLayout: (layout: LayoutMode) => void;
  onShowIndexValue: (show: boolean) => void;
  onManageIndices: () => void;
  indexCount: number;
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
  onShowPrice,
  onChangeBackground,
  onLayout,
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
        <span className="settings-label">涨跌</span>
        <div className="segmented color-segmented" role="group" aria-label="涨跌颜色">
          {colorOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className={preferences.colors === option.value ? "is-selected" : ""}
              aria-label={option.label}
              aria-pressed={preferences.colors === option.value}
              onClick={() => onColors(option.value)}
            >
              <span className={`color-sample ${option.value}`} aria-hidden="true">
                <span>↑</span>
                <span>↓</span>
              </span>
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
        <span className="settings-label">色块</span>
        <div className="segmented" role="group" aria-label="涨跌幅背景色块">
          <button
            type="button"
            className={!preferences.changeBackground ? "is-selected" : ""}
            aria-pressed={!preferences.changeBackground}
            onClick={() => onChangeBackground(false)}
          >
            关
          </button>
          <button
            type="button"
            className={preferences.changeBackground ? "is-selected" : ""}
            aria-pressed={preferences.changeBackground}
            onClick={() => onChangeBackground(true)}
          >
            开
          </button>
        </div>
      </div>

      <div className="settings-row">
        <span className="settings-label">布局</span>
        <div className="segmented layout-segmented" role="group" aria-label="列表布局">
          <button
            type="button"
            className={preferences.layout === "single" ? "is-selected" : ""}
            aria-label="单列"
            aria-pressed={preferences.layout === "single"}
            onClick={() => onLayout("single")}
          >
            <span className="layout-glyph single" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>
          <button
            type="button"
            className={preferences.layout === "double" ? "is-selected" : ""}
            aria-label="双列"
            aria-pressed={preferences.layout === "double"}
            onClick={() => onLayout("double")}
          >
            <span className="layout-glyph double" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
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
