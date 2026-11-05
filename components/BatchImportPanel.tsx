"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mapWithConcurrency, searchStocks } from "@/lib/eastmoney";
import { WATCHLIST_LIMIT } from "@/lib/market";
import type { SearchStock, StockRef } from "@/lib/types";
import { AlertIcon, ArrowLeftIcon, CheckIcon } from "./Icons";

type BatchStatus =
  | "ready"
  | "fuzzy"
  | "already"
  | "duplicate"
  | "missing"
  | "ambiguous"
  | "error"
  | "overflow";

interface BatchEntry {
  input: string;
  stock: StockRef | null;
  status: BatchStatus;
  candidates?: string[];
}

interface BatchImportPanelProps {
  addedStocks: StockRef[];
  onImport: (stocks: StockRef[]) => void;
}

const MAX_LINES = 50;
const batchSearchCache = new Map<string, SearchStock[]>();

function normalizeName(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function parseBatchLines(value: string): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine
      .replace(/^\s*(?:[-*•]|\d+[.、)])\s*/, "")
      .replace(/\uFEFF/g, "")
      .trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
  }
  return lines;
}

function matchLine(input: string, results: SearchStock[]): Omit<BatchEntry, "input"> {
  if (results.length === 0) return { stock: null, status: "missing" };
  const query = normalizeName(input);
  const exact = results.filter((result) => normalizeName(result.name) === query);
  if (exact.length > 0) return { stock: exact[0], status: "ready" };

  const prefix = results.filter((result) => {
    const name = normalizeName(result.name);
    return name.startsWith(query) || query.startsWith(name);
  });
  if (prefix.length === 1) return { stock: prefix[0], status: "fuzzy" };

  const contains = results.filter((result) => normalizeName(result.name).includes(query));
  if (contains.length === 1) return { stock: contains[0], status: "fuzzy" };

  if (results.length === 1) return { stock: results[0], status: "fuzzy" };
  return {
    stock: null,
    status: "ambiguous",
    candidates: results.slice(0, 3).map((result) => result.name),
  };
}

export function BatchImportPanel({ addedStocks, onImport }: BatchImportPanelProps) {
  const [text, setText] = useState("");
  const [stage, setStage] = useState<"input" | "resolving" | "review">("input");
  const [entries, setEntries] = useState<BatchEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const lines = useMemo(() => parseBatchLines(text), [text]);
  const tooMany = lines.length > MAX_LINES;

  useEffect(() => {
    textareaRef.current?.focus();
    return () => abortRef.current?.abort();
  }, []);

  const resolve = useCallback(async () => {
    if (lines.length === 0 || tooMany || stage === "resolving") return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setStage("resolving");
    setProgress(0);

    const results = await mapWithConcurrency(
      lines,
      4,
      async (line) => {
        const cached = batchSearchCache.get(line);
        if (cached) return cached;
        const found = await searchStocks(line, controller.signal);
        batchSearchCache.set(line, found);
        return found;
      },
      (completed, total) => setProgress(Math.round((completed / total) * 100)),
    );
    if (controller.signal.aborted) return;

    const existing = new Set(addedStocks.map((stock) => stock.secid));
    const resolved = new Set<string>();
    let room = Math.max(0, WATCHLIST_LIMIT - addedStocks.length);
    const next: BatchEntry[] = results.map((result, index) => {
      if (result.status === "rejected") {
        return { input: lines[index], stock: null, status: "error" };
      }
      const match = matchLine(lines[index], result.value);
      if (!match.stock) return { input: lines[index], ...match };
      if (existing.has(match.stock.secid)) {
        return { input: lines[index], stock: match.stock, status: "already" };
      }
      if (resolved.has(match.stock.secid)) {
        return { input: lines[index], stock: match.stock, status: "duplicate" };
      }
      if (room <= 0) {
        return { input: lines[index], stock: match.stock, status: "overflow" };
      }
      resolved.add(match.stock.secid);
      room -= 1;
      return { input: lines[index], ...match };
    });
    setEntries(next);
    setStage("review");
  }, [addedStocks, lines, stage, tooMany]);

  const accepted = entries
    .filter((entry) => entry.status === "ready" || entry.status === "fuzzy")
    .map((entry) => entry.stock)
    .filter((stock): stock is StockRef => stock !== null);

  if (stage === "review") {
    return (
      <div className="batch-panel" data-stage="review">
        <div className="batch-review" role="list" aria-label="批量导入结果">
          {entries.map((entry, index) => {
            const isReady = entry.status === "ready" || entry.status === "fuzzy";
            return (
              <div
                className={`batch-row is-${entry.status}`}
                key={`${entry.input}-${index}`}
                role="listitem"
                title={entry.candidates?.join("、")}
              >
                <span className="batch-input">{entry.input}</span>
                <span className="batch-outcome">
                  {isReady ? <CheckIcon size={13} /> : <AlertIcon size={12} />}
                  <span>
                    {entry.status === "ready"
                      ? entry.stock && normalizeName(entry.stock.name) === normalizeName(entry.input)
                        ? "可导入"
                        : entry.stock?.name
                      : entry.status === "fuzzy"
                        ? `匹配 ${entry.stock?.name}`
                        : entry.status === "already"
                          ? "已在自选"
                          : entry.status === "duplicate"
                            ? "重复"
                            : entry.status === "missing"
                            ? "未找到"
                            : entry.status === "ambiguous"
                              ? "多个匹配"
                              : entry.status === "overflow"
                                ? "超出上限"
                                : "搜索失败"}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
        <div className="batch-foot">
          <button type="button" className="batch-back" onClick={() => setStage("input")}>
            <ArrowLeftIcon size={13} />
            返回
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={accepted.length === 0}
            onClick={() => onImport(accepted)}
          >
            导入 {accepted.length} 只
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="batch-panel" data-stage={stage}>
      <textarea
        ref={textareaRef}
        className="batch-textarea"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="每行一个股票或 ETF 名称"
        spellCheck={false}
        aria-label="股票或 ETF 名称，每行一个"
        disabled={stage === "resolving"}
      />
      <div className="batch-foot">
        <span className={`batch-count ${tooMany ? "is-over" : ""}`}>
          {tooMany ? `最多 ${MAX_LINES} 行` : `${lines.length} 行`}
        </span>
        <button
          type="button"
          className="primary-button"
          onClick={() => void resolve()}
          disabled={lines.length === 0 || tooMany || stage === "resolving"}
        >
          {stage === "resolving" ? `解析 ${progress}%` : "导入"}
        </button>
      </div>
    </div>
  );
}
