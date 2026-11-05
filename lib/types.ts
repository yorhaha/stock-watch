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
  high: number | null;
  low: number | null;
  open: number | null;
  preClose: number | null;
}

export interface TrendPoint {
  time: string;
  minute: number;
  price: number;
  average: number;
  open: number;
  volume: number;
}

export interface Trend {
  secid: string;
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

export type ThemeMode = "auto" | "light" | "dark";
export type LayoutMode = "single" | "double";
export type SortMode = "manual" | "change-desc" | "change-asc";

export interface Preferences {
  theme: ThemeMode;
  refreshMs: number;
  showPrice: boolean;
  changeBackground: boolean;
  layout: LayoutMode;
  sort: SortMode;
  showIndexValue: boolean;
}

export interface SessionInfo {
  phase: "unknown" | "pre" | "auction" | "waiting" | "open" | "lunch" | "closed" | "weekend";
  label: string;
  isTrading: boolean;
  isAuction: boolean;
  clock: string;
  dateLabel: string;
  weekday: string;
}
