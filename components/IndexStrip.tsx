"use client";

import { memo, type CSSProperties } from "react";
import { formatIndexPrice, formatPercent, marketOfSecid, toneOf } from "@/lib/market";
import type { Quote, StockRef, Trend } from "@/lib/types";
import { Sparkline } from "./Sparkline";

interface IndexStripProps {
  indices: StockRef[];
  quotes: Record<string, Quote>;
  trends: Record<string, Trend>;
  showValues: boolean;
  onOpen: (index: StockRef) => void;
}

export const IndexStrip = memo(function IndexStrip({
  indices,
  quotes,
  trends,
  showValues,
  onOpen,
}: IndexStripProps) {
  if (indices.length === 0) return null;
  return (
    <section
      className="index-strip"
      aria-label="市场指数"
      data-index-count={indices.length}
      style={{ "--index-columns": indices.length <= 4 ? indices.length : 3 } as CSSProperties}
    >
      {indices.map((index) => {
        const quote = quotes[index.secid];
        const tone = toneOf(quote?.pct);
        return (
          <div
            className={`index-card tone-${tone}`}
            key={index.secid}
            role="button"
            tabIndex={0}
            aria-haspopup="dialog"
            data-secid={index.secid}
            data-market={marketOfSecid(index.secid)}
            data-price={quote?.price ?? ""}
            data-pct={quote?.pct ?? ""}
            onClick={() => onOpen(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onOpen(index);
              }
            }}
            aria-label={
              quote
                ? `${quote.name} ${showValues ? `${formatIndexPrice(quote.price)} ` : ""}${formatPercent(quote.pct)}，打开详情`
                : `${index.name}，打开详情`
            }
          >
            <div className="index-copy">
              <span className="index-name">{quote?.name || index.name}</span>
              {quote ? (
                <span className="index-value">{formatIndexPrice(quote.price)}</span>
              ) : (
                <span className="index-value skeleton-text">—</span>
              )}
              <span className={`index-change tone-${tone}`}>
                {quote ? formatPercent(quote.pct) : "—"}
              </span>
            </div>
            <div className="index-chart" aria-hidden="true">
              <Sparkline trend={trends[index.secid]} quote={quote} loading={!quote} />
            </div>
          </div>
        );
      })}
    </section>
  );
});
