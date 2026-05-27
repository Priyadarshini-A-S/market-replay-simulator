/**
 * parseTimestamp — normalise any common market-data timestamp into
 * UNIX seconds (the unit TradingView Lightweight Charts expects for
 * `UTCTimestamp`).
 *
 * Returns the integer number of seconds since 1970-01-01T00:00:00Z, or
 * `null` if the value cannot be interpreted as a valid date.
 *
 * Supported inputs (auto-detected):
 *
 *   Numeric (or numeric string):
 *     1700661780              → seconds
 *     1700661780000           → milliseconds  (auto-divided)
 *     1700661780000000        → microseconds (auto-divided)
 *     1700661780000000000     → nanoseconds  (auto-divided)
 *
 *   String dates / datetimes:
 *     "2024-01-01"                       (ISO date)
 *     "2024-01-01T10:30:00Z"             (ISO datetime, UTC)
 *     "2024-01-01T10:30:00+05:30"        (ISO datetime, offset)
 *     "2024-01-01 10:30:00"              (ISO-ish, naive → treated as UTC)
 *     "2024-01-01 10:30"                 (naive, no seconds)
 *     "12/25/2024", "12/25/2024 10:30"   (US — MM/DD/YYYY)
 *     "25/12/2024"                       (EU — day > 12 disambiguates)
 *     "01-01-2024"                       (ambiguous, falls back to DD-MM-YYYY)
 *     anything else parseable by `Date.parse` as a final fallback.
 *
 * Timezone policy:
 *   - Strings with an explicit `Z` / `±HH:MM` offset are honoured verbatim.
 *   - Naive strings (no offset) are interpreted as UTC. This matches the
 *     Lightweight Charts convention (its time axis is UTC) and prevents
 *     the chart from shifting depending on the user's local timezone.
 *
 * Performance:
 *   - All regexes are compiled once at module load.
 *   - The numeric path never allocates a Date object.
 *   - The string path tries cheapest patterns first and short-circuits.
 */

// Accept plain decimals and scientific notation (e.g. "1.70E+12" exported
// by Excel / Google Sheets when ms-precision epochs lose their integer form).
const RE_NUMERIC = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
const RE_ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_ISO_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const RE_SLASHED =
  /^(\d{1,2})([\/\-.])(\d{1,2})\2(\d{4})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;

export function parseTimestamp(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  // ---- numeric path (fast) ----
  if (typeof value === 'number') return fromEpoch(value);
  if (typeof value !== 'string') return null;

  const s = value.trim();
  if (!s) return null;

  if (RE_NUMERIC.test(s)) return fromEpoch(Number(s));

  // ---- ISO datetime: 2024-01-01T10:30:00(.123)?(Z|±HH:MM)? ----
  const isoDt = RE_ISO_DATETIME.exec(s);
  if (isoDt) {
    const [, Y, M, D, h, m, sec, tz] = isoDt;
    if (tz) {
      // explicit offset — let the platform handle it
      const ms = Date.parse(s.replace(' ', 'T'));
      return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
    }
    // naive → UTC
    return utcSeconds(+Y, +M, +D, +h, +m, +(sec ?? 0));
  }

  // ---- ISO date only: 2024-01-01 ----
  const isoD = RE_ISO_DATE.exec(s);
  if (isoD) return utcSeconds(+isoD[1], +isoD[2], +isoD[3], 0, 0, 0);

  // ---- slashed / dashed / dotted with 4-digit year at end ----
  const sl = RE_SLASHED.exec(s);
  if (sl) {
    const [, a, sep, b, Y, h, m, sec] = sl;
    const ai = +a;
    const bi = +b;
    let day: number;
    let month: number;
    if (ai > 12 && bi <= 12) { day = ai; month = bi; }
    else if (bi > 12 && ai <= 12) { month = ai; day = bi; }
    else {
      // both <= 12 → ambiguous. Convention: '/' → US (MM/DD/YYYY),
      // '-' or '.' → EU (DD-MM-YYYY). Matches the way most exchanges
      // and most spreadsheet exports format their dates.
      if (sep === '/') { month = ai; day = bi; }
      else { day = ai; month = bi; }
    }
    return utcSeconds(+Y, month, day, +(h ?? 0), +(m ?? 0), +(sec ?? 0));
  }

  // ---- last-resort: native Date.parse ----
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

/**
 * Convert a raw epoch number to seconds, auto-detecting the unit by
 * magnitude. The thresholds are chosen so that any plausible market
 * timestamp from 1970 through year 2286 is classified correctly:
 *
 *   |value| <  1e10   → seconds       (covers up to year 2286)
 *   |value| <  1e13   → milliseconds  (covers up to year 2286 in ms)
 *   |value| <  1e16   → microseconds  (some exchange feeds)
 *   otherwise          → nanoseconds   (e.g. Binance trade stream)
 */
function fromEpoch(n: number): number | null {
  if (!Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  if (abs < 1e10) return Math.trunc(n);
  if (abs < 1e13) return Math.trunc(n / 1e3);
  if (abs < 1e16) return Math.trunc(n / 1e6);
  return Math.trunc(n / 1e9);
}

/**
 * Build a UTC second-precision epoch from individual components, and
 * verify the resulting Date round-trips (rejects 2024-02-30, etc.).
 */
function utcSeconds(
  Y: number, M: number, D: number, h: number, m: number, s: number,
): number | null {
  if (M < 1 || M > 12 || D < 1 || D > 31) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) return null;
  const ms = Date.UTC(Y, M - 1, D, h, m, s);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  if (
    d.getUTCFullYear() !== Y ||
    d.getUTCMonth() !== M - 1 ||
    d.getUTCDate() !== D
  ) return null;
  return Math.floor(ms / 1000);
}
