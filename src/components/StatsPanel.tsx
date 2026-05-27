import { useStore } from '../store/useStore';
import { formatPercent } from '../utils/format';

/**
 * StatsPanel — running prediction scoreboard.
 * Pulls only the `stats` slice so it does not re-render on every tick.
 */
export function StatsPanel() {
  const stats = useStore((s) => s.stats);
  const recent = useStore((s) => s.predictions.slice(-5).reverse());

  return (
    <section className="panel">
      <h3 className="panel__title">Stats</h3>
      <div className="stats">
        <Stat label="Total" value={stats.total} />
        <Stat label="Correct" value={stats.correct} />
        <Stat label="Accuracy" value={formatPercent(stats.accuracy)} />
        <Stat label="Streak" value={stats.streak} />
        <Stat label="Best" value={stats.bestStreak} />
      </div>
      {recent.length > 0 && (
        <ul className="history">
          {recent.map((p, i) => (
            <li key={i} className={p.correct ? 'ok' : 'bad'}>
              <span>{p.direction}</span>
              <span className="mono small">
                {p.baselineClose.toFixed(2)} → {p.resolvedClose.toFixed(2)}
              </span>
              <span>{p.correct ? '✓' : '✗'}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat">
      <div className="stat__value mono">{value}</div>
      <div className="stat__label small muted">{label}</div>
    </div>
  );
}
