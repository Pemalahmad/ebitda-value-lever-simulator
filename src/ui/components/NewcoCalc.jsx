// Capex and opex calculator for a new company you might invest in.
import React, { useMemo, useState } from 'react';
import { fmt, newcoPlan, NEWCO_PRESETS, NEWCO_FIELDS } from '../../engine/index.js';
import { Card, CardHead, KpiStrip, Waterfall, DotColumns, FolderTabs, Segmented, Status, Pill } from './Dots.jsx';

const { money } = fmt;
const signed = (x) => money(x, { sign: true });
const GROUPS = ['Revenue', 'Opex', 'Capex', 'Working capital', 'Valuation'];

export function NewcoCalc() {
  const [preset, setPreset] = useState('logistics');
  const [inp, setInp] = useState(NEWCO_PRESETS.logistics);
  const [group, setGroup] = useState('Revenue');
  const [table, setTable] = useState('pl');
  const plan = useMemo(() => newcoPlan(inp), [inp]);
  const pick = (id) => { setPreset(id); setInp(NEWCO_PRESETS[id]); };
  const set = (id, v) => setInp((x) => ({ ...x, [id]: v }));
  const y1 = plan.rows[0], y5 = plan.rows.at(-1);
  const opexMix = Object.entries(y1.opex).map(([k, v]) => ({ k, v }));
  const LABEL = { staff: 'Staff', rent: 'Rent', marketing: 'Marketing', ga: 'G&A', other: 'Other' };
  return (
    <>
      <div className="newco-presets"><span className="w-eyebrow">Start from a template</span><Segmented value={preset} onChange={pick} label="Template" options={Object.entries(NEWCO_PRESETS).map(([id, p]) => [id, p.label])} /></div>
      <div className="split-main newco">
        <Card className="chart-card">
          <KpiStrip items={[
            { id: 'setup', label: 'Set-up capex', value: money(plan.setup) },
            { id: 'peak', label: 'Peak funding need', value: money(plan.peakFunding), sub: 'deepest cumulative cash' },
            { id: 'be', label: 'EBITDA breakeven', value: plan.breakevenYear ? `Year ${plan.breakevenYear}` : 'Not in 5 years', tone: plan.breakevenYear ? '' : 'neg' },
            { id: 'irr', label: 'IRR, with exit', value: Number.isFinite(plan.irr) ? `${(plan.irr * 100).toFixed(1)}%` : plan.irr === Infinity ? '> 1,000%' : 'n/a', sub: `NPV ${signed(plan.npv)} · ${plan.moic ? `${plan.moic.toFixed(1)}x MOIC` : ''}` },
          ]} />
          <div className="grid-2">
            <div><span className="w-eyebrow">Free cash flow by year (exit excluded)</span><DotColumns cols={plan.rows.map((r) => ({ label: `Year ${r.year}`, value: r.fcf }))} format={(v) => money(v, { sign: true })} /></div>
            <div><span className="w-eyebrow">Year 1: EBITDA to free cash flow</span><Waterfall bridge={plan.bridge} startLabel="EBITDA" endLabel="Free cash flow" format={(v) => money(v)} height={250} zoom={false} /></div>
          </div>
        </Card>
        <Card>
          <CardHead title="Assumptions" sub="Tune any input; everything recalculates" />
          <FolderTabs value={group} onChange={setGroup} tabs={GROUPS.map((g) => ({ id: g, label: g }))} />
          <div className="newco-inputs">{NEWCO_FIELDS.filter((f) => f.group === group).map((f) => (
            <label key={f.id} className="pp"><span className="pp-top"><span>{f.label}</span><b className="mono">{f.unit === 'AED m' ? `AED ${inp[f.id]}m` : `${inp[f.id]}${f.unit.startsWith('%') ? '%' : f.unit === 'x' ? 'x' : ` ${f.unit}`}`}</b></span>
              <input type="range" min={f.min} max={f.max} step={f.step} value={inp[f.id]} onChange={(e) => set(f.id, Number(e.target.value))} /></label>
          ))}</div>
          <p className="w-foot">{plan.checks.filter((c) => c.ok).length} of {plan.checks.length} plausibility checks pass. See the Checks tab below.</p>
        </Card>
      </div>
      <FolderTabs value={table} onChange={setTable} tabs={[{ id: 'pl', label: 'P&L and opex' }, { id: 'cash', label: 'Capex and cash' }, { id: 'mix', label: 'Year-1 opex mix' }, { id: 'checks', label: 'Checks', count: plan.checks.filter((c) => !c.ok).length }]} />
      <Card className="folder-body">
        {table === 'checks' ? <ul className="watch">{plan.checks.map((c) => <li key={c.title}><span className="w-k">{c.title}<small>{c.detail}</small></span><span /><Status s={c.ok ? 'pass' : 'warn'} /></li>)}</ul> : table === 'mix' ? (
          <div className="mix">{opexMix.map((o) => <div key={o.k}><span>{LABEL[o.k]}</span><b>{money(o.v)}</b><Pill tone="">{((o.v / y1.opexTotal) * 100).toFixed(0)}%</Pill><i style={{ width: `${(o.v / y1.opexTotal) * 100}%` }} /></div>)}</div>
        ) : (
          <div className="table-wrap"><table className="data">
            <thead><tr><th>AED m</th>{plan.rows.map((r) => <th key={r.year} className="r">Year {r.year}</th>)}</tr></thead>
            <tbody>{(table === 'pl' ? [
              ['Revenue', (r) => r.revenue], ['Cost of sales', (r) => -r.cogs], ['Gross profit', (r) => r.grossProfit, 'sub'],
              ['Staff', (r) => -r.opex.staff], ['Rent and facilities', (r) => -r.opex.rent], ['Marketing', (r) => -r.opex.marketing], ['G&A', (r) => -r.opex.ga], ['Other opex', (r) => -r.opex.other],
              ['EBITDA', (r) => r.ebitda, 'total'], ['EBITDA margin', (r) => r.margin, 'pct'],
            ] : [
              ['EBITDA', (r) => r.ebitda], ['Tax (9% UAE CT)', (r) => -r.tax], ['Set-up capex', (r) => -(r.capex - r.maint)], ['Maintenance capex', (r) => -r.maint], ['Change in working capital', (r) => -r.dWc],
              ['Free cash flow', (r) => r.fcf, 'total'], ['Depreciation', (r) => -r.da], ['EBIT', (r) => r.ebit, 'sub'],
            ]).map(([label, f, kind]) => <tr key={label} className={kind === 'total' ? 'total' : ''}><td className={kind === 'sub' ? 'muted' : ''}>{label}</td>{plan.rows.map((r) => <td key={r.year} className="r">{kind === 'pct' ? `${(f(r) * 100).toFixed(1)}%` : money(f(r))}</td>)}</tr>)}</tbody>
          </table></div>
        )}
        <p className="w-foot">Year-5 EBITDA {money(y5.ebitda)} × {inp.exitMultiple}x = exit value {money(plan.exit)}. Headcount grows at half the revenue growth; rent and G&A rise 3% a year; tax at 9% above AED 375k. Illustrative planning tool, not investment advice.</p>
      </Card>
    </>
  );
}
