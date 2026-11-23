import { clamp, flag, rel } from './helpers.js';

// Theme parks & attractions. Visitors come from paid acquisition (marketing / CAC)
// and from retained annual-pass holders, capped by park capacity.
const C = {
  baseMarketing: 120,
  passPool: 400000,
  visitsPerPass: 6,
  passPrice: 750,
  capacity: 8.0e6,
  yieldBase: 210,
  priceElasticity: 0.8,
  marketingSaturation: 0.5, // diminishing returns on spend
  secondaryCogs: 0.35,
  fixedOps: 420,
  gaPct: 0.06,
};

export default {
  id: 'leisure',
  name: 'Leisure & Entertainment',
  tagline: 'Parks, attractions, live venues & media',
  company: 'Dubai Holding Entertainment',
  scale: 'Global Village · Dubai Parks and Resorts · model: 8.0m visitor capacity',
  valuation: { method: 'multiple', multiple: 11 },
  wacc: 0.1,
  budget: 160,
  levers: [
    { id: 'marketing', label: 'Marketing spend', unit: 'AED m', base: 120, min: 60, max: 220, step: 2, good: 1, costPerUnit: 0, rampMonths: 3, group: 'Revenue', owner: 'CMO',
      hint: 'Paid acquisition. Diminishing returns (elasticity 0.5); the spend runs through opex.' },
    { id: 'cac', label: 'Customer acquisition cost', unit: 'AED', base: 28, min: 15, max: 45, step: 0.5, good: -1, costPerUnit: 44, rampMonths: 9, group: 'Revenue', owner: 'CMO',
      hint: 'Marketing AED per new visitor. Lowered through attribution, CRM and partnerships.' },
    { id: 'retention', label: 'Annual-pass retention', unit: '%', base: 58, min: 35, max: 82, step: 0.5, good: 1, costPerUnit: 4.5, rampMonths: 12, group: 'Revenue', owner: 'Guest Experience' },
    { id: 'ticketYield', label: 'Ticket yield', unit: 'AED', base: 210, min: 150, max: 300, step: 2, good: 1, costPerUnit: 0.65, rampMonths: 6, group: 'Revenue', owner: 'Revenue Management',
      hint: 'Net revenue per paid visit. Price elasticity −0.8 on new visitors.' },
    { id: 'perCap', label: 'Secondary spend per visitor', unit: 'AED', base: 95, min: 60, max: 150, step: 1, good: 1, costPerUnit: 4.2, rampMonths: 8, group: 'Revenue', owner: 'Retail & F&B' },
    { id: 'staffPerVisitor', label: 'Staff cost per visitor', unit: 'AED', base: 48, min: 30, max: 65, step: 0.5, good: -1, costPerUnit: 8.5, rampMonths: 10, group: 'Cost', owner: 'Park Operations' },
  ],
  scenarios: {
    'Summer campaign': { marketing: 150, perCap: 105 },
    'Loyalty engine': { retention: 68, cac: 24 },
    'Tourism slowdown': { marketing: 100, ticketYield: 195, retention: 52 },
  },

  compute(v) {
    const newDemand = ((C.baseMarketing * 1e6) / v.cac) * Math.pow(v.marketing / C.baseMarketing, C.marketingSaturation) * Math.pow(v.ticketYield / C.yieldBase, -C.priceElasticity);
    const holders = C.passPool * (v.retention / 100);
    const passVisits = holders * C.visitsPerPass;
    const demand = newDemand + passVisits;
    const visitors = Math.min(demand, C.capacity);
    const ratio = visitors / demand;
    const utilisation = visitors / C.capacity;

    const ticketRev = (newDemand * ratio * v.ticketYield) / 1e6;
    const passRev = (holders * C.passPrice) / 1e6;
    const secondaryRev = (visitors * v.perCap) / 1e6;
    const revenue = ticketRev + passRev + secondaryRev;

    const cogs = secondaryRev * C.secondaryCogs;
    const staff = (visitors * v.staffPerVisitor) / 1e6;
    const ga = revenue * C.gaPct;
    const ebitda = revenue - cogs - staff - v.marketing - C.fixedOps - ga;

    const wc = secondaryRev * 0.05 - passRev * 0.45; // stock less deferred pass revenue

    const guestIndex = clamp(88 - 120 * Math.max(0, utilisation - 0.8) - 0.6 * Math.max(0, 48 - v.staffPerVisitor) + 0.1 * (v.retention - 58), 50, 99);

    return {
      revenue,
      ebitda,
      wc,
      lines: [
        { label: 'Ticket revenue', value: ticketRev, kind: 'revenue' },
        { label: 'Annual-pass revenue', value: passRev, kind: 'revenue' },
        { label: 'Secondary spend (F&B, retail)', value: secondaryRev, kind: 'revenue' },
        { label: 'Cost of secondary sales', value: -cogs, kind: 'cost' },
        { label: 'Park staff', value: -staff, kind: 'cost' },
        { label: 'Marketing', value: -v.marketing, kind: 'cost' },
        { label: 'Fixed park operations', value: -C.fixedOps, kind: 'cost' },
        { label: 'G&A', value: -ga, kind: 'cost' },
      ],
      kpis: {
        visitors: { label: 'Visitors', value: visitors / 1e6, unit: 'm' },
        utilisation: { label: 'Capacity utilisation', value: utilisation * 100, unit: '%' },
        revPerVisitor: { label: 'Revenue per visitor', value: (revenue * 1e6) / visitors, unit: 'AED' },
        guestIndex: { label: 'Guest experience index', value: guestIndex, unit: 'pts' },
        lostDemand: { label: 'Demand turned away', value: (demand - visitors) / 1e6, unit: 'm' },
      },
      flags: [
        ...flag(utilisation > 0.88, { id: 'queues', severity: 'high', title: 'Queue times and guest experience',
          detail: `Utilisation of ${(utilisation * 100).toFixed(0)}% means long queues on peak days, which hurts reviews and pass renewals.`,
          mitigation: 'Use dynamic pricing on peak days and timed-entry slots, and add capacity before adding marketing.', owner: 'Park Operations' }),
        ...flag(v.staffPerVisitor < 38, { id: 'safety', severity: 'high', title: 'Ride safety and operations coverage',
          detail: 'Staff cost under AED 38 per visitor puts attraction staffing ratios and safety coverage at risk.',
          mitigation: 'Take savings in back-of-house and through scheduling. Ride and safety staffing ratios stay fixed.', owner: 'Park Operations' }),
        ...flag(rel(v.ticketYield, C.yieldBase) > 0.15, { id: 'price', severity: 'medium', title: 'Price-sensitive demand',
          detail: 'A ticket yield more than 15% above today pushes price-sensitive resident and regional families to competing attractions.',
          mitigation: 'Raise yield through bundles, fast-pass and peak pricing rather than the gate price.', owner: 'Revenue Management' }),
        ...flag(v.marketing < 95, { id: 'brand', severity: 'medium', title: 'Brand awareness decay',
          detail: 'Marketing cuts show up in next year’s visitors, not this year’s P&L.',
          mitigation: 'Protect always-on brand spend and cut only the bottom quartile of campaigns by ROI.', owner: 'CMO' }),
        ...flag(v.cac < 20, { id: 'attribution', severity: 'low', title: 'Attribution optimism',
          detail: 'A CAC under AED 20 is well below the regional benchmark. Check it with holdout tests before budgeting on it.',
          mitigation: 'Run geo holdout tests and media-mix modelling before locking the plan.', owner: 'CMO' }),
      ],
    };
  },

  scorecard(v, r) {
    return [
      { perspective: 'Financial', label: 'EBITDA margin', value: r.margin * 100, target: 33, unit: '%', better: 'higher' },
      { perspective: 'Financial', label: 'Revenue per visitor', value: r.kpis.revPerVisitor.value, target: 295, unit: 'AED', better: 'higher' },
      { perspective: 'Customer', label: 'Guest experience index', value: r.kpis.guestIndex.value, target: 85, unit: 'pts', better: 'higher' },
      { perspective: 'Customer', label: 'Annual-pass retention', value: v.retention, target: 65, unit: '%', better: 'higher' },
      { perspective: 'Internal Process', label: 'Capacity utilisation', value: r.kpis.utilisation.value, target: 74, unit: '%', better: 'higher' },
      { perspective: 'Learning & Growth', label: 'Customer acquisition cost', value: v.cac, target: 25, unit: 'AED', better: 'lower' },
    ];
  },

  missions: [
    { id: 'loyal', title: 'Loyalty Loop', xp: 150, desc: 'Get pass retention to 70% and CAC to AED 24 or less.',
      test: ({ levers }) => ({ progress: Math.min(1, ((levers.retention - 58) / 12 + (28 - levers.cac) / 4) / 2), done: levers.retention >= 70 && levers.cac <= 24 }) },
    { id: 'percap', title: 'Spend per Head', xp: 120, desc: 'Lift revenue per visitor to AED 320 or more.',
      test: ({ scn }) => ({ progress: Math.min(1, scn.kpis.revPerVisitor.value / 320), done: scn.kpis.revPerVisitor.value >= 320 }) },
    { id: 'nopeak', title: 'Full but Fun', xp: 200, desc: 'Run above 80% utilisation with the guest experience index at 85 or above.',
      test: ({ scn }) => ({ progress: Math.min(1, scn.kpis.utilisation.value / 80), done: scn.kpis.utilisation.value >= 80 && scn.kpis.guestIndex.value >= 85 }) },
  ],
};
