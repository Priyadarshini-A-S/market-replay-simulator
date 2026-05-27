import { useStore } from '../../store/useStore';
import { formatTime } from '../../utils/format';

/**
 * TimelineSlider — draggable progress bar for the replay.
 *
 * Uses a native `<input type="range">` so it inherits accessibility for
 * keyboard arrow-key seeking and mobile drag for free. Dragging calls
 * `jumpTo` which pauses replay and clears any pending prediction.
 */
export function TimelineSlider() {
  const total = useStore((s) => s.allCandles.length);
  const currentIndex = useStore((s) => s.currentIndex);
  const jumpTo = useStore((s) => s.jumpTo);
  const time = useStore((s) =>
    s.currentIndex >= 0 ? s.allCandles[s.currentIndex]?.time ?? NaN : NaN,
  );

  if (total === 0) {
    return (
      <section className="panel panel--inline">
        <div className="muted small">Upload a CSV to begin</div>
      </section>
    );
  }

  const max = Math.max(0, total - 1);
  const pct = max ? (currentIndex / max) * 100 : 0;

  return (
    <section className="panel panel--inline timeline">
      <div className="timeline__head">
        <span className="small muted">
          {currentIndex + 1} / {total}
        </span>
        <span className="small mono">{formatTime(time)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={Math.max(0, currentIndex)}
        onChange={(e) => jumpTo(Number(e.target.value))}
        className="timeline__range"
        style={{ ['--pct' as string]: `${pct}%` }}
      />
    </section>
  );
}
