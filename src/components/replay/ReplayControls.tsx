import { useStore } from '../../store/useStore';

const SPEEDS = [1, 2, 5];

/**
 * ReplayControls — Play / Pause / Step / Speed.
 *
 * The buttons all dispatch into the store; the actual playback timer
 * lives in `useReplayEngine` so this component never mounts a setInterval
 * of its own (preventing duplicate timers if it ever re-renders).
 */
export function ReplayControls() {
  const isPlaying = useStore((s) => s.isPlaying);
  const speed = useStore((s) => s.playbackSpeed);
  const hasData = useStore((s) => s.allCandles.length > 0);
  const atEnd = useStore((s) => s.currentIndex >= s.allCandles.length - 1);
  const atStart = useStore((s) => s.currentIndex <= 0);

  const play = useStore((s) => s.play);
  const pause = useStore((s) => s.pause);
  const next = useStore((s) => s.nextCandle);
  const prev = useStore((s) => s.prevCandle);
  const setSpeed = useStore((s) => s.setSpeed);
  const reset = useStore((s) => s.reset);

  return (
    <section className="panel">
      <h3 className="panel__title">Replay</h3>
      <div className="controls">
        <button
          className="btn"
          onClick={prev}
          disabled={!hasData || atStart}
          title="Previous candle"
        >
          ◀︎
        </button>
        {isPlaying ? (
          <button className="btn btn--primary" onClick={pause} disabled={!hasData}>
            ❚❚ Pause
          </button>
        ) : (
          <button
            className="btn btn--primary"
            onClick={play}
            disabled={!hasData || atEnd}
          >
            ▶ Play
          </button>
        )}
        <button
          className="btn"
          onClick={next}
          disabled={!hasData || atEnd}
          title="Next candle"
        >
          ▶︎
        </button>
        <button className="btn btn--ghost" onClick={reset} disabled={!hasData}>
          Reset
        </button>
      </div>
      <div className="speeds">
        {SPEEDS.map((s) => (
          <button
            key={s}
            className={`chip ${speed === s ? 'chip--active' : ''}`}
            onClick={() => setSpeed(s)}
          >
            {s}x
          </button>
        ))}
      </div>
    </section>
  );
}
