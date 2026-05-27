import { useStore } from '../store/useStore';

/**
 * IndicatorPanel — toggle indicators and tune their periods.
 * All indicator math runs against ONLY the visible candles, so toggling
 * here just flips the corresponding setData/empty branch in the chart.
 */
export function IndicatorPanel() {
  const indicators = useStore((s) => s.indicators);
  const params = useStore((s) => s.indicatorParams);
  const toggle = useStore((s) => s.toggleIndicator);
  const setParams = useStore((s) => s.setIndicatorParams);

  return (
    <section className="panel">
      <h3 className="panel__title">Indicators</h3>
      <div className="ind-row">
        <label className="check">
          <input
            type="checkbox"
            checked={indicators.ema}
            onChange={() => toggle('ema')}
          />
          EMA
        </label>
        <NumberField
          value={params.emaPeriod}
          onChange={(n) => setParams({ emaPeriod: n })}
          min={2}
          max={400}
        />
      </div>
      <div className="ind-row">
        <label className="check">
          <input
            type="checkbox"
            checked={indicators.rsi}
            onChange={() => toggle('rsi')}
          />
          RSI
        </label>
        <NumberField
          value={params.rsiPeriod}
          onChange={(n) => setParams({ rsiPeriod: n })}
          min={2}
          max={100}
        />
      </div>
      <div className="ind-row">
        <label className="check">
          <input
            type="checkbox"
            checked={indicators.macd}
            onChange={() => toggle('macd')}
          />
          MACD
        </label>
        <div className="ind-macd">
          <NumberField
            value={params.macdFast}
            onChange={(n) => setParams({ macdFast: n })}
            min={2}
            max={50}
          />
          <NumberField
            value={params.macdSlow}
            onChange={(n) => setParams({ macdSlow: n })}
            min={3}
            max={100}
          />
          <NumberField
            value={params.macdSignal}
            onChange={(n) => setParams({ macdSignal: n })}
            min={2}
            max={50}
          />
        </div>
      </div>
      <div className="muted small">
        Indicators are computed from visible candles only — no future-data leakage.
      </div>
    </section>
  );
}

function NumberField({
  value, onChange, min, max,
}: { value: number; onChange: (n: number) => void; min: number; max: number }) {
  return (
    <input
      className="num"
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
      }}
    />
  );
}
