import React, { useMemo, useState } from 'react';
import { fmt, bridge, tornado, leverage, grid, buildMemo, renderMarkdown, UAE_CORPORATE_TAX, evMultiple } from '../../engine/index.js';
import { Waterfall, Tornado, Heatmap, Phasing } from './Charts.jsx';
import { Icon } from './Icons.jsx';

const { money, pct, months, unitValue } = fmt;

function Tile({ label, value, delta, tone, sub }) {
  return (
    <div className={`tile ${tone || ''}`}>
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {delta !== undefined && <div className={`tile-delta ${tone || ''}`}>{delta}</div>}
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  );
}

const toneOf = (x) => (x > 1e-9 ? 'pos' : x < -1e-9 ? 'neg' : '');

export function KpiTiles({ e, sector }) {
  const c = e.cmp;
  const budgetPct = Math.min(1, c.invest / sector.budget);
  return (
    <div className="tiles six">
      <Tile label="Run-rate EBITDA" value={money(c.scn.ebitda)} delta={`${money(c.dEbitda, { sign: true })} · ${pct(c.dEbitdaPct, { sign: true })}`} tone={toneOf(c.dEbitda)} />
      <Tile label="EBITDA margin" value={pct(c.scn.margin)} delta={`${c.dMarginPts >= 0 ? '+' : '−'}${Math.abs(c.dMarginPts).toFixed(1)} pts`} tone={toneOf(c.dMarginPts)} />
      <Tile label="Enterprise value" value={money(c.scn.ev)} delta={money(c.dEv, { sign: true })} tone={toneOf(c.dEv)} sub={sector.valuation.method === 'capRate' ? `NOI at ${(sector.valuation.capRate * 100).toFixed(2)}% cap rate` : `${sector.valuation.multiple}x EV/EBITDA`} />
      <Tile label="Cash released" value={money(c.cashRelease, { sign: true })} tone={toneOf(c.cashRelease)} sub="Working capital vs baseline" />
      <Tile label="Value created" value={money(c.valueCreated, { sign: true })} tone={toneOf(c.valueCreated)} sub={`${pct(e.valueCreatedPct, { sign: true })} of baseline EV`} />
      <div className={`tile ${c.overBudget ? 'neg' : ''}`}>
        <div className="tile-label">Investment vs budget</div>
        <div className="tile-value">{money(c.invest)}</div>
        <div className="bar budget"><span className={c.overBudget ? 'over' : ''} style={{ width: `${budgetPct * 100}%` }} /></div>
        <div className="tile-sub">{c.overBudget ? `Over the ${money(sector.budget)} envelope` : `of ${money(sector.budget)} envelope`} · payback {months(e.bc.paybackMonths)}</div>
      </div>
    </div>
  );
}

export function SimulatorView({ sector, levers, e, onNudge }) {
  const br = useMemo(() => bridge(sector, levers), [sector, levers]);
  const tor = useMemo(() => tornado(sector, levers), [sector, levers]);
  const lev = useMemo(() => leverage(sector, levers), [sector, levers]);
  const g = useMemo(() => grid(sector, levers, tor[0].id, tor[1].id), [sector, levers, tor]);
  return (
    <>
      <KpiTiles e={e} sector={sector} />
      <div className="grid-2">
        <section className="card">
          <h3>EBITDA bridge</h3>
          <p className="card-sub">How each lever moves EBITDA from the baseline, with interaction effects shown separately so the bridge reconciles.</p>
          {br.steps.length ? <Waterfall bridge={br} /> : <Empty text="Move a lever to build the bridge." />}
        </section>
        <section className="card">
          <h3>Sensitivity tornado</h3>
          <p className="card-sub">EBITDA swing for a ±10% move in each driver from the current scenario. The widest bars are the drivers to govern most tightly.</p>
          <Tornado rows={tor} />
        </section>
      </div>
      <section className="card">
        <h3>Where to play next</h3>
        <p className="card-sub">Each lever moved a further 10% in its value-creating direction, ranked by value created (EV plus cash). Click <b>Play</b> to apply the move.</p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>#</th><th>Lever</th><th className="r">EBITDA</th><th className="r">Value created</th><th className="r">Cost</th><th className="r">Payback</th><th>Owner</th><th /></tr>
            </thead>
            <tbody>
              {lev.map((x, i) => (
                <tr key={x.id} className={x.atLimit ? 'dim' : ''}>
                  <td>{i + 1}</td>
                  <td>{x.label}</td>
                  <td className={`r ${toneOf(x.gain)}`}>{money(x.gain, { sign: true })}</td>
                  <td className={`r ${toneOf(x.valueGain)}`}>{money(x.valueGain, { sign: true })}</td>
                  <td className="r">{money(x.cost)}</td>
                  <td className="r">{x.gain > 0 ? months((x.cost / x.gain) * 12) : x.cashGain > 0 ? 'cash only' : '—'}</td>
                  <td className="muted">{x.owner}</td>
                  <td><button className="play" disabled={x.atLimit} onClick={() => onNudge(x.id)}>{x.atLimit ? 'At limit' : 'Play'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid-2">
        <section className="card">
          <h3>Two-way sensitivity</h3>
          <p className="card-sub">EBITDA across ±20% on the two most sensitive drivers. The outlined cell is the current scenario.</p>
          <Heatmap g={g} />
        </section>
        <section className="card">
          <h3>P&amp;L: baseline vs scenario</h3>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Line</th><th className="r">Baseline</th><th className="r">Scenario</th><th className="r">Δ</th></tr></thead>
              <tbody>
                {e.cmp.base.lines.map((l, i) => {
                  const s = e.cmp.scn.lines[i].value;
                  return (
                    <tr key={l.label}>
                      <td>{l.label}</td>
                      <td className="r">{money(l.value)}</td>
                      <td className="r">{money(s)}</td>
                      <td className={`r ${toneOf(s - l.value)}`}>{Math.abs(s - l.value) < 0.05 ? '—' : money(s - l.value, { sign: true })}</td>
                    </tr>
                  );
                })}
                <tr className="total">
                  <td>EBITDA</td>
                  <td className="r">{money(e.cmp.base.ebitda)}</td>
                  <td className="r">{money(e.cmp.scn.ebitda)}</td>
                  <td className={`r ${toneOf(e.cmp.dEbitda)}`}>{money(e.cmp.dEbitda, { sign: true })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

const OBJECTIVES = {
  Financial: 'Grow EBITDA and enterprise value while protecting cash.',
  Customer: 'Raise guest, resident and client outcomes that sustain pricing power.',
  'Internal Process': 'Run assets and operations at best-in-class productivity.',
  'Learning & Growth': 'Build the digital and commercial capabilities that compound.',
};

export function ScorecardView({ e }) {
  return (
    <>
      <div className="sc-summary">
        <div><b>{e.sc.items.filter((k) => k.status === 'green').length}</b>/{e.sc.items.length} KPIs on target</div>
        <div className="legend"><span className="dot green" /> On target <span className="dot amber" /> Within 5% <span className="dot red" /> Off target</div>
      </div>
      <div className="grid-2">
        {e.sc.perspectives.map((p) => (
          <section className={`card bsc ${p.status}`} key={p.name}>
            <div className="bsc-head">
              <h3><span className={`dot ${p.status}`} /> {p.name}</h3>
            </div>
            <p className="card-sub">{OBJECTIVES[p.name]}</p>
            {p.items.map((k) => {
              const ratio = k.better === 'higher' ? k.value / k.target : k.target / k.value;
              return (
                <div className="kpi-row" key={k.label}>
                  <div className="kpi-top">
                    <span>{k.label}</span>
                    <span className="mono">{unitValue(k.value, k.unit)} <span className="muted">/ {k.better === 'higher' ? '≥' : '≤'} {unitValue(k.target, k.unit)}</span></span>
                  </div>
                  <div className="bar"><span className={k.status} style={{ width: `${Math.max(4, Math.min(1, ratio) * 100)}%` }} /></div>
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </>
  );
}

export function BusinessCaseView({ sector, e }) {
  const bc = e.bc;
  if (!bc.initiatives.length) return <section className="card"><Empty text="Move levers on the Simulator tab to turn them into an initiative portfolio with a business case." /></section>;
  return (
    <>
      <div className="tiles">
        <Tile label="5-year NPV" value={money(bc.npv, { sign: true })} tone={toneOf(bc.npv)} sub={`${pct(bc.wacc)} WACC, after ${pct(UAE_CORPORATE_TAX, { dp: 0 })} UAE CT`} />
        <Tile label="IRR" value={Number.isFinite(bc.irr) ? pct(bc.irr) : bc.irr === Infinity ? '> 1,000%' : 'n/a'} tone={toneOf(bc.irr || 0)} />
        <Tile label="Payback" value={months(bc.paybackMonths)} sub="After tax, including cash release" />
        <Tile label="One-off investment" value={money(bc.invest)} sub={`${money(sector.budget)} envelope`} tone={e.cmp.overBudget ? 'neg' : ''} />
      </div>
      <section className="card">
        <h3>Benefits realisation</h3>
        <p className="card-sub">Pre-tax EBITDA benefit by year as each initiative ramps to run rate. Year 0 is the one-off investment.</p>
        <Phasing yearly={bc.yearly} invest={bc.invest} />
      </section>
      <section className="card">
        <h3>Initiative portfolio (PMO view)</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Initiative</th><th>Change</th><th className="r">Run-rate EBITDA</th><th className="r">Investment</th><th className="r">Ramp</th><th className="r">Payback</th><th className="r">Year 1</th><th className="r">Year 2</th><th>Owner</th></tr>
            </thead>
            <tbody>
              {bc.initiatives.map((i) => (
                <tr key={i.id}>
                  <td>{i.label}</td>
                  <td className="mono sm">{unitValue(i.from, i.unit)} → {unitValue(i.to, i.unit)}</td>
                  <td className={`r ${toneOf(i.runRate)}`}>{Math.abs(i.runRate) < 0.05 ? <span className="muted">cash lever</span> : money(i.runRate, { sign: true })}</td>
                  <td className="r">{money(i.investment)}</td>
                  <td className="r">{i.rampMonths} mo</td>
                  <td className="r">{Math.abs(i.runRate) < 0.05 ? '—' : months(i.paybackMonths)}</td>
                  <td className="r">{money(i.phasing[0], { sign: true })}</td>
                  <td className="r">{money(i.phasing[1], { sign: true })}</td>
                  <td className="muted">{i.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="footnote">Assumptions: linear ramp to run rate; interaction effects allocated pro rata; investment spent in year 0; working-capital release in year 1; benefits taxed at the {pct(UAE_CORPORATE_TAX, { dp: 0 })} UAE corporate tax rate; no terminal value. EV uses {sector.valuation.method === 'capRate' ? `a ${(sector.valuation.capRate * 100).toFixed(2)}% cap rate` : `${evMultiple(sector)}x EBITDA`}.</p>
      </section>
    </>
  );
}

export function MemoView({ sector, levers }) {
  const md = useMemo(() => buildMemo(sector, levers), [sector, levers]);
  const html = useMemo(() => renderMarkdown(md), [md]);
  const [copied, setCopied] = useState(false);
  const download = () => {
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `board-memo-${sector.id}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <section className="card memo-card">
      <div className="memo-actions no-print">
        <span className="copilot"><Icon name="bolt" size={14} /> Executive Co-Pilot · built from the model, every figure traceable</span>
        <div>
          <button className="ghost sm" onClick={copy}><Icon name="copy" size={14} /> {copied ? 'Copied' : 'Copy Markdown'}</button>
          <button className="ghost sm" onClick={download}><Icon name="download" size={14} /> Download .md</button>
          <button className="ghost sm" onClick={() => window.print()}><Icon name="print" size={14} /> Print / PDF</button>
        </div>
      </div>
      <article className="memo" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

function Empty({ text }) {
  return <div className="empty">{text}</div>;
}
