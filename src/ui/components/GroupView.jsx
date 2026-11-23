import React, { useMemo } from 'react';
import { SECTORS, compare, PLAYS, runPlay, fmt } from '../../engine/index.js';
import { Waterfall } from './Charts.jsx';
import { Icon } from './Icons.jsx';
import DH from '../../../data/benchmarks/dubai-holding.json';
import FUNDS from '../../../data/benchmarks/funds.json';

const { money } = fmt;

export function Source({ s }) {
  if (!s?.url) return null;
  return (
    <a className="src" href={s.url} target="_blank" rel="noreferrer" title={`${s.title ?? 'Source'}${s.date ? ` (${s.date})` : ''}${s.quote ? `: “${s.quote}”` : ''}`}>
      [source]
    </a>
  );
}

export function groupSotp(bySector, plays) {
  const rows = SECTORS.map((s) => {
    const c = compare(s, bySector[s.id] ?? {});
    return { id: s.id, name: s.name, baseEv: c.base.ev, ev: c.scn.ev, uplift: c.valueCreated };
  });
  const activePlays = PLAYS.filter((p) => plays[p.id]?.on).map((p) => ({ play: p, r: runPlay(p, plays[p.id].params) }));
  const baseEv = rows.reduce((a, r) => a + r.baseEv, 0);
  const operating = rows.reduce((a, r) => a + r.uplift, 0);
  const playValue = activePlays.reduce((a, x) => a + x.r.value, 0);
  const cash = activePlays.reduce((a, x) => a + x.r.cash, 0);
  return { rows, activePlays, baseEv, operating, playValue, cash, total: baseEv + operating + playValue };
}

export function GroupView({ bySector, plays, setPlays, onOpenSector }) {
  const g = useMemo(() => groupSotp(bySector, plays), [bySector, plays]);
  const bridge = {
    start: g.baseEv,
    end: g.total,
    steps: [
      ...g.rows.filter((r) => Math.abs(r.uplift) > 0.5).map((r) => ({ id: r.id, label: `${r.name}: operating levers`, delta: r.uplift })),
      ...g.activePlays.map(({ play, r }) => ({ id: play.id, label: play.title, delta: r.value })),
    ],
  };
  const toggle = (id) => setPlays((p) => ({ ...p, [id]: { on: !p[id]?.on, params: p[id]?.params ?? {} } }));
  const setParam = (id, k, v) => setPlays((p) => ({ ...p, [id]: { on: true, params: { ...(p[id]?.params ?? {}), [k]: v } } }));
  const loadMove = (m) => setPlays((p) => ({ ...p, [m.play]: { on: true, params: { ...(p[m.play]?.params ?? {}), ...(m.preset ?? {}) } } }));

  return (
    <>
      <section className="card hero">
        <div className="hero-text">
          <div className="eyebrow">Group value-creation plan</div>
          <h3>{DH.name}: sum-of-the-parts and value plays</h3>
          <p className="card-sub">{DH.tagline}</p>
          <div className="facts">
            {DH.overview.map((f) => (
              <div key={f.label} className="fact"><div className="fact-v">{f.value}</div><div className="fact-l">{f.label} <Source s={f.source} /></div></div>
            ))}
          </div>
          <div className="pillars">
            <span className="muted sm">Stated strategic pillars <Source s={DH.strategy.source} />:</span>
            {DH.strategy.pillars.map((p) => <span key={p} className="chip sm">{p}</span>)}
          </div>
          <p className="muted sm">{DH.strategy.valueCreation.text} <Source s={DH.strategy.valueCreation.source} /> This dashboard is a working model of that mandate: operating levers by vertical, corporate-finance plays, benchmarks against regional funds, and the market they sell into.</p>
        </div>
      </section>

      <div className="tiles">
        <Tile label="Modelled group EV (baseline)" value={money(g.baseEv)} sub="Sum of the six verticals (illustrative operating models)" />
        <Tile label="Operating value created" value={money(g.operating, { sign: true })} tone={tone(g.operating)} sub="Lever moves across all verticals" />
        <Tile label="Value from plays" value={money(g.playValue, { sign: true })} tone={tone(g.playValue)} sub={`${g.activePlays.length} of ${PLAYS.length} plays active`} />
        <Tile label="Net cash raised / (deployed)" value={money(g.cash, { sign: true })} tone={tone(g.cash)} sub="IPO and REIT proceeds less acquisitions and costs" />
        <Tile label="Target value" value={money(g.total)} tone={tone(g.total - g.baseEv)} sub={`${(((g.total - g.baseEv) / g.baseEv) * 100).toFixed(1)}% above baseline`} />
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>Group value bridge</h3>
          <p className="card-sub">From the modelled baseline to the target: operating levers by vertical, then corporate-finance plays.</p>
          {bridge.steps.length ? <Waterfall bridge={bridge} startLabel="Baseline group EV" endLabel="Target value" /> : <div className="empty">Switch on a play below, or move levers in any vertical.</div>}
        </section>
        <section className="card">
          <h3>Sum of the parts</h3>
          <p className="card-sub">Each vertical at its current scenario. Click one to open its levers.</p>
          <table className="data">
            <thead><tr><th>Vertical</th><th className="r">Baseline EV</th><th className="r">Scenario EV</th><th className="r">Value created</th></tr></thead>
            <tbody>
              {g.rows.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => onOpenSector(r.id)}>
                  <td>{r.name}</td><td className="r">{money(r.baseEv)}</td><td className="r">{money(r.ev)}</td>
                  <td className={`r ${tone(r.uplift)}`}>{Math.abs(r.uplift) < 0.5 ? '—' : money(r.uplift, { sign: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card">
        <h3>Value-creation plays</h3>
        <p className="card-sub">The corporate-finance moves Gulf holding groups and sovereign funds use, each as a transparent mini-model. Switch a play on and tune its assumptions. The <b>Used by</b> tags link to cited examples below.</p>
        <div className="plays">
          {PLAYS.map((p) => {
            const st = plays[p.id];
            const r = runPlay(p, st?.params);
            const users = FUNDS.funds.filter((f) => f.moves.some((m) => m.play === p.id)).map((f) => f.short ?? f.name);
            if (DH.moves.some((m) => m.play === p.id)) users.unshift('Dubai Holding');
            return (
              <div key={p.id} className={`playcard ${st?.on ? 'on' : ''}`}>
                <div className="play-head">
                  <div>
                    <div className="tag-arch">{p.archetype}</div>
                    <div className="play-title">{p.title}</div>
                  </div>
                  <button className={`switch ${st?.on ? 'on' : ''}`} onClick={() => toggle(p.id)} aria-pressed={!!st?.on} aria-label={`Include ${p.title}`}><span /></button>
                </div>
                <p className="play-sum">{p.summary}</p>
                {users.length > 0 && <div className="users">Used by: {users.map((u) => <span key={u} className="chip sm">{u}</span>)}</div>}
                {st?.on && (
                  <div className="play-params">
                    {p.params.map((x) => (
                      <label key={x.id} className="pp">
                        <span className="pp-top"><span>{x.label}</span><b className="mono">{fmt.unitValue(r.params[x.id], x.unit === 'AED' && x.base > 1000 ? 'AED' : x.unit, x.step < 1 ? 1 : 0)}</b></span>
                        <input type="range" min={x.min} max={x.max} step={x.step} value={r.params[x.id]} onChange={(e) => setParam(p.id, x.id, Number(e.target.value))} />
                      </label>
                    ))}
                  </div>
                )}
                <div className="play-foot">
                  <div className="play-lines">
                    {r.lines.map((l) => <div key={l.label}><span>{l.label}</span><span className={`mono ${tone(l.value)}`}>{money(l.value, { sign: true })}</span></div>)}
                  </div>
                  <div className="play-total"><span>Value</span><b className={tone(r.value)}>{money(r.value, { sign: true })}</b></div>
                  {st?.on && r.notes.map((n) => <div key={n} className="muted sm">{n}</div>)}
                  {st?.on && r.risks.map((n) => <div key={n} className="risk-line">{n}</div>)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h3>What {DH.short} is actually doing</h3>
        <p className="card-sub">Public moves in 2023–2026, each mapped to the play that models it. Press <b>Model it</b> to load the play.</p>
        <div className="timeline">
          {DH.moves.map((m) => (
            <div key={m.title} className="tl-item">
              <div className="tl-date mono">{m.date}</div>
              <div className="tl-body">
                <div className="tl-title">{m.title} <Source s={m.source} /> {!m.play && m.archetype && <span className="chip sm">{m.archetype}</span>}</div>
                <div className="muted sm">{m.detail}</div>
                {m.metrics?.length > 0 && <div className="tl-metrics">{m.metrics.map((x) => <span key={x.label} className="metric"><b>{x.value}</b> {x.label}</span>)}</div>}
              </div>
              {m.play && <button className="play" onClick={() => loadMove(m)}>Model it</button>}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>Regional fund benchmark</h3>
        <p className="card-sub">How the region's largest investors create value. AUM and moves are as reported by the cited sources; figures are not comparable on a like-for-like basis.</p>
        <div className="table-wrap">
          <table className="data funds">
            <thead><tr><th>Investor</th><th className="r">AUM (US$bn)</th><th>Mandate</th><th>Recent value plays</th></tr></thead>
            <tbody>
              {FUNDS.funds.map((f) => (
                <tr key={f.id}>
                  <td><b>{f.name}</b><div className="muted sm">{f.country}</div></td>
                  <td className="r">{f.aumUsdBn ? <>{Math.round(f.aumUsdBn).toLocaleString('en-US')}<div className="muted sm">{f.aumAsOf} <Source s={f.aumSource} /></div></> : '—'}</td>
                  <td className="sm">{f.mandate} <Source s={f.mandateSource} /></td>
                  <td>
                    {f.moves.map((m) => (
                      <div key={m.title} className="fmove">
                        <span className="chip sm">{PLAYS.find((p) => p.id === m.play)?.archetype ?? m.type}</span> {m.title} <Source s={m.source} />
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PlaybookMatrix />
        <p className="footnote">Independent analysis based on public sources; not affiliated with or endorsed by any organisation named. Research as of {FUNDS.asOf}.</p>
      </section>
    </>
  );
}

function PlaybookMatrix() {
  const cols = [{ id: 'dh', name: DH.short, moves: DH.moves }, ...FUNDS.funds.map((f) => ({ id: f.id, name: f.short ?? f.name, moves: f.moves }))];
  return (
    <div className="table-wrap">
      <table className="matrix">
        <thead><tr><th>Playbook</th>{cols.map((c) => <th key={c.id}>{c.name}</th>)}</tr></thead>
        <tbody>
          {PLAYS.map((p) => (
            <tr key={p.id}>
              <td>{p.archetype}</td>
              {cols.map((c) => {
                const hit = c.moves.find((m) => m.play === p.id);
                return <td key={c.id} className={hit ? 'hit' : ''} title={hit ? hit.title : ''}>{hit ? <Icon name="check" size={14} /> : ''}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tone = (x) => (x > 0.5 ? 'pos' : x < -0.5 ? 'neg' : '');

function Tile({ label, value, sub, tone: t }) {
  return (
    <div className={`tile ${t || ''}`}>
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  );
}
