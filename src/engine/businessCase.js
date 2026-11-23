// Business case and benefits realisation: turns a lever scenario into an
// initiative portfolio with ramp-up, 5-year cash flows, NPV, IRR and payback.
import { compare, investmentByLever, movedLevers, sanitize } from './model.js';
import { bridge } from './analysis.js';

export const UAE_CORPORATE_TAX = 0.09;
const YEARS = 5;

// Share of run-rate benefit realised in a given month (1-indexed) for a linear ramp.
const realisedAt = (month, ramp) => Math.min(1, month / Math.max(1, ramp));

export function realisationByYear(rampMonths, years = YEARS) {
  return Array.from({ length: years }, (_, y) => {
    let s = 0;
    for (let m = y * 12 + 1; m <= (y + 1) * 12; m++) s += realisedAt(m, rampMonths);
    return s / 12;
  });
}

export function npv(rate, flows) {
  return flows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
}

export function irr(flows) {
  if (!(flows[0] < 0) || !flows.slice(1).some((x) => x > 0)) return NaN;
  let lo = -0.99, hi = 10;
  if (npv(hi, flows) > 0) return Infinity;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid, flows) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export function businessCase(sector, levers) {
  const v = sanitize(sector, levers);
  const cmp = compare(sector, v);
  const br = bridge(sector, v);
  const cost = investmentByLever(sector, v);
  const moved = movedLevers(sector, v);

  // Allocate the interaction effect pro rata to the isolated effects so the
  // initiatives sum to the scenario's run-rate EBITDA change.
  const isolated = br.steps.filter((s) => s.id !== '_interaction');
  const interaction = br.steps.find((s) => s.id === '_interaction')?.delta ?? 0;
  const absSum = isolated.reduce((a, s) => a + Math.abs(s.delta), 0) || 1;

  const initiatives = moved.map((l) => {
    const iso = isolated.find((s) => s.id === l.id)?.delta ?? 0;
    const runRate = iso + interaction * (Math.abs(iso) / absSum);
    const phasing = realisationByYear(l.rampMonths).map((f) => f * runRate);
    return {
      id: l.id,
      label: l.label,
      owner: l.owner,
      from: l.base,
      to: v[l.id],
      unit: l.unit,
      runRate,
      investment: cost[l.id],
      rampMonths: l.rampMonths,
      phasing,
      paybackMonths: runRate > 0 && cost[l.id] > 0 ? (cost[l.id] / runRate) * 12 : runRate > 0 ? 0 : Infinity,
    };
  });

  const yearly = Array.from({ length: YEARS }, (_, y) => initiatives.reduce((a, i) => a + i.phasing[y], 0));
  const flows = [-cmp.invest, ...yearly.map((b, y) => b * (1 - UAE_CORPORATE_TAX) + (y === 0 ? cmp.cashRelease : 0))];

  // Payback on the monthly realised, after-tax benefit plus the working-capital release.
  let paybackMonths = Infinity;
  if (cmp.invest <= 0) paybackMonths = 0;
  else {
    let cum = -cmp.invest;
    for (let m = 1; m <= YEARS * 12; m++) {
      const monthly = initiatives.reduce((a, i) => a + (i.runRate * realisedAt(m, i.rampMonths)) / 12, 0) * (1 - UAE_CORPORATE_TAX);
      cum += monthly + (m <= 12 ? cmp.cashRelease / 12 : 0);
      if (cum >= 0) { paybackMonths = m; break; }
    }
  }

  return {
    initiatives: initiatives.sort((a, b) => b.runRate - a.runRate),
    yearly,
    flows,
    npv: npv(sector.wacc, flows),
    irr: irr(flows),
    paybackMonths,
    wacc: sector.wacc,
    invest: cmp.invest,
    cashRelease: cmp.cashRelease,
    runRate: cmp.dEbitda,
  };
}
