import React, { useMemo, useRef, useState } from 'react';
import { SECTORS, compare, PLAYS, runPlay, fmt } from '../../engine/index.js';
import { PageHead, Section, Card, CardHead, KpiStrip, DotRows, DotTrack, Pill } from './Dots.jsx';
import { SwarmCursor } from './SwarmCursor.jsx';

const { money } = fmt;
const signed = (x) => money(x, { sign: true });
const tone = (value) => (value > 0.5 ? 'pos' : value < -0.5 ? 'neg' : '');
const HUES = ['var(--text)', 'var(--gold)', 'var(--pos)', 'var(--amber)', 'var(--hue-5)', 'var(--hue-6)'];

export function portfolioSotp(bySector, plays) {
  const rows = SECTORS.map((sector) => {
    const comparison = compare(sector, bySector[sector.id] ?? {});
    return { id: sector.id, name: sector.name, baseEv: comparison.base.ev, ev: comparison.scn.ev, uplift: comparison.valueCreated };
  });
  const activePlays = PLAYS.filter((play) => plays[play.id]?.on).map((play) => ({ play, result: runPlay(play, plays[play.id].params) }));
  const baseEv = rows.reduce((sum, row) => sum + row.baseEv, 0);
  const operating = rows.reduce((sum, row) => sum + row.uplift, 0);
  const playValue = activePlays.reduce((sum, item) => sum + item.result.value, 0);
  const cash = activePlays.reduce((sum, item) => sum + item.result.cash, 0);
  return { rows, activePlays, baseEv, operating, playValue, cash, total: baseEv + operating + playValue };
}

export function PortfolioView({ bySector, plays, setPlays, onOpenSector }) {
  const scope = useRef(null);
  const portfolio = useMemo(() => portfolioSotp(bySector, plays), [bySector, plays]);
  const [view, setView] = useState('mix');
  const [focus, setFocus] = useState(null);
  const toggle = (id) => setPlays((current) => ({ ...current, [id]: { on: !current[id]?.on, params: current[id]?.params ?? {} } }));
  const setParam = (id, key, value) => setPlays((current) => ({ ...current, [id]: { on: true, params: { ...(current[id]?.params ?? {}), [key]: value } } }));
  const change = portfolio.total - portfolio.baseEv;

  // Bridge: baseline -> each model's operating uplift -> each active play -> scenario value.
  const steps = [
    ...portfolio.rows.filter((r) => Math.abs(r.uplift) > 0.5).map((r) => ({ label: `${r.name}: levers`, delta: r.uplift })),
    ...portfolio.activePlays.map(({ play, result }) => ({ label: play.title, delta: result.value })),
  ];
  const lo = portfolio.baseEv * 0.92;
  const hi = Math.max(portfolio.baseEv, portfolio.total, ...steps.reduce((acc, s) => { const last = acc.length ? acc.at(-1) : portfolio.baseEv; return [...acc, last + s.delta]; }, [])) * 1.01;
  const sc = (v) => Math.max(0, (v - lo) / (hi - lo || 1));
  let cum = portfolio.baseEv;
  const bridgeRows = [{ label: 'Baseline portfolio EV', from: 0, to: sc(portfolio.baseEv), tone: 'ink', value: money(portfolio.baseEv) },
    ...steps.map((s) => { const r = { label: s.label, from: sc(cum), to: sc(cum + s.delta), tone: s.delta >= 0 ? 'pos' : 'neg', value: signed(s.delta) }; cum += s.delta; return r; }),
    { label: 'Scenario value', from: 0, to: sc(portfolio.total), tone: 'accent', value: money(portfolio.total) }];

  return <div className="doc" ref={scope}>
    <SwarmCursor scope={scope} />
    <PageHead status={`Six illustrative operating models · ${portfolio.activePlays.length} of ${PLAYS.length} plays active`} title="Portfolio lab" muted="sum of the parts"
      sub="Combine the six operating models into one portfolio, then switch on financing and portfolio plays and watch the value move. A scenario workspace, not a valuation of any named company." />

    <Section n={1} title="Portfolio value" sub="Pick a measure. Hover a business to isolate it; click to open its value plan.">
      <Card className="chart-card">
        <KpiStrip active={view} onSelect={setView} items={[
          { id: 'mix', label: 'Modelled portfolio EV', value: money(portfolio.baseEv), sub: 'six baselines' },
          { id: 'bridge', label: 'Scenario value', value: money(portfolio.total), delta: `${((change / portfolio.baseEv) * 100).toFixed(1)}%`, tone: tone(change) },
          { id: 'ops', label: 'Operating value created', value: signed(portfolio.operating), tone: tone(portfolio.operating) },
          { id: 'plays', label: 'Value from plays', value: signed(portfolio.playValue), sub: `net cash ${signed(portfolio.cash)}` },
        ]} />
        {view === 'mix' && <Composition rows={portfolio.rows} focus={focus} setFocus={setFocus} onOpen={onOpenSector} />}
        {view === 'bridge' && <div className="pad"><DotRows rows={bridgeRows} valueWidth={110} /><p className="w-foot">Axis starts at {money(lo)} so each step is visible.</p></div>}
        {view === 'ops' && <div className="pad"><DotRows valueWidth={110} onRow={(r) => onOpenSector(r.id)} rows={portfolio.rows.map((r) => ({ id: r.id, label: r.name, to: Math.abs(r.uplift) / Math.max(1, ...portfolio.rows.map((x) => Math.abs(x.uplift))), tone: r.uplift >= 0 ? 'pos' : 'neg', value: Math.abs(r.uplift) < 0.5 ? '—' : signed(r.uplift), dim: Math.abs(r.uplift) < 0.5 }))} /><p className="w-foot">{portfolio.operating ? 'Click a business to open its levers.' : 'No levers moved yet. Click a business to open its value plan.'}</p></div>}
        {view === 'plays' && <div className="pad"><DotRows valueWidth={110} rows={PLAYS.map((p) => { const on = plays[p.id]?.on; const r = runPlay(p, plays[p.id]?.params); return { label: p.title, to: Math.abs(r.value) / Math.max(1, ...PLAYS.map((x) => Math.abs(runPlay(x, plays[x.id]?.params).value))), tone: on ? (r.value >= 0 ? 'pos' : 'neg') : 'faint', value: signed(r.value), dim: !on }; })} /><p className="w-foot">Faded rows are plays not yet switched on; their value is what they would add.</p></div>}
      </Card>
    </Section>

    <Section n={2} title="Portfolio plays" sub="Switch a play on and tune its assumptions. The value bar and the portfolio figures above update as you drag.">
      <div className="play-grid">{PLAYS.map((play) => {
        const state = plays[play.id];
        const result = runPlay(play, state?.params);
        const max = Math.max(1, ...PLAYS.map((x) => Math.abs(runPlay(x, plays[x.id]?.params).value)));
        return <Card key={play.id} className={`play-card ${state?.on ? 'on' : ''}`}>
          <header><div><span className="w-eyebrow">{play.archetype}</span><h4>{play.title}</h4></div><button type="button" className={`switch ${state?.on ? 'on' : ''}`} onClick={() => toggle(play.id)} aria-pressed={!!state?.on} aria-label={`Include ${play.title}`}><span /></button></header>
          <p className="play-sum">{play.summary}</p>
          <div className="play-value"><b className={tone(result.value)}>{signed(result.value)}</b><DotTrack to={Math.abs(result.value) / max} tone={state?.on ? (result.value >= 0 ? 'pos' : 'neg') : 'faint'} slots={30} /></div>
          {state?.on && <div className="play-params">{play.params.map((parameter) => <label key={parameter.id} className="pp"><span className="pp-top"><span>{parameter.label}</span><b className="mono">{fmt.unitValue(result.params[parameter.id], parameter.unit === 'AED' && parameter.base > 1000 ? 'AED' : parameter.unit, parameter.step < 1 ? 1 : 0)}</b></span><input type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={result.params[parameter.id]} onChange={(event) => setParam(play.id, parameter.id, Number(event.target.value))} /></label>)}</div>}
          <div className="play-lines">{result.lines.map((line) => <div key={line.label}><span>{line.label}</span><Pill value={line.value}>{signed(line.value)}</Pill></div>)}</div>
          {state?.on && (result.risks.length > 0 || result.notes.length > 0) && <details className="play-more"><summary>Notes and risks</summary>{result.notes.map((note) => <p key={note} className="muted sm">{note}</p>)}{result.risks.map((risk) => <p key={risk} className="risk-line">{risk}</p>)}</details>}
        </Card>;
      })}</div>
    </Section>
  </div>;
}

// Each dot is 1% of portfolio EV, coloured by business. Hover a business to isolate it.
function Composition({ rows, focus, setFocus, onOpen }) {
  const total = rows.reduce((a, r) => a + r.baseEv, 0);
  const counts = rows.map((r) => Math.round((r.baseEv / total) * 100));
  counts[counts.indexOf(Math.max(...counts))] += 100 - counts.reduce((a, b) => a + b, 0);
  const dots = counts.flatMap((n, i) => Array.from({ length: n }, () => i));
  const f = focus != null ? rows.findIndex((r) => r.id === focus) : -1;
  return (
    <div className="composition" onMouseLeave={() => setFocus(null)}>
      <div className="comp-grid" aria-label="Portfolio composition, one dot per 1% of EV">
        {dots.map((i, k) => <i key={k} style={{ background: HUES[i], transitionDelay: `${(k % 10) * 12}ms` }} className={f >= 0 && f !== i ? 'fade' : ''} onMouseEnter={() => setFocus(rows[i].id)} onClick={() => onOpen(rows[i].id)} />)}
      </div>
      <ul className="comp-legend">{rows.map((r, i) => (
        <li key={r.id} className={f === i ? 'on' : f >= 0 ? 'fade' : ''} onMouseEnter={() => setFocus(r.id)}>
          <button type="button" onClick={() => onOpen(r.id)}>
            <i style={{ background: HUES[i] }} /><span className="cl-name">{r.name}</span>
            <span className="cl-share">{counts[i]}%</span><span className="cl-ev">{money(r.ev)}</span>
            <span className={`cl-up ${tone(r.uplift)}`}>{Math.abs(r.uplift) < 0.5 ? 'baseline' : signed(r.uplift)}</span>
          </button>
        </li>
      ))}</ul>
    </div>
  );
}
