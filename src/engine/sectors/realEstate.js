import { flag, rel } from './helpers.js';

// Master developer selling off-plan residential product from a land bank.
const C = {
  unitSize: 1350, // sqft
  landPsf: 260, // allocated land cost, AED/sqft
  priceBase: 1850,
  demandElasticity: 1.1,
  commissionBase: 4,
  salesMarketingPct: 0.02,
};

export default {
  id: 'realEstate',
  name: 'Real Estate & Land',
  tagline: 'Master development, land bank & master planning',
  company: 'Dubai Holding Real Estate & Land Estates',
  scale: 'Nakheel · Meraas · Dubai Properties · model: 1,800 units a year',
  valuation: { method: 'multiple', multiple: 8 },
  wacc: 0.1,
  budget: 400,
  levers: [
    { id: 'units', label: 'Units launched & sold per year', unit: 'units', base: 1800, min: 900, max: 3000, step: 25, good: 1, costPerUnit: 0.97, rampMonths: 12, group: 'Revenue', owner: 'Sales Director',
      hint: 'Sales velocity before price and broker-channel effects.' },
    { id: 'price', label: 'Average selling price', unit: 'AED', base: 1850, min: 1400, max: 2600, step: 10, good: 1, costPerUnit: 2.5, rampMonths: 15, group: 'Revenue', owner: 'Product & Pricing',
      hint: 'AED per sqft. Demand elasticity −1.1: every 1% on price costs ~1.1% of velocity.' },
    { id: 'construction', label: 'Construction cost', unit: 'AED', base: 720, min: 560, max: 920, step: 5, good: -1, costPerUnit: 3.6, rampMonths: 18, group: 'Cost', owner: 'Delivery / PMO',
      hint: 'AED per sellable sqft. Value engineering and procurement packages.' },
    { id: 'infra', label: 'Infrastructure cost (phasing)', unit: 'AED', base: 140, min: 80, max: 200, step: 2, good: -1, costPerUnit: 4.9, rampMonths: 24, group: 'Cost', owner: 'Master Planning',
      hint: 'AED per sqft. Phasing roads and utilities to match sales, in line with the Dubai 2040 Urban Master Plan.' },
    { id: 'commission', label: 'Broker commission', unit: '%', base: 4, min: 1.5, max: 6, step: 0.1, good: -1, costPerUnit: 37, rampMonths: 12, group: 'Cost', owner: 'Sales Director',
      hint: 'Every point cut below 4% costs ~1.5% of sales velocity as brokers prioritise other launches.' },
    { id: 'overhead', label: 'G&A overhead', unit: 'AED m', base: 240, min: 160, max: 320, step: 5, good: -1, costPerUnit: 1.3, rampMonths: 12, group: 'Cost', owner: 'CFO' },
    { id: 'cycle', label: 'Construction cycle', unit: 'months', base: 30, min: 20, max: 40, step: 1, good: -1, costPerUnit: 12, rampMonths: 18, group: 'Capital', owner: 'Delivery / PMO',
      hint: 'Shorter cycles release work-in-progress cash. A working-capital lever.' },
  ],
  scenarios: {
    'Launch acceleration': { units: 2300, price: 1900 },
    'Value engineering': { construction: 670, infra: 120, cycle: 26 },
    'Market correction': { units: 1350, price: 1700 },
  },

  compute(v) {
    const priceEffect = Math.pow(v.price / C.priceBase, -C.demandElasticity);
    const brokerEffect = 1 - 0.015 * Math.max(0, C.commissionBase - v.commission);
    const unitsSold = v.units * priceEffect * brokerEffect;
    const sqft = unitsSold * C.unitSize;

    const revenue = (sqft * v.price) / 1e6;
    const cos = (sqft * (v.construction + v.infra + C.landPsf)) / 1e6;
    const commission = (revenue * v.commission) / 100;
    const sm = revenue * C.salesMarketingPct;
    const ebitda = revenue - cos - commission - sm - v.overhead;

    const buildSpend = (sqft * (v.construction + v.infra)) / 1e6;
    const wc = buildSpend * (v.cycle / 12) * 0.5; // average WIP outstanding

    const quality = Math.max(50, 92 - 0.08 * Math.max(0, 720 - v.construction) - 1.2 * Math.max(0, 28 - v.cycle));

    return {
      revenue,
      ebitda,
      wc,
      lines: [
        { label: 'Sales revenue (recognised)', value: revenue, kind: 'revenue' },
        { label: 'Construction & infrastructure', value: -((sqft * (v.construction + v.infra)) / 1e6), kind: 'cost' },
        { label: 'Allocated land cost', value: -((sqft * C.landPsf) / 1e6), kind: 'cost' },
        { label: 'Broker commission', value: -commission, kind: 'cost' },
        { label: 'Sales & marketing', value: -sm, kind: 'cost' },
        { label: 'G&A overhead', value: -v.overhead, kind: 'cost' },
      ],
      kpis: {
        unitsSold: { label: 'Units sold (net of price effects)', value: unitsSold, unit: 'units' },
        grossMargin: { label: 'Development gross margin', value: ((revenue - cos) / revenue) * 100, unit: '%' },
        quality: { label: 'Handover quality index', value: quality, unit: 'pts' },
        inHouse: { label: 'In-house sales share', value: Math.min(90, ((6 - v.commission) / 4.5) * 100), unit: '%' },
      },
      flags: [
        ...flag(rel(v.price, C.priceBase) > 0.1, { id: 'absorption', severity: 'medium', title: 'Absorption risk on pricing',
          detail: `Price +${(rel(v.price, C.priceBase) * 100).toFixed(0)}% cuts velocity to ${Math.round(unitsSold).toLocaleString()} units a year, with a large off-plan pipeline competing for the same buyers.`,
          mitigation: 'Release in smaller phases and test price on the first tranche before setting the master price list.', owner: 'Product & Pricing' }),
        ...flag(v.construction < 640, { id: 'spec', severity: 'high', title: 'Specification and handover quality',
          detail: 'Construction cost below AED 640/sqft usually means spec downgrades, more snagging and brand damage at handover.',
          mitigation: 'Keep value engineering to the structure and MEP, protect buyer-visible finishes, and audit snagging rates.', owner: 'Delivery / PMO' }),
        ...flag(v.cycle < 24, { id: 'contractor', severity: 'medium', title: 'Contractor capacity',
          detail: 'Cycles under 24 months need contractor capacity and long-lead procurement that the market may not have.',
          mitigation: 'Lock framework agreements for long-lead items and use a stage-gated PMO schedule.', owner: 'Delivery / PMO' }),
        ...flag(v.commission < 2.5, { id: 'broker', severity: 'medium', title: 'Broker channel disengagement',
          detail: 'Commission under 2.5% moves broker attention to competing launches. Velocity falls unless in-house sales can carry it.',
          mitigation: 'Build the in-house and digital sales channel before cutting commission, and keep tiered incentives for top brokers.', owner: 'Sales Director' }),
        ...flag(v.units > 2600, { id: 'supply', severity: 'low', title: 'Oversupply in the pipeline',
          detail: 'More than 2,600 launches a year concentrates exposure to one market cycle.',
          mitigation: 'Spread launches across communities and product types, and gate each launch on sell-through.', owner: 'Strategy' }),
      ],
    };
  },

  scorecard(v, r) {
    return [
      { perspective: 'Financial', label: 'EBITDA margin', value: r.margin * 100, target: 29.5, unit: '%', better: 'higher' },
      { perspective: 'Financial', label: 'Development gross margin', value: r.kpis.grossMargin.value, target: 40, unit: '%', better: 'higher' },
      { perspective: 'Customer', label: 'Units sold', value: r.kpis.unitsSold.value, target: 1850, unit: 'units', better: 'higher' },
      { perspective: 'Customer', label: 'Handover quality index', value: r.kpis.quality.value, target: 88, unit: 'pts', better: 'higher' },
      { perspective: 'Internal Process', label: 'Construction cycle', value: v.cycle, target: 27, unit: 'months', better: 'lower' },
      { perspective: 'Learning & Growth', label: 'In-house sales share', value: r.kpis.inHouse.value, target: 50, unit: '%', better: 'higher' },
    ];
  },

  missions: [
    { id: 'cash', title: 'Cash Unlock', xp: 180, desc: 'Release AED 300m or more of work-in-progress cash.',
      test: ({ cmp }) => ({ progress: Math.max(0, Math.min(1, cmp.cashRelease / 300)), done: cmp.cashRelease >= 300 }) },
    { id: 'margin', title: 'Thirty Club', xp: 150, desc: 'Reach a 30% EBITDA margin while selling at least 1,800 units.',
      test: ({ scn }) => ({ progress: Math.min(1, scn.margin / 0.3), done: scn.margin >= 0.3 && scn.kpis.unitsSold.value >= 1800 }) },
    { id: 'quality', title: 'Built to Last', xp: 120, desc: 'Add AED 150m of EBITDA with the handover quality index at 88 or above.',
      test: ({ cmp, scn }) => ({ progress: Math.max(0, Math.min(1, cmp.dEbitda / 150)), done: cmp.dEbitda >= 150 && scn.kpis.quality.value >= 88 }) },
  ],
};
