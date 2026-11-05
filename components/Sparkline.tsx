"use client";

import { useId } from "react";
import { areaPath, linePath, priceDomain, scaleY, toSeries } from "@/lib/chart";
import { toneOf } from "@/lib/market";
import type { Quote, Trend } from "@/lib/types";

interface SparklineProps {
  trend?: Trend;
  quote?: Quote;
  loading?: boolean;
}

export function Sparkline({ trend, quote, loading = false }: SparklineProps) {
  const rawId = useId();
  const gradientId = `spark-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const series = toSeries(trend, quote?.price);
  const preClose = trend?.preClose ?? quote?.preClose ?? null;
  const height = 44;
  const top = 4;
  const drawHeight = height - top * 2;

  if (series.length === 0) {
    return (
      <div className={`sparkline sparkline-empty ${loading ? "is-loading" : ""}`} aria-hidden="true">
        <span />
      </div>
    );
  }

  // Scale to the intraday range so a large gap from yesterday's close cannot
  // squash the whole day into a thin strip; the baseline is only drawn when it
  // actually falls inside the visible band.
  const prices = series.map((point) => point.price);
  const domain = priceDomain(prices);
  // Draw the session so far across the full width: leaving the not-yet-traded
  // afternoon blank made the tiny mobile sparklines read as cut off.
  const last = series[series.length - 1];
  const maxMinute = Math.max(1, last.minute);
  const path = linePath(series, 240, drawHeight, domain, (point) => point.price, top, maxMinute);
  const area = areaPath(series, 240, drawHeight, domain, top, maxMinute);
  const tone = toneOf(preClose ? last.price - preClose : quote?.pct);
  const baselineY =
    preClose != null &&
    Number.isFinite(preClose) &&
    preClose >= domain.min &&
    preClose <= domain.max
      ? scaleY(preClose, domain, drawHeight, top)
      : null;

  return (
    <div className={`sparkline tone-${tone}`} aria-hidden="true">
      <svg
        className="sparkline-svg"
        viewBox={`0 0 240 ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {baselineY != null ? (
          <line
            className="spark-baseline"
            x1="0"
            x2="240"
            y1={baselineY}
            y2={baselineY}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          className="spark-line"
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
