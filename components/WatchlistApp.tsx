"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useMarketData } from "@/hooks/useMarketData";
import { useMarketSession } from "@/hooks/useMarketSession";
import { usePreferences } from "@/hooks/usePreferences";
import { useWatchlist } from "@/hooks/useWatchlist";
import {
  MARKET_INDICES,
  formatSyncTime,
  formatTradeDate,
} from "@/lib/market";
import type { StockRef } from "@/lib/types";
import { AddStockDialog } from "./AddStockDialog";
import {
  GithubIcon,
  MoonIcon,
  PlusIcon,
  RefreshIcon,
  SettingsIcon,
  SunIcon,
} from "./Icons";
import { IndexStrip } from "./IndexStrip";
import { MarketClock } from "./MarketClock";
import { SettingsPopover } from "./SettingsPopover";
import { StockRow } from "./StockRow";

interface Toast {
  id: number;
  message: string;
  stock?: StockRef;
  index?: number;
}

export function WatchlistApp() {
  const { stocks, hydrated, add, insert, remove, move } = useWatchlist();
  const {
    preferences,
    resolvedTheme,
    setTheme,
    setColors,
    setRefreshMs,
    toggleTheme,
  } = usePreferences();
  const session = useMarketSession();

  const stockSecids = useMemo(() => stocks.map((stock) => stock.secid), [stocks]);
  const indexSecids = useMemo(() => MARKET_INDICES.map((index) => index.secid), []);
  const activeMarket = session.isTrading || session.isAuction;
  const { quotes, trends, status, lastSyncedAt, refresh } = useMarketData(
    stockSecids,
    indexSecids,
    activeMarket,
    preferences.refreshMs,
  );

  const [focusedSecid, setFocusedSecid] = useState<string | null>(null);
  const [expandedSecid, setExpandedSecid] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastId = useRef(0);

  const counts = useMemo(() => {
    let sh = 0;
    let sz = 0;
    let bj = 0;
    for (const stock of stocks) {
      if (stock.exchange === "SH") sh += 1;
      else if (stock.exchange === "BJ") bj += 1;
      else sz += 1;
    }
    return { sh, sz, bj };
  }, [stocks]);

  const latestTradeDate = useMemo(() => {
    let latest = "";
    for (const stock of stocks) {
      const date = trends[stock.secid]?.tradeDate;
      if (date && date > latest) latest = date;
    }
    return latest;
  }, [stocks, trends]);

  const focusedIndex = useMemo(
    () => stocks.findIndex((stock) => stock.secid === focusedSecid),
    [stocks, focusedSecid],
  );

  const showToast = useCallback((message: string) => {
    toastId.current += 1;
    setToast({ id: toastId.current, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (focusedSecid && !stocks.some((stock) => stock.secid === focusedSecid)) {
      setFocusedSecid(null);
    }
    if (expandedSecid && !stocks.some((stock) => stock.secid === expandedSecid)) {
      setExpandedSecid(null);
    }
  }, [stocks, focusedSecid, expandedSecid]);

  useEffect(() => {
    if (!focusedSecid) return;
    const row = document.getElementById(`stock-${focusedSecid}`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedSecid]);

  const toggleExpanded = useCallback((stock: StockRef) => {
    setFocusedSecid(stock.secid);
    setExpandedSecid((current) => (current === stock.secid ? null : stock.secid));
  }, []);

  const activate = useCallback((stock: StockRef) => {
    setFocusedSecid(stock.secid);
  }, []);

  const handleRemove = useCallback(
    (stock: StockRef) => {
      const index = stocks.findIndex((item) => item.secid === stock.secid);
      if (index === -1) return;
      remove(stock.secid);
      if (focusedSecid === stock.secid) {
        const next = stocks[index + 1] ?? stocks[index - 1];
        setFocusedSecid(next?.secid ?? null);
      }
      if (expandedSecid === stock.secid) setExpandedSecid(null);
      toastId.current += 1;
      setToast({
        id: toastId.current,
        message: `已移除 ${stock.name}`,
        stock,
        index,
      });
    },
    [stocks, remove, focusedSecid, expandedSecid],
  );

  const handleUndo = useCallback(() => {
    if (!toast?.stock) return;
    insert(toast.stock, toast.index ?? stocks.length);
    setFocusedSecid(toast.stock.secid);
    setToast(null);
  }, [toast, insert, stocks.length]);

  const handleAdd = useCallback(
    (stock: StockRef) => {
      if (stocks.some((item) => item.secid === stock.secid)) {
        showToast(`${stock.name} 已在自选中`);
        return;
      }
      if (stocks.length >= 30) {
        showToast("自选最多可以放 30 只股票");
        return;
      }
      add(stock);
      setFocusedSecid(stock.secid);
      setExpandedSecid(null);
      showToast(`已添加 ${stock.name}`);
    },
    [stocks, add, showToast],
  );

  const handleEditing = useCallback(() => {
    setEditing((current) => {
      if (!current) setExpandedSecid(null);
      return !current;
    });
    setDragIndex(null);
    setDragOver(null);
  }, []);

  const focusRelative = useCallback(
    (direction: 1 | -1) => {
      setFocusedSecid((current) => {
        if (stocks.length === 0) return null;
        const index = current
          ? stocks.findIndex((stock) => stock.secid === current)
          : -1;
        if (index === -1) return direction === 1 ? stocks[0].secid : stocks[stocks.length - 1].secid;
        const next = Math.max(0, Math.min(stocks.length - 1, index + direction));
        return stocks[next].secid;
      });
    },
    [stocks],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSettingsOpen(false);
        setDialogOpen(true);
        return;
      }
      if (typing || dialogOpen || settingsOpen) return;

      if (event.key === "/" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setDialogOpen(true);
        return;
      }
      if (editing) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusRelative(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusRelative(-1);
      } else if (event.key === "Enter" && focusedSecid) {
        const stock = stocks.find((item) => item.secid === focusedSecid);
        if (stock) {
          event.preventDefault();
          toggleExpanded(stock);
        }
      } else if (event.key === "Escape") {
        if (expandedSecid) {
          setExpandedSecid(null);
        } else {
          setFocusedSecid(null);
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    dialogOpen,
    settingsOpen,
    editing,
    focusedSecid,
    expandedSecid,
    stocks,
    focusRelative,
    toggleExpanded,
  ]);

  const onDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const onDragOverRow = useCallback((event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    if (dragOver !== index) setDragOver(index);
  }, [dragOver]);

  const onDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOver(null);
  }, []);

  const onDrop = useCallback(
    (index: number) => {
      if (dragIndex != null && dragIndex !== index) move(dragIndex, index);
      setDragIndex(null);
      setDragOver(null);
    },
    [dragIndex, move],
  );

  const statusLabel =
    status === "loading"
      ? "正在连接行情"
      : status === "stale" || status === "error"
        ? "连接中断 · 点击重试"
        : `${session.isTrading || session.isAuction ? "更新于" : "行情同步"} ${formatSyncTime(lastSyncedAt)}`;

  const dataCaption = latestTradeDate
    ? `${session.isTrading || session.isAuction ? "今日行情" : "最后交易日"} ${formatTradeDate(latestTradeDate)}`
    : "正在获取行情";

  return (
    <div className="app-shell" id="top">
      <a className="skip-link" href="#watchlist">
        跳到自选
      </a>

      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-group">
            <a className="brand" href="#top" aria-label="Tape 首页">
              <span className="brand-mark">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" fill="currentColor" />
                  <path
                    d="M6.9 15.5 10 12.4l2.2 1.45 4.8-5.35"
                    stroke="var(--brand-ink)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="17" cy="8.5" r="1.25" fill="var(--brand-ink)" />
                </svg>
              </span>
              <span className="brand-name">Tape</span>
            </a>
            <span className="brand-divider" aria-hidden="true" />
            <span className="brand-caption">A 股日内盯盘</span>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button theme-toggle"
              onClick={toggleTheme}
              aria-label={resolvedTheme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
              title={resolvedTheme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
            >
              {resolvedTheme === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
            </button>
            <div className="settings-anchor">
              <button
                type="button"
                className={`icon-button ${settingsOpen ? "is-active" : ""}`}
                data-settings-trigger
                onClick={() => setSettingsOpen((current) => !current)}
                aria-label="设置"
                aria-expanded={settingsOpen}
                title="设置"
              >
                <SettingsIcon size={17} />
              </button>
              <SettingsPopover
                open={settingsOpen}
                preferences={preferences}
                onClose={() => setSettingsOpen(false)}
                onTheme={setTheme}
                onColors={setColors}
                onRefresh={setRefreshMs}
              />
            </div>
            <button type="button" className="add-button" onClick={() => setDialogOpen(true)}>
              <PlusIcon size={15} />
              <span>添加</span>
              <kbd>⌘K</kbd>
            </button>
          </div>
        </div>
      </header>

      <main className="page">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <i />
              WATCHLIST
            </span>
            <h1>自选</h1>
            <p className="hero-sub">
              {stocks.length} 只股票
              <span className="dot-separator">·</span>
              沪 {counts.sh} / 深 {counts.sz}
              {counts.bj > 0 ? <> / 京 {counts.bj}</> : null}
              <span className="dot-separator">·</span>
              {dataCaption}
            </p>
          </div>
          <MarketClock session={session} />
        </section>

        <IndexStrip indices={MARKET_INDICES} quotes={quotes} trends={trends} />

        <section className="watchlist-section" id="watchlist" aria-label="自选股票">
          <div className="watchlist-toolbar">
            <button
              type="button"
              className={`data-status ${status}`}
              onClick={refresh}
              title="立即刷新行情"
              aria-live="polite"
            >
              <span className={`data-dot ${status}`} />
              <span>{statusLabel}</span>
              <RefreshIcon size={12} />
            </button>
            <div className="toolbar-actions">
              {editing ? <span className="edit-hint">拖动或使用箭头排序</span> : null}
              <button type="button" className="text-button" onClick={handleEditing}>
                {editing ? "完成" : "编辑"}
              </button>
            </div>
          </div>

          {!editing ? (
            <div className="column-head" aria-hidden="true">
              <span>股票</span>
              <span>今日走势</span>
              <span>最新价</span>
              <span />
            </div>
          ) : null}

          {!hydrated ? (
            <div className="list-skeleton" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <div className="skeleton-row" key={index}>
                  <span className="skeleton-name" />
                  <span className="skeleton-chart" />
                  <span className="skeleton-price" />
                </div>
              ))}
            </div>
          ) : stocks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-mark">
                <PlusIcon size={20} />
              </span>
              <h2>自选还是空的</h2>
              <p>添加你每天想看的股票，一列排开，一眼看清。</p>
              <button type="button" className="primary-button" onClick={() => setDialogOpen(true)}>
                添加第一只股票
              </button>
            </div>
          ) : (
            <div className={`watchlist ${editing ? "is-editing" : ""}`} role="list">
              {stocks.map((stock, index) => {
                const quote = quotes[stock.secid];
                const trend = trends[stock.secid];
                return (
                  <StockRow
                    key={stock.secid}
                    stock={stock}
                    quote={quote}
                    trend={trend}
                    index={index}
                    expanded={expandedSecid === stock.secid}
                    active={focusedSecid === stock.secid}
                    editing={editing}
                    first={index === 0}
                    last={index === stocks.length - 1}
                    dragOver={dragOver === index && dragIndex !== index}
                    onActivate={activate}
                    onToggle={toggleExpanded}
                    onRemove={handleRemove}
                    onMove={move}
                    onDragStart={onDragStart}
                    onDragOver={onDragOverRow}
                    onDragEnd={onDragEnd}
                    onDrop={onDrop}
                  />
                );
              })}
            </div>
          )}

          {stocks.length > 0 ? (
            <button type="button" className="add-row" onClick={() => setDialogOpen(true)}>
              <PlusIcon size={15} />
              <span>添加股票</span>
              <span className="add-row-hint">
                <kbd>⌘</kbd>
                <kbd>K</kbd>
              </span>
            </button>
          ) : null}
        </section>

        <footer className="site-footer">
          <div className="footer-copy">
            <p>行情数据来自东方财富公开接口，可能存在延迟，仅供学习参考，不构成投资建议。</p>
            <span>© 2026 Tape · Made for focus</span>
          </div>
          <div className="footer-links">
            <div className="keyboard-hints">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> 浏览
              </span>
              <span>
                <kbd>↵</kbd> 展开
              </span>
              <span>
                <kbd>⌘</kbd>
                <kbd>K</kbd> 添加
              </span>
            </div>
            <a
              href="https://github.com/yorhaha/stock-watch"
              target="_blank"
              rel="noreferrer noopener"
              className="github-link"
            >
              <GithubIcon size={14} />
              GitHub
            </a>
          </div>
        </footer>
      </main>

      <AddStockDialog
        open={dialogOpen}
        addedSecids={stockSecids}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAdd}
      />

      {toast ? (
        <div className="toast" role="status" key={toast.id}>
          <span>{toast.message}</span>
          {toast.stock ? (
            <button type="button" onClick={handleUndo}>
              撤销
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
