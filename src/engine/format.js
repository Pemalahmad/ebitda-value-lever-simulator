// Number formatting shared by the UI, the memo and the CLI.
// All money in the engine is AED millions.

export function money(m, { sign = false, dp } = {}) {
  const abs = Math.abs(m);
  const s = sign ? (m > 0 ? '+' : m < 0 ? '−' : '') : m < 0 ? '−' : '';
  if (abs >= 1000) return `${s}AED ${(abs / 1000).toFixed(dp ?? 2)}bn`;
  if (abs >= 100) return `${s}AED ${abs.toFixed(dp ?? 0)}m`;
  return `${s}AED ${abs.toFixed(dp ?? 1)}m`;
}

export function pct(x, { dp = 1, sign = false } = {}) {
  const v = x * 100;
  const s = sign && v > 0 ? '+' : v < 0 ? '−' : '';
  return `${s}${Math.abs(v).toFixed(dp)}%`;
}

export function num(x, dp = 0) {
  return x.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

// Format a lever / KPI value given its unit.
export function unitValue(value, unit, dp) {
  const d = dp ?? (Math.abs(value) < 10 && unit !== '%' ? 1 : 0);
  switch (unit) {
    case '%': return `${value.toFixed(dp ?? 1)}%`;
    case 'AED': return `AED ${num(value, d)}`;
    case 'AED m': return money(value);
    case 'm': return `${value.toFixed(dp ?? 1)}m`;
    case 'x': return `${value.toFixed(1)}x`;
    default: return `${num(value, d)}${unit ? ' ' + unit : ''}`;
  }
}

export function months(m) {
  if (!Number.isFinite(m)) return 'n/a';
  if (m < 1) return '< 1 month';
  return `${Math.round(m)} months`;
}
