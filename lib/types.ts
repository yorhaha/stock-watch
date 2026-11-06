export interface StockRef {
  secid: string;
  code: string;
  name: string;
  held?: boolean;
}

export interface Quote {
  secid: string;
  code: string;
  name: string;
  price: number | null;
  pct: number | null;
  change: number | null;
  amount: number | null;
  amplitude: number | null;
  turnover: number | null;
  volumeRatio: number | null;
  pe: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  preClose: number | null;
}

export interface TrendPoint {
  time: string;
  minute: number;
  price: number;
  average: number | null;
  open: number;
  volume: number;
}

export type MarketKind = "cn" | "hk" | "kr" | "fut" | "a50" | "brent";

export interface Trend {
  secid: string;
  market: MarketKind;
  tradeDate: string;
  preClose: number;
  points: TrendPoint[];
}

export interface Candle {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  pct: number | null;
}

export interface KlinePoint extends Candle {
  ma5: number | null;
  ma10: number | null;
  t70: number | null;
  t30: number | null;
}

export interface SearchStock extends StockRef {
  alreadyAdded?: boolean;
}

export type EconomicEventKind = "fed" | "nonfarm" | "cpi" | "delivery";

export interface EconomicEvent {
  kind: EconomicEventKind;
  name: string;
  startsAt: number;
  date: string;
  time: string;
}

export type ThemeMode = "auto" | "light" | "dark";
export type SortMode = "manual" | "change-desc" | "change-asc";

export interface Preferences {
  theme: ThemeMode;
  refreshMs: number;
  showPrice: boolean;
  sort: SortMode;
  showIndexValue: boolean;
}

export interface SessionInfo {
  phase: "unknown" | "pre" | "auction" | "waiting" | "open" | "lunch" | "closed" | "weekend";
  label: string;
  isTrading: boolean;
  isAuction: boolean;
  isHongKongTrading: boolean;
  isKoreanTrading: boolean;
  isFuturesTrading: boolean;
  isBrentTrading: boolean;
  clock: string;
  dateLabel: string;
  weekday: string;
}
