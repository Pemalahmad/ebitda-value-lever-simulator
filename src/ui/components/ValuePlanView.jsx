// Value Plan: one business-development document in five sections. Replaces the separate
// Simulator, Balanced Scorecard, Business Case and Board Memo tabs.
import React, { useMemo, useState } from 'react';
import { SECTORS, fmt, bridge, tornado, leverage, grid, buildMemo, renderMarkdown, memoVerdict, UAE_CORPORATE_TAX, evMultiple, lineBridge, rolling12, assumptionSummary } from '../../engine/index.js';
import { Heatmap } from './Charts.jsx';
import { Icon } from './Icons.jsx';
import { PageHead, Section, Contents, Card, CardHead, KpiStrip, DotLine, DotRows, DotRing, DotColumns, DotTrack, FolderTabs, Pill, Dot, Segmented, Waterfall, Status } from './Dots.jsx';

const { money, pct, months, unitValue } = fmt;
const toneOf = (x) => (x > 1e-9 ? 'pos' : x < -1e-9 ? 'neg' : '');
const signed = (x) => money(x, { sign: true });

const CONTENTS = [
  { id: 'vp-value', label: 'Value at stake' },
  { id: 'vp-drivers', label: 'Variance bridge' },
  { id: 'vp-r12', label: 'Rolling 12 months' },
  { id: 'vp-sens', label: 'Sensitivity' },
  { id: 'vp-scorecard', label: 'Balanced scorecard' },
  { id: 'vp-case', label: 'Business case' },
  { id: 'vp-memo', label: 'Board memo' },
];
const OBJECTIVES = {
  Financial: 'Grow EBITDA and enterprise value while protecting cash.',
  Customer: 'Raise guest, resident and client outcomes that sustain pricing power.',
  'Internal Process': 'Run assets and operations at best-in-class productivity.',
  'Learning & Growth': 'Build the digital and commercial capabilities that compound.',
};

export function ValuePlanView({ sector, levers, e, onNudge, onPickSector }) {
  const c = e.cmp, bc = e.bc;
  return (
    <div className="doc">
      <PageHead
        status={`Illustrative operating model · ${sector.scale}`}
        title={sector.company}
        muted="value plan"
        meta={[['Prepared by', 'Strategy & Value Creation'], ['Baseline EBITDA', money(c.base.ebitda)], ['Baseline EV', money(c.base.ev)], ['Initiatives', String(bc.initiatives.length)]]}
        actions={<>
          <label className="ws-select"><Icon name={sector.id} size={16} /><select value={sector.id} onChange={(ev) => onPickSector(ev.target.value)} aria-label="Business">{SECTORS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <button type="button" className="ghost sm" onClick={() => window.print()}><Icon name="print" size={14} /> Print</button>
        </>}
      />
      <Contents items={CONTENTS} />
      <ValueAtStake sector={sector} e={e} levers={levers} onNudge={onNudge} />
      <Drivers sector={sector} levers={levers} e={e} onNudge={onNudge} />
      <Rolling sector={sector} levers={levers} e={e} />
      <Sensitivity sector={sector} levers={levers} />
      <Scorecard e={e} />
      <Case sector={sector} e={e} />
      <Memo sector={sector} levers={levers} e={e} />
    </div>
  );
}

function ValueAtStake({ sector, levers, e, onNudge }) {
  const c = e.cmp, bc = e.bc;
  const [metric, setMetric] = useState('ebitda');
  const lev = useMemo(() => leverage(sector, levers).filter((x) => !x.atLimit).slice(0, 5), [sector, levers]);
  // Five-year path as the initiatives ramp to run rate (year 0 = today).
  const share = (i) => (i === 0 || !bc.runRate ? 0 : bc.yearly[i - 1] / bc.runRate);
  const years = [0, 1, 2, 3, 4, 5];
  const paths = {
    ebitda: { base: c.base.ebitda, s: years.map((i) => c.base.ebitda + (i ? bc.yearly[i - 1] : 0)) },
    ev: { base: c.base.ev, s: years.map((i) => c.base.ev + c.dEv * Math.max(0, Math.min(1, share(i)))) },
    value: { base: 0, s: years.map((i) => c.valueCreated * Math.max(0, Math.min(1, share(i)))) },
    cash: { base: 0, s: years.map((i) => bc.flows.slice(0, i + 1).reduce((a, x) => a + x, 0)) },
  };
  const p = paths[metric];
  const series = p.s.map((v, i) => ({ label: i ? `Year ${i}` : 'Today', value: v }));
  const budget = Math.min(1, c.invest / sector.budget);
  return (
    <Section id="vp-value" n={1} title="Value at stake" sub="What the current lever settings are worth, and how fast they arrive. Pick a measure to redraw the path.">
      <div className="split-main">
        <Card className="chart-card">
          <KpiStrip active={metric} onSelect={setMetric} items={[
            { id: 'ebitda', label: 'Run-rate EBITDA', value: money(c.scn.ebitda), delta: pct(c.dEbitdaPct, { sign: true }), tone: toneOf(c.dEbitda) },
            { id: 'ev', label: 'Enterprise value', value: money(c.scn.ev), delta: signed(c.dEv), tone: toneOf(c.dEv) },
            { id: 'value', label: 'Value created', value: signed(c.valueCreated), delta: pct(e.valueCreatedPct, { sign: true }), tone: toneOf(c.valueCreated) },
            { id: 'cash', label: 'Cumulative cash, after tax', value: signed(bc.flows.reduce((a, x) => a + x, 0)), sub: `payback ${months(bc.paybackMonths)}` },
          ]} />
          <DotLine series={series} baseline={p.base} format={(v) => money(v)} label="Five-year value path" />
          <p className="w-foot">Dashed line: baseline. Benefits ramp linearly to run rate; EV follows the EBITDA ramp at {sector.valuation.method === 'capRate' ? `a ${(sector.valuation.capRate * 100).toFixed(2)}% cap rate` : `${evMultiple(sector)}x EBITDA`}.</p>
        </Card>
        <div className="split-side">
          <Card className="ring-card">
            <DotRing value={e.confidence / 100} label={`${e.confidence}`} sub="board confidence" />
            <div><span className="w-eyebrow">Investment envelope</span><b className="big-num">{money(c.invest)}<span> / {money(sector.budget)}</span></b><DotTrack to={budget} tone={c.overBudget ? 'neg' : 'accent'} slots={28} /><span className="muted sm">{c.overBudget ? 'Over the envelope' : `${Math.round(budget * 100)}% of the envelope used`}</span></div>
          </Card>
          <Card>
            <CardHead title="Next best moves" sub="A further 10% on each lever, by value created" />
            <ul className="movers">{lev.map((x) => (
              <li key={x.id}><span className="mv-name">{x.label}<small>{x.owner}</small></span><span className={`mv-val ${toneOf(x.valueGain)}`}>{signed(x.valueGain)}</span><button type="button" className="play" onClick={() => onNudge(x.id)}>Play</button></li>
            ))}</ul>
          </Card>
        </div>
      </div>
    </Section>
  );
}

function Drivers({ sector, levers, e, onNudge }) {
  const [view, setView] = useState('next');
  const [by, setBy] = useState('lever');
  const br = useMemo(() => (by === 'lever' ? bridge(sector, levers) : lineBridge(sector, levers)), [sector, levers, by]);
  const lev = useMemo(() => leverage(sector, levers), [sector, levers]);
  const tor = useMemo(() => tornado(sector, levers), [sector, levers]);
  const g = useMemo(() => grid(sector, levers, tor[0].id, tor[1].id), [sector, levers, tor]);
  return (
    <Section id="vp-drivers" n={2} title="Variance bridge" sub="Baseline to scenario EBITDA, by lever or by P&L line. Every bar is a variance you can trace to an owner.">
      <div className="split-main">
        <Card>
          <CardHead title="EBITDA variance, baseline to scenario" sub={br.steps.length ? `${br.steps.length} movements · ${signed(br.end - br.start)} net` : 'Move a lever to build the bridge'} right={<Segmented value={by} onChange={setBy} label="Bridge by" options={[['lever', 'By lever'], ['line', 'By P&L line']]} />} />
          <Waterfall bridge={br} startLabel="Baseline EBITDA" endLabel="Scenario EBITDA" format={(v) => money(v)} height={380} />
        </Card>
        <KpiWatch sector={sector} e={e} />
      </div>
      <FolderTabs value={view} onChange={setView} tabs={[{ id: 'next', label: 'Where to play next', count: lev.filter((x) => !x.atLimit).length }, { id: 'pl', label: 'P&L variance' }, { id: 'grid', label: 'Two-way sensitivity' }]} />
      <Card className="folder-body">
        {view === 'next' && <div className="table-wrap"><table className="data"><thead><tr><th>#</th><th>Lever</th><th className="r">EBITDA</th><th className="r">Value created</th><th className="r">Cost</th><th className="r">Payback</th><th>Owner</th><th /></tr></thead>
          <tbody>{lev.map((x, i) => <tr key={x.id} className={x.atLimit ? 'dim' : ''}><td className="muted">#{i + 1}</td><td>{x.label}</td><td className="r"><Pill value={x.gain}>{signed(x.gain)}</Pill></td><td className={`r ${toneOf(x.valueGain)}`}>{signed(x.valueGain)}</td><td className="r">{money(x.cost)}</td><td className="r">{x.gain > 0 ? months((x.cost / x.gain) * 12) : x.cashGain > 0 ? 'cash only' : '—'}</td><td className="muted">{x.owner}</td><td><button className="play" disabled={x.atLimit} onClick={() => onNudge(x.id)}>{x.atLimit ? 'At limit' : 'Play'}</button></td></tr>)}</tbody></table></div>}
        {view === 'pl' && <div className="table-wrap"><table className="data"><thead><tr><th>Line</th><th className="r">Baseline</th><th className="r">Scenario</th><th className="r">Variance</th><th className="r">Variance %</th></tr></thead>
          <tbody>{e.cmp.base.lines.map((l, i) => { const s2 = e.cmp.scn.lines[i].value; const d = s2 - l.value; return <tr key={l.label}><td>{l.label}</td><td className="r">{money(l.value)}</td><td className="r">{money(s2)}</td><td className="r">{Math.abs(d) < 0.05 ? '—' : <Pill value={d}>{signed(d)}</Pill>}</td><td className="r muted">{Math.abs(d) < 0.05 ? '—' : pct(d / Math.abs(l.value), { sign: true })}</td></tr>; })}
            <tr className="total"><td>EBITDA</td><td className="r">{money(e.cmp.base.ebitda)}</td><td className="r">{money(e.cmp.scn.ebitda)}</td><td className="r"><Pill value={e.cmp.dEbitda}>{signed(e.cmp.dEbitda)}</Pill></td><td className="r">{pct(e.cmp.dEbitdaPct, { sign: true })}</td></tr></tbody></table></div>}
        {view === 'grid' && <><p className="w-foot" style={{ marginTop: 0 }}>EBITDA across ±20% on the two most sensitive drivers. The outlined cell is the current scenario.</p><Heatmap g={g} /></>}
      </Card>
    </Section>
  );
}

// The KPIs to watch, each with its threshold and status.
function KpiWatch({ sector, e }) {
  const c = e.cmp, bc = e.bc;
  const green = e.sc.items.filter((k) => k.status === 'green').length / e.sc.items.length;
  const high = c.scn.flags.filter((f) => f.severity === 'high').length;
  const rows = [
    { k: 'EBITDA margin', v: pct(c.scn.margin), t: `≥ ${pct(c.base.margin)} baseline`, s: c.scn.margin >= c.base.margin - 1e-9 ? 'ok' : 'breach' },
    { k: 'Payback', v: months(bc.paybackMonths), t: '≤ 24 months', s: !bc.initiatives.length || bc.paybackMonths <= 24 ? 'ok' : bc.paybackMonths <= 36 ? 'near' : 'breach' },
    { k: 'Envelope used', v: pct(c.invest / sector.budget, { dp: 0 }), t: '≤ 100%', s: c.invest <= sector.budget * 0.85 ? 'ok' : c.invest <= sector.budget ? 'near' : 'breach' },
    { k: 'Five-year NPV', v: signed(bc.npv), t: '> 0', s: !bc.initiatives.length || bc.npv > 0 ? 'ok' : 'breach' },
    { k: 'Board confidence', v: `${e.confidence}/100`, t: '≥ 70', s: e.confidence >= 70 ? 'ok' : e.confidence >= 55 ? 'near' : 'breach' },
    { k: 'Scorecard on target', v: pct(green, { dp: 0 }), t: '≥ 75%', s: green >= 0.75 ? 'ok' : green >= 0.5 ? 'near' : 'breach' },
    { k: 'High-severity risks', v: String(high), t: '0', s: high === 0 ? 'ok' : 'breach' },
  ];
  return (
    <Card>
      <CardHead title="KPIs to watch" sub={`${rows.filter((r) => r.s !== 'ok').length} need attention`} />
      <ul className="watch">{rows.map((r) => <li key={r.k}><span className="w-k">{r.k}<small>{r.t}</small></span><b>{r.v}</b><Status s={r.s} /></li>)}</ul>
    </Card>
  );
}

function Rolling({ sector, levers, e }) {
  const [view, setView] = useState('r12');
  const r = useMemo(() => rolling12(sector, levers, 36), [sector, levers]);
  const runRate = e.cmp.scn.ebitda;
  const gap = runRate - e.cmp.base.ebitda;
  const to90 = gap > 0 ? r.find((m) => m.r12 - e.cmp.base.ebitda >= gap * 0.9)?.month : null;
  const series = r.map((m) => ({ label: `M${m.month}`, value: view === 'r12' ? m.r12 : m.monthly }));
  return (
    <Section id="vp-r12" n={3} title="Rolling 12 months" sub="Trailing-twelve-month EBITDA as initiatives ramp to run rate. Months before the plan run at baseline, so the first points are honest.">
      <Card className="chart-card">
        <KpiStrip items={[
          { id: 'm12', label: 'R12M at month 12', value: money(r[11].r12), delta: signed(r[11].r12 - e.cmp.base.ebitda), tone: toneOf(r[11].r12 - e.cmp.base.ebitda) },
          { id: 'm24', label: 'R12M at month 24', value: money(r[23].r12), delta: signed(r[23].r12 - e.cmp.base.ebitda), tone: toneOf(r[23].r12 - e.cmp.base.ebitda) },
          { id: 'rr', label: 'Run rate', value: money(runRate), sub: 'all initiatives at full effect' },
          { id: 't90', label: '90% of the uplift in R12M', value: to90 ? `Month ${to90}` : '—', sub: gap > 0 ? 'time to bank the plan' : 'no uplift to bank' },
        ]} />
        <div className="chart-tools"><Segmented value={view} onChange={setView} label="Series" options={[['r12', 'Rolling 12 months'], ['m', 'Monthly']]} /></div>
        <DotLine series={series} baseline={view === 'r12' ? e.cmp.base.ebitda : e.cmp.base.ebitda / 12} format={(v) => money(v)} label="Rolling twelve-month EBITDA" xLabels={6} />
        <p className="w-foot">Dashed line: baseline {view === 'r12' ? 'annual' : 'monthly'} EBITDA. Linear ramp per initiative, as in the business case.</p>
      </Card>
    </Section>
  );
}

function Sensitivity({ sector, levers }) {
  const [shock, setShock] = useState(0.1);
  const [pick, setPick] = useState(null);
  const a = useMemo(() => assumptionSummary(sector, levers, shock), [sector, levers, shock]);
  const max = Math.max(1e-9, ...a.rows.flatMap((r) => [Math.abs(r.low), Math.abs(r.high)]));
  const sel = a.rows.find((r) => r.id === pick) ?? a.rows[0];
  return (
    <Section id="vp-sens" n={4} title="Assumption sensitivity summary" sub="How far EBITDA moves when each assumption moves, from the current selection. Change the shock size; click a driver for its detail." actions={<Segmented value={shock} onChange={setShock} label="Shock" options={[[0.05, '±5%'], [0.1, '±10%'], [0.2, '±20%']]} />}>
      <div className="split-main">
        <Card>
          <CardHead title={`EBITDA swing for ±${Math.round(shock * 100)}% on each assumption`} sub={`Around ${money(a.ebitda)} current EBITDA; widest first`} right={<span className="legend"><Dot tone="neg" /> downside <Dot tone="pos" /> upside</span>} />
          <div className="tornado2">{a.rows.map((r) => {
            const lo = Math.min(r.low, r.high), hi = Math.max(r.low, r.high);
            return (
              <button type="button" key={r.id} className={`t2-row ${sel.id === r.id ? 'on' : ''}`} onClick={() => setPick(r.id)}>
                <span className="t2-label">{r.label}{r.moved && <i className="t2-moved" title="Moved from baseline" />}</span>
                <span className="t2-track"><i className="t2-mid" />
                  {lo < 0 && <i className="t2-bar neg" style={{ left: `${50 - (Math.abs(lo) / max) * 50}%`, width: `${(Math.abs(lo) / max) * 50}%` }} />}
                  {hi > 0 && <i className="t2-bar pos" style={{ left: '50%', width: `${(hi / max) * 50}%` }} />}
                </span>
                <span className="t2-val"><span className="neg">{money(lo, { sign: true })}</span> <span className="pos">{money(hi, { sign: true })}</span></span>
              </button>
            );
          })}</div>
        </Card>
        <div className="split-side">
          <Card className="ring-card">
            <DotRing value={sel.share} label={pct(sel.share, { dp: 0 })} sub="of total swing" size={120} n={40} />
            <div><span className="w-eyebrow">Selected driver</span><b className="big-num" style={{ fontSize: 17 }}>{sel.label}</b><span className="muted sm">{sel.owner} · {sel.group}</span></div>
          </Card>
          <Card>
            <ul className="watch">
              <li><span className="w-k">Elasticity<small>% EBITDA per 1% of the driver</small></span><b>{sel.elasticity.toFixed(2)}</b><span /></li>
              <li><span className="w-k">Downside<small>−{Math.round(shock * 100)}% move</small></span><b className={toneOf(sel.low)}>{signed(sel.low)}</b><span /></li>
              <li><span className="w-k">Upside<small>+{Math.round(shock * 100)}% move</small></span><b className={toneOf(sel.high)}>{signed(sel.high)}</b><span /></li>
              <li><span className="w-k">Headroom<small>room left in the value-creating direction</small></span><b>{pct(sel.headroom, { dp: 0 })}</b><span /></li>
            </ul>
            <p className="w-foot">Top three drivers carry {pct(a.rows.slice(0, 3).reduce((x, r) => x + r.share, 0), { dp: 0 })} of the total swing: govern them most tightly.</p>
          </Card>
        </div>
      </div>
    </Section>
  );
}

function Scorecard({ e }) {
  const [p, setP] = useState('all');
  const persp = e.sc.perspectives;
  const items = e.sc.items.filter((k) => p === 'all' || k.perspective === p);
  const green = e.sc.items.filter((k) => k.status === 'green').length;
  return (
    <Section id="vp-scorecard" n={5} title="Balanced scorecard" sub={`${green} of ${e.sc.items.length} KPIs on target. Each ring is the share of a perspective's KPIs on target; the bars show each KPI against its target.`}>
      <div className="ring-row">
        {persp.map((x) => {
          const on = x.items.filter((k) => k.status === 'green').length;
          return (
            <Card key={x.name} className={`persp ${p === x.name ? 'on' : ''}`} role="button" tabIndex={0} onClick={() => setP(p === x.name ? 'all' : x.name)} onKeyDown={(ev) => ev.key === 'Enter' && setP(p === x.name ? 'all' : x.name)}>
              <DotRing value={on / x.items.length} label={`${on}/${x.items.length}`} sub="on target" size={112} n={36} tone={x.status === 'green' ? 'pos' : x.status === 'amber' ? 'amber' : 'neg'} />
              <div><h4><Dot tone={x.status} /> {x.name}</h4><p>{OBJECTIVES[x.name]}</p></div>
            </Card>
          );
        })}
      </div>
      <FolderTabs value={p} onChange={setP} tabs={[{ id: 'all', label: 'All KPIs', count: e.sc.items.length }, ...persp.map((x) => ({ id: x.name, label: x.name, count: x.items.length }))]} right={<span className="legend"><Dot tone="green" /> On target <Dot tone="amber" /> Within 5% <Dot tone="red" /> Off target</span>} />
      <Card className="folder-body">
        <DotRows valueWidth={170} rows={items.map((k) => {
          const hi = Math.max(k.value, k.target) * 1.25 || 1;
          return { label: k.label, to: k.value / hi, marker: k.target / hi, tone: k.status === 'green' ? 'pos' : k.status === 'amber' ? 'amber' : 'neg', value: `${unitValue(k.value, k.unit)} / ${k.better === 'higher' ? '≥' : '≤'} ${unitValue(k.target, k.unit)}`, title: `${k.perspective} · target marked` };
        })} />
      </Card>
    </Section>
  );
}

function Case({ sector, e }) {
  const bc = e.bc;
  if (!bc.initiatives.length) return <Section id="vp-case" n={6} title="Business case" sub="Move a lever to turn it into an initiative with a business case."><Card className="empty-card">No initiatives yet. Move a lever on the left or press Play on a next best move.</Card></Section>;
  return (
    <Section id="vp-case" n={6} title="Business case" sub={`Five years, after ${pct(UAE_CORPORATE_TAX, { dp: 0 })} UAE corporate tax, discounted at ${pct(bc.wacc)}.`}>
      <Card>
        <KpiStrip items={[
          { id: 'npv', label: '5-year NPV', value: signed(bc.npv), tone: toneOf(bc.npv) },
          { id: 'irr', label: 'IRR', value: Number.isFinite(bc.irr) ? pct(bc.irr) : bc.irr === Infinity ? '> 1,000%' : 'n/a' },
          { id: 'pb', label: 'Payback', value: months(bc.paybackMonths) },
          { id: 'inv', label: 'One-off investment', value: money(bc.invest), sub: `${money(sector.budget)} envelope` },
        ]} />
        <div className="grid-2 case-charts">
          <div><span className="w-eyebrow">Benefits by year, pre-tax</span><DotColumns cols={[{ label: 'Year 0', value: -bc.invest }, ...bc.yearly.map((y, i) => ({ label: `Year ${i + 1}`, value: y }))]} format={(v) => money(v, { sign: true })} /></div>
          <div><span className="w-eyebrow">Cumulative cash, after tax</span><DotLine height={190} series={bc.flows.map((_, i) => ({ label: `Y${i}`, value: bc.flows.slice(0, i + 1).reduce((a, x) => a + x, 0) }))} baseline={0} format={(v) => money(v, { dp: 0 })} label="Cumulative cash" /></div>
        </div>
      </Card>
      <Card>
        <CardHead title="Initiative portfolio" sub="PMO view: one owner per initiative" />
        <div className="table-wrap"><table className="data"><thead><tr><th>Initiative</th><th>Change</th><th className="r">Run-rate EBITDA</th><th className="r">Investment</th><th className="r">Ramp</th><th className="r">Payback</th><th>Owner</th></tr></thead>
          <tbody>{bc.initiatives.map((i) => <tr key={i.id}><td>{i.label}</td><td className="mono sm">{unitValue(i.from, i.unit)} → {unitValue(i.to, i.unit)}</td><td className="r">{Math.abs(i.runRate) < 0.05 ? <span className="muted">cash lever</span> : <Pill value={i.runRate}>{signed(i.runRate)}</Pill>}</td><td className="r">{money(i.investment)}</td><td className="r">{i.rampMonths} mo</td><td className="r">{Math.abs(i.runRate) < 0.05 ? '—' : months(i.paybackMonths)}</td><td className="muted">{i.owner}</td></tr>)}</tbody></table></div>
      </Card>
    </Section>
  );
}

const VERDICT_TONE = { Approve: 'pos', 'Approve with conditions': 'amber', 'Do not approve as framed': 'neg', Baseline: 'ink' };

function Memo({ sector, levers, e }) {
  const md = useMemo(() => buildMemo(sector, levers), [sector, levers]);
  const [text, setText] = useState(false);
  const [copied, setCopied] = useState(false);
  const verdict = memoVerdict(e);
  const c = e.cmp, bc = e.bc, flags = c.scn.flags;
  const lev = leverage(sector, levers).filter((x) => !x.atLimit && x.valueGain > 0).slice(0, 3);
  const maxRun = Math.max(1e-9, ...bc.initiatives.map((i) => Math.abs(i.runRate)));
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); a.download = `board-memo-${sector.id}.md`; a.click(); URL.revokeObjectURL(a.href); };
  const copy = async () => { try { await navigator.clipboard.writeText(md); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } };
  const headline = verdict === 'Baseline'
    ? `No levers moved. Explore ${lev.map((x) => x.label).join(', ')} first.`
    : `${bc.initiatives.length} initiatives move EBITDA ${signed(c.dEbitda)} and create ${signed(c.valueCreated)} of value for ${money(c.invest)}.`;
  return (
    <Section id="vp-memo" n={7} title="Board memo" sub="The decision on one page. Every figure comes from the model above." actions={<>
      <button type="button" className="ghost sm" onClick={copy}><Icon name="copy" size={14} /> {copied ? 'Copied' : 'Copy text'}</button>
      <button type="button" className="ghost sm" onClick={download}><Icon name="download" size={14} /> .md</button>
    </>}>
      <div className="memo-grid">
        <Card className={`verdict ${VERDICT_TONE[verdict]}`}>
          <span className="w-eyebrow">Recommendation</span>
          <b className="verdict-word">{verdict}</b>
          <p>{headline}</p>
          {verdict !== 'Baseline' && <dl className="verdict-facts">
            <div><dt>NPV</dt><dd>{signed(bc.npv)}</dd></div>
            <div><dt>IRR</dt><dd>{Number.isFinite(bc.irr) ? pct(bc.irr) : bc.irr === Infinity ? 'self-funding' : 'n/a'}</dd></div>
            <div><dt>Payback</dt><dd>{months(bc.paybackMonths)}</dd></div>
            <div><dt>Confidence</dt><dd>{e.confidence}/100</dd></div>
          </dl>}
        </Card>
        <Card>
          <CardHead title={verdict === 'Baseline' ? 'Levers to explore first' : 'Value by initiative'} sub={verdict === 'Baseline' ? 'Value created per further 10% move' : 'Run-rate EBITDA'} />
          <DotRows rows={verdict === 'Baseline'
            ? lev.map((x) => ({ label: x.label, to: x.valueGain / Math.max(...lev.map((y) => y.valueGain)), tone: 'accent', value: signed(x.valueGain) }))
            : bc.initiatives.map((i) => ({ label: i.label, to: Math.abs(i.runRate) / maxRun, tone: i.runRate >= 0 ? 'pos' : 'neg', value: Math.abs(i.runRate) < 0.05 ? 'cash' : signed(i.runRate) }))} />
        </Card>
        <Card>
          <CardHead title="Risks the board should see" sub={flags.length ? `${flags.length} flags, ${flags.filter((f) => f.severity === 'high').length} high` : 'No flags'} />
          {flags.length ? <ul className="risk-list">{flags.map((f) => <li key={f.title}><Dot tone={f.severity === 'high' ? 'red' : f.severity === 'medium' ? 'amber' : 'green'} /><div><b>{f.title}</b><span>{f.mitigation} · {f.owner}</span></div></li>)}</ul>
            : <p className="muted sm">Every lever sits inside the range the model treats as operationally credible.</p>}
        </Card>
      </div>
      <Card>
        <CardHead title="Decisions requested" right={<button type="button" className="ghost sm" onClick={() => setText((v) => !v)}>{text ? 'Hide full memo' : 'Read full memo'}</button>} />
        <ol className="decisions">{verdict === 'Baseline'
          ? <li>Mandate Strategy & Value Creation to build a full business case for the top three levers.</li>
          : <><li>Approve {money(c.invest)} of one-off investment to deliver {signed(c.dEbitda)} of run-rate EBITDA.</li><li>Confirm the initiative owners and the scorecard targets as the tracking baseline.</li>{flags.length > 0 && <li>Endorse the {flags.length} mitigation{flags.length > 1 ? 's' : ''} as conditions of release.</li>}</>}
        </ol>
        {text && <article className="memo" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />}
      </Card>
    </Section>
  );
}

export { Segmented };
