"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { formatDelta, formatIndexDelta, formatIndexPrice, formatPe, formatPercent, formatPrice, toneOf } from "@/lib/market";
import type { Quote, StockRef, Trend } from "@/lib/types";
import { DailyKChart } from "./DailyKChart";
import { DetailChart } from "./DetailChart";
import { BookmarkIcon, CloseIcon } from "./Icons";

interface DetailSheetProps {
  instrument: StockRef;
  kind: "stock" | "index";
  quote?: Quote;
  trend?: Trend;
  held?: boolean;
  onToggleHeld?: (secid: string) => void;
  onClose: () => void;
}

export function DetailSheet({
  instrument,
  kind,
  quote,
  trend,
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
              {quote?.pe != null ? (
                <span className="detail-pe">PE {formatPe(quote.pe)}</span>
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
              <div className="detail-head">
                <span className="detail-panel-title">日K</span>
                <span className="detail-legends">
                  <span className="legend">
                    <i className="legend-line ma5" />
                    MA5
                  </span>
                  <span className="legend">
                    <i className="legend-line ma10" />
                    MA10
                  </span>
                  <span className="legend">
                    <i className="legend-line t70" />
                    T70
                  </span>
                  <span className="legend">
                    <i className="legend-line t30" />
                    T30
                  </span>
                </span>
              </div>
              <DailyKChart secid={instrument.secid} name={name} code={code} kind={kind} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
