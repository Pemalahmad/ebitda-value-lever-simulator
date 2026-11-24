// Variance analysis shared by every tab: price/volume bridges, P&L line bridges, rolling twelve
// months, intercompany eliminations and an assumption sensitivity summary. Pure functions, AED m.
import { compare, baseLevers, sanitize, run } from './model.js';
import { businessCase } from './businessCase.js';

// Any bridge is { start, end, steps: [{ id, label, delta }] } and must reconcile: start + Σ delta = end.
export const reconciles = (b, tol = 1e-6) => Math.abs(b.start + b.steps.reduce((a, s) => a + s.delta, 0) - b.end) <= tol * Math.max(1, Math.abs(b.end));

// Value = volume × average ticket. Volume effect at the old ticket, price/mix effect at the new volume.
export function priceVolumeBridge(prev, cur, { label = 'value' } = {}) {
  const tPrev = prev.value / prev.volume, tCur = cur.value / cur.volume;
  const volume = (cur.volume - prev.volume) * tPrev;
  const price = (tCur - tPrev) * cur.volume;
  return {
    start: prev.value, end: cur.value, label,
    ticket: { prev: tPrev, cur: tCur },
    steps: [{ id: 'volume', label: 'Volume effect', delta: volume }, { id: 'price', label: 'Price & mix effect', delta: price }],
  };
}

// EBITDA bridge by P&L line: revenue, then each cost line (a cost that falls is a positive step).
export function lineBridge(sector, levers) {
  const c = compare(sector, levers);
  const steps = c.base.lines.map((l, i) => ({ id: `line${i}`, label: l.label, delta: c.scn.lines[i].value - l.value })).filter((s) => Math.abs(s.delta) > 1e-9);
  const other = c.dEbitda - steps.reduce((a, s) => a + s.delta, 0);
  if (Math.abs(other) > 1e-6) steps.push({ id: 'other', label: 'Other (outside the P&L lines)', delta: other });
  return { start: c.base.ebitda, end: c.scn.ebitda, steps };
}

// Monthly EBITDA as each initiative ramps linearly to run rate, and the trailing-twelve-month sum.
// Months before the plan starts run at baseline, so the first R12M points are honest.
export function rolling12(sector, levers, months = 36) {
  const c = compare(sector, levers);
  const bc = businessCase(sector, levers);
  const baseM = c.base.ebitda / 12;
  const monthly = Array.from({ length: months }, (_, i) => {
    const m = i + 1;
    const uplift = bc.initiatives.reduce((a, x) => a + (x.runRate / 12) * Math.min(1, m / Math.max(1, x.rampMonths)), 0);
    return baseM + uplift;
  });
  const series = [...Array(12).fill(baseM), ...monthly];
  return monthly.map((v, i) => ({
    month: i + 1,
    monthly: v,
    r12: series.slice(i + 1, i + 13).reduce((a, x) => a + x, 0),
    base12: c.base.ebitda,
  }));
}

// Intercompany eliminations. Each flow is a sale from one entity to another inside the group.
// Opex flows: revenue and cost both fall by the amount, EBITDA is unchanged.
// Capitalised flows: the buyer books an asset, so the seller's margin is unrealised profit and is removed from EBITDA.
export function consolidate(entities, flows = []) {
  const byId = Object.fromEntries(entities.map((e) => [e.id, e]));
  const valid = flows.filter((f) => byId[f.from] && byId[f.to] && f.from !== f.to && f.amount > 0);
  const grossRevenue = entities.reduce((a, e) => a + e.revenue, 0);
  const grossEbitda = entities.reduce((a, e) => a + e.ebitda, 0);
  const revenueElim = valid.reduce((a, f) => a + f.amount, 0);
  const costElim = valid.filter((f) => f.treatment !== 'capex').reduce((a, f) => a + f.amount, 0);
  const profitElim = valid.filter((f) => f.treatment === 'capex').reduce((a, f) => a + f.amount * (f.margin ?? 0) / 100, 0);
  const capexElim = valid.filter((f) => f.treatment === 'capex').reduce((a, f) => a + f.amount, 0);
  const revenue = grossRevenue - revenueElim;
  const ebitda = grossEbitda - profitElim;
  const issues = [];
  for (const f of flows) {
    if (!byId[f.from] || !byId[f.to]) issues.push(`A flow points at an entity that is not in the group (${f.from} → ${f.to}).`);
    else if (f.from === f.to) issues.push(`${byId[f.from].name} cannot sell to itself.`);
    else if (f.amount > byId[f.from].revenue) issues.push(`${byId[f.from].name} sells more inside the group (${f.amount}) than its total revenue (${byId[f.from].revenue.toFixed(0)}).`);
    if (f.treatment === 'capex' && !(f.margin >= 0 && f.margin <= 100)) issues.push('A capitalised flow needs the seller margin between 0 and 100%.');
  }
  return {
    grossRevenue, grossEbitda, revenueElim, costElim, capexElim, profitElim, revenue, ebitda,
    margin: ebitda / revenue,
    // Opex eliminations must net to zero in EBITDA; this is the balance check.
    balanced: Math.abs((revenueElim - capexElim) - costElim) < 1e-9,
    issues,
    bridge: {
      start: grossEbitda, end: ebitda,
      steps: profitElim ? [{ id: 'upp', label: 'Unrealised profit on capitalised sales', delta: -profitElim }] : [],
    },
    revenueBridge: { start: grossRevenue, end: revenue, steps: valid.map((f, i) => ({ id: `ic${i}`, label: `${byId[f.from].name} → ${byId[f.to].name}`, delta: -f.amount })) },
  };
}

// For each lever: EBITDA change for a ±shock move, and elasticity (% EBITDA per 1% of the lever).
export function assumptionSummary(sector, levers, shock = 0.1) {
  const v = sanitize(sector, levers);
  const e0 = run(sector, v).ebitda;
  const rows = sector.levers.map((l) => {
    const at = (k) => {
      const raw = v[l.id] * (1 + k);
      return run(sector, { ...v, [l.id]: Math.min(l.max, Math.max(l.min, raw)) }).ebitda - e0;
    };
    const lo = at(-shock), hi = at(shock);
    const e1 = run(sector, { ...v, [l.id]: Math.min(l.max, v[l.id] * 1.01) }).ebitda;
    return {
      id: l.id, label: l.label, owner: l.owner, group: l.group,
      low: lo, high: hi, swing: Math.abs(hi - lo),
      elasticity: e0 ? ((e1 - e0) / Math.abs(e0)) * 100 : 0,
      headroom: l.good > 0 ? (l.max - v[l.id]) / (l.max - l.min) : (v[l.id] - l.min) / (l.max - l.min),
      moved: Math.abs(v[l.id] - baseLevers(sector)[l.id]) > 1e-9,
    };
  }).sort((a, b) => b.swing - a.swing);
  const total = rows.reduce((a, r) => a + r.swing, 0) || 1;
  rows.forEach((r) => { r.share = r.swing / total; });
  return { ebitda: e0, shock, rows };
}
