"use client";

import { useId } from "react";
import { areaPath, linePath, priceDomain, scaleX, scaleY, toSeries } from "@/lib/chart";
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

  const prices = series.map((point) => point.price);
  if (trend?.preClose) prices.push(trend.preClose);
  const domain = priceDomain(prices, preClose ?? undefined);
  const path = linePath(series, 240, drawHeight, domain, (point) => point.price, top);
  const area = areaPath(series, 240, drawHeight, domain, top);
  const last = series[series.length - 1];
  const tone = toneOf(preClose ? last.price - preClose : quote?.pct);
  const lastX = (scaleX(last.minute, 240) / 240) * 100;
  const lastY = (scaleY(last.price, domain, drawHeight, top) / height) * 100;
  const baselineY =
    preClose != null && Number.isFinite(preClose)
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
      <span
        className="spark-dot"
        style={{ left: `${Math.min(99.6, lastX)}%`, top: `${lastY}%` }}
      />
    </div>
  );
}
