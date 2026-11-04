"use client";

import { useEffect, useId, useRef } from "react";
import {
  formatAmount,
  formatDelta,
  formatPercent,
  formatPrice,
  toneOf,
} from "@/lib/market";
import type { Quote, StockRef, Trend } from "@/lib/types";
import { DetailChart } from "./DetailChart";
import { CloseIcon } from "./Icons";

interface StockDetailSheetProps {
  stock: StockRef;
  quote?: Quote;
  trend?: Trend;
  onClose: () => void;
}

export function StockDetailSheet({ stock, quote, trend, onClose }: StockDetailSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const previousFocus = useRef<HTMLElement | null>(null);
  onCloseRef.current = onClose;
  const titleId = useId();
  const name = quote?.name || stock.name;
  const tone = toneOf(quote?.pct);

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
        data-secid={stock.secid}
      >
        <div className="detail-sheet-head">
          <div className="detail-sheet-identity">
            <span className="detail-sheet-name" id={titleId}>
              {name}
            </span>
          </div>
          <div className={`detail-sheet-quote tone-${tone}`}>
            <span className="detail-sheet-price">{formatPrice(quote?.price)}</span>
            <span className={`detail-sheet-change tone-${tone}`}>
              <span className={`detail-percent tone-${tone}`}>{formatPercent(quote?.pct)}</span>
              <span className="detail-delta">{formatDelta(quote?.change)}</span>
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
          <div className="detail-head">
            <span className="detail-legends">
              <span className="legend">
                <i className="legend-line price" />
                价格
              </span>
              <span className="legend">
                <i className="legend-line average" />
                均价
              </span>
            </span>
          </div>
          <DetailChart trend={trend} quote={quote} name={name} />
          <div className="detail-stats">
            <div className="stat">
              <span className="stat-label">今开</span>
              <span className="stat-value">{formatPrice(quote?.open)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">最高</span>
              <span className="stat-value">{formatPrice(quote?.high)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">最低</span>
              <span className="stat-value">{formatPrice(quote?.low)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">昨收</span>
              <span className="stat-value">{formatPrice(quote?.preClose)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">成交额</span>
              <span className="stat-value">{formatAmount(quote?.amount)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">换手率</span>
              <span className="stat-value">
                {quote?.turnover != null ? `${quote.turnover.toFixed(2)}%` : "—"}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">量比</span>
              <span className="stat-value">
                {quote?.volumeRatio != null ? quote.volumeRatio.toFixed(2) : "—"}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">振幅</span>
              <span className="stat-value">
                {quote?.amplitude != null ? `${quote.amplitude.toFixed(2)}%` : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
