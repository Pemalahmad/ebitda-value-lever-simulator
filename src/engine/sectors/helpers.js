// Small helpers used by the sector models.

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// A risk flag raised by a sector model when a lever is pushed into a zone
// where the EBITDA gain carries a real operating risk.
export function flag(when, f) {
  return when ? [f] : [];
}

// Relative change of a lever vs its base, e.g. 0.12 for +12%.
export const rel = (v, base) => v / base - 1;
