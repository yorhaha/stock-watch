import type { MarketKind, Quote, SessionInfo, SortMode, StockRef, Trend } from "./types";

export const MARKET_TIME_ZONE = "Asia/Shanghai";

export const WATCHLIST_LIMIT = 30;
export const INDEX_LIMIT = 9;

export interface MarketProfile {
  totalMinutes: number;
  axisLabels: [string, string, string];
}

// SGX A50 futures open their trading day with the overnight session at 16:45,
// pause 05:15–09:00, then run the day session until 16:30. Chart minutes skip
// the overnight pause the same way A-share charts skip the lunch break.
export const A50_TRADING_SESSION = {
  startMinute: 16 * 60 + 45,
  breakStartMinute: 5 * 60 + 15,
  breakEndMinute: 9 * 60,
  totalMinutes: 1200,
  axisLabels: ["16:45", "02:45", "16:30"] as [string, string, string],
};

// ICE Brent trades 01:00–23:00 London time, a 22-hour session that crosses
// midnight on the Beijing clock. The clock shifts with UK daylight saving, so
// the chart derives its axis labels from the first tick of the session.
export const BRENT_TRADING_SESSION = {
  totalMinutes: 22 * 60,
  axisLabels: ["09:00", "20:00", "07:00"] as [string, string, string],
};

export const MARKET_PROFILES: Record<MarketKind, MarketProfile> = {
  cn: { totalMinutes: 240, axisLabels: ["09:30", "11:30 / 13:00", "15:00"] },
  hk: { totalMinutes: 330, axisLabels: ["09:30", "12:00 / 13:00", "16:00"] },
  kr: { totalMinutes: 390, axisLabels: ["08:00", "11:15", "14:30"] },
  fut: { totalMinutes: 1380, axisLabels: ["07:00", "18:30", "06:00"] },
  a50: {
    totalMinutes: A50_TRADING_SESSION.totalMinutes,
    axisLabels: A50_TRADING_SESSION.axisLabels,
  },
  brent: {
    totalMinutes: BRENT_TRADING_SESSION.totalMinutes,
    axisLabels: BRENT_TRADING_SESSION.axisLabels,
  },
};

export const DEFAULT_STOCKS: StockRef[] = [
  { secid: "1.600519", code: "600519", name: "贵州茅台" },
  { secid: "0.300750", code: "300750", name: "宁德时代" },
  { secid: "0.002594", code: "002594", name: "比亚迪" },
  { secid: "1.688981", code: "688981", name: "中芯国际" },
  { secid: "0.300059", code: "300059", name: "东方财富" },
  { secid: "1.688256", code: "688256", name: "寒武纪" },
  { secid: "1.600036", code: "600036", name: "招商银行" },
  { secid: "1.601318", code: "601318", name: "中国平安" },
  { secid: "1.600900", code: "600900", name: "长江电力" },
  { secid: "1.601899", code: "601899", name: "紫金矿业" },
  { secid: "0.000858", code: "000858", name: "五粮液" },
  { secid: "0.000333", code: "000333", name: "美的集团" },
  { secid: "0.002475", code: "002475", name: "立讯精密" },
  { secid: "0.300308", code: "300308", name: "中际旭创" },
  { secid: "1.600276", code: "600276", name: "恒瑞医药" },
  { secid: "1.600030", code: "600030", name: "中信证券" },
];

export const DEFAULT_INDICES: StockRef[] = [
  { secid: "1.000001", code: "000001", name: "上证指数" },
  { secid: "0.399001", code: "399001", name: "深证成指" },
  { secid: "0.399006", code: "399006", name: "创业板指" },
];

export const INDEX_CATALOG: StockRef[] = [
  { secid: "1.000001", code: "000001", name: "上证指数" },
  { secid: "0.399001", code: "399001", name: "深证成指" },
  { secid: "0.399006", code: "399006", name: "创业板指" },
  { secid: "1.000688", code: "000688", name: "科创50" },
  { secid: "1.000300", code: "000300", name: "沪深300" },
  { secid: "1.000905", code: "000905", name: "中证500" },
  { secid: "100.HSI", code: "HSI", name: "恒生指数" },
  { secid: "124.HSTECH", code: "HSTECH", name: "恒生科技指数" },
  { secid: "100.KS11", code: "KS11", name: "韩国KOSPI" },
  { secid: "100.KOSPI200", code: "KOSPI200", name: "韩国KOSPI200" },
  { secid: "103.NQ00Y", code: "NQ00Y", name: "小型纳指当月连续" },
  { secid: "101.GC00Y", code: "GC00Y", name: "COMEX黄金" },
  { secid: "112.B00Y", code: "B00Y", name: "布伦特原油当月连续" },
  { secid: "104.CN00Y", code: "CN00Y", name: "A50期指当月连续" },
];

export const POPULAR_STOCKS: StockRef[] = [
  { secid: "1.600887", code: "600887", name: "伊利股份" },
  { secid: "1.601166", code: "601166", name: "兴业银行" },
  { secid: "0.000651", code: "000651", name: "格力电器" },
  { secid: "0.002230", code: "002230", name: "科大讯飞" },
  { secid: "0.300274", code: "300274", name: "阳光电源" },
  { secid: "1.600309", code: "600309", name: "万华化学" },
  { secid: "1.601088", code: "601088", name: "中国神华" },
  { secid: "0.000725", code: "000725", name: "京东方A" },
  { secid: "0.002714", code: "002714", name: "牧原股份" },
  { secid: "0.300124", code: "300124", name: "汇川技术" },
  { secid: "1.600031", code: "600031", name: "三一重工" },
  { secid: "1.601728", code: "601728", name: "中国电信" },
  { secid: "1.510300", code: "510300", name: "沪深300ETF" },
  { secid: "0.159915", code: "159915", name: "创业板ETF" },
  { secid: "1.518880", code: "518880", name: "黄金ETF" },
];

export const STORAGE_KEYS = {
  watchlist: "tape.watchlist.v1",
  indices: "tape.indices.v1",
  prefs: "tape.preferences.v1",
} as const;

export const DEFAULT_PREFERENCES = {
  theme: "auto" as const,
  refreshMs: 5000,
  showPrice: true,
  layout: "single" as const,
  sort: "manual" as const,
  showIndexValue: true,
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MARKET_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const weekdayMap: Record<string, string> = {
  Sun: "周日",
  Mon: "周一",
  Tue: "周二",
  Wed: "周三",
  Thu: "周四",
  Fri: "周五",
  Sat: "周六",
};

function readParts(now = new Date()) {
  const parts: Record<string, string> = {};
  for (const part of dateTimeFormatter.formatToParts(now)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return parts;
}

function isTradingWindow(
  now: Date,
  windows: Array<[start: number, end: number]>,
): boolean {
  const parts = readParts(now);
  const weekday = parts.weekday ?? "Mon";
  if (weekday === "Sat" || weekday === "Sun") return false;
  const minutes =
    Number(parts.hour ?? "0") * 60 + Number(parts.minute ?? "0");
  return windows.some(([start, end]) => minutes >= start && minutes < end);
}

export function getMarketSession(now = new Date()): SessionInfo {
  const parts = readParts(now);
  const weekday = parts.weekday ?? "Mon";
  const hour = Number(parts.hour ?? "0");
  const minute = Number(parts.minute ?? "0");
  const second = Number(parts.second ?? "0");
  const minutes = hour * 60 + minute;
  const clock = [hour, minute, second]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
  const dateLabel = `${Number(parts.month)}月${Number(parts.day)}日`;
  const isWeekend = weekday === "Sat" || weekday === "Sun";

  let phase: SessionInfo["phase"] = "closed";
  let label = "已收盘";
  let isTrading = false;
  let isAuction = false;

  if (isWeekend) {
    phase = "weekend";
    label = "休市";
  } else if (minutes < 9 * 60 + 15) {
    phase = "pre";
    label = "未开盘";
  } else if (minutes < 9 * 60 + 25) {
    phase = "auction";
    label = "集合竞价";
    isAuction = true;
  } else if (minutes < 9 * 60 + 30) {
    phase = "waiting";
    label = "等待开盘";
  } else if (minutes < 11 * 60 + 30) {
    phase = "open";
    label = "交易中";
    isTrading = true;
  } else if (minutes < 13 * 60) {
    phase = "lunch";
    label = "午间休市";
  } else if (minutes < 15 * 60) {
    phase = "open";
    label = "交易中";
    isTrading = true;
  }

  return {
    phase,
    label,
    isTrading,
    isAuction,
    isHongKongTrading: isHongKongMarketOpen(now),
    isKoreanTrading: isKoreanMarketOpen(now),
    isFuturesTrading: isFuturesMarketOpen(now),
    isBrentTrading: isBrentMarketOpen(now),
    clock,
    dateLabel,
    weekday: weekdayMap[weekday] ?? "",
  };
}

export function isHongKongMarketOpen(now = new Date()): boolean {
  return isTradingWindow(now, [
    [9 * 60 + 30, 12 * 60],
    [13 * 60, 16 * 60],
  ]);
}

export function isKoreanMarketOpen(now = new Date()): boolean {
  return isTradingWindow(now, [[8 * 60, 14 * 60 + 30]]);
}

function zoneOffsetMinutes(now: Date, timeZone: string, fallback: number): number {
  const zone = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = zone ? /^GMT([+-])(\d{2}):(\d{2})$/.exec(zone) : null;
  if (!match) return fallback;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

function usEasternOffsetMinutes(now: Date): number {
  return zoneOffsetMinutes(now, "America/New_York", -5 * 60);
}

function londonOffsetMinutes(now: Date): number {
  return zoneOffsetMinutes(now, "Europe/London", 0);
}

function futuresSessionBounds(now: Date): { open: number; close: number } {
  const beijing = 8 * 60 - usEasternOffsetMinutes(now);
  return {
    open: (18 * 60 + beijing) % 1440,
    close: (17 * 60 + beijing) % 1440,
  };
}

function brentSessionBounds(now: Date): { open: number; close: number } {
  const beijing = 8 * 60 - londonOffsetMinutes(now);
  return {
    open: (1 * 60 + beijing) % 1440,
    close: (23 * 60 + beijing) % 1440,
  };
}

function isOvernightSessionOpen(
  now: Date,
  bounds: { open: number; close: number },
): boolean {
  const parts = readParts(now);
  const weekday = parts.weekday ?? "Mon";
  const minutes = Number(parts.hour ?? "0") * 60 + Number(parts.minute ?? "0");
  const isWeekday = weekday !== "Sat" && weekday !== "Sun";
  if (isWeekday && minutes >= bounds.open) return true;
  const isOvernight = weekday !== "Sun" && weekday !== "Mon";
  return isOvernight && minutes < bounds.close;
}

export function isFuturesMarketOpen(now = new Date()): boolean {
  return isOvernightSessionOpen(now, futuresSessionBounds(now));
}

export function isBrentMarketOpen(now = new Date()): boolean {
  return isOvernightSessionOpen(now, brentSessionBounds(now));
}

function minuteOfTime(value: string): number {
  const time = value.includes(" ") ? value.split(" ")[1] : value;
  const [hour, minute] = time.split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

export function tradingMinuteFromTime(
  value: string,
  market: MarketKind = "cn",
): number {
  const total = minuteOfTime(value);
  if (market === "hk") {
    if (total <= 12 * 60) {
      return Math.max(0, Math.min(150, total - (9 * 60 + 30)));
    }
    return Math.max(150, Math.min(330, 150 + total - 13 * 60));
  }
  if (market === "kr") {
    return Math.max(0, Math.min(390, total - 8 * 60));
  }
  if (total <= 11 * 60 + 30) {
    return Math.max(0, Math.min(120, total - (9 * 60 + 30)));
  }
  return Math.max(120, Math.min(240, 120 + total - 13 * 60));
}

function clockFromMinute(value: number): string {
  const minute = ((Math.round(value) % 1440) + 1440) % 1440;
  const hour = String(Math.floor(minute / 60)).padStart(2, "0");
  return `${hour}:${String(minute % 60).padStart(2, "0")}`;
}

export function marketProfileFor(trend?: Trend | null): MarketProfile {
  const profile = MARKET_PROFILES[trend?.market ?? "cn"];
  if (
    !trend ||
    (trend.market !== "fut" && trend.market !== "brent") ||
    trend.points.length === 0
  ) {
    return profile;
  }
  const start = minuteOfTime(trend.points[0].time);
  return {
    totalMinutes: profile.totalMinutes,
    axisLabels: [
      clockFromMinute(start),
      clockFromMinute(start + profile.totalMinutes / 2),
      clockFromMinute(start + profile.totalMinutes),
    ],
  };
}

export function formatTradeDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${Number(match[2])}月${Number(match[3])}日`;
}

export function pricePrecision(code: string | null | undefined): number {
  return code && isFundCode(code) ? 3 : 2;
}

export function formatPrice(value: number | null | undefined, code?: string | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const digits = pricePrecision(code);
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0.0001 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDelta(value: number | null | undefined, code?: string | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0.0001 ? "+" : "";
  return `${sign}${value.toFixed(pricePrecision(code))}`;
}

export function formatAmount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  if (absolute >= 1e12) return `${(value / 1e12).toFixed(2)}万亿`;
  if (absolute >= 1e8) return `${(value / 1e8).toFixed(2)}亿`;
  if (absolute >= 1e4) return `${(value / 1e4).toFixed(2)}万`;
  return `${value.toFixed(0)}`;
}

export function formatVolume(
  value: number | null | undefined,
  unit: "hand" | "count" = "hand",
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const suffix = unit === "hand" ? "手" : "";
  if (Math.abs(value) >= 1e8) return `${(value / 1e8).toFixed(2)}亿${suffix}`;
  if (Math.abs(value) >= 1e4) return `${(value / 1e4).toFixed(2)}万${suffix}`;
  return `${Math.round(value).toLocaleString("zh-CN")}${suffix}`;
}

export function formatSyncTime(timestamp: number | null): string {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: MARKET_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}

export function toneOf(value: number | null | undefined): "up" | "down" | "flat" {
  if (value == null || !Number.isFinite(value) || Math.abs(value) < 0.0001) return "flat";
  return value > 0 ? "up" : "down";
}

export function isStockCode(code: string): boolean {
  return /^(60[0135]\d{3}|68[89]\d{3}|00[0123]\d{3}|30[01]\d{3}|920\d{3})$/.test(code);
}

export function isFundCode(code: string): boolean {
  return /^(5\d{5}|159\d{3})$/.test(code);
}

export function isWatchlistCode(code: string): boolean {
  return isStockCode(code) || isFundCode(code);
}

export function isIndexCode(code: string): boolean {
  return /^(000|399|899|930|931|932)\d{3}$/.test(code);
}

const HONG_KONG_INDEX_SECIDS = new Set(["100.HSI", "124.HSTECH"]);
const KOREAN_INDEX_SECIDS = new Set(["100.KS11", "100.KOSPI200"]);
const A50_INDEX_SECIDS = new Set(["104.CN00Y"]);
const BRENT_INDEX_SECIDS = new Set(["112.B00Y"]);
const FUTURES_INDEX_SECIDS = new Set(["103.NQ00Y", "101.GC00Y"]);

export function marketOfSecid(secid: string): MarketKind {
  if (HONG_KONG_INDEX_SECIDS.has(secid)) return "hk";
  if (KOREAN_INDEX_SECIDS.has(secid)) return "kr";
  if (A50_INDEX_SECIDS.has(secid)) return "a50";
  if (BRENT_INDEX_SECIDS.has(secid)) return "brent";
  if (FUTURES_INDEX_SECIDS.has(secid)) return "fut";
  return "cn";
}

export function isHongKongIndex(secid: string): boolean {
  return HONG_KONG_INDEX_SECIDS.has(secid);
}

export function isKoreanIndex(secid: string): boolean {
  return KOREAN_INDEX_SECIDS.has(secid);
}

export function isBrentIndex(secid: string): boolean {
  return BRENT_INDEX_SECIDS.has(secid);
}

export function isFuturesIndex(secid: string): boolean {
  return (
    FUTURES_INDEX_SECIDS.has(secid) ||
    A50_INDEX_SECIDS.has(secid) ||
    BRENT_INDEX_SECIDS.has(secid)
  );
}

export function isSupportedIndex(secid: string, code: string): boolean {
  return (
    (/^[01]\.\d{6}$/.test(secid) && isIndexCode(code)) ||
    isHongKongIndex(secid) ||
    isKoreanIndex(secid) ||
    isFuturesIndex(secid)
  );
}

export function sortStocksByChange(
  stocks: StockRef[],
  quotes: Record<string, Quote>,
  mode: SortMode,
): StockRef[] {
  if (mode === "manual") return stocks;
  const direction = mode === "change-desc" ? -1 : 1;
  return stocks
    .map((stock, order) => ({ stock, order, pct: quotes[stock.secid]?.pct }))
    .sort((a, b) => {
      const aValue = a.pct;
      const bValue = b.pct;
      if (aValue == null && bValue == null) return a.order - b.order;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (aValue === bValue) return a.order - b.order;
      return (aValue - bValue) * direction;
    })
    .map((entry) => entry.stock);
}
