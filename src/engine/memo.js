// Executive Co-Pilot: writes a board-ready sensitivity memo from the model.
// Deterministic by design: every number in the memo comes from the engine, so
// the memo can be audited line by line and never invents a figure.
import { money, pct, unitValue, months } from './format.js';
import { evaluate } from './game.js';
import { bridge, leverage, tornado } from './analysis.js';
import { evMultiple } from './model.js';
import { UAE_CORPORATE_TAX } from './businessCase.js';

const RAG = { green: '🟢 On target', amber: '🟡 Watch', red: '🔴 Off target' };
const SEV = { high: 'High', medium: 'Medium', low: 'Low' };

function kpiDelta(d, unit) {
  const sign = d > 0 ? '+' : d < 0 ? '−' : '±';
  const a = Math.abs(d);
  if (unit === '%') return `${sign}${a.toFixed(1)} pts`;
  if (unit === 'AED m') return `${sign}${money(a)}`;
  if (unit === 'AED') return `${sign}AED ${Math.round(a).toLocaleString('en-US')}`;
  if (unit === 'm') return `${sign}${a.toFixed(2)}m`;
  return `${sign}${a < 10 ? a.toFixed(1) : Math.round(a).toLocaleString('en-US')}${unit ? ' ' + unit : ''}`;
}

function valuationNote(sector) {
  return sector.valuation.method === 'capRate'
    ? `NOI capitalised at a ${(sector.valuation.capRate * 100).toFixed(2)}% cap rate (${evMultiple(sector).toFixed(1)}x)`
    : `${sector.valuation.multiple}x EV/EBITDA`;
}

export function buildMemo(sector, levers, { date = new Date().toISOString().slice(0, 10), title } = {}) {
  const e = evaluate(sector, levers);
  const { cmp, bc, sc } = e;
  const br = bridge(sector, levers);
  const lev = leverage(sector, levers).filter((x) => !x.atLimit && x.valueGain > 0);
  const torn = tornado(sector, levers).slice(0, 4);
  const flags = cmp.scn.flags;
  const moved = bc.initiatives;
  const lines = [];
  const L = (s = '') => lines.push(s);

  L(`# ${title ?? `Board Memo: ${sector.company} value creation scenario`}`);
  L();
  L(`**Business:** ${sector.name} (${sector.scale}) · **Date:** ${date} · **Prepared by:** Strategy & Value Creation · **Status:** Illustrative operating model (independent analysis)`);
  L();

  // 1. Answer first.
  L('## 1. Recommendation');
  L();
  if (!moved.length) {
    L(`No levers have been moved, so this is the baseline: EBITDA of **${money(cmp.base.ebitda)}** at a **${pct(cmp.base.margin)}** margin and enterprise value of **${money(cmp.base.ev)}** (${valuationNote(sector)}).`);
    L();
    L('The model points to three levers to explore first, ranked by EBITDA per 10% improvement:');
    L();
    lev.slice(0, 3).forEach((x, i) => L(`${i + 1}. **${x.label}**: ${money(x.valueGain, { sign: true })} of value (${money(x.gain, { sign: true })} EBITDA) for ${money(x.cost)} invested. Owner: ${x.owner}.`));
    L();
  } else {
    const verdict = cmp.dEbitda > 0 && bc.npv > 0 && !flags.some((f) => f.severity === 'high') && !cmp.overBudget
      ? 'Approve'
      : cmp.dEbitda > 0 && bc.npv > 0
        ? 'Approve with conditions'
        : 'Do not approve as framed';
    L(`**${verdict}.** This ${moved.length}-initiative programme moves run-rate EBITDA by **${money(cmp.dEbitda, { sign: true })} (${pct(cmp.dEbitdaPct, { sign: true })})** to **${money(cmp.scn.ebitda)}** and creates **${money(cmp.valueCreated, { sign: true })}** of value (${money(cmp.dEv, { sign: true })} enterprise value ${cmp.cashRelease >= 0 ? 'plus' : 'less'} ${money(Math.abs(cmp.cashRelease))} of working capital ${cmp.cashRelease >= 0 ? 'released' : 'absorbed'}), for **${money(cmp.invest)}** of one-off investment.`);
    L();
    L(`- **Five-year NPV:** ${money(bc.npv, { sign: true })} at a ${pct(bc.wacc)} WACC, after ${pct(UAE_CORPORATE_TAX, { dp: 0 })} UAE corporate tax`);
    L(`- **IRR:** ${Number.isFinite(bc.irr) ? pct(bc.irr) : bc.irr === Infinity ? 'very high (self-funding)' : 'n/a'} · **Payback:** ${months(bc.paybackMonths)}`);
    L(`- **Board confidence:** ${e.confidence}/100 · **Risk flags:** ${flags.length} (${flags.filter((f) => f.severity === 'high').length} high)`);
    if (cmp.overBudget) L(`- **Budget:** ${money(cmp.invest)} against a ${money(sector.budget)} transformation envelope. **Over budget by ${money(cmp.invest - sector.budget)}.**`);
    if (verdict === 'Approve with conditions') L(`- **Condition:** approval depends on mitigating the risks in Section 4 before money is released.`);
    L();
  }

  // 2. Situation.
  L('## 2. Baseline and scenario');
  L();
  L('| Metric | Baseline | Scenario | Change |');
  L('|---|---:|---:|---:|');
  L(`| Revenue | ${money(cmp.base.revenue)} | ${money(cmp.scn.revenue)} | ${money(cmp.dRevenue, { sign: true })} |`);
  L(`| EBITDA | ${money(cmp.base.ebitda)} | ${money(cmp.scn.ebitda)} | ${money(cmp.dEbitda, { sign: true })} |`);
  L(`| EBITDA margin | ${pct(cmp.base.margin)} | ${pct(cmp.scn.margin)} | ${cmp.dMarginPts >= 0 ? '+' : '−'}${Math.abs(cmp.dMarginPts).toFixed(1)} pts |`);
  L(`| Enterprise value | ${money(cmp.base.ev)} | ${money(cmp.scn.ev)} | ${money(cmp.dEv, { sign: true })} |`);
  L(`| Working capital | ${money(cmp.base.wc)} | ${money(cmp.scn.wc)} | ${money(-cmp.cashRelease, { sign: true })} |`);
  for (const k of Object.keys(cmp.base.kpis)) {
    const b = cmp.base.kpis[k], s = cmp.scn.kpis[k];
    L(`| ${b.label} | ${unitValue(b.value, b.unit)} | ${unitValue(s.value, s.unit)} | ${kpiDelta(s.value - b.value, b.unit)} |`);
  }
  L();
  L(`Valuation basis: ${valuationNote(sector)}.`);
  L();

  // 3. Bridge and drivers.
  if (moved.length) {
    L('## 3. EBITDA bridge');
    L();
    L('| Step | EBITDA impact |');
    L('|---|---:|');
    L(`| Baseline EBITDA | ${money(br.start)} |`);
    for (const s of br.steps) L(`| ${s.label} | ${money(s.delta, { sign: true })} |`);
    L(`| **Scenario EBITDA** | **${money(br.end)}** |`);
    L();
    const top = br.steps.filter((s) => s.id !== '_interaction')[0];
    const negative = br.steps.filter((s) => s.delta < 0 && s.id !== '_interaction');
    L(`**So what:** ${top ? `${top.label} delivers ${Math.round((Math.abs(top.delta) / Math.max(1e-9, br.steps.reduce((a, s) => a + Math.abs(s.delta), 0))) * 100)}% of the gross movement.` : ''}${negative.length ? ` ${negative.map((n) => n.label).join(' and ')} ${negative.length > 1 ? 'work' : 'works'} against the plan, a trade-off the board should see explicitly.` : ''}`);
    L();
  }

  L(`## ${moved.length ? 4 : 3}. Highest-leverage value drivers`);
  L();
  L('Each lever moved a further 10% in its value-creating direction from the current scenario, ranked by value created (EV plus cash):');
  L();
  L('| Rank | Lever | EBITDA gain | Value created | One-off cost | Payback | Owner |');
  L('|---:|---|---:|---:|---:|---:|---|');
  lev.slice(0, 5).forEach((x, i) => L(`| ${i + 1} | ${x.label} | ${money(x.gain, { sign: true })} | ${money(x.valueGain, { sign: true })} | ${money(x.cost)} | ${x.gain > 0 ? months((x.cost / x.gain) * 12) : 'cash only'} | ${x.owner} |`));
  L();
  if (torn.length) {
    L(`**Sensitivity:** the most sensitive drivers are ${torn.slice(0, 3).map((t) => `${t.label} (±10% swings EBITDA by ${money(t.swing / 2)})`).join(', ')}. Concentrate PMO tracking on these.`);
    L();
  }

  // 4. Risks.
  const sec = moved.length ? 5 : 4;
  L(`## ${sec}. Trade-offs and risks`);
  L();
  if (!flags.length) {
    L('The scenario raises no risk flags. Every lever sits inside the range the model treats as operationally credible.');
  } else {
    L('| Severity | Risk | What the model shows | Mitigation | Owner |');
    L('|---|---|---|---|---|');
    for (const f of flags) L(`| ${SEV[f.severity]} | ${f.title} | ${f.detail} | ${f.mitigation} | ${f.owner} |`);
  }
  L();

  // 5. Balanced scorecard.
  L(`## ${sec + 1}. Balanced Scorecard impact`);
  L();
  L('| Perspective | KPI | Scenario | Target | Status |');
  L('|---|---|---:|---:|---|');
  for (const k of sc.items) L(`| ${k.perspective} | ${k.label} | ${unitValue(k.value, k.unit)} | ${k.better === 'higher' ? '≥' : '≤'} ${unitValue(k.target, k.unit)} | ${RAG[k.status]} |`);
  L();

  // 6. Benefits realisation.
  if (moved.length) {
    L(`## ${sec + 2}. Benefits realisation plan`);
    L();
    L('| Initiative | Change | Run-rate EBITDA | Investment | Ramp | Year 1 | Year 2 | Year 3 | Owner |');
    L('|---|---|---:|---:|---:|---:|---:|---:|---|');
    for (const i of moved) L(`| ${i.label} | ${unitValue(i.from, i.unit)} → ${unitValue(i.to, i.unit)} | ${money(i.runRate, { sign: true })} | ${money(i.investment)} | ${i.rampMonths} mo | ${money(i.phasing[0], { sign: true })} | ${money(i.phasing[1], { sign: true })} | ${money(i.phasing[2], { sign: true })} | ${i.owner} |`);
    L(`| **Total** | | **${money(bc.runRate, { sign: true })}** | **${money(bc.invest)}** | | **${money(bc.yearly[0], { sign: true })}** | **${money(bc.yearly[1], { sign: true })}** | **${money(bc.yearly[2], { sign: true })}** | |`);
    L();
    L('**Governance:** each initiative gets a named owner, a baseline frozen today and a monthly PMO benefits review. Benefits count only once they show in the management accounts. The board sees a quarterly realisation report against this phasing.');
    L();
  }

  L(`## ${moved.length ? sec + 3 : sec + 2}. Decisions requested`);
  L();
  if (moved.length) {
    L(`1. Approve ${money(cmp.invest)} of one-off investment to deliver ${money(cmp.dEbitda, { sign: true })} of run-rate EBITDA.`);
    L(`2. Confirm the initiative owners above and the Balanced Scorecard targets as the tracking baseline.`);
    if (flags.length) L(`3. Endorse the ${flags.length} mitigation${flags.length > 1 ? 's' : ''} in the risk table as conditions of release.`);
  } else {
    L('1. Mandate Strategy & Value Creation to build a full business case for the top three levers.');
  }
  L();
  L('---');
  L('*Generated by the EBITDA Value Lever Simulator: an independent analysis, not affiliated with the company named. Operating figures are illustrative; not investment advice.*');
  return lines.join('\n');
}
