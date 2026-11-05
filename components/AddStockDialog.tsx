"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchStocks } from "@/lib/eastmoney";
import { POPULAR_STOCKS } from "@/lib/market";
import type { SearchStock, StockRef } from "@/lib/types";
import { BatchImportPanel } from "./BatchImportPanel";
import { CheckIcon, CloseIcon, ListPlusIcon, PlusIcon, SearchIcon } from "./Icons";

interface AddStockDialogProps {
  open: boolean;
  addedStocks: StockRef[];
  onClose: () => void;
  onAdd: (stock: StockRef) => void;
  onImport: (stocks: StockRef[]) => void;
}

const searchCache = new Map<string, SearchStock[]>();

export function AddStockDialog({
  open,
  addedStocks,
  onClose,
  onAdd,
  onImport,
}: AddStockDialogProps) {
  const [mode, setMode] = useState<"search" | "batch">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchStock[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const added = useMemo(() => new Set(addedStocks.map((stock) => stock.secid)), [addedStocks]);

  useEffect(() => {
    if (!open) return;
    const option = document.getElementById(`command-result-${highlighted}`);
    option?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  useEffect(() => {
    if (!open) return;
    setMode("search");
    setQuery("");
    setResults([]);
    setError(null);
    setHighlighted(0);
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
    if (!open || mode !== "search") return;
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
        setError(reason instanceof Error ? reason.message : "搜索不可用");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, mode]);

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

  const showBatch = mode === "batch";

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`command-dialog ${showBatch ? "is-batch" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={showBatch ? "批量导入" : "添加自选"}
        ref={dialogRef}
        data-state={showBatch ? "batch" : searching ? "searching" : "idle"}
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
          if (event.target !== inputRef.current || event.nativeEvent.isComposing) return;
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
          }
        }}
      >
        {showBatch ? (
          <>
            <div className="command-input-wrap batch-head">
              <button
                type="button"
                className="icon-button compact command-back"
                onClick={() => setMode("search")}
                aria-label="返回搜索"
              >
                <SearchIcon size={14} />
              </button>
              <span className="command-title">批量导入</span>
              <button type="button" className="icon-button compact command-close" onClick={onClose} aria-label="关闭">
                <CloseIcon size={14} />
              </button>
            </div>
            <BatchImportPanel addedStocks={addedStocks} onImport={onImport} />
          </>
        ) : (
          <>
            <div className="command-input-wrap">
              <SearchIcon size={18} className="command-search-icon" />
              <input
                ref={inputRef}
                className="command-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索股票 / ETF"
                autoComplete="off"
                spellCheck={false}
                aria-label="搜索股票或 ETF"
                aria-controls="stock-search-results"
                aria-activedescendant={visible[highlighted] ? `command-result-${highlighted}` : undefined}
              />
              {searching ? <span className="search-spinner" aria-label="搜索中" /> : null}
              <button type="button" className="icon-button compact command-close" onClick={onClose} aria-label="关闭">
                <CloseIcon size={14} />
              </button>
            </div>

            <div className="command-results" id="stock-search-results" role="listbox">
              {visible.map((stock, index) => {
                const isAdded = added.has(stock.secid);
                return (
                  <button
                    type="button"
                    key={stock.secid}
                    id={`command-result-${index}`}
                    data-secid={stock.secid}
                    role="option"
                    aria-selected={index === highlighted}
                    aria-label={`${isAdded ? "已添加" : "添加"} ${stock.name}`}
                    className={`command-result ${index === highlighted ? "is-highlighted" : ""} ${isAdded ? "is-added" : ""}`}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => choose(stock)}
                    disabled={isAdded}
                  >
                    <span className="result-identity">
                      <span className="result-name">{stock.name}</span>
                    </span>
                    <span className="result-action" aria-hidden="true">
                      {isAdded ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
                    </span>
                  </button>
                );
              })}

              {query.trim() && !searching && !error && visible.length === 0 ? (
                <div className="command-empty">未找到「{query.trim()}」</div>
              ) : null}

              {error ? (
                <div className="command-empty command-error">{error}</div>
              ) : null}
            </div>

            <button
              type="button"
              className="command-batch-entry"
              onClick={() => setMode("batch")}
            >
              <ListPlusIcon size={15} />
              批量导入
            </button>
          </>
        )}
      </div>
    </div>
  );
}
