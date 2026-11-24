// Logic checker and data-gap finder across the whole workbook: operating models, portfolio plays,
// official market data and the live market snapshot. Each check says what it tested and why it failed.
import { SECTORS } from './sectors/index.js';
import { compare, baseLevers, evMultiple } from './model.js';
import { bridge } from './analysis.js';
import { businessCase, npv } from './businessCase.js';
import { PLAYS, runPlay } from './plays.js';
import { reconciles, lineBridge, rolling12 } from './variance.js';

const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

export function logicChecks({ bySector = {}, plays = {}, official, pulse, now = Date.now() } = {}) {
  const out = [];
  const add = (area, title, ok, detail, level = 'fail') => out.push({ area, title, status: ok ? 'pass' : level, detail });

  for (const s of SECTORS) {
    const levers = bySector[s.id] ?? baseLevers(s);
    const area = s.name;
    const badBase = s.levers.filter((l) => l.base < l.min || l.base > l.max);
    add(area, 'Baselines sit inside lever ranges', !badBase.length, badBase.length ? `Out of range: ${badBase.map((l) => l.label).join(', ')}` : `${s.levers.length} levers checked.`);
    const badScn = Object.entries(s.scenarios).flatMap(([n, v]) => Object.entries(v).filter(([k, x]) => { const l = s.levers.find((y) => y.id === k); return !l || x < l.min || x > l.max; }).map(([k]) => `${n}: ${k}`));
    add(area, 'Scenario presets use valid levers and values', !badScn.length, badScn.length ? badScn.join('; ') : `${Object.keys(s.scenarios).length} presets checked.`);
    const c = compare(s, levers);
    const lineSum = (r) => r.lines.reduce((a, l) => a + l.value, 0);
    add(area, 'P&L lines add up to EBITDA', close(lineSum(c.base), c.base.ebitda, 1e-4) && close(lineSum(c.scn), c.scn.ebitda, 1e-4), `Baseline lines ${lineSum(c.base).toFixed(2)} vs EBITDA ${c.base.ebitda.toFixed(2)}.`);
    add(area, 'Valuation equals EBITDA × multiple', close(c.scn.ev, c.scn.ebitda * evMultiple(s)), `${evMultiple(s).toFixed(2)}x applied.`);
    add(area, 'Lever bridge reconciles to scenario EBITDA', reconciles(bridge(s, levers), 1e-4), 'Baseline + lever steps + interaction = scenario.');
    add(area, 'P&L line bridge reconciles', reconciles(lineBridge(s, levers), 1e-4), 'Baseline + line movements = scenario.');
    const bc = businessCase(s, levers);
    add(area, 'NPV recomputes from its cash flows', close(npv(bc.wacc, bc.flows), bc.npv), `${bc.flows.length} yearly flows at ${(bc.wacc * 100).toFixed(1)}%.`);
    const r12 = rolling12(s, levers, 36);
    add(area, 'Rolling 12 months converges to run rate', close(r12.at(-1).r12, c.scn.ebitda, 1e-3) || bc.initiatives.some((i) => i.rampMonths > 24), `Month 36 R12M ${r12.at(-1).r12.toFixed(1)} vs run rate ${c.scn.ebitda.toFixed(1)}.`, 'warn');
    add(area, 'Margin is in a credible range', c.scn.margin > -0.2 && c.scn.margin < 0.75, `Scenario margin ${(c.scn.margin * 100).toFixed(1)}%.`, 'warn');
    add(area, 'Investment stays inside the envelope', !c.overBudget, `${c.invest.toFixed(0)} of ${s.budget} used.`, 'warn');
  }

  for (const p of PLAYS) {
    const r = runPlay(p, plays[p.id]?.params);
    add('Portfolio plays', `${p.title}: value equals its bridge lines`, close(r.value, r.lines.reduce((a, l) => a + l.value, 0)), `${r.lines.length} lines.`);
  }

  if (official) {
    const years = official.annual.map((a) => a.year);
    add('Market tracker', 'Annual years are unique and in order', years.every((y, i) => !i || y > years[i - 1]), years.join(', '));
    add('Market tracker', 'Every published figure has a source link', [...official.annual, ...official.periods].every((x) => x.source?.url), `${official.annual.length + official.periods.length} figures.`);
    const tickets = official.annual.filter((a) => a.transactions).map((a) => (a.valueAedBn * 1e3) / a.transactions);
    add('Market tracker', 'Average ticket per transaction is plausible (AED 1–10m)', tickets.every((t) => t > 1 && t < 10), tickets.map((t) => `AED ${t.toFixed(2)}m`).join(', '), 'warn');
    const partial = official.periods.filter((p) => /\*/.test(p.period));
    add('Market tracker', 'Unofficial periods are flagged', partial.every((p) => /not an official/i.test(p.source.title)), `${partial.length} flagged period(s).`, 'warn');
  }

  if (pulse) {
    const unsorted = pulse.markets.filter((m) => m.series.some(([d], i) => i && d < m.series[i - 1][0]));
    add('Live market', 'Price series are in date order', !unsorted.length, unsorted.map((m) => m.label).join(', ') || `${pulse.markets.length} series.`);
    const nan = pulse.markets.filter((m) => m.series.some(([, v]) => !Number.isFinite(v)));
    add('Live market', 'No missing prices inside a series', !nan.length, nan.map((m) => m.label).join(', ') || 'All values numeric.');
    const stale = pulse.markets.filter((m) => now - Date.parse(m.series.at(-1)[0]) > 4 * 864e5);
    add('Live market', 'Every market updated in the last 4 days', !stale.length, stale.length ? `Stale: ${stale.map((m) => m.label).join(', ')}` : 'All fresh.', 'warn');
    const down = pulse.sources.filter((s) => !s.ok);
    add('Live market', 'All sources returned data on the last refresh', !down.length, down.length ? `Fell back: ${down.map((s) => s.name).join(', ')}` : `${pulse.sources.length} sources live.`, 'warn');
  }
  return out;
}

// What is missing, why it matters and what would fix it. These are the data that would let the model evolve.
export function dataGaps({ official, pulse, aggregate, bySector = {}, intercompany = [] } = {}) {
  const gaps = [];
  const add = (area, item, why, fix, impact = 'medium') => gaps.push({ area, item, why, fix, impact });
  if (!aggregate) add('Market tracker', 'Deal-level DLD transactions', 'Without monthly transactions the market rolling 12 months, price-per-m² trends and community momentum fall back to annual totals.', 'Download the DLD Transactions CSV and run scripts/ingest-dld.mjs, or load it in the import lab.', 'high');
  if (official && official.periods.length < 4) add('Market tracker', 'Quarterly official releases', 'Only partial periods exist for the current year, so quarter-on-quarter variance cannot be bridged.', 'Add each DLD quarterly release (value and transactions) with its source.', 'medium');
  if (pulse) {
    const monthly = pulse.markets.filter((m) => m.interval === '1mo');
    if (monthly.length) add('Live market', `Daily history for ${monthly.map((m) => m.label).join(', ')}`, 'These indices only have monthly history on the current source, so 1-week and 1-month moves are blank.', 'Add a second price source for the DFM and Tadawul (exchange website or a data licence).', 'medium');
  }
  add('Value plan', 'Actuals by month', 'Variance is shown against the model baseline. With monthly actuals, the bridge becomes budget vs actual and the rolling 12 months uses real months.', 'Load monthly revenue and EBITDA by business (CSV with month, business, revenue, EBITDA).', 'high');
  add('Value plan', 'Capex and opex split by business', 'The operating models carry one-off investment per lever but not a full capex schedule or opex by category, so cash conversion is approximate.', 'Add yearly capex (growth vs maintenance) and opex categories per business.', 'medium');
  if (!intercompany.length) add('Portfolio lab', 'Intercompany transactions', 'The sum of the parts adds six businesses without removing sales between them, which overstates group revenue.', 'Enter intercompany flows in the elimination helper (seller, buyer, amount, opex or capitalised).', 'medium');
  const untouched = SECTORS.filter((s) => !bySector[s.id] || Object.entries(bySector[s.id]).every(([k, v]) => baseLevers(s)[k] === v));
  if (untouched.length === SECTORS.length) add('Portfolio lab', 'Scenario for each business', 'All six businesses are at baseline, so the portfolio bridge only shows plays.', 'Open a business in the Value Plan and set its levers.', 'low');
  add('Market entry', 'Primary-source fee schedule', 'VARA fees and capital come from adviser summaries of Schedule 2 and the Company Rulebook.', 'Replace with figures read directly from the rulebook PDFs and record the version date.', 'low');
  return gaps;
}
