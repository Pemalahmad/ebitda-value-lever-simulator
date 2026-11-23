import { flag, rel } from './helpers.js';

// Integrated facilities management: a contract book of work hours delivered by
// technicians or subcontractors. Billable utilisation is the dominant lever.
const C = {
  technicians: 6500,
  paidHours: 2300,
  wage: 38, // fully loaded AED per paid hour
  subCostRatio: 0.86,
  materialsPct: 0.18,
  overheadPct: 0.09,
  newWins: 0.12,
  billBase: 95,
  baseDemandHours: (6500 * 2300 * 0.68) / 0.72, // ~14.1m hours a year
};

export default {
  id: 'urbanServices',
  name: 'Integrated Urban Services',
  tagline: 'Facilities management, security & technical services',
  company: 'Integrated Urban Services',
  scale: 'FM, security & technical services · model: 6,500 technicians',
  valuation: { method: 'multiple', multiple: 8 },
  wacc: 0.095,
  budget: 120,
  levers: [
    { id: 'utilisation', label: 'Technician billable utilisation', unit: '%', base: 68, min: 50, max: 92, step: 0.5, good: 1, costPerUnit: 9.5, rampMonths: 9, group: 'Revenue', owner: 'Operations',
      hint: 'Billable share of paid technician hours. Higher utilisation needs fewer paid hours for the same work. Above 85%, SLA penalties rise.' },
    { id: 'billRate', label: 'Blended bill rate', unit: 'AED', base: 95, min: 75, max: 130, step: 1, good: 1, costPerUnit: 9.1, rampMonths: 18, group: 'Revenue', owner: 'Commercial',
      hint: 'AED per billable hour. Above today, contracts are lost at rebid (−0.6% volume per 1%).' },
    { id: 'retention', label: 'Contract retention', unit: '%', base: 88, min: 70, max: 98, step: 0.5, good: 1, costPerUnit: 2, rampMonths: 12, group: 'Revenue', owner: 'Client Relations' },
    { id: 'subShare', label: 'Subcontracted share of work', unit: '%', base: 28, min: 10, max: 45, step: 0.5, good: -1, costPerUnit: 1.8, rampMonths: 12, group: 'Cost', owner: 'Operations',
      hint: 'Make vs. buy. Subcontracted work earns a 14% margin; self-delivered work earns more if utilisation holds.' },
    { id: 'sla', label: 'SLA penalties', unit: '%', base: 2.5, min: 0.5, max: 6, step: 0.1, good: -1, costPerUnit: 17, rampMonths: 12, group: 'Cost', owner: 'Quality & HSE',
      hint: 'Penalties as % of revenue. Reduced through predictive maintenance on the CAFM platform.' },
    { id: 'leadDays', label: 'Procurement lead time', unit: 'days', base: 45, min: 15, max: 75, step: 1, good: -1, costPerUnit: 0.5, rampMonths: 9, group: 'Capital', owner: 'Procurement',
      hint: 'Drives spares inventory and SLA misses: every day over 30 adds 0.02pp of penalties.' },
    { id: 'dso', label: 'Days sales outstanding', unit: 'days', base: 95, min: 45, max: 140, step: 1, good: -1, costPerUnit: 0.4, rampMonths: 6, group: 'Capital', owner: 'Finance' },
  ],
  scenarios: {
    'Utilisation drive': { utilisation: 76, leadDays: 35 },
    'Insource & digitise': { subShare: 20, sla: 1.6 },
    'Cash sprint': { dso: 70, leadDays: 30 },
  },

  compute(v) {
    const rebidLoss = 1 - 0.6 * Math.max(0, rel(v.billRate, C.billBase));
    const volume = (C.newWins + v.retention / 100) * rebidLoss;
    // Total work demanded (hours) is set by the contract book; the make-vs-buy
    // lever splits it between technicians and subcontractors.
    const demandHours = C.baseDemandHours * volume;
    const s = v.subShare / 100;
    const inHours = demandHours * (1 - s);
    const paid = inHours / (v.utilisation / 100); // paid technician hours needed

    const inRev = (inHours * v.billRate) / 1e6;
    const subRev = (demandHours * s * v.billRate) / 1e6;
    const revenue = inRev + subRev;

    const penaltyPct = v.sla + 0.25 * Math.max(0, v.utilisation - 85) + 0.02 * Math.max(0, v.leadDays - 30);
    const labour = (paid * C.wage) / 1e6;
    const subCost = subRev * C.subCostRatio;
    const materials = inRev * C.materialsPct;
    const penalties = (revenue * penaltyPct) / 100;
    const overhead = revenue * C.overheadPct;
    const ebitda = revenue - labour - subCost - materials - penalties - overhead;

    const wc = (revenue * v.dso) / 365 + (materials * (v.leadDays + 15)) / 365;

    return {
      revenue,
      ebitda,
      wc,
      lines: [
        { label: 'Self-delivered services', value: inRev, kind: 'revenue' },
        { label: 'Subcontracted services', value: subRev, kind: 'revenue' },
        { label: 'Technician labour', value: -labour, kind: 'cost' },
        { label: 'Subcontractor cost', value: -subCost, kind: 'cost' },
        { label: 'Materials & spares', value: -materials, kind: 'cost' },
        { label: 'SLA penalties', value: -penalties, kind: 'cost' },
        { label: 'Overhead', value: -overhead, kind: 'cost' },
      ],
      kpis: {
        slaCompliance: { label: 'SLA compliance', value: Math.max(70, 100 - penaltyPct * 2), unit: '%' },
        inHouse: { label: 'Self-delivered share', value: 100 - v.subShare, unit: '%' },
        receivables: { label: 'Receivables', value: (revenue * v.dso) / 365, unit: 'AED m' },
        penaltyPct: { label: 'Penalty rate', value: penaltyPct, unit: '%' },
      },
      flags: [
        ...flag(v.utilisation > 85, { id: 'burnout', severity: 'high', title: 'Technician burnout and SLA misses',
          detail: `Utilisation at ${v.utilisation}% leaves no slack for reactive jobs. Penalties climb and attrition follows.`,
          mitigation: 'Cap planned utilisation at about 82%, and keep a flexible subcontractor bench for peaks.', owner: 'Operations' }),
        ...flag(rel(v.billRate, C.billBase) > 0.08, { id: 'rebid', severity: 'medium', title: 'Losses at rebid',
          detail: 'Bill rates more than 8% above today lose price-led government and master-community tenders.',
          mitigation: 'Move to outcome-based pricing on renewals instead of raising the hourly rate.', owner: 'Commercial' }),
        ...flag(v.subShare < 15, { id: 'flex', severity: 'medium', title: 'Loss of peak flexibility',
          detail: 'Insourcing below 15% subcontracting removes surge capacity for summer HVAC peaks and specialist trades.',
          mitigation: 'Keep framework subcontractors for specialist and seasonal work.', owner: 'Operations' }),
        ...flag(v.dso < 60, { id: 'dso', severity: 'low', title: 'Client payment cycles',
          detail: 'DSO under 60 days is ambitious against government and related-party payment cycles.',
          mitigation: 'Agree milestone billing and e-invoicing with the largest clients first.', owner: 'Finance' }),
        ...flag(v.leadDays < 25, { id: 'singleSource', severity: 'medium', title: 'Supply resilience',
          detail: 'Lead times under 25 days need vendor-managed inventory, which concentrates supply on a few vendors.',
          mitigation: 'Dual-source critical spares and hold safety stock for life-safety systems.', owner: 'Procurement' }),
      ],
    };
  },

  scorecard(v, r) {
    return [
      { perspective: 'Financial', label: 'EBITDA margin', value: r.margin * 100, target: 10, unit: '%', better: 'higher' },
      { perspective: 'Financial', label: 'Days sales outstanding', value: v.dso, target: 85, unit: 'days', better: 'lower' },
      { perspective: 'Customer', label: 'SLA compliance', value: r.kpis.slaCompliance.value, target: 96, unit: '%', better: 'higher' },
      { perspective: 'Customer', label: 'Contract retention', value: v.retention, target: 90, unit: '%', better: 'higher' },
      { perspective: 'Internal Process', label: 'Billable utilisation', value: v.utilisation, target: 72, unit: '%', better: 'higher' },
      { perspective: 'Learning & Growth', label: 'Self-delivered share', value: r.kpis.inHouse.value, target: 75, unit: '%', better: 'higher' },
    ];
  },

  missions: [
    { id: 'double', title: 'Double Digits', xp: 150, desc: 'Reach a 12% EBITDA margin with SLA compliance at 95% or above.',
      test: ({ scn }) => ({ progress: Math.min(1, scn.margin / 0.12), done: scn.margin >= 0.12 && scn.kpis.slaCompliance.value >= 95 }) },
    { id: 'cash', title: 'Cash Conversion', xp: 150, desc: 'Release AED 80m or more of working capital.',
      test: ({ cmp }) => ({ progress: Math.max(0, Math.min(1, cmp.cashRelease / 80)), done: cmp.cashRelease >= 80 }) },
    { id: 'makebuy', title: 'Make vs. Buy', xp: 120, desc: 'Cut subcontracting to 20% or less with payback under 18 months.',
      test: ({ levers, cmp }) => ({ progress: Math.min(1, (28 - levers.subShare) / 8), done: levers.subShare <= 20 && cmp.paybackMonths <= 18 }) },
  ],
};
