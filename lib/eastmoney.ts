import { isFundCode, isIndexCode, isWatchlistCode, tradingMinuteFromTime } from "./market";
import type { Candle, Quote, SearchStock, Trend, TrendPoint } from "./types";

const QUOTE_ENDPOINT = "https://push2.eastmoney.com/api/qt/ulist.np/get";
const TREND_ENDPOINT = "https://push2.eastmoney.com/api/qt/stock/trends2/get";
const TREND_HISTORY_ENDPOINT = "https://push2his.eastmoney.com/api/qt/stock/trends2/get";
const KLINE_ENDPOINT = "https://push2his.eastmoney.com/api/qt/stock/kline/get";
const SEARCH_ENDPOINT = "https://searchapi.eastmoney.com/api/suggest/get";
const SEARCH_TOKEN = "D43BF722C8E33BDC906FB84D85E326E8";

const QUOTE_FIELDS = [
  "f2",
  "f3",
  "f4",
  "f6",
  "f7",
  "f8",
  "f10",
  "f12",
  "f13",
  "f14",
  "f15",
  "f16",
  "f17",
  "f18",
].join(",");

type Primitive = string | number | null | undefined;
type RawRecord = Record<string, Primitive>;

function numeric(value: Primitive): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value !== "" && value !== "-") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function quoteFromRaw(raw: RawRecord): Quote | null {
  const code = String(raw.f12 ?? "");
  const market = raw.f13;
  if (!code || (market !== 0 && market !== 1)) return null;
  const rawPrice = numeric(raw.f2);
  const preClose = numeric(raw.f18);
  const traded = rawPrice != null && rawPrice > 0;
  const price = traded ? rawPrice : preClose != null && preClose > 0 ? preClose : null;
  return {
    secid: `${market}.${code}`,
    code,
    name: String(raw.f14 ?? code),
    price,
    pct: traded ? numeric(raw.f3) : null,
    change: traded ? numeric(raw.f4) : null,
    amount: numeric(raw.f6),
    amplitude: traded ? numeric(raw.f7) : null,
    turnover: traded ? numeric(raw.f8) : null,
    volumeRatio: traded ? numeric(raw.f10) : null,
    high: traded ? numeric(raw.f15) : null,
    low: traded ? numeric(raw.f16) : null,
    open: traded ? numeric(raw.f17) : null,
    preClose,
  };
}

async function fetchJson(url: string, outerSignal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 9000);
  const abort = () => controller.abort();
  outerSignal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`行情接口返回 ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
    outerSignal?.removeEventListener("abort", abort);
  }
}

export async function fetchQuotes(
  secids: string[],
  signal?: AbortSignal,
): Promise<Map<string, Quote>> {
  if (secids.length === 0) return new Map();
  const params = new URLSearchParams({
    fltt: "2",
    secids: secids.join(","),
    fields: QUOTE_FIELDS,
  });
  const payload = (await fetchJson(
    `${QUOTE_ENDPOINT}?${params.toString()}&_=${Date.now()}`,
    signal,
  )) as { data?: { diff?: RawRecord[] } };
  const result = new Map<string, Quote>();
  for (const raw of payload.data?.diff ?? []) {
    const quote = quoteFromRaw(raw);
    if (quote) result.set(quote.secid, quote);
  }
  if (result.size === 0 && secids.length > 0) {
    throw new Error("行情暂时不可用");
  }
  return result;
}

interface TrendPayload {
  data?: {
    preClose?: number;
    trends?: string[];
  } | null;
}

function trendFromPayload(secid: string, payload: TrendPayload): Trend | null {
  const data = payload.data;
  if (!data?.trends?.length) return null;

  const datedRows = data.trends.filter((row) => row.includes(" "));
  const latestDate = datedRows.length > 0
    ? datedRows[datedRows.length - 1].split(" ")[0]
    : "";
  const points: TrendPoint[] = [];
  let tradeDate = latestDate;
  for (const row of data.trends) {
    if (latestDate && row.includes(" ") && !row.startsWith(`${latestDate} `)) continue;
    const values = row.split(",");
    if (values.length < 8) continue;
    const [time, openValue, closeValue, , , volumeValue, , averageValue] = values;
    const price = numeric(closeValue);
    if (price == null) continue;
    if (!tradeDate && time.includes(" ")) tradeDate = time.split(" ")[0];
    points.push({
      time,
      minute: tradingMinuteFromTime(time),
      price,
      average: numeric(averageValue) ?? price,
      open: numeric(openValue) ?? price,
      volume: numeric(volumeValue) ?? 0,
    });
  }
  if (points.length === 0) return null;

  const preClose =
    typeof data.preClose === "number" && data.preClose > 0
      ? data.preClose
      : points[0].open;

  return { secid, tradeDate, preClose, points };
}

export async function fetchTrend(secid: string, signal?: AbortSignal): Promise<Trend | null> {
  const params = new URLSearchParams({
    secid,
    fields1: "f1,f2,f3,f4,f5,f6,f7,f8",
    fields2: "f51,f52,f53,f54,f55,f56,f57,f58",
    iscr: "0",
    ndays: "1",
    _: String(Date.now()),
  });
  let payload = (await fetchJson(
    `${TREND_ENDPOINT}?${params.toString()}`,
    signal,
  )) as TrendPayload;
  if (payload.data?.trends?.length) return trendFromPayload(secid, payload);

  const historyParams = new URLSearchParams({
    secid,
    fields1: "f1,f2,f3,f4,f5,f6,f7,f8",
    fields2: "f51,f52,f53,f54,f55,f56,f57,f58",
    iscr: "0",
    ndays: "2",
    ut: "fa5fd1943c7b386f172d6893dbfba10b",
    _: String(Date.now()),
  });
  payload = (await fetchJson(
    `${TREND_HISTORY_ENDPOINT}?${historyParams.toString()}`,
    signal,
  )) as TrendPayload;
  return trendFromPayload(secid, payload);
}

interface KlinePayload {
  data?: {
    klines?: string[];
  } | null;
}

async function fetchKlineJson(url: string, signal?: AbortSignal): Promise<unknown> {
  let lastError: unknown;
  const backoff = [250, 600, 1200, 2000];
  for (let attempt = 0; attempt <= backoff.length; attempt += 1) {
    try {
      return await fetchJson(url, signal);
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
      if (attempt < backoff.length) {
        const delay = backoff[attempt] + Math.random() * 250;
        await new Promise((resolve) => window.setTimeout(resolve, delay));
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      }
    }
  }
  throw lastError;
}

export async function fetchDailyKline(
  secid: string,
  signal?: AbortSignal,
): Promise<Candle[]> {
  const params = new URLSearchParams({
    secid,
    fields1: "f1,f2,f3,f4,f5,f6",
    fields2: "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61",
    klt: "101",
    fqt: "1",
    end: "20500101",
    lmt: "260",
    _: String(Date.now()),
  });
  const payload = (await fetchKlineJson(
    `${KLINE_ENDPOINT}?${params.toString()}`,
    signal,
  )) as KlinePayload;

  const candles: Candle[] = [];
  for (const row of payload.data?.klines ?? []) {
    const values = row.split(",");
    if (values.length < 9) continue;
    const [date, openValue, closeValue, highValue, lowValue, volumeValue, amountValue, , pctValue] =
      values;
    const open = numeric(openValue);
    const close = numeric(closeValue);
    const high = numeric(highValue);
    const low = numeric(lowValue);
    if (!date || open == null || close == null || high == null || low == null) continue;
    candles.push({
      date,
      open,
      close,
      high,
      low,
      volume: numeric(volumeValue) ?? 0,
      amount: numeric(amountValue) ?? 0,
      pct: numeric(pctValue),
    });
  }
  if (candles.length === 0) throw new Error("日K数据暂不可用");
  return candles;
}

let jsonpSequence = 0;

function requestJsonp<T>(url: string, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("JSONP 仅可在浏览器中运行"));
      return;
    }
    const callbackName = `__tape_jsonp_${Date.now()}_${jsonpSequence++}`;
    const script = document.createElement("script");
    let timeout = 0;
    const cleanup = () => {
      script.remove();
      delete (window as unknown as Record<string, unknown>)[callbackName];
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("搜索请求超时"));
    }, 8000);

    (window as unknown as Record<string, unknown>)[callbackName] = (payload: T) => {
      cleanup();
      resolve(payload);
    };

    script.async = true;
    script.src = `${url}${url.includes("?") ? "&" : "?"}cb=${callbackName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("搜索服务暂时不可用"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    document.head.appendChild(script);
  });
}

interface SuggestItem {
  Code?: string;
  Name?: string;
  Classify?: string;
  SecurityTypeName?: string;
  QuoteID?: string;
}

async function querySuggestions(query: string, signal?: AbortSignal): Promise<SuggestItem[]> {
  const keyword = query.trim();
  if (!keyword) return [];
  const params = new URLSearchParams({
    input: keyword,
    type: "14",
    token: SEARCH_TOKEN,
    count: "20",
  });
  const payload = (await requestJsonp<{
    QuotationCodeTable?: { Data?: SuggestItem[] | null };
  }>(`${SEARCH_ENDPOINT}?${params.toString()}`, signal)) as {
    QuotationCodeTable?: { Data?: SuggestItem[] | null };
  };
  return payload.QuotationCodeTable?.Data ?? [];
}

export async function searchStocks(query: string, signal?: AbortSignal): Promise<SearchStock[]> {
  const results: SearchStock[] = [];
  const seen = new Set<string>();
  for (const item of await querySuggestions(query, signal)) {
    const isMainBoard = item.Classify === "AStock";
    const isBeijing = item.Classify === "NEEQ" && item.SecurityTypeName === "京A";
    const isFund = item.Classify === "Fund" && isFundCode(String(item.Code ?? ""));
    if (!isMainBoard && !isBeijing && !isFund) continue;
    const code = String(item.Code ?? "");
    const secid = String(item.QuoteID ?? "");
    if (!isWatchlistCode(code) || !/^[01]\.\d{6}$/.test(secid)) continue;
    if (seen.has(secid)) continue;
    seen.add(secid);
    results.push({
      secid,
      code,
      name: String(item.Name ?? code),
    });
  }
  return results;
}

export async function searchIndices(query: string, signal?: AbortSignal): Promise<SearchStock[]> {
  const results: SearchStock[] = [];
  const seen = new Set<string>();
  const seenNames = new Set<string>();
  for (const item of await querySuggestions(query, signal)) {
    if (item.Classify !== "Index") continue;
    const code = String(item.Code ?? "");
    const secid = String(item.QuoteID ?? "");
    if (!isIndexCode(code) || !/^[01]\.\d{6}$/.test(secid)) continue;
    const name = String(item.Name ?? code);
    const nameKey = name.replace(/\s+/g, "").toLowerCase();
    if (seen.has(secid) || seenNames.has(nameKey)) continue;
    seen.add(secid);
    seenNames.add(nameKey);
    results.push({ secid, code, name });
  }
  return results;
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  onSettled?: (completed: number, total: number) => void,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  let completed = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index], index) };
      } catch (error) {
        results[index] = { status: "rejected", reason: error };
      } finally {
        completed += 1;
        onSettled?.(completed, items.length);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}
