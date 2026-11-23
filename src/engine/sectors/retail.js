import { clamp, flag, rel } from './helpers.js';

// Super-regional mall portfolio. EBITDA here is NOI; valued on a cap rate.
const C = {
  gla: 650000, // sqm
  rentBase: 1900,
  spendPerVisitor: 310, // tenant sales per footfall, AED
  leasingCostPerSqm: 300, // fit-out contributions and downtime on re-letting
  otherIncomePct: 0.06, // media, parking, sponsorship
  marketingPct: 0.015,
  ga: 70,
};

export default {
  id: 'retail',
  name: 'Retail & Asset Management',
  tagline: 'Malls, lifestyle destinations & community centres',
  company: 'Dubai Holding Asset Management · Dubai Retail',
  scale: 'model: a 650,000 sqm slice of Dubai Retail’s 58+ destinations',
  valuation: { method: 'capRate', capRate: 0.0725 },
  wacc: 0.085,
  budget: 300,
  levers: [
    { id: 'occupancy', label: 'Occupancy (pre-churn)', unit: '%', base: 92, min: 78, max: 99, step: 0.5, good: 1, costPerUnit: 31, rampMonths: 12, group: 'Revenue', owner: 'Leasing Director' },
    { id: 'baseRent', label: 'Base rent', unit: 'AED', base: 1900, min: 1400, max: 2600, step: 10, good: 1, costPerUnit: 0.48, rampMonths: 24, group: 'Revenue', owner: 'Leasing Director',
      hint: 'AED per sqm per year. Every 1% above today costs ~0.35pp of occupancy at renewal.' },
    { id: 'footfall', label: 'Annual footfall', unit: 'm', base: 58, min: 42, max: 80, step: 0.5, good: 1, costPerUnit: 7.3, rampMonths: 12, group: 'Revenue', owner: 'Marketing & Events' },
    { id: 'turnoverRent', label: 'Turnover rent', unit: '%', base: 1.2, min: 0, max: 3, step: 0.1, good: 1, costPerUnit: 270, rampMonths: 24, group: 'Revenue', owner: 'Leasing Director',
      hint: 'Share of tenant sales collected as turnover rent.' },
    { id: 'recovery', label: 'Service-charge recovery', unit: '%', base: 82, min: 60, max: 98, step: 0.5, good: 1, costPerUnit: 3.1, rampMonths: 12, group: 'Cost', owner: 'Asset Management' },
    { id: 'opex', label: 'Operating cost per sqm', unit: 'AED', base: 520, min: 380, max: 650, step: 5, good: -1, costPerUnit: 0.28, rampMonths: 12, group: 'Cost', owner: 'Facilities' },
    { id: 'tenantRetention', label: 'Tenant retention', unit: '%', base: 85, min: 65, max: 96, step: 0.5, good: 1, costPerUnit: 6.2, rampMonths: 18, group: 'Revenue', owner: 'Asset Management' },
  ],
  scenarios: {
    'Destination upgrade': { footfall: 64, turnoverRent: 1.5, tenantRetention: 88 },
    'Cost & recovery': { opex: 480, recovery: 90 },
    'Rent reset': { baseRent: 2050, occupancy: 92 },
  },

  compute(v) {
    const rentDrag = 0.35 * Math.max(0, rel(v.baseRent, C.rentBase) * 100);
    const churnDrag = 0.15 * (85 - v.tenantRetention);
    const occ = clamp(v.occupancy - rentDrag - churnDrag, 50, 99.5) / 100;
    const leased = C.gla * occ;

    const rent = (leased * v.baseRent) / 1e6;
    const tenantSales = v.footfall * C.spendPerVisitor; // AED m
    const turnover = (tenantSales * v.turnoverRent) / 100;
    const opex = (C.gla * v.opex) / 1e6;
    const recovery = (opex * occ * v.recovery) / 100;
    const other = rent * C.otherIncomePct;
    const revenue = rent + turnover + recovery + other;

    const leasing = ((1 - v.tenantRetention / 100) * leased * C.leasingCostPerSqm) / 1e6;
    const marketing = revenue * C.marketingPct;
    const ebitda = revenue - opex - leasing - marketing - C.ga;

    const wc = (rent * 30) / 365 + (recovery * 45) / 365;
    const ocr = ((rent + turnover + recovery) / tenantSales) * 100;

    return {
      revenue,
      ebitda,
      wc,
      lines: [
        { label: 'Base rent', value: rent, kind: 'revenue' },
        { label: 'Turnover rent', value: turnover, kind: 'revenue' },
        { label: 'Service-charge recoveries', value: recovery, kind: 'revenue' },
        { label: 'Media, parking & other', value: other, kind: 'revenue' },
        { label: 'Property operating costs', value: -opex, kind: 'cost' },
        { label: 'Leasing & re-letting', value: -leasing, kind: 'cost' },
        { label: 'Marketing', value: -marketing, kind: 'cost' },
        { label: 'G&A', value: -C.ga, kind: 'cost' },
      ],
      kpis: {
        occupancy: { label: 'Effective occupancy', value: occ * 100, unit: '%' },
        tenantSales: { label: 'Tenant sales', value: tenantSales, unit: 'AED m' },
        ocr: { label: 'Tenant occupancy-cost ratio', value: ocr, unit: '%' },
        noiPerSqm: { label: 'NOI per sqm GLA', value: (ebitda * 1e6) / C.gla, unit: 'AED' },
      },
      flags: [
        ...flag(ocr > 11.5, { id: 'ocr', severity: 'high', title: 'Tenant affordability',
          detail: `Rent and service charge take ${ocr.toFixed(1)}% of tenant sales. Above ~11.5%, tenants come under strain and defaults and exits start to rise.`,
          mitigation: 'Bring footfall and tenant sales up before rent. Watch the ratio tenant by tenant.', owner: 'Asset Management' }),
        ...flag(rel(v.baseRent, C.rentBase) > 0.1, { id: 'vacancy', severity: 'medium', title: 'Vacancy at renewal',
          detail: `Base rent +${(rel(v.baseRent, C.rentBase) * 100).toFixed(0)}% lowers effective occupancy to ${(occ * 100).toFixed(1)}%.`,
          mitigation: 'Move rents at renewal by category, and protect anchors and F&B that drive footfall.', owner: 'Leasing Director' }),
        ...flag(v.opex < 440, { id: 'maintenance', severity: 'medium', title: 'Deferred maintenance',
          detail: 'Operating cost under AED 440/sqm usually means deferred maintenance, which costs asset value and future capex.',
          mitigation: 'Take savings through energy, FM contract re-tendering and smart-building controls, not lifecycle maintenance.', owner: 'Facilities' }),
        ...flag(v.footfall > 70, { id: 'footfall', severity: 'low', title: 'Footfall needs a catalyst',
          detail: 'More than 70m visits needs new anchors, events or transit links that this model does not cost in.',
          mitigation: 'Tie the footfall target to a named events and anchor programme with its own business case.', owner: 'Marketing & Events' }),
        ...flag(v.turnoverRent > 2.2, { id: 'turnover', severity: 'low', title: 'Tenant pushback on turnover rent',
          detail: 'Turnover rent above 2.2% of sales draws pushback in lease negotiations.',
          mitigation: 'Pair turnover-rent clauses with lower base rent for new-to-market brands.', owner: 'Leasing Director' }),
      ],
    };
  },

  scorecard(v, r) {
    return [
      { perspective: 'Financial', label: 'NOI margin', value: r.margin * 100, target: 72, unit: '%', better: 'higher' },
      { perspective: 'Financial', label: 'NOI per sqm', value: r.kpis.noiPerSqm.value, target: 1950, unit: 'AED', better: 'higher' },
      { perspective: 'Customer', label: 'Footfall', value: v.footfall, target: 60, unit: 'm', better: 'higher' },
      { perspective: 'Customer', label: 'Tenant occupancy-cost ratio', value: r.kpis.ocr.value, target: 10.5, unit: '%', better: 'lower' },
      { perspective: 'Internal Process', label: 'Service-charge recovery', value: v.recovery, target: 88, unit: '%', better: 'higher' },
      { perspective: 'Learning & Growth', label: 'Tenant retention', value: v.tenantRetention, target: 88, unit: '%', better: 'higher' },
    ];
  },

  missions: [
    { id: 'billion', title: 'Billion-Dirham Uplift', xp: 220, desc: 'Create AED 1bn or more of asset value.',
      test: ({ cmp }) => ({ progress: Math.max(0, Math.min(1, cmp.valueCreated / 1000)), done: cmp.valueCreated >= 1000 }) },
    { id: 'tenants', title: 'Tenant Champion', xp: 150, desc: 'Grow NOI with the occupancy-cost ratio at 10% or below.',
      test: ({ cmp, scn }) => ({ progress: cmp.dEbitda > 0 ? Math.min(1, 10 / scn.kpis.ocr.value) : 0, done: cmp.dEbitda > 0 && scn.kpis.ocr.value <= 10 }) },
    { id: 'full', title: 'Full House', xp: 120, desc: 'Reach effective occupancy of 96% or more.',
      test: ({ scn }) => ({ progress: Math.min(1, scn.kpis.occupancy.value / 96), done: scn.kpis.occupancy.value >= 96 }) },
  ],
};
