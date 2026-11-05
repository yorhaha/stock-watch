"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { searchIndices } from "@/lib/eastmoney";
import { INDEX_LIMIT, formatPercent, toneOf } from "@/lib/market";
import type { Quote, SearchStock, StockRef } from "@/lib/types";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  PlusIcon,
  SearchIcon,
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

const indexSearchCache = new Map<string, SearchStock[]>();

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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchStock[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const selected = new Set(indices.map((index) => index.secid));
  const full = indices.length >= INDEX_LIMIT;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setSearching(false);
    setError(null);
    previousFocus.current = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const keyword = query.trim();
    if (!keyword) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }
    const cached = indexSearchCache.get(keyword);
    if (cached) {
      setResults(cached);
      setSearching(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    setError(null);
    const timer = window.setTimeout(async () => {
      try {
        const found = await searchIndices(keyword, controller.signal);
        indexSearchCache.set(keyword, found);
        setResults(found);
      } catch (reason) {
        if (controller.signal.aborted) return;
        setResults([]);
        setError(reason instanceof Error ? reason.message : "搜索不可用");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  const choose = useCallback(
    (index: SearchStock) => {
      if (selected.has(index.secid) || full) return;
      onAdd({ secid: index.secid, code: index.code, name: index.name });
      setQuery("");
      window.setTimeout(() => inputRef.current?.focus(), 0);
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
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
            return;
          }
          if (event.key === "Tab") {
            const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
              "input, textarea, button:not([disabled]), [href]",
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
            return;
          }
          if (event.target === inputRef.current && event.key === "Enter" && !event.nativeEvent.isComposing) {
            const firstAvailable = results.find((result) => !selected.has(result.secid));
            if (firstAvailable && !full) {
              event.preventDefault();
              choose(firstAvailable);
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

        <div className="manager-search">
          <SearchIcon size={15} className="manager-search-icon" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={full ? "已达上限" : "添加指数"}
            aria-label="搜索指数"
            autoComplete="off"
            spellCheck={false}
            disabled={full}
          />
          {searching ? <span className="search-spinner" aria-label="搜索中" /> : null}
        </div>

        {query.trim() ? (
          <div className="manager-results" role="listbox" aria-label="指数搜索结果">
            {results.map((result) => {
              const isSelected = selected.has(result.secid);
              return (
                <button
                  type="button"
                  key={result.secid}
                  className={`manager-result ${isSelected ? "is-selected" : ""}`}
                  role="option"
                  aria-selected={isSelected}
                  disabled={isSelected || full}
                  onClick={() => choose(result)}
                >
                  <span className="manager-result-name">{result.name}</span>
                  <span className="manager-result-action" aria-hidden="true">
                    {isSelected ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
                  </span>
                </button>
              );
            })}
            {!searching && !error && results.length === 0 ? (
              <div className="command-empty">未找到「{query.trim()}」</div>
            ) : null}
            {error ? <div className="command-empty command-error">{error}</div> : null}
          </div>
        ) : indices.length === 0 ? (
          <div className="manager-empty">未添加指数</div>
        ) : (
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
        )}

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
