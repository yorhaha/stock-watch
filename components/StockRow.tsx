"use client";

import { memo } from "react";
import { formatDelta, formatPercent, formatPrice, toneOf } from "@/lib/market";
import type { Quote, StockRef, Trend } from "@/lib/types";
import { Sparkline } from "./Sparkline";

interface StockRowProps {
  stock: StockRef;
  quote?: Quote;
  trend?: Trend;
  active: boolean;
  held: boolean;
  onActivate: (stock: StockRef) => void;
  onOpen: (stock: StockRef) => void;
}

function Percent({ value }: { value: number | null | undefined }) {
  return <span className={`tone-text tone-${toneOf(value)}`}>{formatPercent(value)}</span>;
}

export const StockRow = memo(function StockRow({
  stock,
  quote,
  trend,
  active,
  held,
  onActivate,
  onOpen,
}: StockRowProps) {
  const name = quote?.name || stock.name;
  const tone = toneOf(quote?.pct);

  return (
    <div
      className={`stock-row tone-${tone} ${held ? "is-held" : ""} ${active ? "is-active" : ""}`}
      id={`stock-${stock.secid}`}
      data-secid={stock.secid}
      data-code={stock.code}
      data-price={quote?.price ?? ""}
      data-pct={quote?.pct ?? ""}
      data-tone={tone}
      data-held={held ? "true" : "false"}
      role="listitem"
    >
      <div
        className="stock-main"
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={`${name}，最新价 ${formatPrice(quote?.price, stock.code)}，${formatPercent(quote?.pct)}${held ? "，持有" : ""}，查看分时`}
        onClick={() => onOpen(stock)}
        onFocus={() => onActivate(stock)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            onOpen(stock);
          }
        }}
      >
        <div className="stock-copy">
          <div className="stock-identity">
            <span className="stock-name" title={name}>{name}</span>
          </div>

          <div className="stock-quote">
            <span className="stock-price">{formatPrice(quote?.price, stock.code)}</span>
            <span className="stock-change">
              <Percent value={quote?.pct} />
              {quote?.change != null ? (
                <span className="change-delta">{formatDelta(quote.change, stock.code)}</span>
              ) : null}
            </span>
          </div>
        </div>

        <div className="stock-spark">
          <Sparkline trend={trend} quote={quote} loading={!trend} />
        </div>
      </div>
    </div>
  );
});
