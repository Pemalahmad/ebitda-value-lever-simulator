// Sensitivity analysis: EBITDA bridge, tornado, lever leverage ranking, two-way grid.
import { run, baseLevers, sanitize, movedLevers, evMultiple } from './model.js';

const clampTo = (l, x) => Math.min(l.max, Math.max(l.min, x));

// EBITDA bridge from baseline to scenario. Each moved lever's isolated effect,
// plus an explicit interaction bar so the bridge always reconciles.
export function bridge(sector, levers) {
  const base = run(sector, baseLevers(sector));
  const scn = run(sector, levers);
  const v = sanitize(sector, levers);
  const steps = movedLevers(sector, v).map((l) => {
    const only = run(sector, { ...baseLevers(sector), [l.id]: v[l.id] });
    return { id: l.id, label: l.label, delta: only.ebitda - base.ebitda };
  });
  steps.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const explained = steps.reduce((a, s) => a + s.delta, 0);
  const interaction = scn.ebitda - base.ebitda - explained;
  if (Math.abs(interaction) > 0.05) steps.push({ id: '_interaction', label: 'Interaction effects', delta: interaction });
  return { start: base.ebitda, end: scn.ebitda, steps };
}

// Tornado: EBITDA swing when each lever moves ±shock (relative to its base)
// from the current scenario, all else held.
export function tornado(sector, levers, shock = 0.1) {
  const v = sanitize(sector, levers);
  const cur = run(sector, v).ebitda;
  return sector.levers
    .map((l) => {
      const span = Math.max(Math.abs(l.base) * shock, l.step);
      const lowV = clampTo(l, v[l.id] - span);
      const highV = clampTo(l, v[l.id] + span);
      const dLow = run(sector, { ...v, [l.id]: lowV }).ebitda - cur;
      const dHigh = run(sector, { ...v, [l.id]: highV }).ebitda - cur;
      return { id: l.id, label: l.label, unit: l.unit, lowV, highV, dLow, dHigh, swing: Math.abs(dHigh - dLow) };
    })
    .sort((a, b) => b.swing - a.swing);
}

// Leverage: value created by moving each lever 10% in its value-creating
// direction from the current scenario (EV from EBITDA plus working-capital cash),
// with the one-off cost of that move.
export function leverage(sector, levers, shock = 0.1) {
  const v = sanitize(sector, levers);
  const current = run(sector, v);
  const mult = evMultiple(sector);
  return sector.levers
    .map((l) => {
      const span = Math.max(Math.abs(l.base) * shock, l.step);
      const target = clampTo(l, v[l.id] + span * l.good);
      const moved = Math.abs(target - v[l.id]);
      const after = run(sector, { ...v, [l.id]: target });
      const gain = after.ebitda - current.ebitda;
      const cashGain = current.wc - after.wc;
      const cost = moved * l.costPerUnit;
      return {
        id: l.id,
        label: l.label,
        owner: l.owner,
        gain,
        evGain: gain * mult,
        cashGain,
        valueGain: gain * mult + cashGain,
        cost,
        perAed: cost > 0 ? gain / cost : gain > 0 ? Infinity : 0,
        atLimit: moved < 1e-9,
      };
    })
    .sort((a, b) => b.valueGain - a.valueGain);
}

// Two-way sensitivity grid of EBITDA for two levers around the current scenario.
export function grid(sector, levers, aId, bId, points = 5, span = 0.2) {
  const v = sanitize(sector, levers);
  const la = sector.levers.find((l) => l.id === aId);
  const lb = sector.levers.find((l) => l.id === bId);
  const axis = (l) =>
    Array.from({ length: points }, (_, i) => clampTo(l, v[l.id] + Math.abs(l.base) * span * (i / (points - 1) * 2 - 1)));
  const rows = axis(la);
  const cols = axis(lb);
  const cells = rows.map((ra) => cols.map((cb) => run(sector, { ...v, [aId]: ra, [bId]: cb }).ebitda));
  return { a: la, b: lb, rows, cols, cells, current: run(sector, v).ebitda };
}
