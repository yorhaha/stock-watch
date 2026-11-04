"use client";

import { useId, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import {
  nearestPointIndex,
  priceDomain,
  scaleX,
  scaleY,
  toSeries,
} from "@/lib/chart";
import { formatPrice, formatVolume, toneOf } from "@/lib/market";
import type { Quote, Trend } from "@/lib/types";

interface DetailChartProps {
  trend?: Trend;
  quote?: Quote;
  name: string;
}

export function DetailChart({ trend, quote, name }: DetailChartProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const rawId = useId();
  const gradientId = `detail-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const series = useMemo(() => toSeries(trend, quote?.price), [trend, quote?.price]);
  const geometry = useMemo(() => {
    const right = width > 0 && width < 440 ? 48 : 60;
    const top = 14;
    const priceHeight = 152;
    const volumeGap = 12;
    const volumeHeight = 42;
    const chartWidth = Math.max(40, width - right);
    const volumeTop = top + priceHeight + volumeGap;
    const height = volumeTop + volumeHeight + 26;
    const values = series.flatMap((point) =>
      point.average == null ? [point.price] : [point.price, point.average],
    );
    if (trend?.preClose) values.push(trend.preClose);
    const domain = priceDomain(values, trend?.preClose);
    const volumes = series.map((point) => point.volume ?? 0);
    const maxVolume = Math.max(...volumes, 1);
    return {
      right,
      top,
      priceHeight,
      volumeGap,
      volumeHeight,
      volumeTop,
      height,
      chartWidth,
      domain,
      maxVolume,
    };
  }, [series, trend?.preClose, width]);

  const yFor = (value: number) =>
    scaleY(value, geometry.domain, geometry.priceHeight, geometry.top);
  const xFor = (minute: number) => scaleX(minute, geometry.chartWidth);

  const line = series
    .map((point, index) => {
      const x = xFor(point.minute);
      const y = yFor(point.price);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const averageLine = series
    .filter((point) => point.average != null)
    .map((point, index) => {
      const x = xFor(point.minute);
      const y = yFor(point.average ?? point.price);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const first = series[0];
  const last = series[series.length - 1];
  const area =
    series.length > 0
      ? `${line} L${xFor(last.minute).toFixed(2)},${(geometry.top + geometry.priceHeight).toFixed(2)} L${xFor(first.minute).toFixed(2)},${(geometry.top + geometry.priceHeight).toFixed(2)} Z`
      : "";
  const tone = first && last ? toneOf(last.price - (trend?.preClose ?? first.price)) : "flat";
  const preCloseY = trend?.preClose ? yFor(trend.preClose) : null;

  const hovered = hoverIndex != null ? series[hoverIndex] : null;
  const hoverX = hovered ? xFor(hovered.minute) : 0;
  const hoverY = hovered ? yFor(hovered.price) : 0;
  const tooltipLeft =
    geometry.chartWidth > 0
      ? hoverX > geometry.chartWidth * 0.6
        ? hoverX - 12
        : hoverX + 12
      : 0;
  const tooltipFlip = geometry.chartWidth > 0 && hoverX > geometry.chartWidth * 0.6;

  const onPointerMove = (event: ReactPointerEvent<SVGRectElement>) => {
    if (series.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = Math.max(0, Math.min(geometry.chartWidth, event.clientX - rect.left));
    const minute = (localX / geometry.chartWidth) * 240;
    setHoverIndex(nearestPointIndex(series, minute));
  };

  const tickValues = [0, 1, 2, 3].map(
    (index) =>
      geometry.domain.max -
      ((geometry.domain.max - geometry.domain.min) / 3) * index,
  );

  const formatAxis = (value: number) => formatPrice(value);
  const timeLabel = hovered?.time
    ? hovered.time.includes(" ")
      ? hovered.time.split(" ")[1].slice(0, 5)
      : hovered.time.slice(0, 5)
    : "";

  return (
    <div className="detail-chart" ref={containerRef}>
      {width > 0 && series.length > 0 ? (
        <>
          <svg
            width={width}
            height={geometry.height}
            viewBox={`0 0 ${width} ${geometry.height}`}
            role="img"
            aria-label={`${name}今日分时走势`}
            className={`detail-chart-svg tone-${tone}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>

            {tickValues.map((value, index) => {
              const y = yFor(value);
              return (
                <g key={`${value}-${index}`}>
                  <line
                    x1="0"
                    x2={geometry.chartWidth}
                    y1={y}
                    y2={y}
                    className="detail-grid-line"
                  />
                  <text
                    x={geometry.chartWidth + 9}
                    y={y + 3}
                    className="detail-axis-label"
                  >
                    {formatAxis(value)}
                  </text>
                </g>
              );
            })}

            <line
              x1={geometry.chartWidth / 2}
              x2={geometry.chartWidth / 2}
              y1={geometry.top}
              y2={geometry.volumeTop + geometry.volumeHeight}
              className="detail-center-line"
            />

            {preCloseY != null ? (
              <line
                x1="0"
                x2={geometry.chartWidth}
                y1={preCloseY}
                y2={preCloseY}
                className="detail-baseline"
              />
            ) : null}

            <path d={area} fill={`url(#${gradientId})`} />
            <path
              d={line}
              className="detail-price-line"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {averageLine ? (
              <path
                d={averageLine}
                className="detail-average-line"
                fill="none"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            <line
              x1="0"
              x2={geometry.chartWidth}
              y1={geometry.volumeTop}
              y2={geometry.volumeTop}
              className="detail-volume-divider"
            />
            {series.map((point, index) => {
              const barWidth = Math.max(1, (geometry.chartWidth / 240) * 0.66);
              const volume = point.volume ?? 0;
              const barHeight = (volume / geometry.maxVolume) * geometry.volumeHeight;
              const x = xFor(point.minute) - barWidth / 2;
              const y = geometry.volumeTop + geometry.volumeHeight - barHeight;
              const barTone = point.open != null ? toneOf(point.price - point.open) : "flat";
              return (
                <rect
                  key={`${point.minute}-${index}`}
                  x={x.toFixed(2)}
                  y={y.toFixed(2)}
                  width={barWidth.toFixed(2)}
                  height={Math.max(0.6, barHeight).toFixed(2)}
                  rx="0.4"
                  className={`detail-volume vol-${barTone}`}
                />
              );
            })}

            {hovered ? (
              <g>
                <line
                  x1={hoverX}
                  x2={hoverX}
                  y1={geometry.top}
                  y2={geometry.volumeTop + geometry.volumeHeight}
                  className="detail-crosshair"
                />
                <circle
                  cx={hoverX}
                  cy={hoverY}
                  r="3.2"
                  className="detail-hover-dot"
                  stroke="currentColor"
                />
              </g>
            ) : null}

            <text x="0" y={geometry.height - 3} className="detail-time-label" textAnchor="start">
              09:30
            </text>
            <text
              x={geometry.chartWidth / 2}
              y={geometry.height - 3}
              className="detail-time-label"
              textAnchor="middle"
            >
              11:30 / 13:00
            </text>
            <text
              x={geometry.chartWidth}
              y={geometry.height - 3}
              className="detail-time-label"
              textAnchor="end"
            >
              15:00
            </text>

            <rect
              x="0"
              y={geometry.top}
              width={geometry.chartWidth}
              height={geometry.volumeTop + geometry.volumeHeight - geometry.top}
              fill="transparent"
              onPointerMove={onPointerMove}
              onPointerLeave={() => setHoverIndex(null)}
            />
          </svg>

          {hovered ? (
            <div
              className={`chart-tooltip ${tooltipFlip ? "is-flipped" : ""}`}
              style={{
                left: tooltipLeft,
                top: Math.max(4, hoverY - 20),
              }}
            >
              <div className="tooltip-time">{timeLabel}</div>
              <div className="tooltip-row">
                <span>价格</span>
                <strong>{formatPrice(hovered.price)}</strong>
              </div>
              <div className="tooltip-row">
                <span>均价</span>
                <span>{formatPrice(hovered.average)}</span>
              </div>
              <div className="tooltip-row">
                <span>成交量</span>
                <span>{formatVolume(hovered.volume)}</span>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="detail-chart-placeholder">
          <span className="chart-skeleton-line" />
        </div>
      )}
    </div>
  );
}
