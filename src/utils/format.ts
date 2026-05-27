/**
 * Small presentational helpers. Pure functions only.
 */

export function formatPrice(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatTime(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds)) return '—';
  const d = new Date(unixSeconds * 1000);
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
