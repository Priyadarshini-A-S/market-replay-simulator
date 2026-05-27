# Market Replay Simulator

A static, browser-only trading simulator. Upload historical OHLCV CSV data
and replay it candle-by-candle with prediction mode and indicators (EMA,
RSI, MACD).

Built with **React + TypeScript + Vite**, **TradingView Lightweight
Charts v5**, **lightweight-charts-indicators**, **PapaParse**, and
**Zustand**. Deployable as a fully static site to GitHub Pages.

## Features

- CSV upload with strict validation (PapaParse)
- Candlestick chart with dark trading-terminal aesthetic
- Replay engine: Play / Pause / Next / Previous / 1x · 2x · 5x
- Prediction mode (UP / DOWN) with running accuracy & streak
- Indicators (EMA / RSI / MACD) computed from **visible candles only**
  — no future-data leakage
- Draggable timeline slider for seeking
- Responsive layout, no backend

## Quick start

```bash
npm install
npm run dev
```

Then open the URL printed by Vite (default `http://localhost:5173`).
Click **Load sample** to try the bundled `public/sample.csv`, or
**Upload CSV** for your own file.

### CSV format

Header row required. Columns are case-insensitive:

```
time,open,high,low,close,volume
2024-01-01,100.00,101.50,99.20,100.80,123456
2024-01-02,100.80,102.10,100.30,101.70,134221
...
```

`time` may be an ISO date/datetime string, a UNIX timestamp in seconds,
or a UNIX timestamp in milliseconds — all are auto-detected. Rows with
missing or non-numeric OHLC values are skipped and reported in the
upload status line.

## Architecture

```
src/
├── components/
│   ├── charts/ChartContainer.tsx     # mounts Lightweight Charts, syncs panes
│   ├── replay/ReplayControls.tsx     # play / pause / step / speed
│   ├── replay/TimelineSlider.tsx     # draggable seek bar
│   ├── UploadPanel.tsx
│   ├── PredictionPanel.tsx
│   ├── StatsPanel.tsx
│   └── IndicatorPanel.tsx
├── hooks/useReplayEngine.ts          # setInterval-driven playback
├── parsers/csvParser.ts              # PapaParse + validation
├── services/indicators.ts            # EMA / RSI / MACD wrappers
├── store/useStore.ts                 # Zustand store (single source of truth)
├── types/index.ts
└── utils/format.ts
```

### Key design decisions

- **Zustand over Context**: each panel subscribes only to the slice of
  state it cares about, so advancing the replay 5× per second never
  re-renders the upload panel or stats panel.
- **Replay engine is a hook, not a component**: mounted once in
  `App.tsx`. Its `setInterval` is rebuilt only when `isPlaying` or
  `playbackSpeed` change, never on every candle tick.
- **Chart updates are diff-aware**: when `currentIndex` advances by
  exactly one and the candle array reference is unchanged, the chart
  calls `series.update(bar)` to push only the new candle. Jumps, prev,
  and reloads fall back to `series.setData(slice)`.
- **No future-data leakage**: indicators always receive
  `allCandles.slice(0, currentIndex + 1)` only.
- **Three stacked charts** (price / RSI / MACD) with synced time scales,
  following the pattern from the `lightweight-charts-indicators` docs.
  Sub-panes are hidden via CSS when their indicator is toggled off.

## GitHub Pages deployment

1. Create the repo on GitHub (e.g. `your-user/market-simulate`).

2. Set the Vite base path to your repo name. The simplest way is via an
   environment variable when you build, so the value lives outside the
   source:

   ```bash
   # PowerShell
   $env:VITE_BASE = "/market-simulate/"; npm run deploy

   # bash / zsh
   VITE_BASE="/market-simulate/" npm run deploy
   ```

   The default `base` in `vite.config.ts` is `./` so opening
   `dist/index.html` from disk or any sub-path still works during local
   testing.

3. `npm run deploy` will:
   - run `npm run build` (compiles TS, bundles to `dist/`)
   - push `dist/` to a `gh-pages` branch via the `gh-pages` package

4. In your GitHub repo settings → **Pages**, set the source to the
   `gh-pages` branch / `(root)`. Your site will be live at
   `https://<your-user>.github.io/market-simulate/`.

### npm scripts

| Script           | What it does                              |
| ---------------- | ----------------------------------------- |
| `npm run dev`    | Start Vite dev server with HMR            |
| `npm run build`  | Type-check and produce static `dist/`     |
| `npm run preview`| Preview the production build locally      |
| `npm run deploy` | Build then publish `dist/` to `gh-pages`  |

## Performance notes

- Tested smoothly with ~10k-candle CSVs.
- The slowest hot path is indicator recomputation on every step. EMA /
  RSI / MACD are all O(n); for very large files (>50k) you may want to
  throttle indicator updates or compute them incrementally.
- React `StrictMode` is enabled in dev, which double-invokes effects —
  this is fine for correctness but means you'll see brief duplicate
  log entries during development only.

## License

MIT.
