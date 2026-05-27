import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

/**
 * Replay engine.
 *
 * Owns the playback timer. It is intentionally side-effect only — it
 * doesn't return any values — so that mounting it in `App.tsx` is enough
 * to keep the simulation running. Whenever `isPlaying` or `playbackSpeed`
 * changes the timer is rebuilt with a new interval period.
 *
 * Base period is 1000 ms per candle at 1x speed. Higher speeds shorten
 * the interval; very high speeds are clamped to 30 ms to avoid pushing
 * the chart faster than it can render.
 */
const BASE_INTERVAL_MS = 1000;
const MIN_INTERVAL_MS = 30;

export function useReplayEngine() {
  const isPlaying = useStore((s) => s.isPlaying);
  const speed = useStore((s) => s.playbackSpeed);
  // Read these via getState() inside the tick to avoid re-arming the
  // interval whenever the index advances.
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    const period = Math.max(MIN_INTERVAL_MS, BASE_INTERVAL_MS / Math.max(0.01, speed));

    const id = window.setInterval(() => {
      const store = useStore.getState();
      if (store.currentIndex >= store.allCandles.length - 1) {
        store.pause();
        return;
      }
      store.nextCandle();
    }, period);
    tickRef.current = id;

    return () => {
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [isPlaying, speed]);
}
