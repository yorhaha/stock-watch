"use client";

import { useMarketBreadth } from "@/hooks/useMarketBreadth";
import { formatAmount } from "@/lib/market";

interface MarketBreadthProps {
  active: boolean;
}

export function MarketBreadth({ active }: MarketBreadthProps) {
  const breadth = useMarketBreadth(active);
  if (!breadth) return null;

  const ratio = breadth.volumeRatio;
  const volumeTone =
    ratio == null ? null : ratio >= 1.02 ? "up" : ratio <= 0.98 ? "down" : "flat";
  const volumeLabel =
    volumeTone === "up" ? "放量" : volumeTone === "down" ? "缩量" : "平量";
  const limitUp = breadth.limitUp == null ? null : Math.min(breadth.limitUp, breadth.up);
  const limitDown =
    breadth.limitDown == null ? null : Math.min(breadth.limitDown, breadth.down);
  const segments = [
    { key: "limit-up", count: limitUp ?? 0, className: "is-limit-up" },
    { key: "up", count: breadth.up - (limitUp ?? 0), className: "is-up" },
    { key: "flat", count: breadth.flat, className: "is-flat" },
    { key: "down", count: breadth.down - (limitDown ?? 0), className: "is-down" },
    { key: "limit-down", count: limitDown ?? 0, className: "is-limit-down" },
  ].filter((segment) => segment.count > 0);

  return (
    <footer
      className="market-breadth"
      aria-label={`沪深市场涨跌统计 ${breadth.tradeDate}`}
      data-up={breadth.up}
      data-flat={breadth.flat}
      data-down={breadth.down}
      data-limit-up={breadth.limitUp ?? undefined}
      data-limit-down={breadth.limitDown ?? undefined}
    >
      <div className="breadth-stats">
        <span className="breadth-stat is-up">
          <span className="breadth-label">涨停</span>
          <span className="breadth-value">{breadth.limitUp ?? "—"}</span>
        </span>
        <span className="breadth-stat is-up">
          <span className="breadth-label">上涨</span>
          <span className="breadth-value">{breadth.up}</span>
        </span>
        <span className="breadth-stat">
          <span className="breadth-label">平盘</span>
          <span className="breadth-value">{breadth.flat}</span>
        </span>
        <span className="breadth-stat is-down">
          <span className="breadth-label">下跌</span>
          <span className="breadth-value">{breadth.down}</span>
        </span>
        <span className="breadth-stat is-down">
          <span className="breadth-label">跌停</span>
          <span className="breadth-value">{breadth.limitDown ?? "—"}</span>
        </span>
        <span className="breadth-stat is-total">
          <span className="breadth-label">成交</span>
          <span className="breadth-value">{formatAmount(breadth.amount)}</span>
        </span>
        {ratio != null && volumeTone != null ? (
          <span
            className={`breadth-stat is-${volumeTone}`}
            title={`两市量比 ${ratio.toFixed(2)}（相对 5 日平均成交量）`}
          >
            <span className="breadth-label">量能</span>
            <span className="breadth-value">{volumeLabel}</span>
            <span className="breadth-ratio">{ratio.toFixed(2)}</span>
          </span>
        ) : null}
      </div>
      <div className="breadth-bar" aria-hidden="true">
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={`breadth-segment ${segment.className}`}
            style={{ flexGrow: segment.count }}
          />
        ))}
      </div>
    </footer>
  );
}
