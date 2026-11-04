export type Exchange = "SH" | "SZ" | "BJ";

export interface StockRef {
  secid: string;
  code: string;
  name: string;
  exchange: Exchange;
}

export interface Quote {
  secid: string;
  code: string;
  name: string;
  price: number | null;
  pct: number | null;
  change: number | null;
  volume: number | null;
  amount: number | null;
  amplitude: number | null;
  turnover: number | null;
  pe: number | null;
  volumeRatio: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  preClose: number | null;
  marketCap: number | null;
  floatCap: number | null;
  pb: number | null;
  mainFlow: number | null;
  fetchedAt: number;
}

export interface TrendPoint {
  time: string;
  minute: number;
  price: number;
  average: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

export interface Trend {
  secid: string;
  name: string;
  tradeDate: string;
  preClose: number;
  points: TrendPoint[];
  fetchedAt: number;
}

export interface SearchStock extends StockRef {
  alreadyAdded?: boolean;
}

export type ThemeMode = "auto" | "light" | "dark";
export type ColorMode = "cn" | "intl";

export interface Preferences {
  theme: ThemeMode;
  colors: ColorMode;
  refreshMs: number;
}

export interface SessionInfo {
  phase: "pre" | "auction" | "waiting" | "open" | "lunch" | "closed" | "weekend";
  label: string;
  isTrading: boolean;
  isAuction: boolean;
  clock: string;
  dateLabel: string;
  weekday: string;
}
