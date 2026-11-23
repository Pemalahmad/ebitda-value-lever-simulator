// Opportunity scoring: weighted multi-criteria ranking used by the
// Opportunities tab for sectors, themes and acquisition targets.
// Scores are 1-5 analyst judgements (documented with rationale in the data
// file); weights are the investment committee's priorities and are editable.

export const CRITERIA = [
  { id: 'growth', label: 'Market growth', hint: 'Demand growth and size of the profit pool' },
  { id: 'fit', label: 'Strategic fit', hint: 'Right to win: land, brands, customers and capabilities the Group already has' },
  { id: 'value', label: 'Value-creation upside', hint: 'Room for operating improvement, re-rating or synergies' },
  { id: 'feasibility', label: 'Feasibility', hint: 'Availability, price, regulation and execution complexity' },
  { id: 'risk', label: 'Risk (higher = safer)', hint: 'Cycle, concentration and execution risk, scored so that 5 is lowest risk' },
];

export const DEFAULT_WEIGHTS = { growth: 25, fit: 25, value: 20, feasibility: 15, risk: 15 };

export function normaliseWeights(w) {
  const total = CRITERIA.reduce((a, c) => a + Math.max(0, Number(w[c.id]) || 0), 0);
  if (total <= 0) return Object.fromEntries(CRITERIA.map((c) => [c.id, 1 / CRITERIA.length]));
  return Object.fromEntries(CRITERIA.map((c) => [c.id, Math.max(0, Number(w[c.id]) || 0) / total]));
}

// Weighted score on a 0-100 scale (1 -> 0, 5 -> 100).
export function score(item, weights = DEFAULT_WEIGHTS) {
  const w = normaliseWeights(weights);
  const s = CRITERIA.reduce((a, c) => a + w[c.id] * ((item.scores?.[c.id] ?? 3) - 1) / 4, 0);
  return Math.round(s * 100);
}

export function rank(items, weights = DEFAULT_WEIGHTS) {
  return items
    .map((it) => ({ ...it, total: score(it, weights) }))
    .sort((a, b) => b.total - a.total)
    .map((it, i) => ({ ...it, rank: i + 1 }));
}

export function tier(total) {
  if (total >= 70) return 'Pursue';
  if (total >= 55) return 'Develop';
  if (total >= 40) return 'Watch';
  return 'Deprioritise';
}
