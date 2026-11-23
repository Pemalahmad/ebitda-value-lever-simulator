import React, { useMemo, useState } from 'react';
import { CRITERIA, DEFAULT_WEIGHTS, rank, tier } from '../../engine/opportunities.js';
import { PLAYS } from '../../engine/index.js';
import { Source } from './GroupView.jsx';
import DATA from '../../../data/opportunities/analysis.json';

const TIER_CLASS = { Pursue: 'pos', Develop: 'gold', Watch: 'amber', Deprioritise: 'neg' };

export function OpportunitiesView({ onModel }) {
  const [w, setW] = useState(DEFAULT_WEIGHTS);
  const [listed, setListed] = useState('all');
  const [open, setOpen] = useState(null);
  const sectors = useMemo(() => rank(DATA.sectors, w), [w]);
  const themes = useMemo(() => rank(DATA.themes, w), [w]);
  const targets = useMemo(() => rank(DATA.targets.filter((t) => listed === 'all' || (listed === 'listed') === t.listed), w), [w, listed]);
  const playName = (id) => PLAYS.find((p) => p.id === id)?.title ?? id;

  return (
    <>
      <section className="card hero">
        <div className="eyebrow">Market analysis &amp; opportunity screen · {DATA.asOf}</div>
        <h3>{DATA.summary.headline}</h3>
        <ol className="key-points">{DATA.summary.points.map((p) => <li key={p.text}>{p.text} {p.source && <Source s={p.source} />}</li>)}</ol>
        <p className="footnote">Scores (1–5) are analyst judgements with stated rationale; every market figure is cited. Independent analysis, not investment advice, and not affiliated with any company named.</p>
      </section>

      <section className="card">
        <h3>Investment committee priorities</h3>
        <p className="card-sub">Set the weights; sectors, themes and targets re-rank live. Tiers: Pursue ≥ 70 · Develop ≥ 55 · Watch ≥ 40.</p>
        <div className="weights">
          {CRITERIA.map((c) => (
            <label key={c.id} className="pp" title={c.hint}>
              <span className="pp-top"><span>{c.label}</span><b className="mono">{w[c.id]}</b></span>
              <input type="range" min="0" max="50" step="5" value={w[c.id]} onChange={(e) => setW({ ...w, [c.id]: Number(e.target.value) })} />
            </label>
          ))}
          <button className="ghost sm" onClick={() => setW(DEFAULT_WEIGHTS)}>Reset weights</button>
        </div>
      </section>

      <section className="card">
        <h3>Sector attractiveness</h3>
        <p className="card-sub">Where the Group's verticals and adjacencies sit on growth, fit, upside, feasibility and risk.</p>
        <div className="table-wrap">
          <table className="data heat">
            <thead><tr><th>#</th><th>Sector</th>{CRITERIA.map((c) => <th key={c.id} className="c">{c.label.split(' ')[0]}</th>)}<th className="r">Score</th><th>Call</th></tr></thead>
            <tbody>
              {sectors.map((s) => (
                <React.Fragment key={s.id}>
                  <tr className="clickable" onClick={() => setOpen(open === s.id ? null : s.id)}>
                    <td>{s.rank}</td>
                    <td><b>{s.name}</b><div className="muted sm">{s.headline}</div></td>
                    {CRITERIA.map((c) => <td key={c.id} className={`c h${s.scores[c.id]}`}>{s.scores[c.id]}</td>)}
                    <td className="r"><b>{s.total}</b></td>
                    <td><span className={`chip sm ${TIER_CLASS[tier(s.total)]}`}>{tier(s.total)}</span></td>
                  </tr>
                  {open === s.id && (
                    <tr className="detail"><td colSpan={CRITERIA.length + 4}>
                      <p className="sm">{s.rationale}</p>
                      <ul className="facts-list">{s.facts.map((f) => <li key={f.text}>{f.text} <Source s={f.source} /></li>)}</ul>
                      {s.risks?.length > 0 && <div className="risk-line">Risks: {s.risks.join(' · ')}</div>}
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="footnote">Click a sector for the evidence behind its scores.</p>
      </section>

      <section className="card">
        <h3>New opportunity themes, 2026–2030</h3>
        <div className="themes">
          {themes.map((t) => (
            <div key={t.id} className="theme">
              <div className="theme-head">
                <span className="rank-badge">{t.rank}</span>
                <div>
                  <div className="play-title">{t.title}</div>
                  <div className="muted sm">{t.timeline} · evidence: {t.evidence}</div>
                </div>
                <span className={`chip sm ${TIER_CLASS[tier(t.total)]}`}>{t.total} · {tier(t.total)}</span>
              </div>
              <p className="play-sum">{t.thesis}</p>
              <ul className="facts-list">{t.facts.map((f) => <li key={f.text}>{f.text} <Source s={f.source} /></li>)}</ul>
              <div className="users">How to play it: {t.plays.map((p) => <button key={p} className="chip sm" onClick={() => onModel(p, t.presets?.[p])}>{playName(p)} →</button>)}</div>
              {t.risks?.length > 0 && <div className="risk-line">Risks: {t.risks.join(' · ')}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="panel-head">
          <h3>Target screen: companies to invest in or partner with</h3>
          <div className="scenario-chips">
            {['all', 'listed', 'private'].map((k) => <button key={k} className={`chip ${listed === k ? 'on' : ''}`} onClick={() => setListed(k)}>{k === 'all' ? 'All' : k === 'listed' ? 'Listed' : 'Private'}</button>)}
          </div>
        </div>
        <p className="card-sub">Ranked by the committee weights above. Each target has a value-creation thesis and the play that models it; <b>Model it</b> loads the play on the Group &amp; Funds tab with the target's figures where they are disclosed.</p>
        <div className="targets">
          {targets.map((t) => (
            <div key={t.id} className="target">
              <div className="t-head">
                <span className="rank-badge">{t.rank}</span>
                <div className="t-name">
                  <b>{t.name}</b> <span className="muted sm">{t.ticker ? `${t.ticker} · ` : ''}{t.listed ? 'Listed' : 'Private'} · {t.sector}</span>
                  <div className="muted sm">{t.description}</div>
                </div>
                <div className="t-score"><span className={`chip sm ${TIER_CLASS[tier(t.total)]}`}>{t.total} · {tier(t.total)}</span></div>
              </div>
              <div className="tl-metrics">{t.metrics.map((m) => <span key={m.label} className="metric"><b>{m.value}</b> {m.label} <Source s={m.source} /></span>)}</div>
              <div className="t-body">
                <div><span className="tag-arch">Value-creation thesis</span><p className="sm">{t.fit}</p></div>
                <div><span className="tag-arch">Watch-outs</span><p className="sm">{t.risks.join(' · ')}</p></div>
              </div>
              <div className="t-foot">
                <div className="score-dots">{CRITERIA.map((c) => <span key={c.id} title={`${c.label}: ${t.scores[c.id]}/5`} className={`sd h${t.scores[c.id]}`}>{c.label.split(' ')[0][0]}{t.scores[c.id]}</span>)}</div>
                {t.catalyst && <span className="muted sm">Catalyst: {t.catalyst.text} <Source s={t.catalyst.source} /></span>}
                {t.play && <button className="play" onClick={() => onModel(t.play, t.preset)}>Model it: {playName(t.play)}</button>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
