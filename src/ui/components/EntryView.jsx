import React, { useEffect, useMemo, useState } from 'react';
import { AS_OF, SOURCES, JURISDICTIONS, VA_ACTIVITIES, MODELS, COMPANY_STEPS, PRODUCT_STEPS, VASP_STAGES, COMPLIANCE, assess, varaCosts } from '../../engine/entry.js';
import { Source } from './Source.jsx';
import { PageHead, Waterfall, Section, Contents, DotRing } from './Dots.jsx';
import { LocationAdvisor, RouteProcedure, EntryTimeline, MoaGuide, TaxGuide, Bottlenecks } from './EntryGuide.jsx';
import { STEPS, GUIDE_SOURCES, schedule, ROUTES } from '../../engine/entryGuide.js';

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
  const ROUTE_OF = { dubai: 'dxbml', difc: 'difc', adgm: 'adgm', other: 'auhml' };
  const [route, setRoute] = useState(saved.route ?? ROUTE_OF[saved.jurisdiction ?? 'dubai']);
  const [btype, setBtype] = useState(saved.btype ?? 'vasp');
  const [regulated, setRegulated] = useState(saved.regulated ?? true);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ model, jurisdiction: zone, acts, overheads, custodian, inApp, done, route, btype, regulated })); } catch { /* keep in-session */ } }, [model, zone, acts, overheads, custodian, inApp, done, route, btype, regulated]);

  const m = MODELS.find((x) => x.id === model);
  const a = assess({ model, jurisdiction: zone, activities: acts, marketsInApp: inApp });
  const costs = varaCosts(acts, { overheads, usesCustodian: custodian });
  const steps = procedure(m);
  const gsteps = STEPS.filter((x) => x.by[route] && (!x.by[route].optional || regulated));
  const total = gsteps.reduce((n, x) => n + x.docs.length, 0);
  const ticked = gsteps.reduce((n, x) => n + x.docs.filter((d) => done[`${route}:${x.id}:${d}`]).length, 0);
  const pickRoute = (r) => { setRoute(r); setTimeout(() => document.getElementById('me-steps')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30); };
  const toggle = (k) => setDone((d) => ({ ...d, [k]: !d[k] }));
  const toggleAct = (id) => setActs((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  return <div className="market-board entry-board doc">
    <PageHead status={`Rules as at ${AS_OF}`} title="Market entry" muted="UAE"
      sub="What it takes to enter the UAE, in the order it falls due. A planning aid, not legal advice." />
    <section className="entry-overview">
      <article className="w-card ov-profile">
        <span className="w-eyebrow">Your entry</span>
        <div className="entry-profile">
          <Segments label="Business" value={model} onChange={setModel} options={MODELS.map((x) => [x.id, SHORT_MODEL[x.id]])} />
          <Segments label="Zone" value={zone} onChange={setZone} options={JURISDICTIONS.map((x) => [x.id, SHORT_ZONE[x.id]])} />
          {model === 'selfcustody' && <label className="entry-toggle"><input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} /> App offers buy, swap or staking through partners</label>}
        </div>
        <ul className="ov-needs">
          {a.needs.map((n) => <li key={n}>{n}</li>)}
          {a.flags.map((f) => <li key={f} className="flag">{f}</li>)}
        </ul>
      </article>
      <div className="ov-stats">
        <article className="w-card ov-stat"><span className="w-eyebrow">Who regulates you <Source s={SOURCES[a.jurisdiction.src]} /></span><b className="ov-big">{m.va ? a.jurisdiction.vaRegulator : 'Licensing authority'}</b><p>{m.va ? a.jurisdiction.label : 'DET, ADDED or the free-zone authority; no financial regulator unless the activity is regulated'}</p></article>
        <article className="w-card ov-stat ov-ring"><DotRing value={total ? ticked / total : 0} label={`${Math.round((total ? ticked / total : 0) * 100)}%`} sub="ready" size={92} n={30} /><div><span className="w-eyebrow">Entry readiness</span><b className="ov-big">{ticked}/{total}</b><p>documents ticked for {ROUTES.find((x) => x.id === route).label}</p></div></article>
        <article className="w-card ov-stat"><span className="w-eyebrow">Typical timeline</span><b className="ov-big">{Math.ceil(schedule(route, { regulated, use: 0.5 }).total)} weeks</b><p>{regulated ? 'regulated activity; the regulator sets the pace' : 'banking is usually the longest step'}</p></article>
        <article className="w-card ov-stat"><span className="w-eyebrow">{m.va ? 'Regulatory fees, year one' : 'Financial licence'}</span><b className="ov-big">{m.va ? (acts.length ? aedShort(costs.firstYear) : '—') : 'None needed'}</b><p>{m.va ? `${acts.length} VARA ${acts.length === 1 ? 'activity' : 'activities'}; capital at least ${costs.capitalFloor != null ? aedShort(costs.capitalFloor) : '—'}` : 'trade licence, tax registration and visas only'}</p></article>
      </div>
    </section>

    <Contents items={[{ id: 'me-where', label: 'Where to set up' }, { id: 'me-steps', label: 'Step by step' }, { id: 'me-time', label: 'Timeline' }, { id: 'me-moa', label: 'Memorandum' }, { id: 'me-tax', label: 'VAT and tax' }, { id: 'me-risk', label: 'Bottlenecks' }, ...(m.va === true ? [{ id: 'me-va', label: 'Crypto licensing' }] : [])]} />
    <LocationAdvisor n={1} type={btype} setType={setBtype} onPickRoute={pickRoute} />
    <RouteProcedure n={2} route={route} setRoute={setRoute} regulated={regulated} setRegulated={setRegulated} isVa={m.va === true} done={done} toggle={toggle} />
    <EntryTimeline n={3} route={route} regulated={regulated} />
    <MoaGuide n={4} />
    <TaxGuide n={5} />
    <Bottlenecks n={6} />

    <Section id="me-va" n={7} title={m.va === true ? 'Crypto licensing: capital, fees and regulators' : 'Regulators for virtual assets'} sub="Who licenses virtual-asset activity in each zone, and what a VARA licence costs.">

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
    </Section>

    <section className="signal-ledger entry-compliance">
      <header><div><h3>Compliance you run from day one</h3><p>{m.va ? 'The core of a virtual-asset licence. Regulators test these in interviews and inspections.' : 'AML applies where the activity is designated; the rest is good practice.'}</p></div><span>{COMPLIANCE.filter((c) => m.va || ['aml', 'governance'].includes(c.id)).length} areas</span></header>
      <div>{COMPLIANCE.filter((c) => m.va || ['aml', 'governance'].includes(c.id)).map((c) => <article key={c.id}><i aria-hidden="true" /><div><b>{c.title}</b><ul>{c.points.map((p) => <li key={p}>{p}</li>)}</ul></div><Source s={SOURCES[c.src]} /></article>)}</div>
    </section>

    <section className="signal-ledger">
      <header><div><h3>Sources</h3><p>Set-up costs are adviser estimates and VARA fees come from adviser summaries of its rulebooks; confirm every figure on the authority’s own fee page before relying on it.</p></div><span>{Object.keys(SOURCES).length + GUIDE_SOURCES.length} sources</span></header>
      <div>{[...GUIDE_SOURCES, ...Object.values(SOURCES)].map((s) => <article key={s.url + s.title}><i aria-hidden="true" /><p><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>{s.date ? ` · ${s.date}` : ''}</p><span /></article>)}</div>
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

