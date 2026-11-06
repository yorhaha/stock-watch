"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIndices } from "@/hooks/useIndices";
import { useMarketData } from "@/hooks/useMarketData";
import { useMarketSession } from "@/hooks/useMarketSession";
import { usePreferences } from "@/hooks/usePreferences";
import { useWatchlist } from "@/hooks/useWatchlist";
import {
  WATCHLIST_LIMIT,
  formatSyncTime,
  formatTradeDate,
  isBrentIndex,
  isFuturesIndex,
  isHongKongIndex,
  isKoreanIndex,
  sortStocksByChange,
} from "@/lib/market";
import type { StockRef } from "@/lib/types";
import { AddStockDialog } from "./AddStockDialog";
import { AlertIcon, PlusIcon, RefreshIcon, SettingsIcon } from "./Icons";
import { IndexManagerDialog } from "./IndexManagerDialog";
import { IndexStrip } from "./IndexStrip";
import { MarketClock } from "./MarketClock";
import { SettingsPopover } from "./SettingsPopover";
import { StockRow } from "./StockRow";
import { DetailSheet } from "./DetailSheet";
import { EconomicCalendar } from "./EconomicCalendar";
import { MarketBreadth } from "./MarketBreadth";

interface Toast {
  id: number;
  message: string;
  stock?: StockRef;
  index?: number;
}

export function WatchlistApp() {
  const {
    stocks,
    hydrated: stocksHydrated,
    add,
    addMany,
    insert,
    remove,
    toggleHeld,
  } = useWatchlist();
  const {
    indices,
    hydrated: indicesHydrated,
    add: addIndex,
    remove: removeIndex,
    move: moveIndex,
    replace: replaceIndices,
  } = useIndices();
  const {
    preferences,
    setTheme,
    setRefreshMs,
    setShowPrice,
    setShowIndexValue,
    setPinHeld,
  } = usePreferences();
  const session = useMarketSession();

  const stockSecids = useMemo(() => stocks.map((stock) => stock.secid), [stocks]);
  const indexSecids = useMemo(() => indices.map((index) => index.secid), [indices]);
  const hasHongKongIndex = useMemo(
    () => indices.some((index) => isHongKongIndex(index.secid)),
    [indices],
  );
  const hasKoreanIndex = useMemo(
    () => indices.some((index) => isKoreanIndex(index.secid)),
    [indices],
  );
  const hasFuturesIndex = useMemo(
    () => indices.some((index) => isFuturesIndex(index.secid)),
    [indices],
  );
  const hasBrentIndex = useMemo(
    () => indices.some((index) => isBrentIndex(index.secid)),
    [indices],
  );
  const activeMarket =
    session.isTrading ||
    session.isAuction ||
    (hasHongKongIndex && session.isHongKongTrading) ||
    (hasKoreanIndex && session.isKoreanTrading) ||
    (hasFuturesIndex && session.isFuturesTrading) ||
    (hasBrentIndex && session.isBrentTrading);
  const ready = stocksHydrated && indicesHydrated;
  const { quotes, trends, status, error, lastSyncedAt, refresh } = useMarketData(
    stockSecids,
    indexSecids,
    activeMarket,
    preferences.refreshMs,
    session,
    ready,
  );
  const displayStocks = useMemo(() => {
    const ordered = sortStocksByChange(stocks, quotes);
    if (!preferences.pinHeld) return ordered;
    return [
      ...ordered.filter((stock) => stock.held === true),
      ...ordered.filter((stock) => stock.held !== true),
    ];
  }, [stocks, quotes, preferences.pinHeld]);
  const displayStocksRef = useRef(displayStocks);
  displayStocksRef.current = displayStocks;

  const [focusedSecid, setFocusedSecid] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<
    { secid: string; kind: "stock" | "index" } | null
  >(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [indexManagerOpen, setIndexManagerOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastId = useRef(0);

  const latestTick = useMemo(() => {
    let date = "";
    let time = "";
    for (const item of [...stocks, ...indices]) {
      const trend = trends[item.secid];
      const last = trend?.points[trend.points.length - 1];
      if (!trend?.tradeDate || !last) continue;
      const stamp = last.time.includes(" ") ? last.time.split(" ") : null;
      const pointDate = stamp ? stamp[0] : trend.tradeDate;
      const pointTime = (stamp ? stamp[1] : last.time).slice(0, 5);
      if (pointDate > date || (pointDate === date && pointTime > time)) {
        date = pointDate;
        time = pointTime;
      }
    }
    return { date, time };
  }, [stocks, indices, trends]);

  const detailInstrument = useMemo(() => {
    if (!detailTarget) return null;
    const list = detailTarget.kind === "stock" ? stocks : indices;
    return list.find((item) => item.secid === detailTarget.secid) ?? null;
  }, [stocks, indices, detailTarget]);

  const fallbackTime = lastSyncedAt ? formatSyncTime(lastSyncedAt) : "—";
  const dataTimeLabel = latestTick.date
    ? `${formatTradeDate(latestTick.date)} ${latestTick.time}`
    : fallbackTime;
  const statusLabel =
    status === "loading"
      ? "正在连接行情"
      : status === "stale" || status === "error"
        ? "行情连接中断"
        : `行情更新至 ${dataTimeLabel}`;
  const hasStatusAlert = status === "stale" || status === "error";
  const modalOpen = dialogOpen || detailInstrument !== null || indexManagerOpen;

  const closeDetail = useCallback(() => setDetailTarget(null), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

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
    if (detailTarget) {
      const list = detailTarget.kind === "stock" ? stocks : indices;
      if (!list.some((item) => item.secid === detailTarget.secid)) {
        setDetailTarget(null);
      }
    }
  }, [stocks, indices, focusedSecid, detailTarget]);

  useEffect(() => {
    if (!focusedSecid || detailTarget) return;
    const row = document.getElementById(`stock-${focusedSecid}`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const target = row?.querySelector<HTMLElement>(".stock-main");
    if (target && document.activeElement !== target) {
      target.focus({ preventScroll: true });
    }
  }, [focusedSecid, detailTarget]);

  const openDetail = useCallback((stock: StockRef) => {
    setFocusedSecid(stock.secid);
    setDetailTarget({ secid: stock.secid, kind: "stock" });
  }, []);

  const openIndexDetail = useCallback((index: StockRef) => {
    setDetailTarget({ secid: index.secid, kind: "index" });
  }, []);

  const activate = useCallback((stock: StockRef) => {
    setFocusedSecid(stock.secid);
  }, []);

  const handleRemove = useCallback(
    (stock: StockRef) => {
      const rawIndex = stocks.findIndex((item) => item.secid === stock.secid);
      if (rawIndex === -1) return;
      const displayIndex = displayStocks.findIndex((item) => item.secid === stock.secid);
      remove(stock.secid);
      if (focusedSecid === stock.secid) {
        const next =
          displayStocks[displayIndex + 1] ??
          displayStocks[displayIndex - 1] ??
          null;
        setFocusedSecid(next?.secid ?? null);
      }
      setDetailTarget((current) =>
        current?.kind === "stock" && current.secid === stock.secid ? null : current,
      );
      toastId.current += 1;
      setToast({
        id: toastId.current,
        message: `已移除 ${stock.name}`,
        stock,
        index: rawIndex,
      });
    },
    [stocks, displayStocks, remove, focusedSecid],
  );

  const handleUndo = useCallback(() => {
    if (!toast?.stock) return;
    if (stocks.length >= WATCHLIST_LIMIT) {
      showToast(`自选最多 ${WATCHLIST_LIMIT} 只`);
      return;
    }
    insert(toast.stock, toast.index ?? stocks.length);
    setFocusedSecid(toast.stock.secid);
    setToast(null);
  }, [toast, insert, stocks.length, showToast]);

  const handleAdd = useCallback(
    (stock: StockRef) => {
      if (stocks.some((item) => item.secid === stock.secid)) {
        showToast(`${stock.name} 已在自选中`);
        return;
      }
      if (stocks.length >= WATCHLIST_LIMIT) {
        showToast(`自选最多 ${WATCHLIST_LIMIT} 只`);
        return;
      }
      add(stock);
      setFocusedSecid(stock.secid);
      setDetailTarget(null);
      showToast(`已添加 ${stock.name}`);
    },
    [stocks, add, showToast],
  );

  const handleBatchImport = useCallback(
    (incoming: StockRef[]) => {
      const existing = new Set(stocks.map((stock) => stock.secid));
      const room = Math.max(0, WATCHLIST_LIMIT - stocks.length);
      const fresh = incoming
        .filter((stock) => !existing.has(stock.secid))
        .slice(0, room);
      setDialogOpen(false);
      if (fresh.length === 0) {
        showToast("没有可导入的股票");
        return;
      }
      addMany(fresh);
      setFocusedSecid(fresh[0].secid);
      setDetailTarget(null);
      showToast(fresh.length === 1 ? `已导入 ${fresh[0].name}` : `已导入 ${fresh.length} 只股票`);
    },
    [stocks, addMany, showToast],
  );

  const openIndexManager = useCallback(() => {
    setSettingsOpen(false);
    setIndexManagerOpen(true);
  }, []);

  const sortIndicesByChange = useCallback(() => {
    replaceIndices(sortStocksByChange(indices, quotes));
  }, [indices, quotes, replaceIndices]);

  const focusRelative = useCallback((direction: 1 | -1) => {
    const list = displayStocksRef.current;
    setFocusedSecid((current) => {
      if (list.length === 0) return null;
      const index = current ? list.findIndex((stock) => stock.secid === current) : -1;
      if (index === -1) {
        return direction === 1 ? list[0].secid : list[list.length - 1].secid;
      }
      const next = Math.max(0, Math.min(list.length - 1, index + direction));
      return list[next].secid;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (detailTarget || indexManagerOpen) return;

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

      const interactive = target?.closest(
        'button, a, input, textarea, select, [contenteditable="true"], [role="button"]',
      );
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (interactive && !target?.closest(".stock-main")) return;
        event.preventDefault();
        focusRelative(event.key === "ArrowDown" ? 1 : -1);
      } else if (event.key === "Escape") {
        setFocusedSecid(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    dialogOpen,
    settingsOpen,
    indexManagerOpen,
    detailTarget,
    focusRelative,
  ]);

  return (
    <div
      className="app-shell"
      id="top"
      data-market-phase={session.phase}
      data-status={status}
      data-watchlist-count={stocks.length}
      data-index-count={indices.length}
      data-show-price={preferences.showPrice ? "true" : "false"}
      data-show-index-value={preferences.showIndexValue ? "true" : "false"}
      data-detail-open={detailInstrument ? "true" : "false"}
    >
      <a className="skip-link" href="#watchlist">
        跳到自选
      </a>

      <header className="topbar" inert={modalOpen ? true : undefined}>
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
            <h1 className="topbar-title">自选</h1>
          </div>

          <div className="topbar-actions">
            <MarketClock session={session} />
            <div className="topbar-tools">
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
                  indexCount={indices.length}
                  onClose={closeSettings}
                  onTheme={setTheme}
                  onRefresh={setRefreshMs}
                  onShowPrice={setShowPrice}
                  onPinHeld={setPinHeld}
                  onShowIndexValue={setShowIndexValue}
                  onManageIndices={openIndexManager}
                />
              </div>
              <button
                type="button"
                className="add-button"
                onClick={() => setDialogOpen(true)}
                aria-label="添加自选"
                title="添加自选"
              >
                <PlusIcon size={17} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="page" inert={modalOpen ? true : undefined}>
        <IndexStrip
          indices={indices}
          quotes={quotes}
          trends={trends}
          showValues={preferences.showIndexValue}
          onOpen={openIndexDetail}
        />

        <section className="watchlist-section" id="watchlist" aria-label="自选">
          <div className="watchlist-toolbar">
            <button
              type="button"
              className={`data-status ${status}`}
              onClick={refresh}
              title={error ? `${statusLabel}：${error}` : "刷新行情"}
              aria-label={`${statusLabel}${error ? `：${error}` : ""}，点击刷新`}
            >
              <span className={`data-dot ${status}`} />
              <time
                dateTime={
                  latestTick.date ? `${latestTick.date}T${latestTick.time}:00+08:00` : undefined
                }
              >
                {dataTimeLabel}
              </time>
              {hasStatusAlert ? (
                <AlertIcon size={11} className="status-alert" />
              ) : (
                <RefreshIcon size={12} />
              )}
            </button>
          </div>

          {!stocksHydrated ? (
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
              <h2>自选为空</h2>
              <button type="button" className="primary-button" onClick={() => setDialogOpen(true)}>
                <PlusIcon size={14} />
                添加股票
              </button>
            </div>
          ) : (
            <div className="watchlist" role="list">
              {displayStocks.map((stock) => {
                const quote = quotes[stock.secid];
                const trend = trends[stock.secid];
                return (
                  <StockRow
                    key={stock.secid}
                    stock={stock}
                    quote={quote}
                    trend={trend}
                    active={focusedSecid === stock.secid}
                    held={stock.held === true}
                    onActivate={activate}
                    onOpen={openDetail}
                  />
                );
              })}
            </div>
          )}
        </section>

        <EconomicCalendar />
        <MarketBreadth active={session.isTrading || session.isAuction} />
      </main>

      {detailTarget && detailInstrument ? (
        <DetailSheet
          key={`${detailTarget.kind}-${detailInstrument.secid}`}
          instrument={detailInstrument}
          kind={detailTarget.kind}
          quote={quotes[detailInstrument.secid]}
          trend={trends[detailInstrument.secid]}
          held={detailTarget.kind === "stock" ? detailInstrument.held === true : undefined}
          onToggleHeld={detailTarget.kind === "stock" ? toggleHeld : undefined}
          onRemove={detailTarget.kind === "stock" ? handleRemove : undefined}
          onClose={closeDetail}
        />
      ) : null}

      <AddStockDialog
        open={dialogOpen}
        addedStocks={stocks}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAdd}
        onImport={handleBatchImport}
      />

      <IndexManagerDialog
        open={indexManagerOpen}
        indices={indices}
        quotes={quotes}
        onClose={() => setIndexManagerOpen(false)}
        onAdd={addIndex}
        onRemove={removeIndex}
        onMove={moveIndex}
        onSortByChange={sortIndicesByChange}
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
