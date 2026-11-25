import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createOpsId, opsSummary } from '../opsState.js';
import '../operations.css';

const WORKSPACES = {
  regional: 'Regional Intel', pulse: 'Live Market', market: 'Market Tracker', entry: 'Market Entry', value: 'Value Plan', portfolio: 'Portfolio Lab',
};
const STAGES = ['open', 'doing', 'review', 'done'];
const STAGE_LABEL = { open: 'Open', doing: 'In progress', review: 'Review', done: 'Done' };
const PRIORITY_LABEL = { critical: 'Critical', high: 'High', normal: 'Normal', low: 'Low' };
const today = () => new Date().toISOString().slice(0, 10);
const displayDate = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' });
const aedm = (value) => `AED ${Number(value || 0).toLocaleString('en-AE', { maximumFractionDigits: 1 })}m`;
const updateList = (ops, key, id, patch) => ({ ...ops, [key]: ops[key].map((item) => item.id === id ? { ...item, ...patch } : item) });

function BriefLine({ tone, title, detail, action, onAcknowledge }) {
  return <li className={`brief-line tone-${tone}`}><i aria-hidden="true" /><div><b>{title}</b><span>{detail}</span></div>{action && <button type="button" onClick={onAcknowledge}>Acknowledge</button>}</li>;
}

function Empty({ children }) {
  return <p className="ops-empty">{children}</p>;
}

export function OpsView({ ops, setOps, checks, cases, portfolioSummary, onNavigate }) {
  const [query, setQuery] = useState('');
  const [actionOpen, setActionOpen] = useState(false);
  const [action, setAction] = useState({ title: '', owner: '', due: today(), impact: 0, workspace: 'value', priority: 'normal' });
  const [decision, setDecision] = useState({ title: '', rationale: '', owner: '', workspace: 'regional' });
  const search = useRef(null);
  const summary = useMemo(() => opsSummary(ops), [ops]);
  const normalizedQuery = query.trim().toLowerCase();
  const activeActions = useMemo(() => ops.actions.filter((item) => item.status !== 'done').sort((a, b) => a.due.localeCompare(b.due) || STAGES.indexOf(b.status) - STAGES.indexOf(a.status)), [ops.actions]);
  const filteredActions = normalizedQuery ? activeActions.filter((item) => [item.title, item.owner, item.note, WORKSPACES[item.workspace]].join(' ').toLowerCase().includes(normalizedQuery)) : activeActions;
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return [
      ...ops.actions.map((item) => ({ id: item.id, kind: 'Action', label: item.title, workspace: item.workspace, meta: `${item.owner} · ${STAGE_LABEL[item.status]}` })),
      ...ops.decisions.map((item) => ({ id: item.id, kind: 'Decision', label: item.title, workspace: item.workspace, meta: `${item.owner} · ${item.status}` })),
      ...ops.watchlist.map((item) => ({ id: item.id, kind: item.type, label: item.label, workspace: item.workspace, meta: item.signal })),
    ].filter((item) => `${item.label} ${item.meta} ${WORKSPACES[item.workspace]}`.toLowerCase().includes(normalizedQuery)).slice(0, 8);
  }, [normalizedQuery, ops]);
  const alertItems = useMemo(() => {
    const items = [];
    for (const item of activeActions.filter((candidate) => candidate.due < today())) items.push({ id: `overdue-${item.id}`, tone: 'critical', title: `${item.title} is overdue`, detail: `${item.owner} · due ${displayDate(item.due)}` });
    for (const item of ops.initiatives.filter((candidate) => candidate.status === 'at-risk')) items.push({ id: `risk-${item.id}`, tone: 'watch', title: `${item.name} is at risk`, detail: `${aedm(item.actual)} realised against ${aedm(item.target)}` });
    if (checks.fails || checks.warns) items.push({ id: 'integrity-watch', tone: checks.fails ? 'critical' : 'watch', title: 'Data health needs attention', detail: `${checks.fails} failed checks · ${checks.warns} review items` });
    return items.filter((item) => !ops.acknowledged.includes(item.id));
  }, [activeActions, checks.fails, checks.warns, ops.acknowledged, ops.initiatives]);

  useEffect(() => {
    const key = (event) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (event.key === '/' && !typing) { event.preventDefault(); search.current?.focus(); }
      if (event.key === 'Escape' && document.activeElement === search.current) { setQuery(''); search.current.blur(); }
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, []);

  const addAction = (event) => {
    event.preventDefault();
    if (!action.title.trim()) return;
    const next = { id: createOpsId('action'), title: action.title.trim(), owner: action.owner.trim() || 'Unassigned', due: action.due, priority: action.priority, status: 'open', impact: Number(action.impact) || 0, workspace: action.workspace, note: '' };
    setOps((current) => ({ ...current, actions: [next, ...current.actions] }));
    setAction({ title: '', owner: '', due: today(), impact: 0, workspace: 'value', priority: 'normal' });
    setActionOpen(false);
  };
  const advance = (item) => {
    const next = STAGES[Math.min(STAGES.length - 1, STAGES.indexOf(item.status) + 1)];
    setOps((current) => updateList(current, 'actions', item.id, { status: next }));
  };
  const addDecision = (event) => {
    event.preventDefault();
    if (!decision.title.trim()) return;
    const next = { id: createOpsId('decision'), title: decision.title.trim(), rationale: decision.rationale.trim(), owner: decision.owner.trim() || 'Unassigned', workspace: decision.workspace, date: today(), status: 'draft' };
    setOps((current) => ({ ...current, decisions: [next, ...current.decisions] }));
    setDecision({ title: '', rationale: '', owner: '', workspace: 'regional' });
  };
  const acknowledge = (id) => setOps((current) => ({ ...current, acknowledged: [...new Set([...current.acknowledged, id])] }));

  return <div className="ops-view doc">
    <header className="ops-head">
      <div><span>{new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' })}</span><h2>Today’s operating picture</h2><p>Exceptions, owners and realised value in one working view.</p></div>
      <label className="ops-search"><span>Search or jump</span><div><input ref={search} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Actions, decisions, markets…" /><kbd>/</kbd></div></label>
    </header>

    {normalizedQuery && <section className="command-results" aria-label="Search results"><header><b>Matches</b><span>{searchResults.length} results</span></header>{searchResults.length ? <ul>{searchResults.map((item) => <li key={`${item.kind}-${item.id}`}><button type="button" onClick={() => onNavigate(item.workspace)}><span>{item.kind}</span><b>{item.label}</b><small>{item.meta}</small><em>{WORKSPACES[item.workspace]}</em></button></li>)}</ul> : <Empty>No actions, decisions or watchlist items match this search.</Empty>}</section>}

    <section className="today-runway" aria-label="Today summary">
      <div className="runway-mark"><span>Daily runway</span><b>{summary.overdue ? 'Attention required' : 'Operating normally'}</b></div>
      <dl>
        <div className={summary.overdue ? 'danger' : ''}><dt>Overdue</dt><dd>{summary.overdue}</dd></div>
        <div><dt>Open actions</dt><dd>{summary.open}</dd></div>
        <div className={summary.atRisk ? 'warning' : ''}><dt>At-risk initiatives</dt><dd>{summary.atRisk}</dd></div>
        <div><dt>Value realised</dt><dd>{aedm(summary.actual)}<small>{Math.round(summary.realization * 100)}% of plan</small></dd></div>
        <div><dt>Scenario value</dt><dd>{aedm(portfolioSummary.valueCreated)}<small>versus baseline</small></dd></div>
      </dl>
    </section>

    <div className="ops-primary-grid">
      <section className="ops-panel morning-brief" aria-labelledby="brief-title">
        <header><div><h3 id="brief-title">Morning brief</h3><p>Only unresolved exceptions appear here.</p></div><span>{alertItems.length} live</span></header>
        {alertItems.length ? <ul>{alertItems.slice(0, 5).map((item) => <BriefLine key={item.id} {...item} action onAcknowledge={() => acknowledge(item.id)} />)}</ul> : <Empty>No unresolved exceptions. Review the action register for planned work.</Empty>}
        <footer><span>{checks.loading ? 'Checking source health…' : `${checks.gaps.length} data gaps tracked`}</span><button type="button" onClick={() => onNavigate('pulse')}>Open live market</button></footer>
      </section>

      <section className="ops-panel action-register" aria-labelledby="actions-title">
        <header><div><h3 id="actions-title">Action register</h3><p>Advance work from signal to verified completion.</p></div><button type="button" onClick={() => setActionOpen((value) => !value)}>{actionOpen ? 'Cancel' : 'Create action'}</button></header>
        {actionOpen && <form className="action-form" onSubmit={addAction}>
          <label className="action-title"><span>Action</span><input autoFocus value={action.title} onChange={(event) => setAction((current) => ({ ...current, title: event.target.value }))} placeholder="What needs to happen?" required /></label>
          <label><span>Owner</span><input value={action.owner} onChange={(event) => setAction((current) => ({ ...current, owner: event.target.value }))} placeholder="Team or person" /></label>
          <label><span>Due</span><input type="date" value={action.due} onChange={(event) => setAction((current) => ({ ...current, due: event.target.value }))} /></label>
          <label><span>Value, AEDm</span><input type="number" min="0" step="0.1" value={action.impact} onChange={(event) => setAction((current) => ({ ...current, impact: event.target.value }))} /></label>
          <label><span>Workspace</span><select value={action.workspace} onChange={(event) => setAction((current) => ({ ...current, workspace: event.target.value }))}>{Object.entries(WORKSPACES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label><span>Priority</span><select value={action.priority} onChange={(event) => setAction((current) => ({ ...current, priority: event.target.value }))}>{Object.entries(PRIORITY_LABEL).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <button type="submit">Save action</button>
        </form>}
        <div className="action-table-wrap"><table className="ops-table"><thead><tr><th>Work</th><th>Owner</th><th>Due</th><th>Stage</th><th>Value</th><th><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{filteredActions.map((item) => <tr key={item.id} className={`${item.due < today() ? 'overdue' : ''} priority-${item.priority}`}><td><button className="work-link" type="button" onClick={() => onNavigate(item.workspace)}><b>{item.title}</b><span>{WORKSPACES[item.workspace]}</span></button></td><td>{item.owner}</td><td>{displayDate(item.due)}</td><td><span className={`stage stage-${item.status}`}>{STAGE_LABEL[item.status]}</span></td><td>{item.impact ? aedm(item.impact) : '—'}</td><td><div className="row-actions"><button type="button" onClick={() => setOps((current) => updateList(current, 'actions', item.id, { priority: 'critical', due: today() }))}>Escalate</button><button type="button" onClick={() => advance(item)}>{item.status === 'review' ? 'Complete' : 'Advance'}</button></div></td></tr>)}</tbody></table>{!filteredActions.length && <Empty>No active actions match the current search.</Empty>}</div>
      </section>
    </div>

    <section className="ops-panel value-delivery" aria-labelledby="delivery-title">
      <header><div><h3 id="delivery-title">Value delivery</h3><p>Update actual value during the operating review; forecasts remain visible beside it.</p></div><strong>{aedm(summary.actual)} <small>of {aedm(summary.target)}</small></strong></header>
      <div className="initiative-lines">{ops.initiatives.map((item) => { const progress = item.target ? Math.min(100, item.actual / item.target * 100) : 0; return <article key={item.id}><div className="initiative-main"><span className={`health health-${item.status}`} /><div><b>{item.name}</b><small>{item.owner} · review {displayDate(item.review)}</small></div></div><label><span>Actual AEDm</span><input type="number" min="0" step="0.1" value={item.actual} onChange={(event) => setOps((current) => updateList(current, 'initiatives', item.id, { actual: Number(event.target.value) || 0 }))} /></label><div className="delivery-bar"><i style={{ width: `${progress}%` }} /><span>{Math.round(progress)}%</span></div><select aria-label={`${item.name} health`} value={item.status} onChange={(event) => setOps((current) => updateList(current, 'initiatives', item.id, { status: event.target.value }))}><option value="on-track">On track</option><option value="watch">Watch</option><option value="at-risk">At risk</option><option value="complete">Complete</option></select></article>; })}</div>
    </section>

    <div className="ops-secondary-grid">
      <section className="ops-panel decision-log" aria-labelledby="decisions-title">
        <header><div><h3 id="decisions-title">Decision journal</h3><p>The reason stays attached to the decision.</p></div><span>{ops.decisions.length} recorded</span></header>
        <form onSubmit={addDecision}><label><span>Decision</span><input value={decision.title} onChange={(event) => setDecision((current) => ({ ...current, title: event.target.value }))} placeholder="Record a decision" required /></label><label><span>Owner</span><input value={decision.owner} onChange={(event) => setDecision((current) => ({ ...current, owner: event.target.value }))} placeholder="Owner" /></label><label className="decision-reason"><span>Reason</span><input value={decision.rationale} onChange={(event) => setDecision((current) => ({ ...current, rationale: event.target.value }))} placeholder="Why this decision was taken" /></label><button type="submit">Record</button></form>
        <ol>{ops.decisions.slice(0, 5).map((item) => <li key={item.id}><button type="button" onClick={() => onNavigate(item.workspace)}><span>{displayDate(item.date)}</span><b>{item.title}</b><small>{item.owner} · {item.rationale || 'Reason not recorded'}</small></button><select aria-label={`${item.title} status`} value={item.status} onChange={(event) => setOps((current) => updateList(current, 'decisions', item.id, { status: event.target.value }))}><option value="draft">Draft</option><option value="review">Review</option><option value="approved">Approved</option><option value="implemented">Implemented</option></select></li>)}</ol>
      </section>

      <section className="ops-panel watch-board" aria-labelledby="watch-title">
        <header><div><h3 id="watch-title">Watchlist</h3><p>Topics that can change an active decision.</p></div><span>{ops.watchlist.length} followed</span></header>
        <ul>{ops.watchlist.map((item) => <li key={item.id}><i className={`watch-state ${item.state}`} aria-hidden="true" /><button type="button" onClick={() => onNavigate(item.workspace)}><b>{item.label}</b><span>{item.type} · {item.signal}</span></button><small>{displayDate(item.updated)}</small></li>)}</ul>
      </section>

      <section className="ops-panel review-board" aria-labelledby="reviews-title">
        <header><div><h3 id="reviews-title">Operating cadence</h3><p>Recurring forums and the next pack due.</p></div></header>
        <ul>{ops.reviews.map((item) => <li key={item.id}><div><span>{item.cadence}</span><b>{item.label}</b><small>{item.owner} · {displayDate(item.due)}</small></div><button type="button" className={item.status === 'complete' ? 'complete' : ''} onClick={() => setOps((current) => updateList(current, 'reviews', item.id, { status: item.status === 'complete' ? 'scheduled' : 'complete' }))}>{item.status === 'complete' ? 'Completed' : item.status === 'due' ? 'Complete now' : 'Mark complete'}</button></li>)}</ul>
      </section>

      <section className="ops-panel data-health" aria-labelledby="health-title">
        <header><div><h3 id="health-title">Data health</h3><p>Trust status before the numbers are used.</p></div><span className={checks.fails ? 'bad' : 'good'}>{checks.loading ? 'Checking' : checks.fails ? 'Intervention' : 'Controlled'}</span></header>
        <dl><div><dt>Logic checks</dt><dd>{checks.loading ? '—' : `${checks.checks.length - checks.fails - checks.warns}/${checks.checks.length - checks.warns}`}</dd></div><div><dt>Review items</dt><dd>{checks.loading ? '—' : checks.warns}</dd></div><div><dt>Data gaps</dt><dd>{checks.loading ? '—' : checks.gaps.length}</dd></div><div><dt>Saved cases</dt><dd>{cases.length}</dd></div></dl>
        <button type="button" onClick={() => onNavigate('pulse')}>Inspect evidence and freshness</button>
      </section>
    </div>
  </div>;
}
