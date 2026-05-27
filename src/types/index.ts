/**
 * Shared domain types used across the replay simulator.
 *
 * The `Candle` shape is intentionally kept compatible with both
 * TradingView Lightweight Charts (`CandlestickData`) and the
 * `lightweight-charts-indicators` `Bar` type so we can pass the same
 * objects to both without conversion.
 */
export type UnixSeconds = number;

export interface Candle {
  time: UnixSeconds; // seconds since epoch (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type PredictionDirection = 'UP' | 'DOWN';

/** A prediction that has been placed but not yet evaluated. */
export interface PendingPrediction {
  direction: PredictionDirection;
  /** Index of the last visible candle when prediction was made. */
  baselineIndex: number;
  /** Close price of the baseline candle. */
  baselineClose: number;
}

/** A prediction that has been resolved against the next candle. */
export interface PredictionResult extends PendingPrediction {
  resolvedClose: number;
  correct: boolean;
}

export interface PredictionStats {
  total: number;
  correct: number;
  accuracy: number; // 0..1
  streak: number; // current consecutive correct
  bestStreak: number;
}

export interface IndicatorToggles {
  ema: boolean;
  rsi: boolean;
  macd: boolean;
}

export interface IndicatorParams {
  emaPeriod: number;
  rsiPeriod: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
}

export interface CsvParseResult {
  candles: Candle[];
  totalRows: number;
  validRows: number;
  duplicates: number;
  reordered: boolean;
  errors: string[];
  warnings: string[];
}
