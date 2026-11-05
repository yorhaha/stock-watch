"use client";

import { useCallback, useEffect, useRef } from "react";
import { INDEX_CATALOG, INDEX_LIMIT, formatPercent, toneOf } from "@/lib/market";
import type { Quote, StockRef } from "@/lib/types";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  PlusIcon,
  SortIcon,
  TrashIcon,
} from "./Icons";

interface IndexManagerDialogProps {
  open: boolean;
  indices: StockRef[];
  quotes: Record<string, Quote>;
  onClose: () => void;
  onAdd: (index: StockRef) => void;
  onRemove: (secid: string) => void;
  onMove: (from: number, to: number) => void;
  onSortByChange: () => void;
}

export function IndexManagerDialog({
  open,
  indices,
  quotes,
  onClose,
  onAdd,
  onRemove,
  onMove,
  onSortByChange,
}: IndexManagerDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const selected = new Set(indices.map((index) => index.secid));
  const full = indices.length >= INDEX_LIMIT;
  const available = INDEX_CATALOG.filter((index) => !selected.has(index.secid));

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const scrollTop = window.scrollY;
    const focusTimer = window.setTimeout(
      () => dialogRef.current?.focus({ preventScroll: true }),
      30,
    );
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.scrollTo(0, scrollTop);
      if (previousFocus.current?.isConnected) {
        previousFocus.current.focus({ preventScroll: true });
      }
    };
  }, [open]);

  const choose = useCallback(
    (index: StockRef) => {
      if (selected.has(index.secid) || full) return;
      onAdd(index);
      window.setTimeout(() => {
        const next = dialogRef.current?.querySelector<HTMLElement>(".manager-option");
        if (next) {
          next.focus({ preventScroll: true });
        } else {
          dialogRef.current
            ?.querySelector<HTMLElement>(".manager-close")
            ?.focus({ preventScroll: true });
        }
      }, 0);
    },
    [full, onAdd, selected],
  );

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="manager-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="管理指数"
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
            return;
          }
          if (event.key === "Tab") {
            const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
              "button:not([disabled]), [href]",
            );
            if (!focusable || focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="manager-head">
          <span className="manager-title">指数</span>
          <span className="manager-count">
            {indices.length}/{INDEX_LIMIT}
          </span>
          <button type="button" className="icon-button compact manager-close" onClick={onClose} aria-label="关闭">
            <CloseIcon size={14} />
          </button>
        </div>

        {indices.length > 0 ? (
          <div className="manager-list" role="list">
            {indices.map((index, position) => {
              const quote = quotes[index.secid];
              const tone = toneOf(quote?.pct);
              return (
                <div className="manager-row" key={index.secid} role="listitem">
                  <span className="manager-name">{quote?.name || index.name}</span>
                  <span className={`manager-percent tone-${tone}`}>
                    {quote ? formatPercent(quote.pct) : "—"}
                  </span>
                  <div className="manager-actions">
                    <button
                      type="button"
                      className="icon-button compact"
                      onClick={() => onMove(position, position - 1)}
                      disabled={position === 0}
                      aria-label={`上移 ${index.name}`}
                    >
                      <ChevronUpIcon size={13} />
                    </button>
                    <button
                      type="button"
                      className="icon-button compact"
                      onClick={() => onMove(position, position + 1)}
                      disabled={position === indices.length - 1}
                      aria-label={`下移 ${index.name}`}
                    >
                      <ChevronDownIcon size={13} />
                    </button>
                    <button
                      type="button"
                      className="icon-button compact manager-remove"
                      onClick={() => onRemove(index.secid)}
                      aria-label={`移除 ${index.name}`}
                    >
                      <TrashIcon size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {!full && available.length > 0 ? (
          <div className="manager-options" role="group" aria-label="可添加指数">
            {available.map((index) => (
              <button
                type="button"
                key={index.secid}
                className="manager-option"
                data-index-option={index.secid}
                onClick={() => choose(index)}
                aria-label={`添加 ${index.name}`}
              >
                <span>{index.name}</span>
                <PlusIcon size={12} />
              </button>
            ))}
          </div>
        ) : null}

        <div className="manager-foot">
          <button
            type="button"
            className="manager-sort"
            onClick={onSortByChange}
            disabled={indices.length < 2}
          >
            <SortIcon size={13} />
            按涨跌幅
          </button>
        </div>
      </div>
    </div>
  );
}
