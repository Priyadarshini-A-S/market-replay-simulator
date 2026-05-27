import { create } from 'zustand';
import type {
  Candle,
  IndicatorParams,
  IndicatorToggles,
  PendingPrediction,
  PredictionDirection,
  PredictionResult,
  PredictionStats,
} from '../types';
import { defaultIndicatorParams } from '../services/indicators';
import { clamp } from '../utils/format';

/**
 * Central replay store (Zustand).
 *
 * Why Zustand: we want individual UI panels (controls, stats, chart) to
 * subscribe to *only* the slice they care about so that, e.g., updating
 * `currentIndex` 60 times a second never causes the upload panel or
 * prediction stats to re-render.
 *
 * The store owns the canonical timeline state; the chart and indicator
 * computations are derived. The replay engine (a hook) is responsible
 * for advancing `currentIndex` on a timer.
 */

export interface ReplayState {
  /** Full historical data loaded from CSV. */
  allCandles: Candle[];
  /** Index of last visible candle. -1 means nothing visible yet. */
  currentIndex: number;
  /** Number of candles initially revealed when a file is loaded. */
  initialVisible: number;

  isPlaying: boolean;
  playbackSpeed: number;

  indicators: IndicatorToggles;
  indicatorParams: IndicatorParams;

  pendingPrediction: PendingPrediction | null;
  predictions: PredictionResult[];
  stats: PredictionStats;

  // ---- actions ----
  loadCandles: (candles: Candle[]) => void;
  reset: () => void;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  nextCandle: () => void;
  prevCandle: () => void;
  jumpTo: (idx: number) => void;
  setSpeed: (s: number) => void;

  makePrediction: (direction: PredictionDirection) => void;
  cancelPrediction: () => void;

  toggleIndicator: (k: keyof IndicatorToggles) => void;
  setIndicatorParams: (p: Partial<IndicatorParams>) => void;
}

const EMPTY_STATS: PredictionStats = {
  total: 0,
  correct: 0,
  accuracy: 0,
  streak: 0,
  bestStreak: 0,
};

function recomputeStats(prev: PredictionStats, result: PredictionResult): PredictionStats {
  const total = prev.total + 1;
  const correct = prev.correct + (result.correct ? 1 : 0);
  const streak = result.correct ? prev.streak + 1 : 0;
  const bestStreak = Math.max(prev.bestStreak, streak);
  return { total, correct, accuracy: total ? correct / total : 0, streak, bestStreak };
}

/**
 * Internal helper: when the visible window advances past a pending
 * prediction's baseline candle, evaluate it against the new candle.
 */
function resolvePredictionIfDue(state: ReplayState): Partial<ReplayState> {
  const p = state.pendingPrediction;
  if (!p) return {};
  if (state.currentIndex <= p.baselineIndex) return {};
  const resolvedClose = state.allCandles[p.baselineIndex + 1]?.close;
  if (resolvedClose === undefined) return {};
  const movedUp = resolvedClose > p.baselineClose;
  const correct = (p.direction === 'UP' && movedUp) || (p.direction === 'DOWN' && !movedUp);
  const result: PredictionResult = { ...p, resolvedClose, correct };
  return {
    pendingPrediction: null,
    predictions: [...state.predictions, result],
    stats: recomputeStats(state.stats, result),
  };
}

export const useStore = create<ReplayState>((set, get) => ({
  allCandles: [],
  currentIndex: -1,
  initialVisible: 50,

  isPlaying: false,
  playbackSpeed: 1,

  indicators: { ema: true, rsi: false, macd: false },
  indicatorParams: defaultIndicatorParams,

  pendingPrediction: null,
  predictions: [],
  stats: EMPTY_STATS,

  loadCandles: (candles) => {
    const initial = Math.min(50, Math.max(1, Math.floor(candles.length * 0.2)));
    set({
      allCandles: candles,
      currentIndex: candles.length ? initial - 1 : -1,
      initialVisible: initial,
      isPlaying: false,
      pendingPrediction: null,
      predictions: [],
      stats: EMPTY_STATS,
    });
  },

  reset: () => set({
    currentIndex: get().allCandles.length ? get().initialVisible - 1 : -1,
    isPlaying: false,
    pendingPrediction: null,
    predictions: [],
    stats: EMPTY_STATS,
  }),

  play: () => {
    if (!get().allCandles.length) return;
    if (get().currentIndex >= get().allCandles.length - 1) return;
    set({ isPlaying: true });
  },
  pause: () => set({ isPlaying: false }),
  togglePlay: () => (get().isPlaying ? get().pause() : get().play()),

  nextCandle: () => {
    const s = get();
    if (s.currentIndex >= s.allCandles.length - 1) {
      set({ isPlaying: false });
      return;
    }
    const nextIdx = s.currentIndex + 1;
    const partial = resolvePredictionIfDue({ ...s, currentIndex: nextIdx });
    set({ currentIndex: nextIdx, ...partial });
  },

  prevCandle: () => {
    const s = get();
    if (s.currentIndex <= 0) return;
    set({ currentIndex: s.currentIndex - 1, isPlaying: false });
  },

  jumpTo: (idx) => {
    const s = get();
    const clamped = clamp(idx, 0, Math.max(0, s.allCandles.length - 1));
    set({ currentIndex: clamped, isPlaying: false, pendingPrediction: null });
  },

  setSpeed: (s) => set({ playbackSpeed: s }),

  makePrediction: (direction) => {
    const s = get();
    if (s.currentIndex < 0 || s.currentIndex >= s.allCandles.length - 1) return;
    if (s.pendingPrediction) return;
    set({
      pendingPrediction: {
        direction,
        baselineIndex: s.currentIndex,
        baselineClose: s.allCandles[s.currentIndex].close,
      },
    });
  },
  cancelPrediction: () => set({ pendingPrediction: null }),

  toggleIndicator: (k) =>
    set((s) => ({ indicators: { ...s.indicators, [k]: !s.indicators[k] } })),
  setIndicatorParams: (p) =>
    set((s) => ({ indicatorParams: { ...s.indicatorParams, ...p } })),
}));
