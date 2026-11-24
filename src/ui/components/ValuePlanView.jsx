// Value Plan: one business-development document in five sections. Replaces the separate
// Simulator, Balanced Scorecard, Business Case and Board Memo tabs.
import React, { useMemo, useState } from 'react';
import { SECTORS, fmt, bridge, tornado, leverage, grid, buildMemo, renderMarkdown, memoVerdict, UAE_CORPORATE_TAX, evMultiple } from '../../engine/index.js';
import { Heatmap } from './Charts.jsx';
import { Icon } from './Icons.jsx';
import { PageHead, Section, Contents, Card, CardHead, KpiStrip, DotLine, DotRows, DotRing, DotColumns, DotTrack, FolderTabs, Pill, Dot, Segmented } from './Dots.jsx';

const { money, pct, months, unitValue } = fmt;
const toneOf = (x) => (x > 1e-9 ? 'pos' : x < -1e-9 ? 'neg' : '');
const signed = (x) => money(x, { sign: true });

const CONTENTS = [
  { id: 'vp-value', label: 'Value at stake' },
  { id: 'vp-drivers', label: 'Drivers' },
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
  const br = useMemo(() => bridge(sector, levers), [sector, levers]);
  const tor = useMemo(() => tornado(sector, levers), [sector, levers]);
  const lev = useMemo(() => leverage(sector, levers), [sector, levers]);
  const g = useMemo(() => grid(sector, levers, tor[0].id, tor[1].id), [sector, levers, tor]);
  // Bridge as dot ranges on a zoomed axis so small lever effects stay visible.
  const steps = [{ label: 'Baseline EBITDA', from: 0, to: br.start, total: true }];
  let cum = br.start;
  for (const s of br.steps) { steps.push({ label: s.label, from: cum, to: cum + s.delta, delta: s.delta }); cum += s.delta; }
  steps.push({ label: 'Scenario EBITDA', from: 0, to: br.end, total: true });
  const vals = steps.flatMap((s) => [s.from, s.to]).filter((v, i) => !(i % 2 === 0 && steps[i / 2]?.total));
  const hi = Math.max(...steps.map((s) => s.to), ...steps.map((s) => s.from));
  const lo = Math.max(0, Math.min(...vals, br.start, br.end) * 0.9);
  const sc = (v) => Math.max(0, (v - lo) / (hi - lo || 1));
  const maxSwing = Math.max(1, ...tor.slice(0, 7).flatMap((t) => [Math.abs(t.dLow), Math.abs(t.dHigh)]));
  return (
    <Section id="vp-drivers" n={2} title="What drives it" sub="The EBITDA bridge, the drivers that swing it most, and where to play next.">
      <div className="grid-2">
        <Card>
          <CardHead title="EBITDA bridge" sub={br.steps.length ? `Axis from ${money(lo)} so lever effects are visible` : 'Move a lever to build the bridge'} />
          <DotRows rows={steps.map((s) => ({ label: s.label, from: s.total ? 0 : sc(s.from), to: sc(s.to), tone: s.total ? 'ink' : s.delta >= 0 ? 'pos' : 'neg', value: s.total ? money(s.to) : signed(s.delta) }))} />
        </Card>
        <Card>
          <CardHead title="Sensitivity" sub="EBITDA swing for ±10% on each driver; widest first" />
          <DotRows rows={tor.slice(0, 7).map((t) => ({ label: t.label, from: 0.5 - Math.abs(Math.min(t.dLow, t.dHigh, 0)) / maxSwing / 2, to: 0.5 + Math.max(t.dLow, t.dHigh, 0) / maxSwing / 2, tone: 'accent', marker: 0.5, value: `±${money(t.swing / 2)}` }))} />
        </Card>
      </div>
      <FolderTabs value={view} onChange={setView} tabs={[{ id: 'next', label: 'Where to play next', count: lev.filter((x) => !x.atLimit).length }, { id: 'pl', label: 'P&L' }, { id: 'grid', label: 'Two-way sensitivity' }]} />
      <Card className="folder-body">
        {view === 'next' && <div className="table-wrap"><table className="data"><thead><tr><th>#</th><th>Lever</th><th className="r">EBITDA</th><th className="r">Value created</th><th className="r">Cost</th><th className="r">Payback</th><th>Owner</th><th /></tr></thead>
          <tbody>{lev.map((x, i) => <tr key={x.id} className={x.atLimit ? 'dim' : ''}><td className="muted">#{i + 1}</td><td>{x.label}</td><td className="r"><Pill value={x.gain}>{signed(x.gain)}</Pill></td><td className={`r ${toneOf(x.valueGain)}`}>{signed(x.valueGain)}</td><td className="r">{money(x.cost)}</td><td className="r">{x.gain > 0 ? months((x.cost / x.gain) * 12) : x.cashGain > 0 ? 'cash only' : '—'}</td><td className="muted">{x.owner}</td><td><button className="play" disabled={x.atLimit} onClick={() => onNudge(x.id)}>{x.atLimit ? 'At limit' : 'Play'}</button></td></tr>)}</tbody></table></div>}
        {view === 'pl' && <div className="table-wrap"><table className="data"><thead><tr><th>Line</th><th className="r">Baseline</th><th className="r">Scenario</th><th className="r">Change</th></tr></thead>
          <tbody>{e.cmp.base.lines.map((l, i) => { const s = e.cmp.scn.lines[i].value; return <tr key={l.label}><td>{l.label}</td><td className="r">{money(l.value)}</td><td className="r">{money(s)}</td><td className="r">{Math.abs(s - l.value) < 0.05 ? '—' : <Pill value={s - l.value}>{signed(s - l.value)}</Pill>}</td></tr>; })}
            <tr className="total"><td>EBITDA</td><td className="r">{money(e.cmp.base.ebitda)}</td><td className="r">{money(e.cmp.scn.ebitda)}</td><td className="r"><Pill value={e.cmp.dEbitda}>{signed(e.cmp.dEbitda)}</Pill></td></tr></tbody></table></div>}
        {view === 'grid' && <><p className="w-foot" style={{ marginTop: 0 }}>EBITDA across ±20% on the two most sensitive drivers. The outlined cell is the current scenario.</p><Heatmap g={g} /></>}
      </Card>
    </Section>
  );
}

function Scorecard({ e }) {
  const [p, setP] = useState('all');
  const persp = e.sc.perspectives;
  const items = e.sc.items.filter((k) => p === 'all' || k.perspective === p);
  const green = e.sc.items.filter((k) => k.status === 'green').length;
  return (
    <Section id="vp-scorecard" n={3} title="Balanced scorecard" sub={`${green} of ${e.sc.items.length} KPIs on target. Each ring is the share of a perspective's KPIs on target; the bars show each KPI against its target.`}>
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
  if (!bc.initiatives.length) return <Section id="vp-case" n={4} title="Business case" sub="Move a lever to turn it into an initiative with a business case."><Card className="empty-card">No initiatives yet. Move a lever on the left or press Play on a next best move.</Card></Section>;
  return (
    <Section id="vp-case" n={4} title="Business case" sub={`Five years, after ${pct(UAE_CORPORATE_TAX, { dp: 0 })} UAE corporate tax, discounted at ${pct(bc.wacc)}.`}>
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
    <Section id="vp-memo" n={5} title="Board memo" sub="The decision on one page. Every figure comes from the model above." actions={<>
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
