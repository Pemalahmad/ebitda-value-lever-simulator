import React, { useEffect, useMemo, useState } from 'react';
import { AS_OF, SOURCES, JURISDICTIONS, VA_ACTIVITIES, MODELS, COMPANY_STEPS, PRODUCT_STEPS, VASP_STAGES, COMPLIANCE, PITFALLS, assess, varaCosts } from '../../engine/entry.js';
import { Source } from './Source.jsx';
import { PageHead, Waterfall } from './Dots.jsx';

const KEY = 'vls.entry.v1';
const aed = (v) => (v == null ? 'Set by VARA' : `AED ${Math.round(v).toLocaleString('en-US')}`);
const aedShort = (v) => (v >= 1e6 ? `AED ${(v / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 })}m` : `AED ${Math.round(v / 1e3)}k`);
const SHORT_MODEL = { general: 'Company', product: 'Product', selfcustody: 'Self-custody', vasp: 'Crypto service' };
const SHORT_ACT = { advisory: 'Advisory', broker: 'Broker-dealer', custody: 'Custody', exchange: 'Exchange', lending: 'Lending', management: 'Management', transfer: 'Transfer', issuance: 'Issuance' };
const SHORT_ZONE = { dubai: 'Dubai', difc: 'DIFC', adgm: 'ADGM', other: 'Other emirates' };

function load() { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } }

// Every step in one shape for the procedure console.
function procedure(model) {
  const steps = COMPANY_STEPS.map((s) => ({ id: s.id, label: s.title, owner: s.owner, when: s.when, gate: s.detail, checks: s.checks, src: s.src }));
  if (model.product) steps.push(...PRODUCT_STEPS.map((s) => ({ id: s.id, label: s.title, owner: s.owner, when: s.when, gate: s.detail, checks: s.checks, src: s.src })));
  if (model.va === true) {
    const at = steps.findIndex((s) => s.id === 'c3');
    steps.splice(at, 0, { ...stage(VASP_STAGES[0]), owner: 'Regulatory', when: 'Before incorporation' });
    steps.splice(steps.findIndex((s) => s.id === 'c4'), 0, { ...stage(VASP_STAGES[1]), owner: 'Regulatory', when: 'After incorporation' });
  }
  return steps;
}
const stage = (s) => ({ id: s.id, label: s.title.replace(/^Stage \d: /, ''), gate: `${s.detail} ${s.allowed} ${s.notAllowed} ${s.fee}`, checks: s.file, src: 'varaSite' });

export function EntryView() {
  const saved = useMemo(load, []);
  const [model, setModel] = useState(saved.model ?? 'vasp');
  const [zone, setZone] = useState(saved.jurisdiction ?? 'dubai');
  const [acts, setActs] = useState(saved.acts ?? ['broker', 'custody']);
  const [overheads, setOverheads] = useState(saved.overheads ?? 4000000);
  const [custodian, setCustodian] = useState(saved.custodian ?? false);
  const [inApp, setInApp] = useState(saved.inApp ?? true);
  const [done, setDone] = useState(saved.done ?? {});
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ model, jurisdiction: zone, acts, overheads, custodian, inApp, done })); } catch { /* keep in-session */ } }, [model, zone, acts, overheads, custodian, inApp, done]);

  const m = MODELS.find((x) => x.id === model);
  const a = assess({ model, jurisdiction: zone, activities: acts, marketsInApp: inApp });
  const costs = varaCosts(acts, { overheads, usesCustodian: custodian });
  const steps = procedure(m);
  const total = steps.reduce((n, s) => n + s.checks.length, 0);
  const ticked = steps.reduce((n, s) => n + s.checks.filter((c) => done[`${s.id}:${c}`]).length, 0);
  const toggle = (k) => setDone((d) => ({ ...d, [k]: !d[k] }));
  const toggleAct = (id) => setActs((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  return <div className="market-board entry-board doc">
    <PageHead status={`Rules as at ${AS_OF}`} title="Market entry" muted="UAE"
      sub="What it takes to enter the UAE, in the order it falls due. A planning aid, not legal advice." />
    <section className="market-opening">
      <div className="market-intro">
        <div className="market-status"><span aria-hidden="true" />Rules as at <b>{AS_OF}</b></div>
        <h2>Enter the UAE,<br />licensed and in order.</h2>
        <p>The structure, licences, tax, people and product rules in the order they fall due, with a full track for virtual-asset businesses benchmarked on Dubai's VARA.</p>
        <div className="entry-profile">
          <Segments label="Business" value={model} onChange={setModel} options={MODELS.map((x) => [x.id, SHORT_MODEL[x.id]])} />
          <Segments label="Zone" value={zone} onChange={setZone} options={JURISDICTIONS.map((x) => [x.id, SHORT_ZONE[x.id]])} />
          {model === 'selfcustody' && <label className="entry-toggle"><input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} /> App offers buy, swap or staking through partners</label>}
        </div>
        <div className="market-provenance">{m.label}. A planning aid, not legal advice: confirm each requirement with the regulator and UAE counsel.</div>
      </div>
      <CostWidget va={m.va === true} costs={costs} acts={acts} regulator={a.jurisdiction.vaRegulator} steps={steps} done={done} />
    </section>

    <section className="instrument-grid">
      <article className="instrument">
        <header><span>Who regulates you</span><Source s={SOURCES[a.jurisdiction.src]} /></header>
        <div className="instrument-value">{m.va ? a.jurisdiction.vaRegulator : 'Licensing authority'}</div>
        <p>{m.va ? a.jurisdiction.note : 'Department of Economy and Tourism (mainland) or the free-zone authority issues the trade licence. No financial regulator unless the activity is regulated.'}</p>
        <footer>{a.jurisdiction.label}</footer>
      </article>
      <article className="instrument">
        <header><span>Entry readiness</span></header>
        <div className="investor-body">
          <div className="investor-ring" style={{ '--share': `${(ticked / total) * 100}%` }}><span>{Math.round((ticked / total) * 100)}%</span></div>
          <div><div className="instrument-value">{ticked}/{total}</div><p>checklist items done</p></div>
        </div>
        <footer><b>{steps.filter((s) => s.checks.every((c) => done[`${s.id}:${c}`])).length}</b> of {steps.length} steps cleared</footer>
      </article>
      <article className="instrument period-widget">
        <header><span>{m.va === true ? 'Licence timeline' : 'Steps by phase'}</span>{m.va === true && <Source s={SOURCES.varaSchedule2} />}</header>
        <div className="period-head"><div className="instrument-value">{m.va === true ? '4–12 mo' : `${steps.length} steps`}</div><span>{m.va === true ? 'IDQ to full licence, typical range' : 'in the order they fall due'}</span></div>
        <div className="period-track" aria-label="Typical licence timeline in months">{Array.from({ length: 12 }, (_, i) => <i key={i} className={m.va === true ? (i < 4 ? 'on' : i < 12 ? 'maybe' : '') : (i < steps.length ? 'on' : '')} />)}</div>
        <footer>{m.va === true ? <><b>Months 1–4</b> well-prepared · <b>to 12</b> with questions</> : <>Company setup first, then {m.product ? 'product compliance' : 'launch'}</>}</footer>
      </article>
    </section>

    <section className="signal-ledger">
      <header><div><h3>What this entry needs</h3><p>Routed from the business model and zone above.</p></div><span>{a.needs.length} requirements{a.flags.length ? ` · ${a.flags.length} flagged` : ''}</span></header>
      <div>
        {a.needs.map((n) => <article key={n}><i aria-hidden="true" /><p>{n}</p><span /></article>)}
        {a.flags.map((f) => <article key={f} className="flag"><i aria-hidden="true" /><p>{f}</p><Source s={SOURCES.varaMarketing} /></article>)}
      </div>
    </section>

    <EntrySop steps={steps} done={done} toggle={toggle} />

    <section className="market-analysis-grid">
      {m.va === true && <article className="history-widget">
        <header><div><h3>Capital and fee calculator</h3><p>VARA's eight activities. Capital is the higher of the floor or a share of fixed annual overheads.</p></div><span className="chart-key"><Source s={SOURCES.varaSchedule2} /> <Source s={SOURCES.varaCapital} /></span></header>
        <div className="chart-controls entry-wrap" aria-label="Activities">{VA_ACTIVITIES.map((x) => <button key={x.id} type="button" className={acts.includes(x.id) ? 'on' : ''} aria-pressed={acts.includes(x.id)} onClick={() => toggleAct(x.id)}>{SHORT_ACT[x.id]}</button>)}</div>
        <div className="entry-inputs">
          <label>Fixed annual overheads<input type="number" min="0" step="100000" value={overheads} onChange={(e) => setOverheads(Number(e.target.value) || 0)} /></label>
          <label className="entry-toggle"><input type="checkbox" checked={custodian} onChange={(e) => setCustodian(e.target.checked)} /> Client assets with a separately licensed custodian</label>
        </div>
        {acts.length === 0 ? <p className="entry-empty">Pick at least one activity.</p> : <div className="table-wrap"><table className="market-table">
          <thead><tr><th>Activity</th><th>Application</th><th>Supervision / yr</th><th>Paid-up capital</th></tr></thead>
          <tbody>{costs.capitalByActivity.map((c, i) => { const x = VA_ACTIVITIES.find((v) => v.id === c.id); return <tr key={c.id}><td><span>{i + 1}</span>{c.label}</td><td>{aed(x.application)}</td><td>{aed(x.supervision)}</td><td>{aed(c.capital)}</td></tr>; })}
            <tr className="entry-total"><td>Total</td><td>≤ {aed(costs.application)}</td><td>{aed(costs.supervision)}</td><td>≥ {aed(costs.capitalFloor)}</td></tr></tbody>
        </table></div>}
        {acts.length > 0 && costs.capitalFloor != null && <div className="entry-wf"><span className="w-eyebrow">Cash needed before the first client, regulatory items only</span><Waterfall zoom={false} height={230} bridge={{ start: 0, end: costs.firstYear + costs.capitalFloor, steps: [{ id: 'app', label: 'Application fees', delta: costs.application }, { id: 'sup', label: 'First-year supervision', delta: costs.supervision }, { id: 'cap', label: 'Paid-up capital', delta: costs.capitalFloor }] }} startLabel="Start" endLabel="Total" format={(v) => aedShort(v)} /></div>}
        <footer>{costs.separateCustodyEntity ? 'Custody must sit in its own licensed entity: budget a second set of capital and fees. ' : ''}Additional activities attract a reduced extension fee, so the application total is an upper bound.</footer>
      </article>}

      {model === 'selfcustody' && <article className="history-widget">
        <header><div><h3>Where the licence line sits</h3><p>Regulators judge the economic function, not the label. Map each feature before launch.</p></div></header>
        <div className="table-wrap"><table className="market-table entry-map">
          <thead><tr><th>Feature</th><th>Likely position</th><th>What to do</th></tr></thead>
          <tbody>{PERIMETER.map(([f, p, d], i) => <tr key={f}><td><span>{i + 1}</span>{f}</td><td>{p}</td><td>{d}</td></tr>)}</tbody>
        </table></div>
        <footer>No VARA source confirms a specific exemption for non-custodial wallets: get the regulator's view in writing.</footer>
      </article>}

      <article className={`community-widget ${m.va === true || model === 'selfcustody' ? '' : 'entry-span'}`}>
        <header><div><h3>Virtual-asset regulators</h3><p>Each zone is a separate regime with its own entity, capital and fees. Payments in virtual assets also sit with the Central Bank.</p></div><Source s={SOURCES.cbuaeLaw} /></header>
        <div className="table-wrap"><table className="market-table">
          <thead><tr><th>Zone</th><th>Regulator</th></tr></thead>
          <tbody>{JURISDICTIONS.map((j, i) => <tr key={j.id} className={j.id === zone ? 'on' : ''}><td><span>{i + 1}</span>{SHORT_ZONE[j.id]}</td><td>{j.vaRegulator}</td></tr>)}
            <tr><td><span>+</span>Payments, stablecoins</td><td>CBUAE</td></tr></tbody>
        </table></div>
      </article>
    </section>

    <section className="signal-ledger entry-compliance">
      <header><div><h3>Compliance you run from day one</h3><p>{m.va ? 'The core of a virtual-asset licence. Regulators test these in interviews and inspections.' : 'AML applies where the activity is designated; the rest is good practice.'}</p></div><span>{COMPLIANCE.filter((c) => m.va || ['aml', 'governance'].includes(c.id)).length} areas</span></header>
      <div>{COMPLIANCE.filter((c) => m.va || ['aml', 'governance'].includes(c.id)).map((c) => <article key={c.id}><i aria-hidden="true" /><div><b>{c.title}</b><ul>{c.points.map((p) => <li key={p}>{p}</li>)}</ul></div><Source s={SOURCES[c.src]} /></article>)}</div>
    </section>

    <section className="signal-ledger">
      <header><div><h3>Pitfalls that stall an entry</h3><p>Where entries lose months.</p></div><span>{PITFALLS.length} pitfalls</span></header>
      <div>{PITFALLS.map((p) => <article key={p} className="flag"><i aria-hidden="true" /><p>{p}</p><span /></article>)}</div>
    </section>

    <section className="signal-ledger">
      <header><div><h3>Sources</h3><p>Fees and capital from adviser summaries of VARA's Schedule 2 and Company Rulebook; read the primary rulebooks before relying on them.</p></div><span>{Object.keys(SOURCES).length} sources</span></header>
      <div>{Object.values(SOURCES).map((s) => <article key={s.url + s.title}><i aria-hidden="true" /><p><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>{s.date ? ` · ${s.date}` : ''}</p><span /></article>)}</div>
    </section>
  </div>;
}

const PERIMETER = [
  ['Device or app sale; user alone holds the keys', 'Product sale', 'Trade licence and product compliance'],
  ['Recovery the company can control', 'May be custody', 'Design it out, or license custody separately'],
  ['Buy, sell or swap in the app', 'Broker-dealer or exchange', 'Licensed partner; you market on its behalf'],
  ['Staking or yield', 'Lending or management', 'Licensed partner; risk disclosures'],
  ['Paying merchants in crypto', 'Central Bank payments', 'Licensed payment provider'],
  ['Ads, influencers, affiliates', 'VA marketing', 'Partner approval and disclaimers'],
];

function Segments({ label, value, onChange, options }) {
  return <div className="entry-seg"><span>{label}</span><div className="chart-controls entry-wrap">{options.map(([id, text]) => <button key={id} type="button" className={value === id ? 'on' : ''} aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>)}</div></div>;
}

function CostWidget({ va, costs, acts, regulator, steps, done }) {
  const [view, setView] = useState('fees');
  if (!va) {
    return <article className="pulse-widget">
      <header><div><span>Entry procedure</span><b>No financial licence needed</b></div></header>
      <div className="pulse-number">{steps.length} steps</div>
      <div className="pulse-change"><strong>{steps.reduce((n, s) => n + s.checks.length, 0)} checks</strong><span>from structure to launch</span></div>
      <div className="entry-bars">{steps.map((s) => { const k = s.checks.filter((c) => done[`${s.id}:${c}`]).length; return <div key={s.id} title={s.label}><i style={{ height: `${20 + (k / s.checks.length) * 80}%` }} className={k === s.checks.length ? 'full' : ''} /><span>{s.id.toUpperCase()}</span></div>; })}</div>
      <footer><span>Bars fill as checks are ticked</span><span>Trade licence · tax · visas</span></footer>
    </article>;
  }
  const rows = costs.capitalByActivity.map((c) => { const x = VA_ACTIVITIES.find((v) => v.id === c.id); return { id: c.id, label: x.label, v: view === 'fees' ? x.application + x.supervision : view === 'capital' ? c.capital ?? 0 : x.supervision }; });
  const max = Math.max(1, ...rows.map((r) => r.v));
  const head = { fees: ['Regulatory fees, year one', costs.firstYear, `Stage 1 payment ${aedShort(costs.atiPayment)}`, 'application plus first supervision'], capital: ['Paid-up capital floor', costs.capitalFloor ?? 0, 'Higher of the floor', 'or 15–25% of fixed overheads'], supervision: ['Annual supervision', costs.supervision, 'Every year', 'payable in advance'] }[view];
  return <article className="pulse-widget">
    <header><div><span>{head[0]}</span><b>{regulator} · {acts.length} {acts.length === 1 ? 'activity' : 'activities'}</b></div><div className="pulse-actions"><div className="pulse-switch" aria-label="Cost view">{[['fees', 'Fees'], ['capital', 'Capital'], ['supervision', 'Annual']].map(([id, t]) => <button key={id} type="button" className={view === id ? 'on' : ''} aria-pressed={view === id} onClick={() => setView(id)}>{t}</button>)}</div><Source s={view === 'capital' ? SOURCES.varaCapital : SOURCES.varaSchedule2} /></div></header>
    <div className="pulse-number" key={view}>{acts.length ? aedShort(head[1]) : '—'}</div>
    <div className="pulse-change"><strong>{head[2]}</strong><span>{head[3]}</span></div>
    <div className="entry-bars">{rows.map((r) => <div key={r.id} title={`${r.label}: ${aed(r.v)}`}><i style={{ height: `${(r.v / max) * 100}%` }} /><span>{SHORT_ACT[r.id]}</span></div>)}</div>
    <footer><span>{acts.length ? `Up to ${aed(costs.firstYear)} in fees` : 'Pick activities below'}</span><span>Before capital, insurance and staff</span></footer>
  </article>;
}

function EntrySop({ steps, done, toggle }) {
  const [active, setActive] = useState(0);
  const step = steps[Math.min(active, steps.length - 1)];
  const cleared = (s) => s.checks.every((c) => done[`${s.id}:${c}`]);
  const all = () => step.checks.forEach((c) => { if (cleared(step) || !done[`${step.id}:${c}`]) toggle(`${step.id}:${c}`); });
  return <section className="sop-console">
    <header>
      <div><span>Entry procedure</span><h3>From structure to launch</h3><p>Work down the steps in order. Tick each item as it is done; progress stays in this browser.</p></div>
      <div className="sop-progress"><b>{steps.filter(cleared).length}/{steps.length}</b><span>steps cleared</span></div>
    </header>
    <div className="sop-layout">
      <nav className="sop-steps" aria-label="Entry steps">
        {steps.map((s, i) => <button type="button" key={s.id} className={`${step.id === s.id ? 'on' : ''} ${cleared(s) ? 'done' : ''}`} onClick={() => setActive(i)} aria-current={step.id === s.id ? 'step' : undefined}>
          <span>{cleared(s) ? '✓' : i + 1}</span><span><b>{s.label}</b><small>{s.owner} · {s.when}</small></span>
        </button>)}
      </nav>
      <article className="sop-detail">
        <div className="sop-meta"><span>Owner <b>{step.owner}</b></span><span>When <b>{step.when}</b></span>{step.src && <Source s={SOURCES[step.src]} />}</div>
        <h4>{step.label}</h4>
        <p className="entry-gate">{step.gate}</p>
        <ul className="entry-checks">{step.checks.map((c) => { const k = `${step.id}:${c}`; return <li key={c}><button type="button" role="checkbox" aria-checked={!!done[k]} onClick={() => toggle(k)}><span aria-hidden="true">{done[k] ? '✓' : '○'}</span>{c}</button></li>; })}</ul>
        <div className="sop-output"><span>Items done</span><b>{step.checks.filter((c) => done[`${step.id}:${c}`]).length} of {step.checks.length}</b></div>
        <div className="sop-actions">
          <button type="button" className={`sop-complete ${cleared(step) ? 'done' : ''}`} onClick={all}>{cleared(step) ? 'Reopen step' : 'Mark step complete'}</button>
          {active < steps.length - 1 && <button type="button" className="ghost sm" onClick={() => setActive((i) => i + 1)}>Continue</button>}
        </div>
      </article>
    </div>
  </section>;
}
