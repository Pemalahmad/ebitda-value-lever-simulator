// The practical UAE set-up guide: where to set up, every step with its platform, cost, time and
// bottleneck, a timeline, the memorandum of association, VAT and corporate tax, and the bottlenecks.
import React, { useMemo, useState } from 'react';
import { ROUTES, LOCATIONS, BUSINESS_TYPES, STEPS, schedule, MOA, TAX, BOTTLENECKS, GUIDE_AS_OF } from '../../engine/entryGuide.js';
import { VASP_STAGES } from '../../engine/entry.js';
import { Section, Card, CardHead, FolderTabs, Segmented, Status } from './Dots.jsx';
import { SpotCard } from './Effects.jsx';

const aedRange = ([a, b]) => `AED ${Math.round(a / 1000)}k–${Math.round(b / 1000)}k`;
const wk = (w) => (w < 1 ? `${Math.max(1, Math.round(w * 5))} working day${Math.round(w * 5) > 1 ? 's' : ''}` : `${Math.round(w * 10) / 10} week${w > 1 ? 's' : ''}`);
const range = ([a, b]) => `${wk(a)} – ${wk(b)}`;
const loc = (id) => LOCATIONS.find((l) => l.id === id);

export function LocationAdvisor({ n, type, setType, onPickRoute }) {
  const t = BUSINESS_TYPES.find((x) => x.id === type) ?? BUSINESS_TYPES[0];
  return (
    <Section id="me-where" n={n} title="Where to set up" sub="Pick what you are launching. The three best locations are ranked with the reason, the indicative first-year cost and how long set-up takes. Costs are adviser estimates; confirm with the authority.">
      <div className="advisor-types"><Segmented value={type} onChange={setType} label="Business type" options={BUSINESS_TYPES.map((b) => [b.id, b.label])} /></div>
      <div className="advisor-grid">{t.rank.map(([id, why], i) => {
        const l = loc(id);
        return (
          <SpotCard key={id} className={`advisor-card ${i === 0 ? 'best' : ''}`}>
            <span className="w-eyebrow">{i === 0 ? 'Best fit' : `Option ${i + 1}`} · {l.emirate}</span>
            <h4>{l.name}</h4>
            <p className="advisor-why">{why}</p>
            <dl className="advisor-facts">
              <div><dt>First year, indicative</dt><dd>{aedRange(type === 'vasp' && l.vaCost ? l.vaCost : l.cost)}{type === 'vasp' && l.vaCost ? ' incl. licence' : ''}</dd></div>
              <div><dt>Set-up time</dt><dd>{type === 'vasp' ? '4–12 months with the regulator' : range(l.setupWeeks)}</dd></div>
              <div><dt>Selling onshore</dt><dd>{l.onshore}</dd></div>
              <div><dt>Office</dt><dd>{l.office}</dd></div>
            </dl>
            <p className="advisor-watch"><b>Watch:</b> {l.watch}</p>
            <button type="button" className="ghost sm" onClick={() => onPickRoute(l.route)}>See the steps for this route →</button>
          </SpotCard>
        );
      })}</div>
      <Card>
        <CardHead title="All locations compared" sub={`Indicative, as at ${GUIDE_AS_OF}. Licence and a basic desk or office, before visas.`} />
        <div className="table-wrap"><table className="data loc-table">
          <thead><tr><th>Location</th><th>Emirate</th><th className="r">First year</th><th className="r">Set-up</th><th>Best for</th><th>Watch</th></tr></thead>
          <tbody>{LOCATIONS.map((l) => <tr key={l.id} className="clickable" onClick={() => onPickRoute(l.route)} role="button" tabIndex={0}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPickRoute(l.route); } }}>
            <td><b>{l.name}</b></td><td className="muted">{l.emirate}</td><td className="r">{aedRange(l.cost)}</td><td className="r">{range(l.setupWeeks)}</td><td className="sm">{l.best}</td><td className="sm muted">{l.watch}</td></tr>)}</tbody>
        </table></div>
      </Card>
    </Section>
  );
}

export function RouteProcedure({ n, route, setRoute, regulated, setRegulated, isVa, done, toggle }) {
  const steps = STEPS.filter((s) => s.by[route] && (!s.by[route].optional || regulated));
  const [active, setActive] = useState(0);
  const step = steps[Math.min(active, steps.length - 1)];
  const r = step.by[route];
  const key = (s, d) => `${route}:${s.id}:${d}`;
  const cleared = (s) => s.docs.every((d) => done[key(s, d)]);
  const R = ROUTES.find((x) => x.id === route);
  return (
    <Section id="me-steps" n={n} title="Step by step: what to do, where, cost and time" sub="Choose the route. Each step names the platform to use, the documents, the indicative cost, how long it takes and the bottleneck to expect. Tick documents as you collect them; progress stays in this browser."
      actions={<Segmented value={route} onChange={(v) => { setRoute(v); setActive(0); }} label="Route" options={ROUTES.map((x) => [x.id, x.label])} />}>
      <div className="route-bar">
        <span><b>{R.label}</b> · {R.authority} · main portal <a href={R.portal.url} target="_blank" rel="noreferrer">{R.portal.name}</a></span>
        <label className="entry-toggle"><input type="checkbox" checked={regulated} onChange={(e) => setRegulated(e.target.checked)} /> Regulated activity (crypto, finance, health, education)</label>
      </div>
      <section className="sop-console route-console">
        <div className="sop-layout">
          <nav className="sop-steps" aria-label="Steps">
            {steps.map((s, i) => <button type="button" key={s.id} className={`${step.id === s.id ? 'on' : ''} ${cleared(s) ? 'done' : ''}`} onClick={() => setActive(i)} aria-current={step.id === s.id ? 'step' : undefined}>
              <span>{cleared(s) ? '✓' : i + 1}</span><span><b>{s.title}</b><small>{s.by[route].platform.name} · {range(s.by[route].weeks)}</small></span>
            </button>)}
          </nav>
          <article className="sop-detail">
            <div className="sop-meta"><span>Owner <b>{step.owner}</b></span><span>Time <b>{range(r.weeks)}</b></span></div>
            <h4>{step.title}</h4>
            <p className="entry-gate">{step.what}</p>
            <div className="step-facts">
              <div><span>Where</span><a className="platform" href={r.platform.url} target="_blank" rel="noreferrer">{r.platform.name} ↗</a></div>
              <div><span>Cost</span><b>{r.cost}</b></div>
            </div>
            <span className="w-eyebrow">Documents to prepare</span>
            <ul className="entry-checks">{step.docs.map((d) => { const k = key(step, d); return <li key={d}><button type="button" role="checkbox" aria-checked={!!done[k]} onClick={() => toggle(k)}><span aria-hidden="true">{done[k] ? '✓' : '○'}</span>{d}</button></li>; })}</ul>
            {step.id === 'regulator' && isVa && (route === 'dxbml' || route === 'dxbfz') && <div className="vara-stages">{VASP_STAGES.map((st) => <div key={st.id}><b>{st.title}</b><p>{st.allowed} {st.notAllowed}</p></div>)}</div>}
            <div className="step-warn"><b>Bottleneck</b><p>{step.bottleneck}</p></div>
            <div className="step-tip"><b>Tip</b><p>{step.tip}</p></div>
            <div className="sop-actions">
              {active > 0 ? <button type="button" className="ghost sm" onClick={() => setActive((i) => i - 1)}>← Back</button> : <span />}
              {active < steps.length - 1 && <button type="button" className="sop-complete" onClick={() => setActive((i) => i + 1)}>Next step →</button>}
            </div>
          </article>
        </div>
      </section>
    </Section>
  );
}

export function EntryTimeline({ n, route, regulated }) {
  const [use, setUse] = useState(0.5);
  const s = useMemo(() => schedule(route, { regulated, use }), [route, regulated, use]);
  const R = ROUTES.find((x) => x.id === route);
  return (
    <Section id="me-time" n={n} title="Timeline" sub={`${R.label}${regulated ? ', regulated activity' : ''}: steps that can run in parallel do. The critical path (in the accent colour) sets the launch date.`}
      actions={<Segmented value={use} onChange={setUse} label="Estimate" options={[[0, 'Best case'], [0.5, 'Typical'], [1, 'Prudent']]} />}>
      <Card>
        <CardHead title={`About ${Math.ceil(s.total)} weeks from start to an operating company`} sub={regulated ? 'Regulatory approval dominates; start it first.' : 'Banking is usually the longest step.'} />
        <div className="gantt" style={{ '--total': s.total }}>
          {s.rows.map((r) => (
            <div key={r.id} className={`g-row ${r.critical ? 'crit' : ''}`}>
              <span className="g-label">{r.title}</span>
              <span className="g-track"><i style={{ left: `${(r.start / s.total) * 100}%`, width: `${Math.max(1.2, (r.dur / s.total) * 100)}%` }} title={`Week ${r.start.toFixed(1)} to ${r.end.toFixed(1)}`} /></span>
              <span className="g-val">{wk(r.dur)}</span>
            </div>
          ))}
          <div className="g-axis">{Array.from({ length: 5 }, (_, i) => <span key={i}>wk {Math.round((s.total * i) / 4)}</span>)}</div>
        </div>
      </Card>
    </Section>
  );
}

export function MoaGuide({ n }) {
  const [view, setView] = useState('clauses');
  return (
    <Section id="me-moa" n={n} title="Memorandum of association" sub={MOA.what}>
      <FolderTabs value={view} onChange={setView} tabs={[{ id: 'clauses', label: 'What must be written', count: MOA.clauses.length }, { id: 'steps', label: 'How to execute it', count: MOA.steps.length }, { id: 'templates', label: 'Templates', count: MOA.templates.length }, { id: 'pitfalls', label: 'Pitfalls', count: MOA.pitfalls.length }]} />
      <Card className="folder-body">
        {view === 'clauses' && <div className="table-wrap"><table className="data"><thead><tr><th>#</th><th>Clause</th><th>What to write</th></tr></thead><tbody>{MOA.clauses.map(([k, v], i) => <tr key={k}><td className="muted">{i + 1}</td><td><b>{k}</b></td><td>{v}</td></tr>)}</tbody></table></div>}
        {view === 'steps' && <ol className="guide-steps">{MOA.steps.map(([k, v]) => <li key={k}><b>{k}</b><p>{v}</p></li>)}</ol>}
        {view === 'templates' && <ul className="guide-links">{MOA.templates.map((t) => <li key={t.name}><a href={t.url} target="_blank" rel="noreferrer">{t.name} ↗</a></li>)}</ul>}
        {view === 'pitfalls' && <ul className="watch">{MOA.pitfalls.map((p) => <li key={p}><span className="w-k">{p}</span><span /><Status s="warn" /></li>)}</ul>}
        <p className="w-foot"><b>Cost:</b> {MOA.cost}</p>
      </Card>
    </Section>
  );
}

export function TaxGuide({ n }) {
  const [view, setView] = useState('vatform');
  return (
    <Section id="me-tax" n={n} title="VAT and corporate tax" sub="Both are filed on EmaraTax, the Federal Tax Authority portal. Corporate tax registration is for every company; VAT starts at the turnover threshold.">
      <div className="grid-2">
        <Card><CardHead title="Corporate tax" sub="Register within three months of incorporation" right={<a className="ghost sm" href="https://eservices.tax.gov.ae/" target="_blank" rel="noreferrer">EmaraTax ↗</a>} />
          <ul className="watch">{TAX.ct.rules.map(([k, v]) => <li key={k}><span className="w-k">{k}<small>{v}</small></span><span /><span /></li>)}</ul></Card>
        <Card><CardHead title="VAT rules" sub="Thresholds, deadlines and penalties" />
          <ul className="watch">{TAX.vat.rules.map(([k, v]) => <li key={k}><span className="w-k">{k}<small>{v}</small></span><span /><span /></li>)}</ul></Card>
      </div>
      <FolderTabs value={view} onChange={setView} tabs={[{ id: 'vatform', label: 'What you fill in for VAT', count: TAX.vat.form.length }]} />
      <Card className="folder-body">
        <ol className="guide-steps two-col">{TAX.vat.form.map(([k, v]) => <li key={k}><b>{k}</b><p>{v}</p></li>)}</ol>
        <p className="w-foot">The portal’s exact fields change from time to time; this lists what the application asks for and the evidence to have ready.</p>
      </Card>
    </Section>
  );
}

export function Bottlenecks({ n }) {
  return (
    <Section id="me-risk" n={n} title="Compliance bottlenecks and how to clear them" sub="Where UAE entries lose weeks or months, in order of impact.">
      <Card><div className="table-wrap"><table className="data"><thead><tr><th>Area</th><th>Impact</th><th>Bottleneck</th><th>How to clear it</th></tr></thead>
        <tbody>{[...BOTTLENECKS].sort((a, b) => (a.impact === 'high' ? -1 : 1) - (b.impact === 'high' ? -1 : 1)).map((b) => <tr key={b.area}><td><b>{b.area}</b></td><td><span className={`impact ${b.impact}`}>{b.impact}</span></td><td className="sm">{b.issue}</td><td className="sm">{b.fix}</td></tr>)}</tbody></table></div></Card>
    </Section>
  );
}
