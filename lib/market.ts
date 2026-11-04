import type { Exchange, SessionInfo, StockRef } from "./types";

export const MARKET_TIME_ZONE = "Asia/Shanghai";

export const DEFAULT_STOCKS: StockRef[] = [
  { secid: "1.600519", code: "600519", name: "贵州茅台", exchange: "SH" },
  { secid: "0.300750", code: "300750", name: "宁德时代", exchange: "SZ" },
  { secid: "0.002594", code: "002594", name: "比亚迪", exchange: "SZ" },
  { secid: "1.688981", code: "688981", name: "中芯国际", exchange: "SH" },
  { secid: "0.300059", code: "300059", name: "东方财富", exchange: "SZ" },
  { secid: "1.688256", code: "688256", name: "寒武纪", exchange: "SH" },
  { secid: "1.600036", code: "600036", name: "招商银行", exchange: "SH" },
  { secid: "1.601318", code: "601318", name: "中国平安", exchange: "SH" },
];

export const MARKET_INDICES: StockRef[] = [
  { secid: "1.000001", code: "000001", name: "上证指数", exchange: "SH" },
  { secid: "0.399001", code: "399001", name: "深证成指", exchange: "SZ" },
  { secid: "0.399006", code: "399006", name: "创业板指", exchange: "SZ" },
];

export const POPULAR_STOCKS: StockRef[] = [
  { secid: "1.600900", code: "600900", name: "长江电力", exchange: "SH" },
  { secid: "1.601899", code: "601899", name: "紫金矿业", exchange: "SH" },
  { secid: "0.000858", code: "000858", name: "五粮液", exchange: "SZ" },
  { secid: "0.000333", code: "000333", name: "美的集团", exchange: "SZ" },
  { secid: "0.002475", code: "002475", name: "立讯精密", exchange: "SZ" },
  { secid: "0.300308", code: "300308", name: "中际旭创", exchange: "SZ" },
  { secid: "1.600276", code: "600276", name: "恒瑞医药", exchange: "SH" },
  { secid: "1.600030", code: "600030", name: "中信证券", exchange: "SH" },
  { secid: "0.000001", code: "000001", name: "平安银行", exchange: "SZ" },
  { secid: "1.601012", code: "601012", name: "隆基绿能", exchange: "SH" },
  { secid: "0.002415", code: "002415", name: "海康威视", exchange: "SZ" },
  { secid: "0.300502", code: "300502", name: "新易盛", exchange: "SZ" },
];

export const STORAGE_KEYS = {
  watchlist: "tape.watchlist.v1",
  prefs: "tape.preferences.v1",
} as const;

export const DEFAULT_PREFERENCES = {
  theme: "auto" as const,
  colors: "cn" as const,
  refreshMs: 5000,
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
    clock,
    dateLabel,
    weekday: weekdayMap[weekday] ?? "",
  };
}

export function tradingMinuteFromTime(value: string): number {
  const time = value.includes(" ") ? value.split(" ")[1] : value;
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute;
  if (total <= 11 * 60 + 30) {
    return Math.max(0, Math.min(120, total - (9 * 60 + 30)));
  }
  return Math.max(120, Math.min(240, 120 + total - 13 * 60));
}

export function formatTradeDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${Number(match[2])}月${Number(match[3])}日`;
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0.0001 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDelta(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0.0001 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

export function formatAmount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  if (absolute >= 1e12) return `${(value / 1e12).toFixed(2)}万亿`;
  if (absolute >= 1e8) return `${(value / 1e8).toFixed(2)}亿`;
  if (absolute >= 1e4) return `${(value / 1e4).toFixed(2)}万`;
  return `${value.toFixed(0)}`;
}

export function formatVolume(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1e8) return `${(value / 1e8).toFixed(2)}亿手`;
  if (Math.abs(value) >= 1e4) return `${(value / 1e4).toFixed(2)}万手`;
  return `${Math.round(value).toLocaleString("zh-CN")}手`;
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

export function exchangeLabel(exchange: Exchange): string {
  if (exchange === "SH") return "沪";
  if (exchange === "BJ") return "京";
  return "深";
}

export function isStockCode(code: string): boolean {
  return /^(60[0135]\d{3}|68[89]\d{3}|00[0123]\d{3}|30[01]\d{3}|920\d{3})$/.test(code);
}

export function normalizeSecid(secid: string): string | null {
  const match = /^([01])\.(\d{6})$/.exec(secid);
  if (!match || !isStockCode(match[2])) return null;
  return `${match[1]}.${match[2]}`;
}
