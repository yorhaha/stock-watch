"use client";

import type { CSSProperties } from "react";
import { formatPercent, formatPrice, toneOf } from "@/lib/market";
import type { Quote, StockRef, Trend } from "@/lib/types";
import { Sparkline } from "./Sparkline";

interface IndexStripProps {
  indices: StockRef[];
  quotes: Record<string, Quote>;
  trends: Record<string, Trend>;
  showValues: boolean;
}

export function IndexStrip({ indices, quotes, trends, showValues }: IndexStripProps) {
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
            data-secid={index.secid}
            data-price={quote?.price ?? ""}
            data-pct={quote?.pct ?? ""}
            aria-label={
              quote
                ? `${quote.name} ${showValues ? `${formatPrice(quote.price)} ` : ""}${formatPercent(quote.pct)}`
                : index.name
            }
          >
            <div className="index-copy">
              <span className="index-name">{quote?.name || index.name}</span>
              {quote ? (
                <span className="index-value">{formatPrice(quote.price)}</span>
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
}
