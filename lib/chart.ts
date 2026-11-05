import type { Trend, TrendPoint } from "./types";

export interface SeriesPoint {
  minute: number;
  price: number;
  average?: number;
  volume?: number;
  open?: number;
  time?: string;
}

export interface Domain {
  min: number;
  max: number;
}

export function toSeries(trend: Trend | undefined, livePrice?: number | null): SeriesPoint[] {
  if (!trend?.points.length) return [];
  const points: SeriesPoint[] = trend.points.map((point: TrendPoint) => ({
    minute: point.minute,
    price: point.price,
    average: point.average,
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

export function priceDomain(values: number[], preClose?: number): Domain {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0);
  if (clean.length === 0) {
    const fallback = preClose && preClose > 0 ? preClose : 1;
    return { min: fallback * 0.995, max: fallback * 1.005 };
  }
  let min = Math.min(...clean);
  let max = Math.max(...clean);
  if (preClose && preClose > 0) {
    min = Math.min(min, preClose);
    max = Math.max(max, preClose);
  }
  const span = max - min;
  const base = Math.max(Math.abs(preClose ?? max), max, 0.01);
  const padding = span > base * 0.0004 ? span * 0.16 : base * 0.0015;
  return { min: min - padding, max: max + padding };
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

export function areaPath(
  points: SeriesPoint[],
  width: number,
  height: number,
  domain: Domain,
  top = 0,
  maxMinute = 240,
): string {
  if (points.length === 0) return "";
  const line = linePath(points, width, height, domain, (point) => point.price, top, maxMinute);
  const first = points[0];
  const last = points[points.length - 1];
  const firstX = scaleX(first.minute, width, maxMinute);
  const lastX = scaleX(last.minute, width, maxMinute);
  const bottom = top + height;
  return `${line} L${lastX.toFixed(2)},${bottom.toFixed(2)} L${firstX.toFixed(2)},${bottom.toFixed(2)} Z`;
}

export function nearestPointIndex(points: SeriesPoint[], minute: number): number {
  if (points.length === 0) return -1;
  let closest = 0;
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += 1) {
    const current = Math.abs(points[index].minute - minute);
    if (current < distance) {
      distance = current;
      closest = index;
    }
  }
  return closest;
}
