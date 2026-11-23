import React, { useMemo, useState } from 'react';
import { aggregate, DLD_COLUMNS, normalise, parseCsv } from '../../engine/market.js';
import { Source } from './Source.jsx';

const n0 = (value) => Math.round(value).toLocaleString('en-US');
const bn = (value) => `AED ${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}bn`;

export const MARKET_CASES = [
  { id: 'base', title: 'Base case', factor: 1, volume: 1, investors: 1, tone: '#3157d5', signal: 'Published 2025 market level', posture: 'Hold the current underwriting frame.' },
  { id: 'upside', title: 'Upside', factor: 1.16, volume: 1.1, investors: 1.1, tone: '#168f82', signal: 'Value expands faster than volume', posture: 'Test selective pricing and launch acceleration.' },
  { id: 'growth', title: 'Growth', factor: 1.27, volume: 1.2, investors: 1.2, tone: '#5c76dc', signal: 'Broad participation and absorption', posture: 'Model capacity, delivery and working-capital needs.' },
  { id: 'downside', title: 'Downside', factor: 0.85, volume: 0.85, investors: 0.9, tone: '#d5534a', signal: 'Lower deal flow and softer values', posture: 'Protect cash and phase discretionary commitments.' },
  { id: 'liquidity', title: 'Liquidity stress', factor: 0.75, volume: 0.76, investors: 0.85, tone: '#a76b00', signal: 'Capital availability tightens', posture: 'Escalate funding, collections and covenant review.' },
];

const RELEASE_MONTHS = [
  {
    label: 'October 2026',
    days: 31,
    start: 4,
    events: [
      { day: 1, kind: 'source', title: 'Nine-month market tally', owner: 'Market intelligence', status: 'Published', note: 'Validate the media tally against DLD data and retain the source note.' },
      { day: 12, kind: 'review', title: 'Annual review source check', owner: 'Data governance', status: 'Complete', note: 'Confirm definitions for value, transactions and active investors.' },
      { day: 26, kind: 'decision', title: 'Scenario calibration', owner: 'Strategy', status: 'Complete', note: 'Refresh the five working cases before the next investment review.' },
    ],
  },
  {
    label: 'November 2026',
    days: 30,
    start: 0,
    events: [
      { day: 3, kind: 'source', title: 'Monthly transaction extract', owner: 'Market intelligence', status: 'Complete', note: 'Load the latest DLD extract and reconcile the published total.' },
      { day: 10, kind: 'review', title: 'Evidence validation', owner: 'Data governance', status: 'Complete', note: 'Clear source, scope and partial-period labels through SOP gate one.' },
      { day: 17, kind: 'model', title: 'Scenario refresh', owner: 'Strategy', status: 'In review', note: 'Update downside and liquidity cases using current volume signals.' },
      { day: 24, kind: 'decision', title: 'Decision review', owner: 'Business owner', status: 'Next', note: 'Select the working case, record the action and assign an owner.' },
      { day: 30, kind: 'record', title: 'Board memo cut-off', owner: 'PMO', status: 'Planned', note: 'Lock the evidence pack and schedule the next review date.' },
    ],
  },
  {
    label: 'December 2026',
    days: 31,
    start: 2,
    events: [
      { day: 2, kind: 'source', title: 'Monthly transaction extract', owner: 'Market intelligence', status: 'Planned', note: 'Run the local import and compare volume against November.' },
      { day: 9, kind: 'review', title: 'Community momentum review', owner: 'Research', status: 'Planned', note: 'Inspect price movement only where the minimum deal threshold is met.' },
      { day: 16, kind: 'model', title: 'Year-end case refresh', owner: 'Strategy', status: 'Planned', note: 'Rebase the scenario deck ahead of the preliminary annual release.' },
    ],
  },
];

const FIELD_CHECKS = [
  ['date', 'Transaction date'],
  ['type', 'Transaction type'],
  ['registration', 'Registration type'],
  ['area', 'Community / area'],
  ['amount', 'Transaction amount'],
  ['size', 'Transaction size'],
];

export function ReleaseCalendar() {
  const [monthIndex, setMonthIndex] = useState(1);
  const month = RELEASE_MONTHS[monthIndex];
  const [selectedDay, setSelectedDay] = useState(month.events.find((event) => event.status === 'Next')?.day ?? month.events[0].day);
  const selected = month.events.find((event) => event.day === selectedDay) ?? month.events[0];

  const moveMonth = (offset) => {
    const next = Math.min(RELEASE_MONTHS.length - 1, Math.max(0, monthIndex + offset));
    setMonthIndex(next);
    setSelectedDay(RELEASE_MONTHS[next].events[0].day);
  };

  return <section className="release-calendar" id="market-calendar">
    <header>
      <div><span>Evidence cadence</span><h3>Release and review calendar</h3><p>Published data and internal decision gates remain visibly separate.</p></div>
      <div className="calendar-nav"><button type="button" onClick={() => moveMonth(-1)} disabled={monthIndex === 0} aria-label="Previous month">‹</button><b>{month.label}</b><button type="button" onClick={() => moveMonth(1)} disabled={monthIndex === RELEASE_MONTHS.length - 1} aria-label="Next month">›</button></div>
    </header>
    <div className="calendar-layout">
      <div className="calendar-grid" aria-label={month.label}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span className="weekday" key={day}>{day}</span>)}
        {Array.from({ length: month.start }, (_, index) => <span className="calendar-blank" key={`blank-${index}`} />)}
        {Array.from({ length: month.days }, (_, index) => {
          const day = index + 1;
          const event = month.events.find((item) => item.day === day);
          return <button type="button" key={day} className={`${event ? `has-event ${event.kind}` : ''} ${selectedDay === day ? 'selected' : ''}`} onClick={() => event && setSelectedDay(day)} disabled={!event} aria-label={event ? `${day} ${event.title}` : `${day}`}><span>{day}</span>{event && <i aria-hidden="true" />}</button>;
        })}
      </div>
      <article className="calendar-detail">
        <div><span>{selected.status}</span><b>{month.label.split(' ')[0]} {selected.day}</b></div>
        <h4>{selected.title}</h4>
        <p>{selected.note}</p>
        <footer><span>Owner</span><b>{selected.owner}</b></footer>
      </article>
    </div>
  </section>;
}

export function ScenarioDeck({ latest, selectedId, onSelect }) {
  const activeIndex = MARKET_CASES.findIndex((item) => item.id === selectedId);
  const active = MARKET_CASES[activeIndex];
  const values = caseValues(active, latest);
  const move = (direction) => onSelect(MARKET_CASES[(activeIndex + direction + MARKET_CASES.length) % MARKET_CASES.length].id);

  return <section className="scenario-deck" id="market-scenarios">
    <header><div><span>Illustrative working cases</span><h3>Scenario lens</h3><p>Use these cases to frame a decision. They are not market forecasts.</p></div><div className="deck-nav"><button type="button" onClick={() => move(-1)} aria-label="Previous scenario">‹</button><span>{activeIndex + 1} / {MARKET_CASES.length}</span><button type="button" onClick={() => move(1)} aria-label="Next scenario">›</button></div></header>
    <div className="scenario-track" role="listbox" tabIndex="0" aria-label="Market working cases" onKeyDown={(event) => { if (event.key === 'ArrowLeft') move(-1); if (event.key === 'ArrowRight') move(1); }}>
      {MARKET_CASES.map((item, index) => {
        let offset = index - activeIndex;
        if (offset > 2) offset -= MARKET_CASES.length;
        if (offset < -2) offset += MARKET_CASES.length;
        const itemValues = caseValues(item, latest);
        return <button type="button" key={item.id} role="option" aria-selected={item.id === selectedId} className={`scenario-card ${item.id === selectedId ? 'active' : ''}`} style={{ '--offset': offset, '--case-tone': item.tone, zIndex: 4 - Math.abs(offset) }} onClick={() => onSelect(item.id)}>
          <span>{item.title}</span><b>{bn(itemValues.value)}</b><small>{item.signal}</small><i><span style={{ width: `${Math.min(100, item.factor * 70)}%` }} /></i>
        </button>;
      })}
    </div>
    <div className="scenario-readout"><div><span>Working case</span><b>{active.title}</b></div><div><span>Transactions</span><b>{n0(values.transactions)}</b></div><div><span>Investors</span><b>{n0(values.investors)}</b></div><p>{active.posture}</p></div>
  </section>;
}

export function BeforeAfterCard({ latest, scenarioId }) {
  const [open, setOpen] = useState(false);
  const scenario = MARKET_CASES.find((item) => item.id === scenarioId) ?? MARKET_CASES[0];
  const values = caseValues(scenario, latest);
  const delta = values.value / latest.valueAedBn - 1;

  return <section className={`comparison-book ${open ? 'open' : ''}`}>
    <button type="button" className="comparison-cover" onClick={() => setOpen(true)} aria-expanded={open}>
      <span>Open comparison</span><b>{scenario.title}</b><small>Published market versus the selected working case</small>
    </button>
    <div className="comparison-spread">
      <article><span>Published market</span><h3>{latest.year}</h3><b>{bn(latest.valueAedBn)}</b><p>{n0(latest.transactions)} transactions<br />{n0(latest.investors)} investors</p></article>
      <article style={{ '--case-tone': scenario.tone }}><span>Working case</span><h3>{scenario.title}</h3><b>{bn(values.value)}</b><p>{delta === 0 ? 'No adjustment to published value' : `${delta > 0 ? '+' : '−'}${Math.abs(delta * 100).toFixed(0)}% value adjustment`}<br />{scenario.posture}</p></article>
      <button type="button" className="comparison-close" onClick={() => setOpen(false)}>Close comparison</button>
    </div>
  </section>;
}

export function ImportLab({ onImport, bundledAggregate }) {
  const [state, setState] = useState({ status: 'idle', progress: 0, error: '', file: null, summary: null, fields: [] });
  const tick = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

  const readFile = async (file) => {
    if (!file) return;
    setState({ status: 'scanning', progress: 8, error: '', file, summary: null, fields: [] });
    try {
      const text = await file.text();
      setState((value) => ({ ...value, progress: 28 }));
      await tick();
      const rows = parseCsv(text);
      if (!rows.length) throw new Error('The CSV has no transaction rows.');
      const headers = new Set(Object.keys(rows[0]));
      const fields = FIELD_CHECKS.map(([key, label]) => ({ key, label, source: DLD_COLUMNS[key], found: headers.has(DLD_COLUMNS[key]) || (key === 'size' && headers.has(DLD_COLUMNS.propertySize)) }));
      const missing = fields.filter((item) => !item.found);
      if (missing.length) throw new Error(`Missing required columns: ${missing.map((item) => item.source).join(', ')}`);
      setState((value) => ({ ...value, progress: 56, fields }));
      await tick();
      const transactions = rows.map(normalise);
      const validRows = transactions.filter((item) => item.date && Number.isFinite(item.amount) && item.amount > 0).length;
      setState((value) => ({ ...value, progress: 78 }));
      await tick();
      const result = aggregate(transactions, { window: 90, minDeals: 5, top: 12 });
      const summary = { rows: rows.length, validRows, rejected: rows.length - validRows, period: `${result.period.start} to ${result.period.end}`, value: result.totals.valueAedBn };
      setState({ status: 'ready', progress: 100, error: '', file, summary, fields });
      onImport(result);
    } catch (error) {
      setState((value) => ({ ...value, status: 'error', progress: 0, error: error.message || 'The CSV could not be read.' }));
    }
  };

  return <section className="import-lab" id="market-import">
    <header><div><span>Local data workspace</span><h3>DLD import lab</h3><p>Validate and aggregate a transaction CSV in this browser. The file is never uploaded.</p></div><div className={`import-state ${state.status}`}>{state.status === 'idle' ? bundledAggregate ? 'Bundled file connected' : 'Ready for a file' : state.status === 'scanning' ? 'Scanning locally' : state.status === 'ready' ? 'Validation passed' : 'Needs attention'}</div></header>
    <div className="import-layout">
      <label className={`drop-zone ${state.status}`} htmlFor="dld-import-file">
        <input id="dld-import-file" type="file" accept=".csv,text/csv" onChange={(event) => readFile(event.target.files?.[0])} />
        <span className="scan-line" style={{ '--scan': `${state.progress}%` }} />
        <b>{state.file?.name ?? 'Choose a DLD Transactions CSV'}</b>
        <small>{state.file ? `${(state.file.size / 1024 / 1024).toFixed(1)} MB · processed locally` : 'CSV only · no network transfer'}</small>
        <i>{state.status === 'scanning' ? `${state.progress}%` : state.status === 'ready' ? 'Replace file' : 'Browse file'}</i>
      </label>
      <div className="field-inspector">
        <div className="field-tabs"><b>Fields</b><span>Quality</span><span>Run</span></div>
        {state.error && <p className="import-error">{state.error}</p>}
        {state.fields.length > 0 ? <ul>{state.fields.map((field) => <li key={field.key}><span>{field.found ? '✓' : '!'}</span><div><b>{field.label}</b><small>{field.source}</small></div></li>)}</ul> : <p className="import-empty">Required DLD fields appear here as the file is mapped.</p>}
      </div>
    </div>
    {state.summary && <div className="import-summary"><Metric label="Rows read" value={n0(state.summary.rows)} /><Metric label="Valid transactions" value={n0(state.summary.validRows)} /><Metric label="Rejected rows" value={n0(state.summary.rejected)} /><Metric label="Imported value" value={bn(state.summary.value)} /><p>{state.summary.period}</p></div>}
  </section>;
}

export function MobileCommandDock() {
  const items = [
    ['Pulse', 'market-pulse'],
    ['Charts', 'market-history'],
    ['Cases', 'market-scenarios'],
    ['SOP', 'market-sop'],
    ['Import', 'market-import'],
  ];
  return <nav className="mobile-command-dock" aria-label="Market workspace shortcuts">{items.map(([label, id]) => <button type="button" key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><span aria-hidden="true">{label.slice(0, 1)}</span>{label}</button>)}</nav>;
}

function caseValues(item, latest) {
  return { value: latest.valueAedBn * item.factor, transactions: latest.transactions * item.volume, investors: latest.investors * item.investors };
}

const Metric = ({ label, value }) => <div><span>{label}</span><b>{value}</b></div>;
