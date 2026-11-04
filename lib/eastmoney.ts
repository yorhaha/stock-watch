import { isStockCode, tradingMinuteFromTime } from "./market";
import type { Quote, SearchStock, StockRef, Trend, TrendPoint } from "./types";

const QUOTE_ENDPOINT = "https://push2.eastmoney.com/api/qt/ulist.np/get";
const TREND_ENDPOINT = "https://push2.eastmoney.com/api/qt/stock/trends2/get";
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
  return {
    secid: `${market}.${code}`,
    code,
    name: String(raw.f14 ?? code),
    price: numeric(raw.f2),
    pct: numeric(raw.f3),
    change: numeric(raw.f4),
    amount: numeric(raw.f6),
    amplitude: numeric(raw.f7),
    turnover: numeric(raw.f8),
    volumeRatio: numeric(raw.f10),
    high: numeric(raw.f15),
    low: numeric(raw.f16),
    open: numeric(raw.f17),
    preClose: numeric(raw.f18),
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

export async function fetchTrend(secid: string, signal?: AbortSignal): Promise<Trend | null> {
  const params = new URLSearchParams({
    secid,
    fields1: "f1,f2,f3,f4,f5,f6,f7,f8",
    fields2: "f51,f52,f53,f54,f55,f56,f57,f58",
    iscr: "0",
    ndays: "1",
    _: String(Date.now()),
  });
  const payload = (await fetchJson(`${TREND_ENDPOINT}?${params.toString()}`, signal)) as {
    data?: {
      preClose?: number;
      trends?: string[];
    } | null;
  };
  const data = payload.data;
  if (!data?.trends?.length) return null;

  const points: TrendPoint[] = [];
  let tradeDate = "";
  for (const row of data.trends) {
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

  return {
    secid,
    tradeDate,
    preClose,
    points,
  };
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

export async function searchStocks(query: string, signal?: AbortSignal): Promise<SearchStock[]> {
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

  const results: SearchStock[] = [];
  const seen = new Set<string>();
  for (const item of payload.QuotationCodeTable?.Data ?? []) {
    const isMainBoard = item.Classify === "AStock";
    const isBeijing = item.Classify === "NEEQ" && item.SecurityTypeName === "京A";
    if (!isMainBoard && !isBeijing) continue;
    const code = String(item.Code ?? "");
    const secid = String(item.QuoteID ?? "");
    if (!isStockCode(code) || !/^[01]\.\d{6}$/.test(secid)) continue;
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

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index], index) };
      } catch (error) {
        results[index] = { status: "rejected", reason: error };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}
