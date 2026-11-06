"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { useDividendYield } from "@/hooks/useDividendYield";
import {
  currentMarketClock,
  formatAmount,
  formatDelta,
  formatIndexDelta,
  formatIndexPrice,
  formatPe,
  formatPercent,
  formatPrice,
  formatSignedAmount,
  formatTradeDate,
  formatVolume,
  formatYield,
  isStockCode,
  toneOf,
  tradingMinuteFromTime,
} from "@/lib/market";
import type { Quote, SessionInfo, StockRef, Trend } from "@/lib/types";
import { DailyKChart } from "./DailyKChart";
import { DetailChart } from "./DetailChart";
import { BookmarkIcon, CloseIcon } from "./Icons";

interface DetailSheetProps {
  instrument: StockRef;
  kind: "stock" | "index";
  quote?: Quote;
  trend?: Trend;
  session: SessionInfo;
  held?: boolean;
  onToggleHeld?: (secid: string) => void;
  onClose: () => void;
}

export function DetailSheet({
  instrument,
  kind,
  quote,
  trend,
  session,
  held = false,
  onToggleHeld,
  onClose,
}: DetailSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const previousFocus = useRef<HTMLElement | null>(null);
  onCloseRef.current = onClose;
  const titleId = useId();
  const name = quote?.name || instrument.name;
  const code = quote?.code || instrument.code;
  const tone = toneOf(quote?.pct);
  const isIndex = kind === "index";
  const dividendYield = useDividendYield(
    instrument.secid,
    quote?.price,
    !isIndex && isStockCode(code),
  );
  const elapsedMinutes = tradingMinuteFromTime(currentMarketClock());
  const estimateLive =
    trend != null &&
    formatTradeDate(trend.tradeDate) === session.dateLabel &&
    (session.phase === "open" || session.phase === "lunch");
  const estimatedVolume =
    estimateLive &&
    elapsedMinutes > 0 &&
    elapsedMinutes < 240 &&
    quote?.volume != null &&
    quote.volume > 0
      ? (quote.volume / elapsedMinutes) * 240
      : null;
  const volumeRatio =
    quote?.volumeRatio != null && Number.isFinite(quote.volumeRatio)
      ? quote.volumeRatio
      : null;
  const volumeState =
    volumeRatio == null ? null : volumeRatio >= 1.5 ? "放量" : volumeRatio <= 0.8 ? "缩量" : null;
  const hasAverage = useMemo(
    () => trend == null || trend.points.some((point) => point.average != null),
    [trend],
  );

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>("button, [href]");
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, []);

  return (
    <div
      className="detail-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={sheetRef}
        data-secid={instrument.secid}
        data-kind={kind}
      >
        <div className="detail-sheet-head">
          <div className="detail-sheet-identity">
            <span className="detail-sheet-name" id={titleId}>
              {name}
            </span>
            {onToggleHeld ? (
              <button
                type="button"
                className={`hold-toggle ${held ? "is-held" : ""}`}
                onClick={() => onToggleHeld(instrument.secid)}
                aria-pressed={held}
                aria-label={held ? `取消持有 ${name}` : `标记 ${name} 为持有`}
                title={held ? "取消持有标记" : "标记为持有"}
              >
                <BookmarkIcon size={11} />
                <span>持有</span>
              </button>
            ) : null}
          </div>
          <div className={`detail-sheet-quote tone-${tone}`}>
            <span className="detail-sheet-price">
              {isIndex ? formatIndexPrice(quote?.price) : formatPrice(quote?.price, code)}
            </span>
            <span className={`detail-sheet-change tone-${tone}`}>
              <span className={`detail-percent tone-${tone}`}>{formatPercent(quote?.pct)}</span>
              {quote?.change != null ? (
                <span className="detail-delta">
                  {isIndex ? formatIndexDelta(quote.change) : formatDelta(quote.change, code)}
                </span>
              ) : null}
            </span>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="icon-button detail-sheet-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="detail-sheet-body">
          <div className="detail-chart-grid">
            <section className="detail-panel">
              <div className="detail-head">
                <span className="detail-panel-title">分时</span>
                <span className="detail-legends">
                  <span className="legend">
                    <i className="legend-line price" />
                    价格
                  </span>
                  {hasAverage ? (
                    <span className="legend">
                      <i className="legend-line average" />
                      均价
                    </span>
                  ) : null}
                </span>
              </div>
              <DetailChart trend={trend} quote={quote} name={name} code={code} kind={kind} />
            </section>
            <section className="detail-panel">
              <DailyKChart secid={instrument.secid} name={name} code={code} kind={kind} />
            </section>
          </div>

          {!isIndex ? (
            <div className="detail-stats">
              <div className="stat">
                <span className="stat-label">PE</span>
                <span className="stat-value">{formatPe(quote?.pe)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">PE TTM</span>
                <span className="stat-value">{formatPe(quote?.peTtm)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">PB</span>
                <span className="stat-value">{formatPe(quote?.pb)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">股息率</span>
                <span className="stat-value">{formatYield(dividendYield)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">总市值</span>
                <span className="stat-value">{formatAmount(quote?.marketCap)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">成交量</span>
                <span className="stat-value">{formatVolume(quote?.volume)}</span>
                {estimatedVolume != null ? (
                  <span className="stat-note">预估 {formatVolume(estimatedVolume)}</span>
                ) : null}
              </div>
              <div className="stat">
                <span className="stat-label">量比</span>
                <span className="stat-value">{formatPe(volumeRatio)}</span>
                {volumeState ? <span className="stat-note">{volumeState}</span> : null}
              </div>
              <div className="stat">
                <span className="stat-label">主力净流入</span>
                <span className={`stat-value tone-text tone-${toneOf(quote?.netInflow)}`}>
                  {formatSignedAmount(quote?.netInflow)}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
