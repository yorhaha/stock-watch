"use client";

import { memo, useId, useMemo } from "react";
import {
  areaPathFromLine,
  linePath,
  priceDomain,
  priceDomainFromRange,
  priceRange,
  scaleX,
  scaleY,
} from "@/lib/chart";
import { toneOf } from "@/lib/market";
import type { Quote, Trend } from "@/lib/types";

interface SparklineProps {
  trend?: Trend;
  quote?: Quote;
  loading?: boolean;
}

const WIDTH = 240;
const HEIGHT = 44;

export const Sparkline = memo(function Sparkline({
  trend,
  quote,
  loading = false,
}: SparklineProps) {
  const rawId = useId();
  const gradientId = `spark-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const preClose = trend?.preClose ?? quote?.preClose ?? null;
  const points = trend?.points;

  // The trend shape is static between trend polls; only the last point follows
  // the live quote. Keep the base path and append one segment per tick.
  const baseRange = useMemo(
    () => (points ? priceRange(points, 0, points.length - 1) : null),
    [points],
  );

  const lastPoint = points?.[points.length - 1];
  const livePrice =
    quote?.price != null && Number.isFinite(quote.price) ? quote.price : null;
  const lastPrice = livePrice ?? lastPoint?.price ?? null;
  const maxMinute = lastPoint ? Math.max(1, lastPoint.minute) : 1;

  const range = useMemo(() => {
    if (lastPrice == null || !Number.isFinite(lastPrice) || lastPrice <= 0) {
      return baseRange;
    }
    if (!baseRange) return { min: lastPrice, max: lastPrice };
    if (lastPrice >= baseRange.min && lastPrice <= baseRange.max) return baseRange;
    return {
      min: Math.min(baseRange.min, lastPrice),
      max: Math.max(baseRange.max, lastPrice),
    };
  }, [baseRange, lastPrice]);

  const domain = useMemo(
    () => (range ? priceDomainFromRange(range, undefined, 0.08) : priceDomain([])),
    [range],
  );

  const basePath = useMemo(() => {
    if (!points || points.length <= 1) return "";
    return linePath(
      points.slice(0, -1),
      WIDTH,
      HEIGHT,
      domain,
      (point) => point.price,
      0,
      maxMinute,
    );
  }, [points, domain, maxMinute]);

  const view = useMemo(() => {
    if (!points || !lastPoint || lastPrice == null) return null;
    const lastX = scaleX(lastPoint.minute, WIDTH, maxMinute).toFixed(2);
    const lastY = scaleY(lastPrice, domain, HEIGHT).toFixed(2);
    const path = basePath ? `${basePath} L${lastX},${lastY}` : `M${lastX},${lastY}`;
    const area = areaPathFromLine(path, points, WIDTH, HEIGHT, 0, maxMinute);
    const tone = toneOf(preClose ? lastPrice - preClose : quote?.pct);
    const baselineY =
      preClose != null &&
      Number.isFinite(preClose) &&
      preClose >= domain.min &&
      preClose <= domain.max
        ? scaleY(preClose, domain, HEIGHT)
        : null;
    return { path, area, tone, baselineY };
  }, [points, lastPoint, lastPrice, basePath, domain, maxMinute, preClose, quote?.pct]);

  if (!view) {
    return (
      <div className={`sparkline sparkline-empty ${loading ? "is-loading" : ""}`} aria-hidden="true">
        <span />
      </div>
    );
  }

  return (
    <div className={`sparkline tone-${view.tone}`} aria-hidden="true">
      <svg
        className="sparkline-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {view.baselineY != null ? (
          <line
            className="spark-baseline"
            x1="0"
            x2={WIDTH}
            y1={view.baselineY}
            y2={view.baselineY}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        <path d={view.area} fill={`url(#${gradientId})`} />
        <path
          className="spark-line"
          d={view.path}
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
});
