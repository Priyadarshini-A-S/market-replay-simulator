import { ChartContainer } from './components/charts/ChartContainer';
import { UploadPanel } from './components/UploadPanel';
import { ReplayControls } from './components/replay/ReplayControls';
import { TimelineSlider } from './components/replay/TimelineSlider';
import { PredictionPanel } from './components/PredictionPanel';
import { StatsPanel } from './components/StatsPanel';
import { IndicatorPanel } from './components/IndicatorPanel';
import { useReplayEngine } from './hooks/useReplayEngine';

/**
 * App layout:
 *
 *   ┌─────────────────────────┬──────────────────┐
 *   │       Chart stack       │   Side panels    │
 *   │ (price / rsi / macd)    │ Upload           │
 *   │                         │ Replay           │
 *   │                         │ Predict          │
 *   │                         │ Stats            │
 *   │                         │ Indicators       │
 *   ├─────────────────────────┴──────────────────┤
 *   │              Timeline slider               │
 *   └────────────────────────────────────────────┘
 *
 * The replay engine is mounted once here so its setInterval lives for
 * the lifetime of the app, independent of any panel rendering.
 */
export function App() {
  useReplayEngine();

  return (
    <div className="app">
      <header className="app__header">
        <h1>Market Replay Simulator</h1>
        <span className="muted small">candle-by-candle replay · prediction mode · indicators</span>
      </header>

      <main className="app__main">
        <section className="app__chart">
          <ChartContainer />
        </section>
        <aside className="app__side">
          <UploadPanel />
          <ReplayControls />
          <PredictionPanel />
          <StatsPanel />
          <IndicatorPanel />
        </aside>
      </main>

      <footer className="app__footer">
        <TimelineSlider />
      </footer>
    </div>
  );
}
