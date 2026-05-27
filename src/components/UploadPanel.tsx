import { useRef, useState } from 'react';
import { parseCsv } from '../parsers/csvParser';
import { useStore } from '../store/useStore';

/**
 * UploadPanel — accepts a CSV file (or loads the bundled sample) and
 * pushes the parsed candles into the store. All parsing happens
 * client-side; no data ever leaves the browser.
 */
export function UploadPanel() {
  const loadCandles = useStore((s) => s.loadCandles);
  const total = useStore((s) => s.allCandles.length);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  function summarise(result: Awaited<ReturnType<typeof parseCsv>>): string {
    const bits = [`Loaded ${result.validRows} / ${result.totalRows} candles`];
    if (result.errors.length) {
      bits.push(`${result.errors.length} bad row(s) skipped — first: ${result.errors[0]}`);
    }
    for (const w of result.warnings) bits.push(w);
    return bits.join(' · ');
  }

  async function handleFile(file: File) {
    setBusy(true);
    setStatus('Parsing…');
    try {
      const result = await parseCsv(file);
      loadCandles(result.candles);
      setStatus(summarise(result));
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadSample() {
    setBusy(true);
    setStatus('Loading sample…');
    try {
      const url = `${import.meta.env.BASE_URL}sample.csv`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const result = await parseCsv(text);
      loadCandles(result.candles);
      setStatus(summarise(result));
    } catch (e) {
      setStatus(`Could not load sample: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h3 className="panel__title">Data</h3>
      <div className="upload">
        <button
          className="btn btn--primary"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          Upload CSV
        </button>
        <button className="btn" onClick={loadSample} disabled={busy}>
          Load sample
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
      </div>
      <div className="muted small">
        Expected columns: <code>time, open, high, low, close, volume</code>
      </div>
      {status && <div className="status small">{status}</div>}
      {total > 0 && (
        <div className="muted small">{total} candles loaded</div>
      )}
    </section>
  );
}
