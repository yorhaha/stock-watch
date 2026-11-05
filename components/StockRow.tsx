"use client";

import { memo, type DragEvent } from "react";
import { formatDelta, formatPercent, formatPrice, toneOf } from "@/lib/market";
import type { Quote, StockRef, Trend } from "@/lib/types";
import { ChevronDownIcon, ChevronUpIcon, GripIcon, TrashIcon } from "./Icons";
import { Sparkline } from "./Sparkline";

interface StockRowProps {
  stock: StockRef;
  quote?: Quote;
  trend?: Trend;
  index: number;
  active: boolean;
  editing: boolean;
  held: boolean;
  first: boolean;
  last: boolean;
  dragOver: boolean;
  onActivate: (stock: StockRef) => void;
  onOpen: (stock: StockRef) => void;
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
  active,
  editing,
  held,
  first,
  last,
  dragOver,
  onActivate,
  onOpen,
  onRemove,
  onMove,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: StockRowProps) {
  const name = quote?.name || stock.name;
  const tone = toneOf(quote?.pct);

  if (editing) {
    return (
      <div
        className={`stock-row edit-row ${held ? "is-held" : ""} ${dragOver ? "is-drag-over" : ""}`}
        draggable
        onDragStart={() => onDragStart(index)}
        onDragOver={(event) => onDragOver(event, index)}
        onDragEnd={onDragEnd}
        onDrop={(event) => {
          event.preventDefault();
          onDrop(index);
        }}
        id={`stock-${stock.secid}`}
        data-secid={stock.secid}
        role="listitem"
      >
        <span className="drag-handle" aria-hidden="true">
          <GripIcon size={15} />
        </span>
        <div className="stock-identity">
          <span className="stock-name" title={name}>{name}</span>
        </div>
        <div className="edit-actions">
          <button
            type="button"
            className="icon-button compact"
            onClick={() => onMove(index, index - 1)}
            disabled={first}
            aria-label={`上移 ${name}`}
          >
            <ChevronUpIcon size={14} />
          </button>
          <button
            type="button"
            className="icon-button compact"
            onClick={() => onMove(index, index + 1)}
            disabled={last}
            aria-label={`下移 ${name}`}
          >
            <ChevronDownIcon size={14} />
          </button>
          <button
            type="button"
            className="icon-button compact edit-remove"
            onClick={() => onRemove(stock)}
            aria-label={`从自选移除 ${name}`}
          >
            <TrashIcon size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`stock-row tone-${tone} ${held ? "is-held" : ""} ${active ? "is-active" : ""}`}
      id={`stock-${stock.secid}`}
      data-secid={stock.secid}
      data-code={stock.code}
      data-price={quote?.price ?? ""}
      data-pct={quote?.pct ?? ""}
      data-tone={tone}
      data-held={held ? "true" : "false"}
      role="listitem"
    >
      <div
        className="stock-main"
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={`${name}，最新价 ${formatPrice(quote?.price, stock.code)}，${formatPercent(quote?.pct)}${held ? "，持有" : ""}，查看分时`}
        onClick={() => onOpen(stock)}
        onFocus={() => onActivate(stock)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            onOpen(stock);
          }
        }}
      >
        <div className="stock-identity">
          <span className="stock-name" title={name}>{name}</span>
        </div>

        <div className="stock-spark">
          <Sparkline trend={trend} quote={quote} loading={!trend} />
        </div>

        <div className="stock-quote">
          <span className="stock-price">{formatPrice(quote?.price, stock.code)}</span>
          <span className="stock-change">
            <Percent value={quote?.pct} />
            {quote?.change != null ? (
              <span className="change-delta">{formatDelta(quote.change, stock.code)}</span>
            ) : null}
          </span>
        </div>
      </div>
    </div>
  );
});
