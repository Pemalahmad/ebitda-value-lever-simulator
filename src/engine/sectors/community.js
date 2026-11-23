import { clamp, flag, rel } from './helpers.js';

// Community management company: earns management fees per unit from owners'
// associations, plus amenity and community-commercial income.
const C = {
  units: 85000,
  newWins: 0.1, // new contracts won each year, as share of the base
  overhead: 22,
  feeBase: 1450,
};

export default {
  id: 'community',
  name: 'Community Management',
  tagline: 'Sustainable, vibrant communities & districts',
  company: 'Dubai Holding Community Management',
  scale: 'Nakheel · Meraas · Dubai Properties communities · model: 85,000 units',
  valuation: { method: 'multiple', multiple: 10 },
  wacc: 0.09,
  budget: 30,
  levers: [
    { id: 'fee', label: 'Management fee per unit', unit: 'AED', base: 1450, min: 1100, max: 2000, step: 10, good: 1, costPerUnit: 0.066, rampMonths: 12, group: 'Revenue', owner: 'Commercial',
      hint: 'Fee increases need owners’ association approval under the RERA service-charge framework. Churn rises above +5%.' },
    { id: 'collection', label: 'Collection rate', unit: '%', base: 88, min: 70, max: 98, step: 0.5, good: 1, costPerUnit: 1.2, rampMonths: 6, group: 'Revenue', owner: 'Finance',
      hint: 'Also a working-capital lever: arrears tie up cash.' },
    { id: 'amenity', label: 'Amenity & community income per unit', unit: 'AED', base: 600, min: 200, max: 1400, step: 10, good: 1, costPerUnit: 0.13, rampMonths: 12, group: 'Revenue', owner: 'Community Commercial' },
    { id: 'retention', label: 'Contract retention', unit: '%', base: 90, min: 72, max: 99, step: 0.5, good: 1, costPerUnit: 0.88, rampMonths: 12, group: 'Revenue', owner: 'Client Relations' },
    { id: 'costPerUnit', label: 'Service cost per unit', unit: 'AED', base: 1050, min: 750, max: 1300, step: 5, good: -1, costPerUnit: 0.11, rampMonths: 9, group: 'Cost', owner: 'Operations' },
    { id: 'procurement', label: 'Procurement savings', unit: '%', base: 0, min: 0, max: 15, step: 0.5, good: 1, costPerUnit: 1.1, rampMonths: 9, group: 'Cost', owner: 'Procurement',
      hint: 'Group-wide vendor consolidation applied to service costs.' },
    { id: 'digital', label: 'Resident self-service adoption', unit: '%', base: 35, min: 10, max: 85, step: 1, good: 1, costPerUnit: 0.36, rampMonths: 12, group: 'Cost', owner: 'Technology Transformation',
      hint: 'App and portal adoption. Each point saves ~0.2% of service cost.' },
  ],
  scenarios: {
    'Digital community': { digital: 65, collection: 93 },
    'Procurement wave': { procurement: 8, costPerUnit: 1010 },
    'Fee pressure': { fee: 1400, retention: 87 },
  },

  compute(v) {
    const feeChurn = 1 - 0.3 * Math.max(0, rel(v.fee, C.feeBase) - 0.05);
    const unitsEff = C.units * (C.newWins + v.retention / 100) * feeChurn;
    const digitalSaving = 0.002 * (v.digital - 35);
    const costEff = v.costPerUnit * (1 - v.procurement / 100) * (1 - digitalSaving);

    const feeRev = (unitsEff * v.fee * (v.collection / 100)) / 1e6;
    const amenityRev = (unitsEff * v.amenity) / 1e6;
    const revenue = feeRev + amenityRev;
    const service = (unitsEff * costEff) / 1e6;
    const ebitda = revenue - service - C.overhead;

    const arrears = (unitsEff * v.fee * (1 - v.collection / 100)) / 1e6;
    const wc = arrears + (revenue * 45) / 365;

    const satisfaction = clamp(80 + 0.03 * (v.costPerUnit - 1050) + 0.12 * (v.digital - 35) - 0.5 * Math.max(0, rel(v.fee, C.feeBase) * 100), 40, 99);

    return {
      revenue,
      ebitda,
      wc,
      lines: [
        { label: 'Management fees (collected)', value: feeRev, kind: 'revenue' },
        { label: 'Amenity & community income', value: amenityRev, kind: 'revenue' },
        { label: 'Service delivery cost', value: -service, kind: 'cost' },
        { label: 'Overhead', value: -C.overhead, kind: 'cost' },
      ],
      kpis: {
        units: { label: 'Units under management', value: unitsEff, unit: 'units' },
        satisfaction: { label: 'Resident satisfaction index', value: satisfaction, unit: 'pts' },
        arrears: { label: 'Fee arrears', value: arrears, unit: 'AED m' },
      },
      flags: [
        ...flag(rel(v.fee, C.feeBase) > 0.08, { id: 'rera', severity: 'high', title: 'Regulatory and owner approval',
          detail: 'Fee increases above ~8% need owners’ association approval under RERA’s service-charge framework, and they invite tenders from rival managers.',
          mitigation: 'Benchmark against the RERA service-charge index and show owners the service-level gains before asking.', owner: 'Commercial' }),
        ...flag(v.costPerUnit < 900, { id: 'service', severity: 'medium', title: 'Service levels and complaints',
          detail: 'Service cost under AED 900 a unit usually means slower response times and more complaints.',
          mitigation: 'Reduce cost through route optimisation and self-service, and publish SLA dashboards to owners.', owner: 'Operations' }),
        ...flag(v.procurement > 10, { id: 'vendor', severity: 'medium', title: 'Vendor concentration',
          detail: 'Savings above 10% usually depend on single-sourcing, which adds supplier and quality risk.',
          mitigation: 'Use dual-source frameworks with performance clauses, and keep a reserve vendor for each category.', owner: 'Procurement' }),
        ...flag(v.digital > 70, { id: 'adoption', severity: 'low', title: 'Change-management load',
          detail: 'Self-service adoption above 70% needs sustained change management across older and offline residents.',
          mitigation: 'Run phased rollouts with community ambassadors, and keep assisted channels open.', owner: 'Technology Transformation' }),
        ...flag(v.retention < 85, { id: 'churn', severity: 'medium', title: 'Contract churn',
          detail: 'Retention under 85% shrinks the managed portfolio and the fixed-cost base it supports.',
          mitigation: 'Run quarterly owner reviews and a recovery plan for every at-risk community.', owner: 'Client Relations' }),
      ],
    };
  },

  scorecard(v, r) {
    return [
      { perspective: 'Financial', label: 'EBITDA margin', value: r.margin * 100, target: 32, unit: '%', better: 'higher' },
      { perspective: 'Financial', label: 'Collection rate', value: v.collection, target: 92, unit: '%', better: 'higher' },
      { perspective: 'Customer', label: 'Resident satisfaction index', value: r.kpis.satisfaction.value, target: 82, unit: 'pts', better: 'higher' },
      { perspective: 'Customer', label: 'Contract retention', value: v.retention, target: 92, unit: '%', better: 'higher' },
      { perspective: 'Internal Process', label: 'Service cost per unit', value: v.costPerUnit, target: 1000, unit: 'AED', better: 'lower' },
      { perspective: 'Learning & Growth', label: 'Self-service adoption', value: v.digital, target: 50, unit: '%', better: 'higher' },
    ];
  },

  missions: [
    { id: 'digital', title: 'Digital District', xp: 150, desc: 'Reach 60% self-service adoption with resident satisfaction at 84 or above.',
      test: ({ levers, scn }) => ({ progress: Math.min(1, (levers.digital - 35) / 25), done: levers.digital >= 60 && scn.kpis.satisfaction.value >= 84 }) },
    { id: 'arrears', title: 'Arrears Buster', xp: 120, desc: 'Cut fee arrears by AED 8m or more.',
      test: ({ base, scn }) => { const d = base.kpis.arrears.value - scn.kpis.arrears.value; return { progress: Math.max(0, Math.min(1, d / 8)), done: d >= 8 }; } },
    { id: 'margin', title: 'Lean & Loved', xp: 180, desc: 'Reach a 36% EBITDA margin with resident satisfaction at 80 or above.',
      test: ({ scn }) => ({ progress: Math.min(1, scn.margin / 0.36), done: scn.margin >= 0.36 && scn.kpis.satisfaction.value >= 80 }) },
  ],
};
