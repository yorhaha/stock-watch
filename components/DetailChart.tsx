"use client";

import { useId, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import {
  axisWidthFor,
  layoutAxisLabelCenters,
  nearestPointIndex,
  priceDomain,
  scaleX,
  scaleY,
  toSeries,
  type AxisLabel,
} from "@/lib/chart";
import {
  formatIndexPrice,
  formatPercent,
  formatPrice,
  formatVolume,
  marketProfileFor,
  toneOf,
} from "@/lib/market";
import type { Quote, Trend } from "@/lib/types";

interface DetailChartProps {
  trend?: Trend;
  quote?: Quote;
  name: string;
  code?: string;
  kind?: "stock" | "index";
  compact?: boolean;
}

function formatAxisValue(value: number, kind: "stock" | "index", code?: string): string {
  return kind === "index" ? formatIndexPrice(value) : formatPrice(value, code);
}

export function DetailChart({
  trend,
  quote,
  name,
  code,
  kind = "stock",
  compact = false,
}: DetailChartProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const rawId = useId();
  const gradientId = `detail-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const series = useMemo(() => toSeries(trend, quote?.price), [trend, quote?.price]);
  const profile = marketProfileFor(trend);

  // The right axis carries only three levels: previous close, session high and
  // session low. They double as the chart's horizontal references.
  const axisLabels = useMemo<AxisLabel[]>(() => {
    if (series.length === 0) return [];
    const prices = series
      .map((point) => point.price)
      .filter((value) => Number.isFinite(value) && value > 0);
    if (prices.length === 0) return [];
    const preClose = trend?.preClose;
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const labels: AxisLabel[] = [];
    const seen = new Set<string>();
    const add = (label: AxisLabel) => {
      if (seen.has(label.text)) return;
      seen.add(label.text);
      labels.push(label);
    };
    const changeOf = (value: number) =>
      preClose != null && preClose > 0 ? ((value - preClose) / preClose) * 100 : null;
    const changeLabel = (value: number) => {
      const change = changeOf(value);
      return change == null ? undefined : formatPercent(change);
    };

    if (preClose != null && preClose > 0) {
      add({
        key: "preclose",
        value: preClose,
        text: formatAxisValue(preClose, kind, code),
        tone: "flat",
      });
    }
    add({
      key: "high",
      value: high,
      text: formatAxisValue(high, kind, code),
      sub: changeLabel(high),
      tone: toneOf(preClose != null ? high - preClose : 0),
    });
    add({
      key: "low",
      value: low,
      text: formatAxisValue(low, kind, code),
      sub: changeLabel(low),
      tone: toneOf(preClose != null ? low - preClose : 0),
    });
    return labels;
  }, [series, trend?.preClose, kind, code]);
  const axisWidth = useMemo(() => axisWidthFor(axisLabels), [axisLabels]);

  const geometry = useMemo(() => {
    const top = 14;
    const volumeGap = 10;
    const volumeHeight = 42;
    const chartWidth = Math.max(40, width - axisWidth);
    const values = series.flatMap((point) =>
      point.average == null ? [point.price] : [point.price, point.average],
    );
    if (trend?.preClose) values.push(trend.preClose);
    const domain = priceDomain(values, trend?.preClose, 0.08);
    const volumes = series.map((point) => point.volume ?? 0);
    const maxVolume = Math.max(...volumes, 1);
    const hasVolume = volumes.some((value) => value > 0);
    // Without a volume strip, the price panel absorbs the released height so
    // both detail charts keep the same overall footprint.
    const priceHeight = (hasVolume ? 160 : 212) - (compact ? 6 : 0);
    const volumeTop = top + priceHeight + volumeGap;
    const plotBottom = hasVolume ? volumeTop + volumeHeight : top + priceHeight;
    const height = plotBottom + 20;
    return {
      top,
      priceHeight,
      volumeGap,
      volumeHeight,
      volumeTop,
      plotBottom,
      hasVolume,
      height,
      chartWidth,
      domain,
      maxVolume,
    };
  }, [series, trend?.preClose, width, axisWidth, compact]);

  const axisLayout = useMemo(() => {
    const boxes = axisLabels.map((label) => ({
      y: scaleY(label.value, geometry.domain, geometry.priceHeight, geometry.top),
      height: label.sub ? 20 : 12,
    }));
    const centers = layoutAxisLabelCenters(
      boxes,
      geometry.top,
      geometry.height - 4,
    );
    return axisLabels.map((label, index) => ({
      label,
      y: boxes[index]?.y ?? geometry.top,
      centerY: centers[index] ?? boxes[index]?.y ?? geometry.top,
    }));
  }, [axisLabels, geometry]);

  const yFor = (value: number) =>
    scaleY(value, geometry.domain, geometry.priceHeight, geometry.top);
  const xFor = (minute: number) =>
    scaleX(minute, geometry.chartWidth, profile.totalMinutes);

  const paths = useMemo(() => {
    if (series.length === 0) return { line: "", averageLine: "", area: "" };
    const line = series
      .map((point, index) => {
        const x = scaleX(point.minute, geometry.chartWidth, profile.totalMinutes);
        const y = scaleY(point.price, geometry.domain, geometry.priceHeight, geometry.top);
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
    const averageLine = series
      .filter((point) => point.average != null)
      .map((point, index) => {
        const x = scaleX(point.minute, geometry.chartWidth, profile.totalMinutes);
        const y = scaleY(
          point.average ?? point.price,
          geometry.domain,
          geometry.priceHeight,
          geometry.top,
        );
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
    const first = series[0];
    const last = series[series.length - 1];
    const bottom = (geometry.top + geometry.priceHeight).toFixed(2);
    const area = `${line} L${scaleX(last.minute, geometry.chartWidth, profile.totalMinutes).toFixed(2)},${bottom} L${scaleX(first.minute, geometry.chartWidth, profile.totalMinutes).toFixed(2)},${bottom} Z`;
    return { line, averageLine, area };
  }, [series, geometry, profile.totalMinutes]);

  const first = series[0];
  const last = series[series.length - 1];
  const tone = first && last ? toneOf(last.price - (trend?.preClose ?? first.price)) : "flat";

  const volumeBarWidth = Math.max(
    1,
    (geometry.chartWidth / profile.totalMinutes) * 0.66,
  );

  const volumeNodes = useMemo(() => {
    if (!geometry.hasVolume || !trend) return null;
    // The last bar follows the live quote's tone, so it is rendered below;
    // everything else is stable between quote ticks.
    return trend.points.slice(0, -1).map((point, index) => {
      const volume = point.volume ?? 0;
      const barHeight = (volume / geometry.maxVolume) * geometry.volumeHeight;
      const x =
        scaleX(point.minute, geometry.chartWidth, profile.totalMinutes) -
        volumeBarWidth / 2;
      const y = geometry.volumeTop + geometry.volumeHeight - barHeight;
      const barTone = toneOf(point.price - point.open);
      return (
        <rect
          key={`${point.minute}-${index}`}
          x={x.toFixed(2)}
          y={y.toFixed(2)}
          width={volumeBarWidth.toFixed(2)}
          height={Math.max(0.6, barHeight).toFixed(2)}
          rx="0.4"
          className={`detail-volume vol-${barTone}`}
        />
      );
    });
  }, [
    trend,
    geometry.chartWidth,
    geometry.volumeTop,
    geometry.volumeHeight,
    geometry.maxVolume,
    geometry.hasVolume,
    profile.totalMinutes,
    volumeBarWidth,
  ]);

  const lastVolumeNode = useMemo(() => {
    if (!geometry.hasVolume || series.length === 0) return null;
    const point = series[series.length - 1];
    const volume = point.volume ?? 0;
    const barHeight = (volume / geometry.maxVolume) * geometry.volumeHeight;
    const x =
      scaleX(point.minute, geometry.chartWidth, profile.totalMinutes) -
      volumeBarWidth / 2;
    const y = geometry.volumeTop + geometry.volumeHeight - barHeight;
    const barTone = point.open != null ? toneOf(point.price - point.open) : "flat";
    return (
      <rect
        key={`${point.minute}-${series.length - 1}`}
        x={x.toFixed(2)}
        y={y.toFixed(2)}
        width={volumeBarWidth.toFixed(2)}
        height={Math.max(0.6, barHeight).toFixed(2)}
        rx="0.4"
        className={`detail-volume vol-${barTone}`}
      />
    );
  }, [
    series,
    geometry.chartWidth,
    geometry.volumeTop,
    geometry.volumeHeight,
    geometry.maxVolume,
    geometry.hasVolume,
    profile.totalMinutes,
    volumeBarWidth,
  ]);

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
    const minute = (localX / geometry.chartWidth) * profile.totalMinutes;
    setHoverIndex(nearestPointIndex(series, minute));
  };

  const formatValue = (value: number) => formatAxisValue(value, kind, code);
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

            {axisLayout.map(({ label, y }) =>
              label.key === "preclose" ? null : (
                <line
                  key={`grid-${label.key}`}
                  x1="0"
                  x2={geometry.chartWidth}
                  y1={y}
                  y2={y}
                  className="detail-grid-line"
                />
              ),
            )}

            <line
              x1={geometry.chartWidth / 2}
              x2={geometry.chartWidth / 2}
              y1={geometry.top}
              y2={geometry.plotBottom}
              className="detail-center-line"
            />

            {axisLayout.map(({ label, y }) =>
              label.key === "preclose" ? (
                <line
                  key="baseline"
                  x1="0"
                  x2={geometry.chartWidth}
                  y1={y}
                  y2={y}
                  className="detail-baseline"
                />
              ) : null,
            )}

            {axisLayout.map(({ label, centerY }) => {
              const toneClass =
                label.tone && label.tone !== "flat" ? ` tone-${label.tone}` : "";
              return (
                <g key={`label-${label.key}`}>
                  <text
                    x={width - 1}
                    y={centerY - (label.sub ? 1.5 : -3)}
                    textAnchor="end"
                    className={`detail-axis-label${label.primary ? " is-primary" : ""}`}
                  >
                    {label.text}
                  </text>
                  {label.sub ? (
                    <text
                      x={width - 1}
                      y={centerY + 7.5}
                      textAnchor="end"
                      className={`detail-axis-sub${toneClass}`}
                    >
                      {label.sub}
                    </text>
                  ) : null}
                </g>
              );
            })}

            <path d={paths.area} fill={`url(#${gradientId})`} />
            <path
              d={paths.line}
              className="detail-price-line"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {paths.averageLine ? (
              <path
                d={paths.averageLine}
                className="detail-average-line"
                fill="none"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {geometry.hasVolume ? (
              <>
                <line
                  x1="0"
                  x2={geometry.chartWidth}
                  y1={geometry.volumeTop}
                  y2={geometry.volumeTop}
                  className="detail-volume-divider"
                />
                {volumeNodes}
                {lastVolumeNode}
              </>
            ) : null}

            {hovered ? (
              <g>
                <line
                  x1={hoverX}
                  x2={hoverX}
                  y1={geometry.top}
                  y2={geometry.plotBottom}
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
              {profile.axisLabels[0]}
            </text>
            <text
              x={geometry.chartWidth / 2}
              y={geometry.height - 3}
              className="detail-time-label"
              textAnchor="middle"
            >
              {profile.axisLabels[1]}
            </text>
            <text
              x={geometry.chartWidth}
              y={geometry.height - 3}
              className="detail-time-label"
              textAnchor="end"
            >
              {profile.axisLabels[2]}
            </text>

            <rect
              x="0"
              y={geometry.top}
              width={geometry.chartWidth}
              height={geometry.plotBottom - geometry.top}
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
                <strong>{formatValue(hovered.price)}</strong>
              </div>
              {hovered.average != null ? (
                <div className="tooltip-row">
                  <span>均价</span>
                  <span>{formatValue(hovered.average)}</span>
                </div>
              ) : null}
              {geometry.hasVolume ? (
                <div className="tooltip-row">
                  <span>成交量</span>
                  <span>{formatVolume(hovered.volume, kind === "index" ? "count" : "hand")}</span>
                </div>
              ) : null}
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
