import { clamp, flag, rel } from './helpers.js';

// Luxury hotel & resort portfolio with an F&B arm. USALI-style P&L, simplified.
const C = {
  rooms: 2400,
  adrBase: 1150,
  priceElasticity: 0.6, // realised occupancy falls 0.6% per 1% ADR increase
  otherRevPct: 0.07, // spa, parking, leases, as % of rooms + F&B
  undistributedFixed: 180, // AED m: S&M, A&G, property ops, IT
  undistributedVar: 0.08,
};

export default {
  id: 'hospitality',
  name: 'Hospitality',
  tagline: 'Luxury hotels, resorts, residences & F&B',
  company: 'Dubai Holding Hospitality · Jumeirah',
  scale: `model: a ${C.rooms.toLocaleString()}-key slice of the 36 owned hotels`,
  valuation: { method: 'multiple', multiple: 14 },
  wacc: 0.095,
  budget: 150,
  levers: [
    { id: 'occupancy', label: 'Occupancy (at base rate)', unit: '%', base: 74, min: 55, max: 92, step: 0.5, good: 1, costPerUnit: 12, rampMonths: 9, group: 'Revenue', owner: 'Commercial Director',
      hint: 'Demand-side occupancy before price effects. Realised occupancy also responds to ADR.' },
    { id: 'adr', label: 'Average daily rate', unit: 'AED', base: 1150, min: 850, max: 1600, step: 10, good: 1, costPerUnit: 0.45, rampMonths: 12, group: 'Revenue', owner: 'Revenue Management',
      hint: 'Price elasticity −0.6: every 1% on ADR costs ~0.6% of realised occupancy.' },
    { id: 'fnbSpend', label: 'F&B spend per occupied room', unit: 'AED', base: 380, min: 220, max: 600, step: 5, good: 1, costPerUnit: 0.26, rampMonths: 8, group: 'Revenue', owner: 'F&B Director' },
    { id: 'distribution', label: 'Distribution cost (OTA mix)', unit: '%', base: 14, min: 6, max: 22, step: 0.5, good: -1, costPerUnit: 12, rampMonths: 12, group: 'Cost', owner: 'Digital & CRM',
      hint: 'Commission as % of rooms revenue. Hospitality’s acquisition cost (CAC).' },
    { id: 'labourPOR', label: 'Rooms labour per occupied room', unit: 'AED', base: 165, min: 100, max: 240, step: 1, good: -1, costPerUnit: 0.97, rampMonths: 10, group: 'Cost', owner: 'Operations' },
    { id: 'fnbCostRatio', label: 'F&B cost ratio', unit: '%', base: 66, min: 52, max: 80, step: 0.5, good: -1, costPerUnit: 2.5, rampMonths: 6, group: 'Cost', owner: 'F&B Director',
      hint: 'Food, beverage and F&B labour as % of F&B revenue (COGS).' },
    { id: 'energy', label: 'Energy per available room-night', unit: 'AED', base: 55, min: 30, max: 80, step: 1, good: -1, costPerUnit: 2.2, rampMonths: 18, group: 'Cost', owner: 'Engineering' },
  ],
  scenarios: {
    'Peak season push': { occupancy: 82, adr: 1240, fnbSpend: 410 },
    'Margin discipline': { labourPOR: 150, fnbCostRatio: 61, energy: 46, distribution: 11 },
    'Softer market': { occupancy: 66, adr: 1080, fnbSpend: 350 },
  },

  compute(v) {
    const priceFactor = Math.pow(v.adr / C.adrBase, -C.priceElasticity);
    const occ = clamp((v.occupancy / 100) * priceFactor, 0.2, 0.95);
    const available = C.rooms * 365;
    const roomNights = available * occ;

    const roomsRev = (roomNights * v.adr) / 1e6;
    const fnbRev = (roomNights * v.fnbSpend) / 1e6;
    const otherRev = C.otherRevPct * (roomsRev + fnbRev);
    const revenue = roomsRev + fnbRev + otherRev;

    const roomsLabour = (roomNights * v.labourPOR) / 1e6;
    const distribution = (roomsRev * v.distribution) / 100;
    const fnbCost = (fnbRev * v.fnbCostRatio) / 100;
    const energy = (available * v.energy) / 1e6;
    const undistributed = C.undistributedFixed + C.undistributedVar * revenue;
    const costs = roomsLabour + distribution + fnbCost + energy + undistributed;
    const ebitda = revenue - costs;

    const wc = (revenue * 25) / 365 + fnbRev * 0.04; // guest ledger + F&B stock

    const revpar = (roomsRev * 1e6) / available;
    const guestIndex = clamp(90 + 0.08 * (v.labourPOR - 165) - 40 * Math.max(0, occ - 0.86) - 0.12 * Math.max(0, 66 - v.fnbCostRatio) * 2, 50, 99);

    return {
      revenue,
      ebitda,
      wc,
      lines: [
        { label: 'Rooms revenue', value: roomsRev, kind: 'revenue' },
        { label: 'F&B revenue', value: fnbRev, kind: 'revenue' },
        { label: 'Other operated revenue', value: otherRev, kind: 'revenue' },
        { label: 'Rooms labour', value: -roomsLabour, kind: 'cost' },
        { label: 'Distribution & commissions', value: -distribution, kind: 'cost' },
        { label: 'F&B cost of sales', value: -fnbCost, kind: 'cost' },
        { label: 'Energy & utilities', value: -energy, kind: 'cost' },
        { label: 'Undistributed operating expenses', value: -undistributed, kind: 'cost' },
      ],
      kpis: {
        occupancy: { label: 'Realised occupancy', value: occ * 100, unit: '%' },
        revpar: { label: 'RevPAR', value: revpar, unit: 'AED' },
        guestIndex: { label: 'Guest satisfaction index', value: guestIndex, unit: 'pts' },
        directShare: { label: 'Direct booking share', value: clamp(100 - v.distribution * 4, 5, 95), unit: '%' },
      },
      flags: [
        ...flag(v.labourPOR < 135, { id: 'service', severity: 'high', title: 'Service standards at risk',
          detail: 'Rooms labour below AED 135 per occupied room is under luxury brand standards. Guest satisfaction and repeat stays will erode.',
          mitigation: 'Take labour savings through scheduling and housekeeping tech, not headcount at the front of house. Track guest scores weekly.', owner: 'Operations' }),
        ...flag(rel(v.adr, C.adrBase) > 0.12, { id: 'rate', severity: 'medium', title: 'Rate push erodes occupancy',
          detail: `ADR +${(rel(v.adr, C.adrBase) * 100).toFixed(0)}% cuts realised occupancy to ${(occ * 100).toFixed(1)}% through price elasticity.`,
          mitigation: 'Phase rate increases by segment and season, and pair them with product upgrades so the rate premium holds.', owner: 'Revenue Management' }),
        ...flag(v.fnbCostRatio < 58, { id: 'fnb', severity: 'medium', title: 'F&B quality risk',
          detail: 'An F&B cost ratio under 58% usually means portion or ingredient cuts, which put an award-winning portfolio at reputational risk.',
          mitigation: 'Take the savings through menu engineering and procurement consolidation, not recipe specification.', owner: 'F&B Director' }),
        ...flag(occ > 0.88, { id: 'strain', severity: 'low', title: 'Operating strain at high occupancy',
          detail: 'Realised occupancy above 88% leaves little room for maintenance and suggests rate is being left on the table.',
          mitigation: 'Use the demand to test rate, and protect maintenance windows.', owner: 'Revenue Management' }),
        ...flag(v.distribution < 9, { id: 'ota', severity: 'medium', title: 'Aggressive direct-channel shift',
          detail: 'Dropping OTA commissions below 9% risks losing visibility in feeder markets.',
          mitigation: 'Fund the CRM and loyalty programme first, and step OTA allocation down market by market.', owner: 'Digital & CRM' }),
      ],
    };
  },

  scorecard(v, r) {
    return [
      { perspective: 'Financial', label: 'EBITDA margin', value: r.margin * 100, target: 36, unit: '%', better: 'higher' },
      { perspective: 'Financial', label: 'RevPAR', value: r.kpis.revpar.value, target: 880, unit: 'AED', better: 'higher' },
      { perspective: 'Customer', label: 'Guest satisfaction index', value: r.kpis.guestIndex.value, target: 88, unit: 'pts', better: 'higher' },
      { perspective: 'Internal Process', label: 'F&B cost ratio', value: v.fnbCostRatio, target: 63, unit: '%', better: 'lower' },
      { perspective: 'Internal Process', label: 'Energy per room-night', value: v.energy, target: 50, unit: 'AED', better: 'lower' },
      { perspective: 'Learning & Growth', label: 'Direct booking share', value: r.kpis.directShare.value, target: 50, unit: '%', better: 'higher' },
    ];
  },

  missions: [
    { id: 'revpar', title: 'RevPAR Royale', xp: 150, desc: 'Lift RevPAR to AED 900 or more while realised occupancy stays at 70% or above.',
      test: ({ scn }) => ({ progress: Math.min(1, scn.kpis.revpar.value / 900), done: scn.kpis.revpar.value >= 900 && scn.kpis.occupancy.value >= 70 }) },
    { id: 'margin', title: 'Margin Architect', xp: 200, desc: 'Reach a 38% EBITDA margin with no high-severity risk.',
      test: ({ scn }) => ({ progress: Math.min(1, scn.margin / 0.38), done: scn.margin >= 0.38 && !scn.flags.some((f) => f.severity === 'high') }) },
    { id: 'direct', title: 'Direct Line', xp: 120, desc: 'Cut distribution cost to 10% or less with payback under 24 months.',
      test: ({ levers, cmp }) => ({ progress: Math.min(1, (14 - levers.distribution) / 4), done: levers.distribution <= 10 && cmp.paybackMonths < 24 }) },
  ],
};
