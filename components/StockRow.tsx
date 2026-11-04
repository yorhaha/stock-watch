"use client";

import { memo, type DragEvent } from "react";
import {
  formatAmount,
  formatDelta,
  formatPercent,
  formatPrice,
  formatSyncTime,
  formatTradeDate,
  exchangeLabel,
  toneOf,
} from "@/lib/market";
import type { Quote, StockRef, Trend } from "@/lib/types";
import { DetailChart } from "./DetailChart";
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GripIcon,
  TrashIcon,
} from "./Icons";
import { Sparkline } from "./Sparkline";

interface StockRowProps {
  stock: StockRef;
  quote?: Quote;
  trend?: Trend;
  index: number;
  expanded: boolean;
  active: boolean;
  editing: boolean;
  first: boolean;
  last: boolean;
  dragOver: boolean;
  onActivate: (stock: StockRef) => void;
  onToggle: (stock: StockRef) => void;
  onRemove: (stock: StockRef) => void;
  onMove: (from: number, to: number) => void;
  onDragStart: (index: number) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnd: () => void;
  onDrop: (index: number) => void;
}

function Percent({ value }: { value: number | null | undefined }) {
  return <span className={`tone-text tone-${toneOf(value)}`}>{formatPercent(value)}</span>;
}

export const StockRow = memo(function StockRow({
  stock,
  quote,
  trend,
  index,
  expanded,
  active,
  editing,
  first,
  last,
  dragOver,
  onActivate,
  onToggle,
  onRemove,
  onMove,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: StockRowProps) {
  const name = quote?.name || stock.name;
  const tone = toneOf(quote?.pct);
  const marketSlug = stock.exchange === "SH" ? "sh" : stock.exchange === "BJ" ? "bj" : "sz";
  const href = `https://quote.eastmoney.com/${marketSlug}${stock.code}.html`;

  if (editing) {
    return (
      <div
        className={`stock-row edit-row ${dragOver ? "is-drag-over" : ""}`}
        draggable
        onDragStart={() => onDragStart(index)}
        onDragOver={(event) => onDragOver(event, index)}
        onDragEnd={onDragEnd}
        onDrop={(event) => {
          event.preventDefault();
          onDrop(index);
        }}
        id={`stock-${stock.secid}`}
        role="listitem"
      >
        <span className="drag-handle" aria-hidden="true">
          <GripIcon size={16} />
        </span>
        <div className="stock-identity">
          <span className="stock-name">{name}</span>
          <span className="stock-meta">
            {stock.code}
            <span className="exchange-label">{exchangeLabel(stock.exchange)}</span>
          </span>
        </div>
        <div className="edit-actions">
          <button
            type="button"
            className="icon-button compact"
            onClick={() => onMove(index, index - 1)}
            disabled={first}
            aria-label={`上移 ${name}`}
          >
            <ChevronUpIcon size={15} />
          </button>
          <button
            type="button"
            className="icon-button compact"
            onClick={() => onMove(index, index + 1)}
            disabled={last}
            aria-label={`下移 ${name}`}
          >
            <ChevronDownIcon size={15} />
          </button>
          <button
            type="button"
            className="edit-remove"
            onClick={() => onRemove(stock)}
            aria-label={`从自选移除 ${name}`}
          >
            移除
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`stock-row tone-${tone} ${expanded ? "is-expanded" : ""} ${active ? "is-active" : ""}`}
      id={`stock-${stock.secid}`}
      role="listitem"
    >
      <div
        className={`stock-main tone-${tone}`}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${name}，最新价 ${formatPrice(quote?.price)}，${formatPercent(quote?.pct)}`}
        onClick={() => onToggle(stock)}
        onFocus={() => onActivate(stock)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            onToggle(stock);
          }
        }}
      >
        <div className="stock-identity">
          <span className="stock-name">{name}</span>
          <span className="stock-meta">
            {stock.code}
            <span className="exchange-label">{exchangeLabel(stock.exchange)}</span>
          </span>
        </div>

        <div className="stock-spark">
          <Sparkline trend={trend} quote={quote} loading={!trend} />
        </div>

        <div className="stock-quote">
          <span className="stock-price">{formatPrice(quote?.price)}</span>
          <span className="stock-change">
            <Percent value={quote?.pct} />
            <span className="change-delta">{formatDelta(quote?.change)}</span>
          </span>
        </div>

        <span className="stock-chevron" aria-hidden="true">
          <ChevronDownIcon size={14} />
        </span>
      </div>

      {expanded ? (
        <div className="stock-detail">
          <div className="detail-head">
            <div className="detail-title-row">
              <span className="detail-title">分时</span>
              <span className="detail-legends">
                <span className="legend">
                  <i className="legend-line price" />
                  价格
                </span>
                <span className="legend">
                  <i className="legend-line average" />
                  均价
                </span>
              </span>
            </div>
            <div className="detail-head-meta">
              {trend?.tradeDate ? <span>{formatTradeDate(trend.tradeDate)}</span> : null}
              {trend?.fetchedAt ? <span>更新于 {formatSyncTime(trend.fetchedAt)}</span> : null}
              <a
                className="detail-link"
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(event) => event.stopPropagation()}
              >
                详情
                <ArrowUpRightIcon size={12} />
              </a>
            </div>
          </div>

          <DetailChart trend={trend} quote={quote} name={name} />

          <div className="detail-stats">
            <div className="stat">
              <span className="stat-label">今开</span>
              <span className="stat-value">{formatPrice(quote?.open)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">最高</span>
              <span className="stat-value">{formatPrice(quote?.high)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">最低</span>
              <span className="stat-value">{formatPrice(quote?.low)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">昨收</span>
              <span className="stat-value">{formatPrice(quote?.preClose)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">成交额</span>
              <span className="stat-value">{formatAmount(quote?.amount)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">换手率</span>
              <span className="stat-value">
                {quote?.turnover != null ? `${quote.turnover.toFixed(2)}%` : "—"}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">量比</span>
              <span className="stat-value">
                {quote?.volumeRatio != null ? quote.volumeRatio.toFixed(2) : "—"}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">振幅</span>
              <span className="stat-value">
                {quote?.amplitude != null ? `${quote.amplitude.toFixed(2)}%` : "—"}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});
