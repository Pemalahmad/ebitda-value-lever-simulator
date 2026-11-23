// Core model: lever values -> P&L -> EBITDA -> enterprise value, and the
// comparison of a scenario against the sector baseline.

export function baseLevers(sector) {
  return Object.fromEntries(sector.levers.map((l) => [l.id, l.base]));
}

export function sanitize(sector, levers = {}) {
  const out = baseLevers(sector);
  for (const l of sector.levers) {
    const raw = levers[l.id];
    if (raw === undefined || raw === null || raw === '') continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error(`Lever "${l.id}" must be a number`);
    out[l.id] = Math.min(l.max, Math.max(l.min, n));
  }
  return out;
}

export function evMultiple(sector) {
  return sector.valuation.method === 'capRate' ? 1 / sector.valuation.capRate : sector.valuation.multiple;
}

export function valuation(sector, ebitda) {
  return ebitda * evMultiple(sector);
}

export function run(sector, levers) {
  const v = sanitize(sector, levers);
  const r = sector.compute(v);
  return { ...r, margin: r.ebitda / r.revenue, ev: valuation(sector, r.ebitda), levers: v };
}

// One-off cost to move each lever in its value-creating direction.
export function investmentByLever(sector, levers) {
  const v = sanitize(sector, levers);
  return Object.fromEntries(
    sector.levers.map((l) => {
      const improvement = (v[l.id] - l.base) * l.good;
      return [l.id, improvement > 0 ? improvement * l.costPerUnit : 0];
    }),
  );
}

export function movedLevers(sector, levers) {
  const v = sanitize(sector, levers);
  return sector.levers.filter((l) => Math.abs(v[l.id] - l.base) > 1e-9);
}

export function compare(sector, levers) {
  const base = run(sector, baseLevers(sector));
  const scn = run(sector, levers);
  const invest = Object.values(investmentByLever(sector, levers)).reduce((a, b) => a + b, 0);
  const dEbitda = scn.ebitda - base.ebitda;
  const dEv = scn.ev - base.ev;
  const cashRelease = base.wc - scn.wc;
  const valueCreated = dEv + cashRelease;
  return {
    base,
    scn,
    dRevenue: scn.revenue - base.revenue,
    dEbitda,
    dEbitdaPct: dEbitda / base.ebitda,
    dMarginPts: (scn.margin - base.margin) * 100,
    dEv,
    cashRelease,
    valueCreated,
    invest,
    roi: invest > 0 ? valueCreated / invest : Infinity,
    paybackMonths: dEbitda > 0 ? (invest / dEbitda) * 12 : Infinity,
    overBudget: invest > sector.budget,
  };
}
