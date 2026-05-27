import Papa from 'papaparse';
import type { Candle, CsvParseResult } from '../types';
import { parseTimestamp } from '../utils/parseTimestamp';

/**
 * CSV parser for OHLCV historical data.
 *
 * Expected columns (header row, case-insensitive):
 *   time, open, high, low, close, volume
 *
 * All common timestamp formats are accepted — see `parseTimestamp` for
 * the full list. Rows missing required fields or containing non-finite
 * numbers are discarded and reported in `errors`. The result is sorted
 * ascending by time and de-duplicated (last write wins on equal
 * timestamps; duplicates and reordering are surfaced in `warnings`).
 */
export function parseCsv(input: File | string): Promise<CsvParseResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const out: Candle[] = [];
    let total = 0;

    const handle = (row: Record<string, unknown>, rowIndex: number) => {
      total += 1;
      const candle = rowToCandle(row);
      if (!candle) {
        errors.push(`Row ${rowIndex + 2}: malformed or missing fields`);
        return;
      }
      out.push(candle);
    };

    const finish = () => {
      const warnings: string[] = [];
      // detect whether input was already sorted before we sort it
      let reordered = false;
      for (let i = 1; i < out.length; i++) {
        if (out[i].time < out[i - 1].time) { reordered = true; break; }
      }
      if (reordered) {
        out.sort((a, b) => a.time - b.time);
        warnings.push('Rows were not chronologically ordered — auto-sorted ascending.');
      }
      // de-dup by time (keep the last entry for a given timestamp)
      const dedup: Candle[] = [];
      let duplicates = 0;
      for (const c of out) {
        if (dedup.length && dedup[dedup.length - 1].time === c.time) {
          dedup[dedup.length - 1] = c;
          duplicates += 1;
        } else {
          dedup.push(c);
        }
      }
      if (duplicates > 0) {
        warnings.push(`${duplicates} duplicate timestamp(s) collapsed (kept last value).`);
      }
      resolve({
        candles: dedup,
        totalRows: total,
        validRows: dedup.length,
        duplicates,
        reordered,
        errors: errors.slice(0, 20),
        warnings,
      });
    };

    const config: Papa.ParseConfig<Record<string, unknown>> = {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (h) => h.trim().toLowerCase(),
      step: (results) => handle(results.data, total),
      complete: finish,
      error: (err: Error) => {
        errors.push(`Parse error: ${err.message}`);
        finish();
      },
    } as Papa.ParseConfig<Record<string, unknown>>;

    if (typeof input === 'string') {
      Papa.parse<Record<string, unknown>>(input, config);
    } else {
      Papa.parse<Record<string, unknown>, File>(input, config as never);
    }
  });
}

function rowToCandle(row: Record<string, unknown>): Candle | null {
  const time = parseTimestamp(row.time ?? row.timestamp ?? row.date ?? row.datetime);
  const open = toNum(row.open);
  const high = toNum(row.high);
  const low = toNum(row.low);
  const close = toNum(row.close);
  const volume = toNum(row.volume ?? row.vol ?? 0);

  if (
    time === null ||
    !Number.isFinite(open) ||
    !Number.isFinite(high) ||
    !Number.isFinite(low) ||
    !Number.isFinite(close)
  ) {
    return null;
  }
  return { time, open, high, low, close, volume: Number.isFinite(volume) ? volume : 0 };
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}


