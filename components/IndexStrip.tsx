"use client";

import { formatPercent, formatPrice, toneOf } from "@/lib/market";
import type { Quote, StockRef, Trend } from "@/lib/types";
import { Sparkline } from "./Sparkline";

interface IndexStripProps {
  indices: StockRef[];
  quotes: Record<string, Quote>;
  trends: Record<string, Trend>;
}

export function IndexStrip({ indices, quotes, trends }: IndexStripProps) {
  return (
    <section className="index-strip" aria-label="市场指数">
      {indices.map((index) => {
        const quote = quotes[index.secid];
        const tone = toneOf(quote?.pct);
        return (
          <div className={`index-card tone-${tone}`} key={index.secid}>
            <div className="index-copy">
              <span className="index-name">{quote?.name || index.name}</span>
              {quote ? (
                <span className="index-value">{formatPrice(quote.price)}</span>
              ) : (
                <span className="index-value skeleton-text">—</span>
              )}
              <span className={`index-change tone-${tone}`}>
                {quote ? formatPercent(quote.pct) : "载入中"}
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
