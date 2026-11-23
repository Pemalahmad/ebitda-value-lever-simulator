import React, { useMemo } from 'react';
import { SECTORS, compare, PLAYS, runPlay, fmt } from '../../engine/index.js';
import { Waterfall } from './Charts.jsx';

const { money } = fmt;

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
  const portfolio = useMemo(() => portfolioSotp(bySector, plays), [bySector, plays]);
  const bridge = {
    start: portfolio.baseEv,
    end: portfolio.total,
    steps: [
      ...portfolio.rows.filter((row) => Math.abs(row.uplift) > 0.5).map((row) => ({ id: row.id, label: `${row.name}: operating levers`, delta: row.uplift })),
      ...portfolio.activePlays.map(({ play, result }) => ({ id: play.id, label: play.title, delta: result.value })),
    ],
  };
  const toggle = (id) => setPlays((current) => ({ ...current, [id]: { on: !current[id]?.on, params: current[id]?.params ?? {} } }));
  const setParam = (id, key, value) => setPlays((current) => ({ ...current, [id]: { on: true, params: { ...(current[id]?.params ?? {}), [key]: value } } }));

  return <>
    <section className="card hero">
      <div className="eyebrow">Portfolio scenario lab</div>
      <h3>Connect market signals to a value-creation plan</h3>
      <p className="card-sub">Combine the six illustrative operating models into a sum-of-the-parts view, then test transparent financing and portfolio plays. This is a scenario workspace—not a profile of any named company or a valuation recommendation.</p>
      <div className="facts">
        <Fact value="6" label="sector models" />
        <Fact value={String(PLAYS.length)} label="portfolio plays" />
        <Fact value="AED m" label="model currency" />
        <Fact value="Live" label="scenario bridge" />
      </div>
    </section>

    <div className="tiles">
      <Tile label="Modelled portfolio EV" value={money(portfolio.baseEv)} sub="Sum of six illustrative sector baselines" />
      <Tile label="Operating value created" value={money(portfolio.operating, { sign: true })} tone={tone(portfolio.operating)} sub="Lever moves across the portfolio" />
      <Tile label="Value from plays" value={money(portfolio.playValue, { sign: true })} tone={tone(portfolio.playValue)} sub={`${portfolio.activePlays.length} of ${PLAYS.length} plays active`} />
      <Tile label="Net cash raised / deployed" value={money(portfolio.cash, { sign: true })} tone={tone(portfolio.cash)} sub="Proceeds less acquisitions and costs" />
      <Tile label="Scenario value" value={money(portfolio.total)} tone={tone(portfolio.total - portfolio.baseEv)} sub={`${(((portfolio.total - portfolio.baseEv) / portfolio.baseEv) * 100).toFixed(1)}% vs baseline`} />
    </div>

    <div className="grid-2">
      <section className="card">
        <h3>Portfolio value bridge</h3>
        <p className="card-sub">From the modelled baseline to the current scenario: operating levers first, then active portfolio plays.</p>
        {bridge.steps.length ? <Waterfall bridge={bridge} startLabel="Baseline portfolio EV" endLabel="Scenario value" /> : <div className="empty">Switch on a play below, or move levers in an operating model.</div>}
      </section>
      <section className="card">
        <h3>Sum of the parts</h3>
        <p className="card-sub">Each model at its current scenario. Select a row to open its operating levers.</p>
        <table className="data"><thead><tr><th>Model</th><th className="r">Baseline EV</th><th className="r">Scenario EV</th><th className="r">Value created</th></tr></thead>
          <tbody>{portfolio.rows.map((row) => <tr key={row.id} className="clickable" onClick={() => onOpenSector(row.id)}><td>{row.name}</td><td className="r">{money(row.baseEv)}</td><td className="r">{money(row.ev)}</td><td className={`r ${tone(row.uplift)}`}>{Math.abs(row.uplift) < 0.5 ? '—' : money(row.uplift, { sign: true })}</td></tr>)}</tbody>
        </table>
      </section>
    </div>

    <section className="card">
      <h3>Portfolio value plays</h3>
      <p className="card-sub">Turn on a play and adjust its assumptions. Each mini-model exposes its value bridge, cash effect, risks and calculation notes.</p>
      <div className="plays">{PLAYS.map((play) => {
        const state = plays[play.id];
        const result = runPlay(play, state?.params);
        return <div key={play.id} className={`playcard ${state?.on ? 'on' : ''}`}>
          <div className="play-head"><div><div className="tag-arch">{play.archetype}</div><div className="play-title">{play.title}</div></div><button className={`switch ${state?.on ? 'on' : ''}`} onClick={() => toggle(play.id)} aria-pressed={!!state?.on} aria-label={`Include ${play.title}`}><span /></button></div>
          <p className="play-sum">{play.summary}</p>
          {state?.on && <div className="play-params">{play.params.map((parameter) => <label key={parameter.id} className="pp"><span className="pp-top"><span>{parameter.label}</span><b className="mono">{fmt.unitValue(result.params[parameter.id], parameter.unit === 'AED' && parameter.base > 1000 ? 'AED' : parameter.unit, parameter.step < 1 ? 1 : 0)}</b></span><input type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={result.params[parameter.id]} onChange={(event) => setParam(play.id, parameter.id, Number(event.target.value))} /></label>)}</div>}
          <div className="play-foot"><div className="play-lines">{result.lines.map((line) => <div key={line.label}><span>{line.label}</span><span className={`mono ${tone(line.value)}`}>{money(line.value, { sign: true })}</span></div>)}</div><div className="play-total"><span>Value</span><b className={tone(result.value)}>{money(result.value, { sign: true })}</b></div>{state?.on && result.notes.map((note) => <div key={note} className="muted sm">{note}</div>)}{state?.on && result.risks.map((risk) => <div key={risk} className="risk-line">{risk}</div>)}</div>
        </div>;
      })}</div>
    </section>
  </>;
}

const tone = (value) => (value > 0.5 ? 'pos' : value < -0.5 ? 'neg' : '');
const Fact = ({ value, label }) => <div className="fact"><div className="fact-v">{value}</div><div className="fact-l">{label}</div></div>;
const Tile = ({ label, value, sub, tone: tileTone }) => <div className={`tile ${tileTone || ''}`}><div className="tile-label">{label}</div><div className="tile-value">{value}</div>{sub && <div className="tile-sub">{sub}</div>}</div>;
