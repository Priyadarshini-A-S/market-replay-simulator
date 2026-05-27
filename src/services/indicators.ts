import { EMA, RSI, MACD } from 'lightweight-charts-indicators';
import type { Candle, IndicatorParams } from '../types';

/**
 * Indicator service.
 *
 * All functions take ONLY the candles that are currently visible during
 * replay. Passing the full historical array would leak future data
 * into past indicator values, breaking the realism of the simulator.
 *
 * The `lightweight-charts-indicators` package returns:
 *   { plots: { plot0: [{time, value}, ...], plot1?: ..., plot2?: ... } }
 * which already matches Lightweight Charts `LineData` / `HistogramData`.
 */
export interface LinePoint {
  time: number;
  value: number;
}

export interface MacdResult {
  macd: LinePoint[];
  signal: LinePoint[];
  histogram: LinePoint[];
}

const candlesToBars = (candles: Candle[]) =>
  candles.map((c) => ({
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));

/** Clean NaN / undefined entries so the chart never receives invalid points. */
const cleanPlot = (plot: ReadonlyArray<{ time: number; value: number }> | undefined): LinePoint[] => {
  if (!plot) return [];
  return plot.filter(
    (p) => p && typeof p.time === 'number' && Number.isFinite(p.value),
  ) as LinePoint[];
};

export function computeEma(candles: Candle[], length: number): LinePoint[] {
  if (candles.length < length) return [];
  const bars = candlesToBars(candles);
  const result = EMA.calculate(bars, { length, src: 'close' });
  return cleanPlot(result.plots.plot0 as ReadonlyArray<{ time: number; value: number }>);
}

export function computeRsi(candles: Candle[], length: number): LinePoint[] {
  if (candles.length < length + 1) return [];
  const bars = candlesToBars(candles);
  const result = RSI.calculate(bars, { length, src: 'close' });
  return cleanPlot(result.plots.plot0 as ReadonlyArray<{ time: number; value: number }>);
}

export function computeMacd(
  candles: Candle[],
  fast: number,
  slow: number,
  signal: number,
): MacdResult {
  if (candles.length < slow + signal) {
    return { macd: [], signal: [], histogram: [] };
  }
  const bars = candlesToBars(candles);
  const result = MACD.calculate(bars, {
    fastLength: fast,
    slowLength: slow,
    signalLength: signal,
    src: 'close',
  });
  // Convention used by the library: plot0=MACD, plot1=signal, plot2=histogram.
  return {
    macd: cleanPlot(result.plots.plot0 as ReadonlyArray<{ time: number; value: number }>),
    signal: cleanPlot(result.plots.plot1 as ReadonlyArray<{ time: number; value: number }>),
    histogram: cleanPlot(result.plots.plot2 as ReadonlyArray<{ time: number; value: number }>),
  };
}

export const defaultIndicatorParams: IndicatorParams = {
  emaPeriod: 20,
  rsiPeriod: 14,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
};
