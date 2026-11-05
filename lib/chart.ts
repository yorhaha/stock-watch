import type { Trend, TrendPoint } from "./types";

export interface SeriesPoint {
  minute: number;
  price: number;
  average?: number | null;
  volume?: number;
  open?: number;
  time?: string;
}

export interface Domain {
  min: number;
  max: number;
}

export interface PriceRange {
  min: number;
  max: number;
}

export function toSeries(trend: Trend | undefined, livePrice?: number | null): SeriesPoint[] {
  if (!trend?.points.length) return [];
  const points: SeriesPoint[] = trend.points.map((point: TrendPoint) => ({
    minute: point.minute,
    price: point.price,
    average: point.average ?? undefined,
    volume: point.volume,
    open: point.open,
    time: point.time,
  }));
  if (livePrice != null && Number.isFinite(livePrice) && points.length > 0) {
    points[points.length - 1] = {
      ...points[points.length - 1],
      price: livePrice,
    };
  }
  return points;
}

export function priceRange(
  points: Array<{ price: number }>,
  start = 0,
  end = points.length,
): PriceRange | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let found = false;
  for (let index = start; index < end; index += 1) {
    const value = points[index].price;
    if (!Number.isFinite(value) || value <= 0) continue;
    found = true;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return found ? { min, max } : null;
}

export function priceDomainFromRange(
  range: PriceRange,
  preClose?: number,
): Domain {
  let min = range.min;
  let max = range.max;
  if (preClose && preClose > 0) {
    min = Math.min(min, preClose);
    max = Math.max(max, preClose);
  }
  const span = max - min;
  const base = Math.max(Math.abs(preClose ?? max), max, 0.01);
  const padding = span > base * 0.0004 ? span * 0.16 : base * 0.0015;
  return { min: min - padding, max: max + padding };
}

export function priceDomain(values: number[], preClose?: number): Domain {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0);
  if (clean.length === 0) {
    const fallback = preClose && preClose > 0 ? preClose : 1;
    return { min: fallback * 0.995, max: fallback * 1.005 };
  }
  return priceDomainFromRange(
    { min: Math.min(...clean), max: Math.max(...clean) },
    preClose,
  );
}

export function scaleY(value: number, domain: Domain, height: number, top = 0): number {
  const ratio = (domain.max - value) / (domain.max - domain.min || 1);
  return top + ratio * height;
}

export function scaleX(minute: number, width: number, maxMinute = 240): number {
  return (Math.max(0, Math.min(maxMinute, minute)) / maxMinute) * width;
}

export function linePath(
  points: SeriesPoint[],
  width: number,
  height: number,
  domain: Domain,
  accessor: (point: SeriesPoint) => number,
  top = 0,
  maxMinute = 240,
): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => {
      const x = scaleX(point.minute, width, maxMinute);
      const y = scaleY(accessor(point), domain, height, top);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function areaPathFromLine(
  line: string,
  points: SeriesPoint[],
  width: number,
  height: number,
  top = 0,
  maxMinute = 240,
): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  const firstX = scaleX(first.minute, width, maxMinute);
  const lastX = scaleX(last.minute, width, maxMinute);
  const bottom = top + height;
  return `${line} L${lastX.toFixed(2)},${bottom.toFixed(2)} L${firstX.toFixed(2)},${bottom.toFixed(2)} Z`;
}

export function nearestPointIndex(points: SeriesPoint[], minute: number): number {
  if (points.length === 0) return -1;
  // First index whose minute is not before the target.
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (points[middle].minute < minute) low = middle + 1;
    else high = middle;
  }
  let bestMinute: number;
  if (low === 0) {
    bestMinute = points[0].minute;
  } else if (low === points.length) {
    bestMinute = points[points.length - 1].minute;
  } else {
    const before = points[low - 1].minute;
    const after = points[low].minute;
    // Equal distances resolve to the earlier minute, matching the old
    // linear scan's earliest-index tie-break.
    bestMinute = minute - before <= after - minute ? before : after;
  }
  // Return the first occurrence of that minute, not its last.
  low = 0;
  high = points.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (points[middle].minute < bestMinute) low = middle + 1;
    else high = middle;
  }
  return low;
}
