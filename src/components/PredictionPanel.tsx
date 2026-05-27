import { useStore } from '../store/useStore';
import { formatPrice } from '../utils/format';

/**
 * PredictionPanel — UP / DOWN guess for the next candle.
 *
 * Only enabled when:
 *   - the replay is paused, AND
 *   - there is at least one more candle available, AND
 *   - there is no already-pending prediction.
 *
 * Resolution happens automatically inside the store when the visible
 * window advances past the baseline candle.
 */
export function PredictionPanel() {
  const isPlaying = useStore((s) => s.isPlaying);
  const hasData = useStore((s) => s.allCandles.length > 0);
  const atEnd = useStore((s) => s.currentIndex >= s.allCandles.length - 1);
  const pending = useStore((s) => s.pendingPrediction);
  const make = useStore((s) => s.makePrediction);
  const cancel = useStore((s) => s.cancelPrediction);
  const lastClose = useStore((s) =>
    s.currentIndex >= 0 ? s.allCandles[s.currentIndex]?.close : undefined,
  );

  const canPredict = hasData && !isPlaying && !atEnd && !pending;

  return (
    <section className="panel">
      <h3 className="panel__title">Predict next candle</h3>
      {!hasData && <div className="muted small">Load a CSV first.</div>}
      {hasData && isPlaying && (
        <div className="muted small">Pause the replay to place a prediction.</div>
      )}
      {hasData && !isPlaying && atEnd && (
        <div className="muted small">End of data — nothing left to predict.</div>
      )}
      <div className="predict">
        <button
          className="btn btn--up"
          onClick={() => make('UP')}
          disabled={!canPredict}
        >
          ▲ UP
        </button>
        <button
          className="btn btn--down"
          onClick={() => make('DOWN')}
          disabled={!canPredict}
        >
          ▼ DOWN
        </button>
      </div>
      {pending && (
        <div className="pending">
          <div className="small">
            Pending: <strong>{pending.direction}</strong> from{' '}
            <span className="mono">{formatPrice(pending.baselineClose)}</span>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={cancel}>
            Cancel
          </button>
        </div>
      )}
      {!pending && lastClose !== undefined && (
        <div className="muted small">
          Current close: <span className="mono">{formatPrice(lastClose)}</span>
        </div>
      )}
    </section>
  );
}
