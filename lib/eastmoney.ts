import {
  A50_TRADING_SESSION,
  BRENT_TRADING_SESSION,
  isFundCode,
  isStockCode,
  isWatchlistCode,
  MARKET_TIME_ZONE,
  marketOfSecid,
  tradingMinuteFromTime,
} from "./market";
import type {
  AmountProfile,
  Candle,
  MarketBreadth,
  MarketKind,
  Quote,
  SearchStock,
  Trend,
  TrendPoint,
} from "./types";

const QUOTE_ENDPOINT = "https://push2.eastmoney.com/api/qt/ulist.np/get";
const QUOTE_FALLBACK_ENDPOINT =
  "https://push2delay.eastmoney.com/api/qt/ulist.np/get";
const TREND_ENDPOINT = "https://push2.eastmoney.com/api/qt/stock/trends2/get";
const TREND_DELAY_ENDPOINT =
  "https://push2delay.eastmoney.com/api/qt/stock/trends2/get";
const TREND_HISTORY_ENDPOINT = "https://push2his.eastmoney.com/api/qt/stock/trends2/get";
const KLINE_ENDPOINT = "https://push2his.eastmoney.com/api/qt/stock/kline/get";
const SEARCH_ENDPOINT = "https://searchapi.eastmoney.com/api/suggest/get";
const SEARCH_TOKEN = "D43BF722C8E33BDC906FB84D85E326E8";
const QUOTE_TOKEN = "fa5fd1943c7b386f172d6893dbfba10b";
const QUOTE_MARKETS = new Set([0, 1, 100, 101, 103, 104, 112, 124]);
const BREADTH_SECIDS = ["1.000001", "0.399001"];
const BREADTH_FIELDS = ["f5", "f6", "f10", "f104", "f105", "f106", "f124"].join(",");
const POOL_ENDPOINT = "https://push2ex.eastmoney.com/getTopic";
const POOL_TOKEN = "7eea3edcaed734bea9cbfc24409ed989";
const DIVIDEND_ENDPOINT = "https://datacenter-web.eastmoney.com/api/data/v1/get";
const DIVIDEND_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

const QUOTE_FIELDS = [
  "f2",
  "f3",
  "f4",
  "f5",
  "f6",
  "f7",
  "f8",
  "f9",
  "f10",
  "f12",
  "f13",
  "f14",
  "f15",
  "f16",
  "f17",
  "f18",
  "f20",
  "f23",
  "f62",
  "f114",
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
  if (!code || typeof market !== "number" || !QUOTE_MARKETS.has(market)) {
    return null;
  }
  const rawPrice = numeric(raw.f2);
  const preClose = numeric(raw.f18);
  const traded = rawPrice != null && rawPrice > 0;
  const price = traded ? rawPrice : preClose != null && preClose > 0 ? preClose : null;
  const pe = numeric(raw.f9);
  const peTtm = numeric(raw.f114);
  const pb = numeric(raw.f23);
  const marketCap = numeric(raw.f20);
  return {
    secid: `${market}.${code}`,
    code,
    name: String(raw.f14 ?? code),
    price,
    pct: traded ? numeric(raw.f3) : null,
    change: traded ? numeric(raw.f4) : null,
    amount: numeric(raw.f6),
    volume: numeric(raw.f5),
    amplitude: traded ? numeric(raw.f7) : null,
    turnover: traded ? numeric(raw.f8) : null,
    volumeRatio: traded ? numeric(raw.f10) : null,
    // Indices and funds report 0 for valuation ratios; only stocks carry real values.
    pe: pe != null && pe !== 0 ? pe : null,
    peTtm: peTtm != null && peTtm !== 0 ? peTtm : null,
    pb: pb != null && pb !== 0 ? pb : null,
    marketCap: marketCap != null && marketCap > 0 ? marketCap : null,
    netInflow: numeric(raw.f62),
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

async function requestQuotes(
  endpoint: string,
  secids: string[],
  signal?: AbortSignal,
): Promise<Map<string, Quote>> {
  const params = new URLSearchParams({
    fltt: "2",
    secids: secids.join(","),
    fields: QUOTE_FIELDS,
    ut: QUOTE_TOKEN,
  });
  const payload = (await fetchJson(
    `${endpoint}?${params.toString()}&_=${Date.now()}`,
    signal,
  )) as { data?: { diff?: RawRecord[] } };
  const result = new Map<string, Quote>();
  for (const raw of payload.data?.diff ?? []) {
    const quote = quoteFromRaw(raw);
    if (quote) result.set(quote.secid, quote);
  }
  return result;
}

export async function fetchQuotes(
  secids: string[],
  signal?: AbortSignal,
): Promise<Map<string, Quote>> {
  if (secids.length === 0) return new Map();

  let primaryError: unknown;
  let result = new Map<string, Quote>();
  try {
    result = await requestQuotes(QUOTE_ENDPOINT, secids, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    primaryError = error;
  }

  const missing = secids.filter((secid) => !result.has(secid));
  if (missing.length > 0) {
    try {
      const fallback = await requestQuotes(QUOTE_FALLBACK_ENDPOINT, missing, signal);
      fallback.forEach((quote, secid) => result.set(secid, quote));
    } catch (error) {
      if (signal?.aborted) throw error;
      if (result.size === 0) primaryError = primaryError ?? error;
    }
  }

  if (result.size === 0) {
    throw primaryError ?? new Error("行情暂时不可用");
  }
  return result;
}

interface TrendPayload {
  data?: {
    preClose?: number;
    trends?: string[];
  } | null;
}

interface TrendRow {
  date: string;
  stamp: string;
  absoluteMinute: number;
  open: string;
  close: string;
  volume: string;
  amount: string;
  average: string;
}

interface TrendFields {
  time: string;
  open: string;
  close: string;
  volume: string;
  amount: string;
  average: string;
}

function trendFields(values: string[]): TrendFields | null {
  // trends2 is asked for f51,f52,f53,f56,f57,f58
  // (time/open/close/volume/amount/average). Some hosts may still answer with
  // the legacy eight-column row, so accept that too.
  if (values.length >= 8) {
    const [time, open, close, , , volume, amount, average] = values;
    return { time, open, close, volume, amount, average };
  }
  if (values.length >= 6) {
    const [time, open, close, volume, amount, average] = values;
    return { time, open, close, volume, amount, average };
  }
  if (values.length >= 5) {
    const [time, open, close, volume, average] = values;
    return { time, open, close, volume, amount: "", average };
  }
  return null;
}

const FUTURES_SESSION_GAP_MINUTES = 30;
const FUTURES_TOTAL_MINUTES = 1380;
const A50_OVERNIGHT_MINUTES =
  (A50_TRADING_SESSION.breakStartMinute - A50_TRADING_SESSION.startMinute + 1440) % 1440;
const A50_BREAK_MINUTES =
  A50_TRADING_SESSION.breakEndMinute - A50_TRADING_SESSION.breakStartMinute;

function parseTrendRow(row: string): TrendRow | null {
  const fields = trendFields(row.split(","));
  if (!fields) return null;
  const stamp = fields.time;
  const space = stamp.indexOf(" ");
  const date = space > 0 ? stamp.slice(0, space) : "";
  const clock = space > 0 ? stamp.slice(space + 1) : stamp;
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clockMatch = /^(\d{1,2}):(\d{2})/.exec(clock);
  if (!dayMatch || !clockMatch) return null;
  const day =
    Date.UTC(Number(dayMatch[1]), Number(dayMatch[2]) - 1, Number(dayMatch[3])) / 86400000;
  const minute = Number(clockMatch[1]) * 60 + Number(clockMatch[2]);
  return {
    date,
    stamp,
    absoluteMinute: day * 1440 + minute,
    open: fields.open,
    close: fields.close,
    volume: fields.volume,
    amount: fields.amount,
    average: fields.average,
  };
}

function positiveOrNull(value: number | null): number | null {
  return value != null && value > 0 ? value : null;
}

function pointFromRow(row: TrendRow, minute: number): TrendPoint | null {
  const price = numeric(row.close);
  if (price == null || price <= 0) return null;
  return {
    time: row.stamp,
    minute,
    price,
    average: positiveOrNull(numeric(row.average)),
    open: numeric(row.open) ?? price,
    volume: numeric(row.volume) ?? 0,
  };
}

function futuresTrendFromPayload(
  secid: string,
  market: MarketKind,
  data: NonNullable<TrendPayload["data"]>,
): Trend | null {
  const totalMinutes =
    market === "brent" ? BRENT_TRADING_SESSION.totalMinutes : FUTURES_TOTAL_MINUTES;
  const rows: TrendRow[] = [];
  for (const row of data.trends ?? []) {
    const parsed = parseTrendRow(row);
    if (parsed) rows.push(parsed);
  }
  if (rows.length === 0) return null;

  // A session crosses midnight and ends with a multi-hour break, so split on
  // that gap rather than on the calendar date.
  let sessionStart = 0;
  for (let index = 1; index < rows.length; index += 1) {
    const gap = rows[index].absoluteMinute - rows[index - 1].absoluteMinute;
    if (gap > FUTURES_SESSION_GAP_MINUTES) sessionStart = index;
  }
  const start = rows[sessionStart];

  const points: TrendPoint[] = [];
  for (let index = sessionStart; index < rows.length; index += 1) {
    const row = rows[index];
    const minute = Math.max(
      0,
      Math.min(totalMinutes, row.absoluteMinute - start.absoluteMinute),
    );
    const point = pointFromRow(row, minute);
    if (point) points.push(point);
  }
  if (points.length === 0) return null;

  const preClose =
    typeof data.preClose === "number" && data.preClose > 0
      ? data.preClose
      : points[0].open;

  return { secid, market, tradeDate: start.date, preClose, points };
}

function nextDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const stamp =
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) + 86400000;
  return new Date(stamp).toISOString().slice(0, 10);
}

function a50TrendFromPayload(
  secid: string,
  market: MarketKind,
  data: NonNullable<TrendPayload["data"]>,
): Trend | null {
  const rows: TrendRow[] = [];
  for (const row of data.trends ?? []) {
    const parsed = parseTrendRow(row);
    if (parsed) rows.push(parsed);
  }
  if (rows.length === 0) return null;

  // Two-day responses carry the previous trading day as well; every A50
  // trading day begins with the 16:45 overnight tick.
  let sessionStart = 0;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index].absoluteMinute % 1440 === A50_TRADING_SESSION.startMinute) {
      sessionStart = index;
      break;
    }
  }

  const start = rows[sessionStart];
  const points: TrendPoint[] = [];
  for (let index = sessionStart; index < rows.length; index += 1) {
    const row = rows[index];
    const elapsed = row.absoluteMinute - start.absoluteMinute;
    if (elapsed < 0) continue;
    // Skip the 05:15–09:00 pause so overnight and day sessions share one axis.
    const minute =
      elapsed <= A50_OVERNIGHT_MINUTES ? elapsed : elapsed - A50_BREAK_MINUTES;
    const point = pointFromRow(
      row,
      Math.max(0, Math.min(A50_TRADING_SESSION.totalMinutes, minute)),
    );
    if (point) points.push(point);
  }
  if (points.length === 0) return null;

  const preClose =
    typeof data.preClose === "number" && data.preClose > 0
      ? data.preClose
      : points[0].open;

  return { secid, market, tradeDate: nextDate(start.date), preClose, points };
}

function trendFromPayload(secid: string, payload: TrendPayload): Trend | null {
  const data = payload.data;
  if (!data?.trends?.length) return null;
  const market = marketOfSecid(secid);
  if (market === "a50") return a50TrendFromPayload(secid, market, data);
  if (market === "fut" || market === "brent") {
    return futuresTrendFromPayload(secid, market, data);
  }

  const datedRows = data.trends.filter((row) => row.includes(" "));
  const latestDate = datedRows.length > 0
    ? datedRows[datedRows.length - 1].split(" ")[0]
    : "";
  const points: TrendPoint[] = [];
  let tradeDate = latestDate;
  for (const row of data.trends) {
    if (latestDate && row.includes(" ") && !row.startsWith(`${latestDate} `)) continue;
    const fields = trendFields(row.split(","));
    if (!fields) continue;
    const price = numeric(fields.close);
    if (price == null) continue;
    if (!tradeDate && fields.time.includes(" ")) tradeDate = fields.time.split(" ")[0];
    points.push({
      time: fields.time,
      minute: tradingMinuteFromTime(fields.time, market),
      price,
      average: positiveOrNull(numeric(fields.average)),
      open: numeric(fields.open) ?? price,
      volume: numeric(fields.volume) ?? 0,
    });
  }
  if (points.length === 0) return null;

  const preClose =
    typeof data.preClose === "number" && data.preClose > 0
      ? data.preClose
      : points[0].open;

  return { secid, market, tradeDate, preClose, points };
}

async function requestTrend(
  endpoint: string,
  secid: string,
  ndays: number,
  signal?: AbortSignal,
): Promise<Trend | null> {
  const params = new URLSearchParams({
    secid,
    fields1: "f1,f2,f3,f4,f5,f6,f7,f8",
    fields2: "f51,f52,f53,f56,f58",
    iscr: "0",
    ndays: String(ndays),
    ut: QUOTE_TOKEN,
    _: String(Date.now()),
  });
  const payload = (await fetchJson(
    `${endpoint}?${params.toString()}`,
    signal,
  )) as TrendPayload;
  return trendFromPayload(secid, payload);
}

export async function fetchTrend(secid: string, signal?: AbortSignal): Promise<Trend | null> {
  const market = marketOfSecid(secid);
  const primary =
    market === "cn" || market === "fut" || market === "a50" || market === "brent"
      ? TREND_ENDPOINT
      : TREND_DELAY_ENDPOINT;

  try {
    const trend = await requestTrend(primary, secid, 1, signal);
    if (trend) return trend;
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  return requestTrend(TREND_HISTORY_ENDPOINT, secid, 2, signal);
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
    ut: QUOTE_TOKEN,
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

/**
 * Average share of a full day's turnover already traded by each minute,
 * combined across the two exchange indices. Built from the completed sessions
 * in a five-day intraday response; used to project the market's closing
 * turnover without assuming a flat intraday pace.
 */
export async function fetchMarketAmountProfile(
  signal?: AbortSignal,
): Promise<AmountProfile | null> {
  const results = await Promise.allSettled(
    BREADTH_SECIDS.map(async (secid) => {
      const params = new URLSearchParams({
        secid,
        fields1: "f1,f2,f3,f4,f5,f6,f7,f8",
        fields2: "f51,f52,f53,f56,f57,f58",
        iscr: "0",
        ndays: "5",
        ut: QUOTE_TOKEN,
        _: String(Date.now()),
      });
      return (await fetchKlineJson(
        `${TREND_HISTORY_ENDPOINT}?${params.toString()}`,
        signal,
      )) as TrendPayload;
    }),
  );
  if (signal?.aborted) return null;

  const sessions = new Map<string, Map<number, number>>();
  let latest = "";
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const row of result.value.data?.trends ?? []) {
      const parsed = parseTrendRow(row);
      if (!parsed) continue;
      const amount = numeric(parsed.amount);
      if (amount == null) continue;
      let points = sessions.get(parsed.date);
      if (!points) sessions.set(parsed.date, (points = new Map()));
      const minute = tradingMinuteFromTime(parsed.stamp);
      points.set(minute, (points.get(minute) ?? 0) + amount);
      if (parsed.date > latest) latest = parsed.date;
    }
  }

  const sums = new Array<number>(241).fill(0);
  let days = 0;
  for (const [date, points] of sessions) {
    // The latest day is still in progress; only completed sessions describe
    // a full-day shape.
    if (date === latest || points.size < 200) continue;
    const entries = [...points.entries()].sort((a, b) => a[0] - b[0]);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    if (total <= 0) continue;
    let cumulative = 0;
    let index = 0;
    for (let minute = 0; minute <= 240; minute += 1) {
      while (index < entries.length && entries[index][0] <= minute) {
        cumulative += entries[index][1];
        index += 1;
      }
      sums[minute] += cumulative / total;
    }
    days += 1;
  }
  if (days < 2) return null;
  return {
    tradeDate: latest,
    fractions: sums.map((sum) => sum / days),
  };
}

const breadthDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: MARKET_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function beijingDate(stampSeconds: number): string {
  const date = stampSeconds > 0 ? new Date(stampSeconds * 1000) : new Date();
  const parts = breadthDateFormatter.formatToParts(date);
  const part = (type: "year" | "month" | "day") =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function countOf(value: Primitive): number {
  const parsed = numeric(value);
  return parsed != null && parsed > 0 ? parsed : 0;
}

interface BreadthRow {
  f5?: Primitive;
  f6?: Primitive;
  f10?: Primitive;
  f104?: Primitive;
  f105?: Primitive;
  f106?: Primitive;
  f124?: Primitive;
}

interface BreadthBase {
  up: number;
  flat: number;
  down: number;
  amount: number | null;
  volumeRatio: number | null;
  tradeDate: string;
}

async function requestBreadth(
  endpoint: string,
  signal?: AbortSignal,
): Promise<BreadthBase> {
  const params = new URLSearchParams({
    fltt: "2",
    secids: BREADTH_SECIDS.join(","),
    fields: BREADTH_FIELDS,
    ut: QUOTE_TOKEN,
  });
  const payload = (await fetchJson(
    `${endpoint}?${params.toString()}&_=${Date.now()}`,
    signal,
  )) as { data?: { diff?: BreadthRow[] } };

  const rows = payload.data?.diff ?? [];
  let up = 0;
  let flat = 0;
  let down = 0;
  let amount = 0;
  let volume = 0;
  let volumeBaseline = 0;
  let stamp = 0;
  for (const row of rows) {
    up += countOf(row.f104);
    down += countOf(row.f105);
    flat += countOf(row.f106);
    amount += countOf(row.f6);
    const rowVolume = countOf(row.f5);
    const rowRatio = numeric(row.f10);
    if (rowVolume > 0 && rowRatio != null && rowRatio > 0) {
      volume += rowVolume;
      volumeBaseline += rowVolume / rowRatio;
    }
    stamp = Math.max(stamp, countOf(row.f124));
  }
  if (rows.length < BREADTH_SECIDS.length || up + flat + down === 0) {
    throw new Error("市场涨跌数据暂不可用");
  }
  return {
    up,
    flat,
    down,
    amount: amount > 0 ? amount : null,
    volumeRatio: volumeBaseline > 0 ? volume / volumeBaseline : null,
    tradeDate: beijingDate(stamp),
  };
}

async function fetchPoolCount(
  kind: "ZT" | "DT",
  date: string,
  signal?: AbortSignal,
): Promise<number | null> {
  const params = new URLSearchParams({
    ut: POOL_TOKEN,
    dpt: "wz.ztzt",
    Pageindex: "0",
    pagesize: "1",
    sort: kind === "ZT" ? "fbt:asc" : "fund:asc",
    date,
  });
  try {
    const payload = (await fetchJson(
      `${POOL_ENDPOINT}${kind}Pool?${params.toString()}`,
      signal,
    )) as { data?: { tc?: Primitive } | null };
    const count = numeric(payload.data?.tc);
    return count != null && count >= 0 ? count : null;
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

export async function fetchMarketBreadth(signal?: AbortSignal): Promise<MarketBreadth> {
  let base: BreadthBase;
  try {
    base = await requestBreadth(QUOTE_ENDPOINT, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    base = await requestBreadth(QUOTE_FALLBACK_ENDPOINT, signal);
  }
  const date = base.tradeDate.replace(/-/g, "");
  const [limitUp, limitDown] = await Promise.all([
    fetchPoolCount("ZT", date, signal),
    fetchPoolCount("DT", date, signal),
  ]);
  return { ...base, limitUp, limitDown };
}

interface DividendRow {
  PRETAX_BONUS_RMB?: Primitive;
  EX_DIVIDEND_DATE?: Primitive;
}

/**
 * Cash dividends per share paid within the trailing year. Falls back to the
 * latest cash dividend for annual payers whose ex-date slipped past the window.
 */
export async function fetchDividendPerShare(
  secid: string,
  signal?: AbortSignal,
): Promise<number | null> {
  const code = secid.split(".")[1] ?? "";
  if (!isStockCode(code)) return null;
  const params = new URLSearchParams({
    reportName: "RPT_SHAREBONUS_DET",
    columns: "SECURITY_CODE,PRETAX_BONUS_RMB,EX_DIVIDEND_DATE",
    filter: `(SECURITY_CODE="${code}")`,
    pageNumber: "1",
    pageSize: "20",
    sortTypes: "-1",
    sortColumns: "EX_DIVIDEND_DATE",
    source: "WEB",
    client: "WEB",
  });
  const payload = (await fetchJson(
    `${DIVIDEND_ENDPOINT}?${params.toString()}`,
    signal,
  )) as { result?: { data?: DividendRow[] | null } };

  const now = Date.now();
  const seen = new Set<number>();
  let total = 0;
  let latest: { perShare: number; stamp: number } | null = null;
  for (const row of payload.result?.data ?? []) {
    const perTen = numeric(row.PRETAX_BONUS_RMB);
    const rawDate = row.EX_DIVIDEND_DATE;
    if (perTen == null || perTen <= 0 || typeof rawDate !== "string") continue;
    const stamp = Date.parse(`${rawDate.replace(" ", "T")}+08:00`);
    if (!Number.isFinite(stamp) || stamp > now || seen.has(stamp)) continue;
    seen.add(stamp);
    const perShare = perTen / 10;
    if (latest == null) latest = { perShare, stamp };
    // Rows arrive newest first, so everything past this point is older too.
    if (now - stamp > DIVIDEND_WINDOW_MS) break;
    total += perShare;
  }
  const perShare =
    total > 0
      ? total
      : latest && now - latest.stamp <= DIVIDEND_WINDOW_MS * 2
        ? latest.perShare
        : null;
  return perShare != null && perShare > 0 ? perShare : null;
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
