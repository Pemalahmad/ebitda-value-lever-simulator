import React, { useMemo, useState } from 'react';
import { AS_OF, SOURCES, JURISDICTIONS, VA_ACTIVITIES, MODELS, COMPANY_STEPS, PRODUCT_STEPS, VASP_STAGES, COMPLIANCE, PITFALLS, assess, varaCosts } from '../../engine/entry.js';
import { Source } from './Source.jsx';

const KEY = 'vls.entry.v1';
const aed = (v) => (v == null ? 'Set by VARA' : `AED ${Math.round(v).toLocaleString('en-US')}`);
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ } };

function Steps({ steps, done, toggle, start = 1 }) {
  return (
    <ol className="entry-steps" start={start}>
      {steps.map((s) => {
        const n = s.checks.filter((c) => done[`${s.id}:${c}`]).length;
        return (
          <li key={s.id}>
            <div className="entry-step-head"><h4>{s.title}</h4><span className={`chip sm ${n === s.checks.length ? 'pos' : ''}`}>{n}/{s.checks.length}</span></div>
            <p>{s.detail} {s.src && <Source s={SOURCES[s.src]} />}</p>
            <ul className="checklist">{s.checks.map((c) => (
              <li key={c}><label><input type="checkbox" checked={!!done[`${s.id}:${c}`]} onChange={() => toggle(`${s.id}:${c}`)} /> {c}</label></li>
            ))}</ul>
          </li>
        );
      })}
    </ol>
  );
}

export function EntryView() {
  const saved = useMemo(load, []);
  const [model, setModel] = useState(saved.model ?? 'vasp');
  const [jurisdiction, setJurisdiction] = useState(saved.jurisdiction ?? 'dubai');
  const [acts, setActs] = useState(saved.acts ?? ['broker', 'custody']);
  const [overheads, setOverheads] = useState(saved.overheads ?? 4000000);
  const [custodian, setCustodian] = useState(saved.custodian ?? false);
  const [inApp, setInApp] = useState(saved.inApp ?? true);
  const [done, setDone] = useState(saved.done ?? {});
  const persist = (p) => save({ model, jurisdiction, acts, overheads, custodian, inApp, done, ...p });
  const upd = (setter, key) => (v) => { setter(v); persist({ [key]: v }); };
  const toggle = (k) => { const next = { ...done, [k]: !done[k] }; setDone(next); persist({ done: next }); };
  const toggleAct = (id) => upd(setActs, 'acts')(acts.includes(id) ? acts.filter((x) => x !== id) : [...acts, id]);

  const m = MODELS.find((x) => x.id === model);
  const a = assess({ model, jurisdiction, activities: acts, marketsInApp: inApp });
  const costs = varaCosts(acts, { overheads, usesCustodian: custodian });
  const showVasp = m.va === true;
  const vara = a.jurisdiction.vaRegulator === 'VARA';
  const productStart = COMPANY_STEPS.length + 1;

  return (
    <>
      <section className="card pulse-head">
        <h3>UAE Market Entry</h3>
        <p className="card-sub">What any business needs to enter the UAE, in order: the structure, the licences, tax, people and product rules, with a full track for virtual-asset (crypto) businesses benchmarked on Dubai's VARA and its ADGM and DIFC equivalents. Rules and figures as at {AS_OF}, from the cited sources. A planning aid, not legal advice: confirm every requirement with the regulator and UAE counsel.</p>
      </section>

      <section className="card">
        <h3>Your entry profile</h3>
        <p className="card-sub">Pick the business model and the zone. The roadmap, the regulator and the cost stack below follow from these choices.</p>
        <div className="journal-form">
          <label className="wide">Business model
            <select value={model} onChange={(e) => upd(setModel, 'model')(e.target.value)}>{MODELS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
          </label>
          <label className="wide">Where the entity sits
            <select value={jurisdiction} onChange={(e) => upd(setJurisdiction, 'jurisdiction')(e.target.value)}>{JURISDICTIONS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
          </label>
          {model === 'selfcustody' && <label className="wide entry-inline"><input type="checkbox" checked={inApp} onChange={(e) => upd(setInApp, 'inApp')(e.target.checked)} /> The companion app offers buy, sell, swap or staking through partners</label>}
        </div>
        <div className="entry-verdict">
          <div>
            <span className="tile-label">What you need</span>
            <ul>{a.needs.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
          <div>
            <span className="tile-label">Regulator for virtual-asset activity here</span>
            <p><b>{a.jurisdiction.vaRegulator}</b>. {a.jurisdiction.note} <Source s={SOURCES[a.jurisdiction.src]} /></p>
            {a.flags.map((f) => <p key={f} className="entry-flag">{f}</p>)}
          </div>
        </div>
      </section>

      <section className="card">
        <h3>1. Set up the company</h3>
        <p className="card-sub">Every business does these, in this order. Tick items off as you go; progress stays in this browser.</p>
        <Steps steps={COMPANY_STEPS} done={done} toggle={toggle} />
      </section>

      {m.product && (
        <section className="card">
          <h3>2. Bring the product in</h3>
          <p className="card-sub">For physical products, including hardware devices, sold online or in retail.</p>
          <Steps steps={PRODUCT_STEPS} done={done} toggle={toggle} start={productStart} />
        </section>
      )}

      {model === 'selfcustody' && (
        <section className="card">
          <h3>{m.product ? '3' : '2'}. Self-custody: where the licence line sits</h3>
          <p className="card-sub">Regulators judge the economic function, not the label. Map each feature before launch.</p>
          <div className="table-wrap"><table className="data">
            <thead><tr><th>Feature</th><th>Likely position</th><th>What to do</th></tr></thead>
            <tbody>
              <tr><td>Selling the device or app, the user alone holds the keys</td><td>Product sale; no custody of client assets</td><td>Trade licence and product compliance; get the perimeter view in writing from the regulator</td></tr>
              <tr><td>Backup or recovery where the company can move or restore assets</td><td>May be custody</td><td>Design it out, or license custody in a separate entity</td></tr>
              <tr><td>Buy, sell or swap inside the app</td><td>Broker-dealer or exchange activity</td><td>Route through providers licensed for UAE users; you act only as their approved marketer</td></tr>
              <tr><td>Staking or yield</td><td>Lending, borrowing or management activity</td><td>Licensed partner only; disclose risks</td></tr>
              <tr><td>Paying merchants with crypto or stablecoins</td><td>Central Bank payment services</td><td>Licensed payment provider; only approved payment tokens</td></tr>
              <tr><td>Advertising, influencers and affiliates</td><td>Marketing of virtual assets</td><td>Product marketing is fine; promoting the in-app activities needs the licensed partner's approval and risk disclaimers</td></tr>
            </tbody>
          </table></div>
        </section>
      )}

      {showVasp && (
        <>
          <section className="card">
            <h3>{m.product ? '3' : '2'}. Get licensed for the virtual-asset activity</h3>
            <p className="card-sub">{vara ? 'VARA runs two stages and typically takes four to twelve months.' : `This zone is licensed by the ${a.jurisdiction.vaRegulator}, whose process and schedule differ; VARA's stages are shown as the benchmark.`} Nothing may be marketed or offered to clients until the licence is issued. <Source s={SOURCES.varaSite} /></p>
            <div className="entry-stages">{VASP_STAGES.map((s) => (
              <article key={s.id} className="pulse-signal">
                <h4>{s.title}</h4>
                <p>{s.detail}</p>
                <span className="tile-label">File</span>
                <ul className="checklist">{s.file.map((f) => <li key={f}><label><input type="checkbox" checked={!!done[`${s.id}:${f}`]} onChange={() => toggle(`${s.id}:${f}`)} /> {f}</label></li>)}</ul>
                <p className="entry-ok"><b>Allowed:</b> {s.allowed}</p>
                <p className="entry-no"><b>Not allowed:</b> {s.notAllowed}</p>
                <p><b>Fee:</b> {s.fee}</p>
              </article>
            ))}</div>
          </section>

          <section className="card">
            <h3>Capital and fee calculator (VARA)</h3>
            <p className="card-sub">Pick the activities and your expected fixed annual overheads. Capital is the higher of the activity floor or a share of overheads. <Source s={SOURCES.varaSchedule2} /> <Source s={SOURCES.varaCapital} /></p>
            <div className="chips entry-acts">{VA_ACTIVITIES.map((x) => (
              <button key={x.id} className={`chip ${acts.includes(x.id) ? 'on' : ''}`} onClick={() => toggleAct(x.id)} aria-pressed={acts.includes(x.id)}>{x.label}</button>
            ))}</div>
            <div className="journal-form" style={{ marginTop: 12 }}>
              <label>Fixed annual overheads (AED)
                <input type="number" min="0" step="100000" value={overheads} onChange={(e) => upd(setOverheads, 'overheads')(Number(e.target.value) || 0)} />
              </label>
              <label className="wide entry-inline"><input type="checkbox" checked={custodian} onChange={(e) => upd(setCustodian, 'custodian')(e.target.checked)} /> Client assets held by a separately VARA-licensed custodian</label>
            </div>
            {acts.length === 0 ? <p className="muted">Pick at least one activity.</p> : (
              <div className="table-wrap"><table className="data">
                <thead><tr><th>Activity</th><th className="r">Application fee</th><th className="r">Annual supervision</th><th className="r">Paid-up capital</th></tr></thead>
                <tbody>
                  {costs.capitalByActivity.map((c) => { const x = VA_ACTIVITIES.find((v) => v.id === c.id); return (
                    <tr key={c.id}><td>{c.label}{x.note && <div className="muted" style={{ fontSize: 11 }}>{x.note}</div>}</td><td className="r">{aed(x.application)}</td><td className="r">{aed(x.supervision)}</td><td className="r">{aed(c.capital)}</td></tr>
                  ); })}
                  <tr className="total"><td>Total</td><td className="r">up to {aed(costs.application)}</td><td className="r">{aed(costs.supervision)} / yr</td><td className="r">{costs.capitalFloor == null ? '—' : `at least ${aed(costs.capitalFloor)}`}</td></tr>
                </tbody>
              </table></div>
            )}
            {acts.length > 0 && <p className="card-sub" style={{ marginTop: 10 }}>Paid at Stage 1 (Approval to Incorporate): about {aed(costs.atiPayment)}. Regulatory fees in year one: up to {aed(costs.firstYear)}, before capital, insurance, office, the two Responsible Individuals and advisers. Additional activities attract a reduced extension fee, so the application total is an upper bound. {costs.separateCustodyEntity && <b>Custody needs its own licensed entity: budget a second set of capital and fees.</b>}</p>}
          </section>
        </>
      )}

      <section className="card">
        <h3>Compliance you must run from day one</h3>
        <p className="card-sub">{m.va ? 'The core of a virtual-asset licence. Regulators test these in interviews and inspections.' : 'For a non-crypto business the AML points apply where the activity is designated (for example dealers in precious metals or real estate); the rest is good practice.'}</p>
        <div className="pulse-signals">{COMPLIANCE.filter((c) => m.va || ['aml', 'governance'].includes(c.id)).map((c) => (
          <article key={c.id} className="pulse-signal">
            <h4>{c.title} <Source s={SOURCES[c.src]} /></h4>
            <ul className="entry-points">{c.points.map((p) => <li key={p}>{p}</li>)}</ul>
          </article>
        ))}</div>
      </section>

      <section className="card">
        <h3>Pitfalls that stall an entry</h3>
        <ul className="entry-points">{PITFALLS.map((p) => <li key={p}>{p}</li>)}</ul>
      </section>

      <section className="card">
        <h3>Sources and further reading</h3>
        <p className="card-sub">Fees and capital are taken from VARA's Schedule 2 and Company Rulebook as summarised by UAE advisers; read the primary rulebooks before relying on them.</p>
        <ul className="plain">{Object.values(SOURCES).map((s) => <li key={s.url + s.title} className="pulse-news"><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>{s.date && <span className="muted"> · {s.date}</span>}</li>)}</ul>
      </section>
    </>
  );
}
