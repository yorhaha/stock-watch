"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchStocks } from "@/lib/eastmoney";
import { POPULAR_STOCKS, exchangeLabel } from "@/lib/market";
import type { SearchStock, StockRef } from "@/lib/types";
import { CheckIcon, PlusIcon, SearchIcon } from "./Icons";

interface AddStockDialogProps {
  open: boolean;
  addedSecids: string[];
  onClose: () => void;
  onAdd: (stock: StockRef) => void;
}

const searchCache = new Map<string, SearchStock[]>();

export function AddStockDialog({
  open,
  addedSecids,
  onClose,
  onAdd,
}: AddStockDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchStock[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const added = useMemo(() => new Set(addedSecids), [addedSecids]);

  useEffect(() => {
    if (!open) return;
    const option = document.getElementById(`command-result-${highlighted}`);
    option?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setError(null);
    setHighlighted(0);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
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
    const cached = searchCache.get(keyword);
    if (cached) {
      setResults(cached);
      setSearching(false);
      setError(null);
      setHighlighted(0);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    setError(null);
    const timer = window.setTimeout(async () => {
      try {
        const found = await searchStocks(keyword, controller.signal);
        searchCache.set(keyword, found);
        setResults(found);
        setHighlighted(0);
      } catch (reason) {
        if (controller.signal.aborted) return;
        setResults([]);
        setError(reason instanceof Error ? reason.message : "搜索暂时不可用");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  const visible: SearchStock[] = useMemo(() => {
    if (query.trim()) return results;
    return POPULAR_STOCKS.map((stock) => ({ ...stock }));
  }, [query, results]);

  const choose = useCallback(
    (stock: SearchStock) => {
      if (added.has(stock.secid)) return;
      onAdd(stock);
      onClose();
    },
    [added, onAdd, onClose],
  );

  const moveHighlight = (direction: 1 | -1) => {
    if (visible.length === 0) return;
    setHighlighted((current) => {
      let next = current;
      for (let step = 0; step < visible.length; step += 1) {
        next = (next + direction + visible.length) % visible.length;
        if (!added.has(visible[next].secid)) break;
      }
      return next;
    });
  };

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="command-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="添加股票"
        ref={dialogRef}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            moveHighlight(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveHighlight(-1);
          } else if (event.key === "Enter") {
            event.preventDefault();
            const stock = visible[highlighted];
            if (stock) choose(stock);
          } else if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          } else if (event.key === "Tab") {
            const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
              'input, button:not([disabled]), [href]',
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
        <div className="command-input-wrap">
          <SearchIcon size={18} className="command-search-icon" />
          <input
            ref={inputRef}
            className="command-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索股票名称或代码"
            autoComplete="off"
            spellCheck={false}
            aria-label="搜索股票"
            aria-controls="stock-search-results"
            aria-activedescendant={visible[highlighted] ? `command-result-${highlighted}` : undefined}
          />
          {searching ? <span className="search-spinner" aria-label="搜索中" /> : null}
          <button type="button" className="esc-key" onClick={onClose}>
            ESC
          </button>
        </div>

        <div className="command-section-head">
          <span>{query.trim() ? "搜索结果" : "热门 A 股"}</span>
          <span>{query.trim() ? "按名称或代码" : "点击添加至自选"}</span>
        </div>

        <div className="command-results" id="stock-search-results" role="listbox">
          {visible.map((stock, index) => {
            const isAdded = added.has(stock.secid);
            return (
              <button
                type="button"
                key={stock.secid}
                id={`command-result-${index}`}
                role="option"
                aria-selected={index === highlighted}
                className={`command-result ${index === highlighted ? "is-highlighted" : ""} ${isAdded ? "is-added" : ""}`}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => choose(stock)}
                disabled={isAdded}
              >
                <span className="result-exchange">{exchangeLabel(stock.exchange)}</span>
                <span className="result-identity">
                  <span className="result-name">{stock.name}</span>
                  <span className="result-code">{stock.code}</span>
                </span>
                <span className="result-action">
                  {isAdded ? (
                    <>
                      <CheckIcon size={13} />
                      已添加
                    </>
                  ) : (
                    <>
                      <PlusIcon size={14} />
                      添加
                    </>
                  )}
                </span>
              </button>
            );
          })}

          {query.trim() && !searching && !error && visible.length === 0 ? (
            <div className="command-empty">
              <p>没有找到「{query.trim()}」</p>
              <span>试试股票名称或 6 位代码，目前支持沪深京 A 股。</span>
            </div>
          ) : null}

          {error ? (
            <div className="command-empty command-error">
              <p>搜索暂时不可用</p>
              <span>{error}，请稍后重试。</span>
            </div>
          ) : null}
        </div>

        <div className="command-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            选择
          </span>
          <span>
            <kbd>↵</kbd>
            添加
          </span>
          <span className="command-source">行情来自东方财富</span>
        </div>
      </div>
    </div>
  );
}
