import type { Candle, KlinePoint } from "./types";

export const KLINE_BARS = 90;

/**
 * Recreates the TDX indicator lines on daily closes:
 *
 * LC:=REF(CLOSE,1);
 * A1:=SMA(MAX(CLOSE-LC,0),6,1);
 * A2:=SMA(ABS(CLOSE-LC),6,1);
 * AP:=REF(A1,1); BP:=REF(A2,1);
 * RSI6_Y:=AP/BP*100;
 * T70:IF(RSI6_Y<70,LC+(3.5*BP-5*AP)/0.3,LC+5*BP-50/7*AP);
 * T30:IF(RSI6_Y<30,LC+(1.5*BP-5*AP)/0.7,LC+5*BP-50/3*AP);
 * MA5:MA(C,5); MA10:MA(C,10);
 *
 * SMA(X,N,M) in TDX is (M*X+(N-M)*previous)/N. The caller fetches more
 * history than it displays, so the seed value of the recursion has no
 * measurable influence inside the visible window.
 */
export function computeKline(candles: Candle[]): KlinePoint[] {
  const points: KlinePoint[] = [];
  let a1 = 0;
  let a2 = 0;
  let sum5 = 0;
  let sum10 = 0;

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    const previous = candles[index - 1];
    const ap = a1;
    const bp = a2;

    let t70: number | null = null;
    let t30: number | null = null;
    if (previous && bp > 0) {
      const rsi6Yesterday = (ap / bp) * 100;
      const lc = previous.close;
      t70 =
        rsi6Yesterday < 70
          ? lc + (3.5 * bp - 5 * ap) / 0.3
          : lc + 5 * bp - (50 / 7) * ap;
      t30 =
        rsi6Yesterday < 30
          ? lc + (1.5 * bp - 5 * ap) / 0.7
          : lc + 5 * bp - (50 / 3) * ap;
    }

    if (previous) {
      a1 = (Math.max(candle.close - previous.close, 0) + 5 * a1) / 6;
      a2 = (Math.abs(candle.close - previous.close) + 5 * a2) / 6;
    } else {
      a1 = Math.max(candle.close - candle.open, 0);
      a2 = Math.abs(candle.close - candle.open);
    }

    sum5 += candle.close;
    sum10 += candle.close;
    if (index >= 5) sum5 -= candles[index - 5].close;
    if (index >= 10) sum10 -= candles[index - 10].close;

    points.push({
      ...candle,
      ma5: index >= 4 ? sum5 / 5 : null,
      ma10: index >= 9 ? sum10 / 10 : null,
      t70,
      t30,
    });
  }

  return points;
}

export function visibleKline(points: KlinePoint[], count = KLINE_BARS): KlinePoint[] {
  return points.slice(-count);
}
