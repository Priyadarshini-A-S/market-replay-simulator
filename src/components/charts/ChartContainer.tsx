import { useEffect, useMemo, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type HistogramData,
  type Time,
  type LogicalRange,
} from 'lightweight-charts';
import { useStore } from '../../store/useStore';
import { computeEma, computeRsi, computeMacd } from '../../services/indicators';

/**
 * ChartContainer
 *
 * Holds three stacked charts (price, RSI, MACD) whose time scales are
 * synced. The pattern is taken from the `lightweight-charts-indicators`
 * docs and keeps the implementation portable across LWC versions.
 *
 * Performance:
 *   - The chart is created exactly once.
 *   - When `currentIndex` advances by exactly one and the candle array
 *     reference hasn't changed, we call `series.update(bar)` to push a
 *     single bar instead of resending all data.
 *   - Any other change (jump, prev, file reload) falls back to
 *     `series.setData(slice)`.
 *   - Indicators are always `setData` because their values depend on
 *     recursive state that cannot be patched in-place safely.
 */

const CHART_BG = '#0d1117';
const TEXT_COLOR = '#c9d1d9';
const GRID_COLOR = 'rgba(255,255,255,0.04)';
const UP_COLOR = '#26a69a';
const DOWN_COLOR = '#ef5350';

function baseChartOptions(height: number) {
  return {
    height,
    layout: {
      background: { type: ColorType.Solid, color: CHART_BG },
      textColor: TEXT_COLOR,
      fontSize: 12,
    },
    grid: { vertLines: { color: GRID_COLOR }, horzLines: { color: GRID_COLOR } },
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
    timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true, secondsVisible: false },
    crosshair: { mode: CrosshairMode.Normal },
  } as const;
}

export function ChartContainer() {
  const priceEl = useRef<HTMLDivElement>(null);
  const rsiEl = useRef<HTMLDivElement>(null);
  const macdEl = useRef<HTMLDivElement>(null);

  const priceChart = useRef<IChartApi | null>(null);
  const rsiChart = useRef<IChartApi | null>(null);
  const macdChart = useRef<IChartApi | null>(null);

  const candleSeries = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const emaSeries = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSeries = useRef<ISeriesApi<'Line'> | null>(null);
  const macdLineSeries = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalSeries = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistSeries = useRef<ISeriesApi<'Histogram'> | null>(null);

  const lastDrawnIndex = useRef<number>(-2);
  const lastCandlesRef = useRef<unknown>(null);

  // Subscribe to the granular slices we actually need.
  const allCandles = useStore((s) => s.allCandles);
  const currentIndex = useStore((s) => s.currentIndex);
  const indicators = useStore((s) => s.indicators);
  const params = useStore((s) => s.indicatorParams);

  // ---- mount: create charts once ----
  useEffect(() => {
    if (!priceEl.current || !rsiEl.current || !macdEl.current) return;

    priceChart.current = createChart(priceEl.current, baseChartOptions(420));
    rsiChart.current = createChart(rsiEl.current, baseChartOptions(120));
    macdChart.current = createChart(macdEl.current, baseChartOptions(140));

    candleSeries.current = priceChart.current.addSeries(CandlestickSeries, {
      upColor: UP_COLOR, downColor: DOWN_COLOR,
      borderUpColor: UP_COLOR, borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR, wickDownColor: DOWN_COLOR,
    });
    emaSeries.current = priceChart.current.addSeries(LineSeries, {
      color: '#f7b500', lineWidth: 2, priceLineVisible: false, lastValueVisible: false,
    });
    rsiSeries.current = rsiChart.current.addSeries(LineSeries, {
      color: '#7e57c2', lineWidth: 2,
    });
    macdLineSeries.current = macdChart.current.addSeries(LineSeries, {
      color: '#42a5f5', lineWidth: 2,
    });
    macdSignalSeries.current = macdChart.current.addSeries(LineSeries, {
      color: '#ffa726', lineWidth: 2,
    });
    macdHistSeries.current = macdChart.current.addSeries(HistogramSeries, {
      color: '#26a69a',
    });

    // sync the three time scales so panning/zooming one moves the others
    const syncFrom = (src: IChartApi, dests: IChartApi[]) => {
      src.timeScale().subscribeVisibleLogicalRangeChange((range: LogicalRange | null) => {
        if (!range) return;
        for (const d of dests) d.timeScale().setVisibleLogicalRange(range);
      });
    };
    syncFrom(priceChart.current, [rsiChart.current, macdChart.current]);
    syncFrom(rsiChart.current, [priceChart.current, macdChart.current]);
    syncFrom(macdChart.current, [priceChart.current, rsiChart.current]);

    // responsive
    const ro = new ResizeObserver(() => {
      if (priceEl.current && priceChart.current)
        priceChart.current.applyOptions({ width: priceEl.current.clientWidth });
      if (rsiEl.current && rsiChart.current)
        rsiChart.current.applyOptions({ width: rsiEl.current.clientWidth });
      if (macdEl.current && macdChart.current)
        macdChart.current.applyOptions({ width: macdEl.current.clientWidth });
    });
    ro.observe(priceEl.current);

    return () => {
      ro.disconnect();
      priceChart.current?.remove();
      rsiChart.current?.remove();
      macdChart.current?.remove();
      priceChart.current = rsiChart.current = macdChart.current = null;
    };
  }, []);

  // visible window
  const visible = useMemo(
    () => (currentIndex >= 0 ? allCandles.slice(0, currentIndex + 1) : []),
    [allCandles, currentIndex],
  );

  // ---- push candle data ----
  useEffect(() => {
    const s = candleSeries.current;
    if (!s) return;
    const candlesChanged = lastCandlesRef.current !== allCandles;
    const isSingleStep =
      !candlesChanged && currentIndex === lastDrawnIndex.current + 1 && currentIndex >= 0;
    if (isSingleStep) {
      const last = allCandles[currentIndex];
      s.update({
        time: last.time as Time,
        open: last.open, high: last.high, low: last.low, close: last.close,
      } as CandlestickData);
    } else {
      s.setData(
        visible.map((c) => ({
          time: c.time as Time,
          open: c.open, high: c.high, low: c.low, close: c.close,
        })) as CandlestickData[],
      );
      // fit content only on first draw or after a reload
      if (candlesChanged) priceChart.current?.timeScale().fitContent();
    }
    lastDrawnIndex.current = currentIndex;
    lastCandlesRef.current = allCandles;
  }, [allCandles, currentIndex, visible]);

  // ---- indicators (always recompute from visible only) ----
  useEffect(() => {
    if (!emaSeries.current) return;
    emaSeries.current.setData(
      (indicators.ema ? computeEma(visible, params.emaPeriod) : []) as LineData[],
    );
  }, [visible, indicators.ema, params.emaPeriod]);

  useEffect(() => {
    if (!rsiSeries.current) return;
    rsiSeries.current.setData(
      (indicators.rsi ? computeRsi(visible, params.rsiPeriod) : []) as LineData[],
    );
  }, [visible, indicators.rsi, params.rsiPeriod]);

  useEffect(() => {
    if (!macdLineSeries.current || !macdSignalSeries.current || !macdHistSeries.current) return;
    const m = indicators.macd
      ? computeMacd(visible, params.macdFast, params.macdSlow, params.macdSignal)
      : { macd: [], signal: [], histogram: [] };
    macdLineSeries.current.setData(m.macd as LineData[]);
    macdSignalSeries.current.setData(m.signal as LineData[]);
    macdHistSeries.current.setData(
      m.histogram.map((p) => ({
        time: p.time as Time,
        value: p.value,
        color: p.value >= 0 ? UP_COLOR : DOWN_COLOR,
      })) as HistogramData[],
    );
  }, [visible, indicators.macd, params.macdFast, params.macdSlow, params.macdSignal]);

  return (
    <div className="chart-stack">
      <div ref={priceEl} className="chart-pane chart-pane--price" />
      <div
        ref={rsiEl}
        className="chart-pane chart-pane--rsi"
        style={{ display: indicators.rsi ? 'block' : 'none' }}
      />
      <div
        ref={macdEl}
        className="chart-pane chart-pane--macd"
        style={{ display: indicators.macd ? 'block' : 'none' }}
      />
    </div>
  );
}
