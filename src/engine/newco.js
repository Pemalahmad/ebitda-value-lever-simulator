// Capex and opex calculator for a new company you might invest in. Five-year plan:
// revenue and opex build -> EBITDA -> D&A -> tax -> capex and working capital -> free cash flow,
// then NPV, IRR, payback, peak funding need and an exit value. AED m unless stated.
import { npv, irr, UAE_CORPORATE_TAX } from './businessCase.js';

const TAX_FREE = 0.375; // UAE corporate tax applies above AED 375k of taxable profit

// Typical cost structures; direct labour (drivers, doctors, kitchen staff) sits in cost of sales,
// headcount here is the overhead team. Starting points to edit, not benchmarks for a named company.
export const NEWCO_PRESETS = {
  logistics: { label: 'Logistics hub', revenue: 60, growth: 20, grossMargin: 30, headcount: 40, costPerHead: 0.18, rent: 4, marketingPct: 1, ga: 3, otherPct: 2, fitout: 18, equipment: 30, technology: 6, otherCapex: 3, life: 8, maintPct: 3, debtorDays: 60, creditorDays: 45, stockDays: 10, wacc: 11, exitMultiple: 9 },
  clinic: { label: 'Specialist clinic', revenue: 25, growth: 25, grossMargin: 45, headcount: 25, costPerHead: 0.15, rent: 3, marketingPct: 3, ga: 2, otherPct: 3, fitout: 9, equipment: 14, technology: 2, otherCapex: 1, life: 7, maintPct: 3, debtorDays: 75, creditorDays: 40, stockDays: 20, wacc: 12, exitMultiple: 12 },
  fnb: { label: 'F&B group (5 sites)', revenue: 30, growth: 18, grossMargin: 68, headcount: 130, costPerHead: 0.09, rent: 5.5, marketingPct: 4, ga: 2, otherPct: 4, fitout: 11, equipment: 4, technology: 1, otherCapex: 1, life: 6, maintPct: 2.5, debtorDays: 5, creditorDays: 45, stockDays: 8, wacc: 13, exitMultiple: 8 },
  saas: { label: 'B2B software', revenue: 12, growth: 45, grossMargin: 78, headcount: 30, costPerHead: 0.28, rent: 0.8, marketingPct: 15, ga: 1.5, otherPct: 3, fitout: 1, equipment: 0.5, technology: 3, otherCapex: 0.5, life: 4, maintPct: 2, debtorDays: 45, creditorDays: 30, stockDays: 0, wacc: 14, exitMultiple: 12 },
  charging: { label: 'EV charging network', revenue: 15, growth: 40, grossMargin: 45, headcount: 15, costPerHead: 0.18, rent: 1, marketingPct: 2, ga: 1.5, otherPct: 3, fitout: 2, equipment: 45, technology: 4, otherCapex: 2, life: 10, maintPct: 4, debtorDays: 20, creditorDays: 50, stockDays: 5, wacc: 10, exitMultiple: 11 },
};

export const NEWCO_FIELDS = [
  { id: 'revenue', label: 'Year-1 revenue', unit: 'AED m', min: 1, max: 500, step: 1, group: 'Revenue' },
  { id: 'growth', label: 'Revenue growth a year', unit: '%', min: 0, max: 100, step: 1, group: 'Revenue' },
  { id: 'grossMargin', label: 'Gross margin', unit: '%', min: 5, max: 95, step: 1, group: 'Revenue' },
  { id: 'headcount', label: 'Headcount, year 1', unit: 'people', min: 1, max: 2000, step: 1, group: 'Opex' },
  { id: 'costPerHead', label: 'Cost per head (salary, visa, housing)', unit: 'AED m', min: 0.03, max: 1, step: 0.01, group: 'Opex' },
  { id: 'rent', label: 'Rent and facilities', unit: 'AED m', min: 0, max: 100, step: 0.1, group: 'Opex' },
  { id: 'marketingPct', label: 'Marketing', unit: '% of revenue', min: 0, max: 40, step: 0.5, group: 'Opex' },
  { id: 'ga', label: 'G&A, licences, audit', unit: 'AED m', min: 0, max: 50, step: 0.1, group: 'Opex' },
  { id: 'otherPct', label: 'Other opex', unit: '% of revenue', min: 0, max: 20, step: 0.5, group: 'Opex' },
  { id: 'fitout', label: 'Fit-out and build', unit: 'AED m', min: 0, max: 500, step: 0.5, group: 'Capex' },
  { id: 'equipment', label: 'Equipment and vehicles', unit: 'AED m', min: 0, max: 500, step: 0.5, group: 'Capex' },
  { id: 'technology', label: 'Technology and systems', unit: 'AED m', min: 0, max: 100, step: 0.5, group: 'Capex' },
  { id: 'otherCapex', label: 'Other set-up capex', unit: 'AED m', min: 0, max: 100, step: 0.5, group: 'Capex' },
  { id: 'life', label: 'Average asset life', unit: 'years', min: 2, max: 25, step: 1, group: 'Capex' },
  { id: 'maintPct', label: 'Maintenance capex', unit: '% of revenue', min: 0, max: 15, step: 0.5, group: 'Capex' },
  { id: 'debtorDays', label: 'Debtor days', unit: 'days', min: 0, max: 180, step: 1, group: 'Working capital' },
  { id: 'creditorDays', label: 'Creditor days', unit: 'days', min: 0, max: 180, step: 1, group: 'Working capital' },
  { id: 'stockDays', label: 'Stock days', unit: 'days', min: 0, max: 180, step: 1, group: 'Working capital' },
  { id: 'wacc', label: 'Discount rate', unit: '%', min: 5, max: 30, step: 0.5, group: 'Valuation' },
  { id: 'exitMultiple', label: 'Exit EV / EBITDA, year 5', unit: 'x', min: 2, max: 30, step: 0.5, group: 'Valuation' },
];

export function newcoPlan(input, years = 5) {
  const p = { ...NEWCO_PRESETS.logistics, ...input };
  const setup = p.fitout + p.equipment + p.technology + p.otherCapex;
  const rows = [];
  let prevWc = 0;
  for (let y = 1; y <= years; y++) {
    const g = Math.pow(1 + p.growth / 100, y - 1);
    const revenue = p.revenue * g;
    const cogs = revenue * (1 - p.grossMargin / 100);
    // Headcount grows at half revenue growth: operating leverage, not a straight line.
    const staff = p.headcount * Math.pow(1 + p.growth / 200, y - 1) * p.costPerHead;
    const opex = { staff, rent: p.rent * Math.pow(1.03, y - 1), marketing: revenue * p.marketingPct / 100, ga: p.ga * Math.pow(1.03, y - 1), other: revenue * p.otherPct / 100 };
    const opexTotal = Object.values(opex).reduce((a, b) => a + b, 0);
    const ebitda = revenue - cogs - opexTotal;
    const maint = revenue * p.maintPct / 100;
    const capex = (y === 1 ? setup : 0) + maint;
    const da = setup / p.life + rows.reduce((a, r) => a + r.maint, maint) / p.life;
    const ebit = ebitda - da;
    const tax = Math.max(0, ebit - TAX_FREE) * UAE_CORPORATE_TAX;
    const wc = (revenue * p.debtorDays + cogs * p.stockDays - (cogs + opexTotal - staff) * p.creditorDays) / 365;
    const dWc = wc - prevWc;
    prevWc = wc;
    const fcf = ebitda - tax - capex - dWc;
    rows.push({ year: y, revenue, cogs, grossProfit: revenue - cogs, opex, opexTotal, ebitda, margin: ebitda / revenue, da, ebit, tax, capex, maint, wc, dWc, fcf });
  }
  const last = rows.at(-1);
  const exit = last.ebitda * p.exitMultiple;
  // Cash flows with year 1 at t = 0 (set-up capex is spent up front), exit value added in the final year.
  const flows = rows.map((r, i) => r.fcf + (i === years - 1 ? exit : 0));
  let cum = 0, trough = 0, payback = null;
  rows.forEach((r) => { const before = cum; cum += r.fcf; trough = Math.min(trough, cum); if (payback == null && cum >= 0 && r.fcf > 0 && before < 0) payback = r.year - 1 + (-before / r.fcf); });
  const breakeven = rows.find((r) => r.ebitda > 0)?.year ?? null;
  const peakFunding = -trough;
  return {
    inputs: p, rows, setup, exit, flows,
    peakFunding,
    paybackYears: payback,
    breakevenYear: breakeven,
    npv: npv(p.wacc / 100, flows),
    irr: irr(flows),
    moic: peakFunding > 0 ? (rows.reduce((a, r) => a + Math.max(0, r.fcf), 0) + exit) / peakFunding : null,
  // FCF bridge for year 1: EBITDA -> tax -> capex -> working capital -> FCF.
    bridge: { start: rows[0].ebitda, end: rows[0].fcf, steps: [{ id: 'tax', label: 'Tax', delta: -rows[0].tax }, { id: 'capex', label: 'Capex', delta: -rows[0].capex }, { id: 'wc', label: 'Working capital', delta: -rows[0].dWc }] },
    checks: newcoChecks(p, rows),
  };
}

export function newcoChecks(p, rows) {
  const out = [];
  const add = (ok, title, detail) => out.push({ ok, title, detail });
  add(p.grossMargin > 0 && p.grossMargin < 95, 'Gross margin is plausible', `${p.grossMargin}% gross margin.`);
  add(rows[0].opexTotal < rows[0].revenue * 2, 'Year-1 opex is less than twice revenue', `Opex ${rows[0].opexTotal.toFixed(1)} vs revenue ${rows[0].revenue.toFixed(1)}.`);
  add(rows.at(-1).ebitda > 0, 'EBITDA turns positive within five years', rows.at(-1).ebitda > 0 ? `Year-5 margin ${(rows.at(-1).margin * 100).toFixed(1)}%.` : 'Still loss-making in year 5; check growth and cost assumptions.');
  add(p.creditorDays <= 120, 'Creditor days are realistic', `${p.creditorDays} days; above 120 relies on suppliers funding the business.`);
  add(p.exitMultiple <= 20 || p.growth >= 30, 'Exit multiple fits the growth rate', `${p.exitMultiple}x for ${p.growth}% growth.`);
  add(rows.every((r) => Math.abs(r.revenue - r.cogs - r.opexTotal - r.ebitda) < 1e-6), 'P&L adds up each year', 'Revenue − cost of sales − opex = EBITDA.');
  add(rows.every((r) => Math.abs(r.ebitda - r.tax - r.capex - r.dWc - r.fcf) < 1e-6), 'Cash flow adds up each year', 'EBITDA − tax − capex − change in working capital = free cash flow.');
  return out;
}
