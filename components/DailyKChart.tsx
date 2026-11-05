"use client";

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useDailyKline } from "@/hooks/useDailyKline";
import { useElementWidth } from "@/hooks/useElementWidth";
import { priceDomain, scaleY } from "@/lib/chart";
import { computeKline, visibleKline } from "@/lib/kline";
import { formatPercent, formatPrice, formatVolume, toneOf } from "@/lib/market";
import type { KlinePoint } from "@/lib/types";

interface DailyKChartProps {
  secid: string;
  name: string;
  code?: string;
}

function linePath(
  points: KlinePoint[],
  accessor: (point: KlinePoint) => number | null,
  xFor: (index: number) => number,
  yFor: (value: number) => number,
): string {
  let path = "";
  points.forEach((point, index) => {
    const value = accessor(point);
    if (value == null || !Number.isFinite(value)) return;
    path += `${path ? "L" : "M"}${xFor(index).toFixed(2)},${yFor(value).toFixed(2)}`;
  });
  return path;
}

export function DailyKChart({ secid, name, code }: DailyKChartProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const { candles, loading, error, retry } = useDailyKline(secid);

  const points = useMemo(() => visibleKline(computeKline(candles)), [candles]);

  const geometry = useMemo(() => {
    const right = width > 0 && width < 440 ? 48 : 60;
    const top = 14;
    const priceHeight = 152;
    const volumeGap = 12;
    const volumeHeight = 42;
    const chartWidth = Math.max(40, width - right);
    const volumeTop = top + priceHeight + volumeGap;
    const height = volumeTop + volumeHeight + 26;
    const values: number[] = [];
    for (const point of points) {
      values.push(point.high, point.low);
      for (const value of [point.ma5, point.ma10, point.t70, point.t30]) {
        if (value != null && Number.isFinite(value)) values.push(value);
      }
    }
    const domain = priceDomain(values);
    const maxVolume = Math.max(...points.map((point) => point.volume), 1);
    const slot = chartWidth / Math.max(points.length, 1);
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
      slot,
    };
  }, [points, width]);

  const yFor = (value: number) =>
    scaleY(value, geometry.domain, geometry.priceHeight, geometry.top);
  const xFor = (index: number) => (index + 0.5) * geometry.slot;

  const ma5Path = linePath(points, (point) => point.ma5, xFor, yFor);
  const ma10Path = linePath(points, (point) => point.ma10, xFor, yFor);
  const t70Path = linePath(points, (point) => point.t70, xFor, yFor);
  const t30Path = linePath(points, (point) => point.t30, xFor, yFor);

  const bodyWidth = Math.max(1, Math.min(7, geometry.slot * 0.62));
  const volumeWidth = Math.max(0.8, Math.min(6.5, geometry.slot * 0.58));

  const hovered = hoverIndex != null ? points[hoverIndex] : null;
  const hoverX = hovered && hoverIndex != null ? xFor(hoverIndex) : 0;
  const hoverY = hovered ? yFor(hovered.close) : 0;
  const tooltipFlip = geometry.chartWidth > 0 && hoverX > geometry.chartWidth * 0.6;
  const tooltipLeft = tooltipFlip ? hoverX - 12 : hoverX + 12;

  const labelIndexes = useMemo(() => {
    const last = points.length - 1;
    if (last <= 0) return last === 0 ? [0] : [];
    return Array.from(
      new Set([0, Math.floor(last / 3), Math.floor((last * 2) / 3), last]),
    );
  }, [points.length]);

  const onPointerMove = (event: ReactPointerEvent<SVGRectElement>) => {
    if (points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = Math.max(0, Math.min(geometry.chartWidth - 0.01, event.clientX - rect.left));
    const index = Math.min(points.length - 1, Math.floor(localX / geometry.slot));
    setHoverIndex(index);
  };

  const tickValues = [0, 1, 2, 3].map(
    (index) =>
      geometry.domain.max -
      ((geometry.domain.max - geometry.domain.min) / 3) * index,
  );

  return (
    <div className="detail-chart kline-chart" ref={containerRef}>
      {width > 0 && points.length > 0 ? (
        <>
          <svg
            width={width}
            height={geometry.height}
            viewBox={`0 0 ${width} ${geometry.height}`}
            role="img"
            aria-label={`${name}最近90个交易日K线`}
            className="detail-chart-svg"
          >
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
                    {formatPrice(value, code)}
                  </text>
                </g>
              );
            })}

            {points.map((point, index) => {
              const tone = toneOf(point.close - point.open);
              const x = xFor(index);
              const bodyTop = yFor(Math.max(point.open, point.close));
              const bodyBottom = yFor(Math.min(point.open, point.close));
              return (
                <g key={point.date} className={`k-candle tone-${tone}`}>
                  <line
                    x1={x}
                    x2={x}
                    y1={yFor(point.high)}
                    y2={yFor(point.low)}
                    className="k-wick"
                  />
                  <rect
                    x={(x - bodyWidth / 2).toFixed(2)}
                    y={bodyTop.toFixed(2)}
                    width={bodyWidth.toFixed(2)}
                    height={Math.max(0.9, bodyBottom - bodyTop).toFixed(2)}
                    rx={bodyWidth > 3 ? 0.6 : 0}
                    className="k-body"
                  />
                </g>
              );
            })}

            <path d={ma5Path} className="k-line ma5" />
            <path d={ma10Path} className="k-line ma10" />
            <path d={t70Path} className="k-line t70" />
            <path d={t30Path} className="k-line t30" />

            <line
              x1="0"
              x2={geometry.chartWidth}
              y1={geometry.volumeTop}
              y2={geometry.volumeTop}
              className="detail-volume-divider"
            />
            {points.map((point, index) => {
              const tone = toneOf(point.close - point.open);
              const barHeight = (point.volume / geometry.maxVolume) * geometry.volumeHeight;
              const x = xFor(index) - volumeWidth / 2;
              const y = geometry.volumeTop + geometry.volumeHeight - barHeight;
              return (
                <rect
                  key={`volume-${point.date}`}
                  x={x.toFixed(2)}
                  y={y.toFixed(2)}
                  width={volumeWidth.toFixed(2)}
                  height={Math.max(0.6, barHeight).toFixed(2)}
                  rx="0.4"
                  className={`k-volume tone-${tone}`}
                />
              );
            })}

            {hovered ? (
              <line
                x1={hoverX}
                x2={hoverX}
                y1={geometry.top}
                y2={geometry.volumeTop + geometry.volumeHeight}
                className="detail-crosshair"
              />
            ) : null}

            {labelIndexes.map((index) => {
              const point = points[index];
              if (!point) return null;
              const anchor =
                index === 0 ? "start" : index === points.length - 1 ? "end" : "middle";
              return (
                <text
                  key={`label-${point.date}`}
                  x={xFor(index)}
                  y={geometry.height - 3}
                  className="detail-time-label"
                  textAnchor={anchor}
                >
                  {point.date.slice(5)}
                </text>
              );
            })}

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
              <div className="tooltip-time">{hovered.date}</div>
              <div className="tooltip-row">
                <span>开盘</span>
                <strong>{formatPrice(hovered.open, code)}</strong>
              </div>
              <div className="tooltip-row">
                <span>最高</span>
                <span>{formatPrice(hovered.high, code)}</span>
              </div>
              <div className="tooltip-row">
                <span>最低</span>
                <span>{formatPrice(hovered.low, code)}</span>
              </div>
              <div className="tooltip-row">
                <span>收盘</span>
                <strong>{formatPrice(hovered.close, code)}</strong>
              </div>
              <div className="tooltip-row">
                <span>涨跌幅</span>
                <span>{formatPercent(hovered.pct)}</span>
              </div>
              <div className="tooltip-row">
                <span>成交量</span>
                <span>{formatVolume(hovered.volume)}</span>
              </div>
            </div>
          ) : null}
        </>
      ) : !loading && error ? (
        <div className="detail-chart-placeholder is-error">
          <span>日K数据暂不可用</span>
          <button type="button" className="chart-retry" onClick={retry}>
            重试
          </button>
        </div>
      ) : (
        <div className="detail-chart-placeholder">
          <span className="chart-skeleton-line" />
        </div>
      )}
    </div>
  );
}
