import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { SECTORS, baseLevers, evaluate, fmt, getSector, investmentByLever } from '../engine/index.js';
import { ChecksButton, ChecksDrawer, useChecks } from './components/ChecksDrawer.jsx';
import { Icon } from './components/Icons.jsx';
import { LeverPanel } from './components/Levers.jsx';
import { defaultOps } from './opsState.js';
import { exportWorkspace, importWorkspace, loadWorkspace, readHash, saveWorkspace, writeHash } from './state.js';

const PulseView = lazy(() => import('./components/PulseView.jsx').then((module) => ({ default: module.PulseView })));
const OpsView = lazy(() => import('./components/OpsView.jsx').then((module) => ({ default: module.OpsView })));
const RegionalView = lazy(() => import('./components/RegionalView.jsx').then((module) => ({ default: module.RegionalView })));
const MarketView = lazy(() => import('./components/MarketView.jsx').then((module) => ({ default: module.MarketView })));
const EntryView = lazy(() => import('./components/EntryView.jsx').then((module) => ({ default: module.EntryView })));
const ValuePlanView = lazy(() => import('./components/ValuePlanView.jsx').then((module) => ({ default: module.ValuePlanView })));
const PortfolioView = lazy(() => import('./components/PortfolioView.jsx').then((module) => ({ default: module.PortfolioView })));

const TABS = [
  { id: 'ops', label: 'Daily Command', group: 'Operate', description: 'Start with exceptions, owners, decisions and realised value that require attention today.' },
  { id: 'regional', label: 'Regional Intel', group: 'Intelligence', description: 'Satellite context for the GCC industries shaping demand, location and resilience.' },
  { id: 'pulse', label: 'Live Market', group: 'Intelligence', description: 'Market signals, source health and the events that could change an investment decision.' },
  { id: 'market', label: 'Market Tracker', group: 'Intelligence', description: 'Dubai transactions, investor activity and community performance with an evidence trail.' },
  { id: 'entry', label: 'Market Entry', group: 'Launch', description: 'Choose a UAE route, prepare the documents and track the regulatory path to launch.' },
  { id: 'value', label: 'Value Plan', group: 'Value creation', description: 'Move operating drivers and see the EBITDA, cash and valuation consequences.' },
  { id: 'portfolio', label: 'Portfolio Lab', group: 'Value creation', description: 'Combine operating cases, consolidation adjustments and portfolio plays.' },
];
const LEGACY = { simulator: 'vp-value', scorecard: 'vp-scorecard', case: 'vp-case', memo: 'vp-memo' };
const THEME_KEY = 'market-tracker-theme';
const CASES_KEY = 'evls.cases.v1';
const FILM_URL = import.meta.env.VITE_LAUNCH_FILM_URL;

function initialTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* Keep the system setting. */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function WorkspaceFallback() {
  return <div className="workspace-loading" role="status"><span /><b>Opening workspace</b><small>Loading only the data this decision needs.</small></div>;
}

function caseSummary(bySector) {
  return SECTORS.reduce((summary, item) => {
    const result = evaluate(item, bySector[item.id] ?? baseLevers(item));
    summary.baseline += result.cmp.base.ev;
    summary.scenario += result.cmp.scn.ev;
    summary.valueCreated += result.cmp.valueCreated;
    return summary;
  }, { baseline: 0, scenario: 0, valueCreated: 0 });
}

function loadCases() {
  try {
    const value = JSON.parse(window.localStorage.getItem(CASES_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => item?.id && item?.name && item?.workspace).slice(0, 20) : [];
  } catch { return []; }
}

function LaunchFilm() {
  const [show, setShow] = useState(() => {
    if (!FILM_URL || typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    try { return window.sessionStorage.getItem('evls.film.seen') !== '1'; } catch { return true; }
  });
  const close = () => {
    try { window.sessionStorage.setItem('evls.film.seen', '1'); } catch { /* Session-only fallback. */ }
    setShow(false);
  };
  const skip = useRef(null);
  useEffect(() => {
    if (!show) return undefined;
    requestAnimationFrame(() => skip.current?.focus());
    const key = (event) => event.key === 'Escape' && close();
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [show]);
  if (!show) return null;
  return <div className="launch-film" role="dialog" aria-modal="true" aria-label="Regional decision platform introduction">
    <video src={FILM_URL} autoPlay muted playsInline onEnded={close} />
    <div><b>UAE Decision Atlas</b><span>From regional context to portfolio action</span></div>
    <button ref={skip} type="button" onClick={close}>Skip introduction</button>
  </div>;
}

export default function App() {
  const initial = useMemo(readHash, []);
  const restored = useMemo(loadWorkspace, []);
  const firstTab = LEGACY[initial.tab] ? 'value' : TABS.some((item) => item.id === initial.tab) ? initial.tab : 'ops';
  const firstSector = getSector(initial.sector);
  const [sectorId, setSectorId] = useState(initial.sector);
  const [tab, setTab] = useState(firstTab);
  const [bySector, setBySector] = useState(() => ({
    ...(restored?.bySector ?? {}),
    [initial.sector]: { ...baseLevers(firstSector), ...(restored?.bySector?.[initial.sector] ?? {}), ...initial.levers },
  }));
  const [plays, setPlays] = useState(restored?.plays ?? {});
  const [intercompany, setIntercompany] = useState(restored?.intercompany ?? []);
  const [ops, setOps] = useState(() => restored?.ops ?? defaultOps());
  const [activeScenario, setActiveScenario] = useState(null);
  const [checksOpen, setChecksOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [casesOpen, setCasesOpen] = useState(false);
  const [cases, setCases] = useState(loadCases);
  const [caseName, setCaseName] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [theme, setTheme] = useState(initialTheme);
  const [shared, setShared] = useState(false);
  const [saveState, setSaveState] = useState(restored ? 'Restored' : 'Autosave ready');
  const [notice, setNotice] = useState('');
  const tabs = useRef(new Map());
  const controlsClose = useRef(null);
  const controlsDialog = useRef(null);
  const casesClose = useRef(null);
  const casesDialog = useRef(null);
  const importInput = useRef(null);

  const sector = getSector(sectorId);
  const levers = bySector[sectorId] ?? baseLevers(sector);
  const evaluation = useMemo(() => evaluate(sector, levers), [sector, levers]);
  const cost = useMemo(() => investmentByLever(sector, levers), [sector, levers]);
  const checks = useChecks(bySector, plays, intercompany);
  const active = TABS.find((item) => item.id === tab) ?? TABS[1];
  const workspace = useMemo(() => ({ bySector, plays, intercompany, ops }), [bySector, plays, intercompany, ops]);
  const currentSummary = useMemo(() => caseSummary(bySector), [bySector]);

  useEffect(() => writeHash(sectorId, levers, baseLevers(sector), tab), [sectorId, levers, sector, tab]);
  useEffect(() => {
    const section = LEGACY[initial.tab];
    if (section) setTimeout(() => document.getElementById(section)?.scrollIntoView({ block: 'start' }), 80);
  }, [initial.tab]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* In-session preference only. */ }
  }, [theme]);
  useEffect(() => {
    setSaveState('Saving…');
    const timer = setTimeout(() => setSaveState(saveWorkspace(workspace) ? 'Saved locally' : 'Session only'), 350);
    return () => clearTimeout(timer);
  }, [workspace]);
  useEffect(() => {
    try { window.localStorage.setItem(CASES_KEY, JSON.stringify(cases)); } catch { /* Cases remain available in this session. */ }
  }, [cases]);
  useEffect(() => {
    tabs.current.get(tab)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    document.title = `${active.label} · UAE Decision Atlas`;
  }, [tab, active.label]);
  useEffect(() => {
    if (!controlsOpen) return undefined;
    const prior = document.activeElement;
    requestAnimationFrame(() => controlsClose.current?.focus());
    document.body.classList.add('overlay-open');
    const key = (event) => {
      if (event.key === 'Escape') setControlsOpen(false);
      if (event.key !== 'Tab' || !controlsDialog.current) return;
      const items = [...controlsDialog.current.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])')].filter((item) => !item.disabled);
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    addEventListener('keydown', key);
    return () => { removeEventListener('keydown', key); document.body.classList.remove('overlay-open'); prior?.focus?.(); };
  }, [controlsOpen]);
  useEffect(() => {
    if (!casesOpen) return undefined;
    const prior = document.activeElement;
    requestAnimationFrame(() => casesClose.current?.focus());
    document.body.classList.add('overlay-open');
    const key = (event) => {
      if (event.key === 'Escape') setCasesOpen(false);
      if (event.key !== 'Tab' || !casesDialog.current) return;
      const items = [...casesDialog.current.querySelectorAll('button, input, select, [tabindex]:not([tabindex="-1"])')].filter((item) => !item.disabled);
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    addEventListener('keydown', key);
    return () => { removeEventListener('keydown', key); document.body.classList.remove('overlay-open'); prior?.focus?.(); };
  }, [casesOpen]);

  const setLever = (id, value) => {
    setActiveScenario(null);
    setBySector((current) => ({ ...current, [sectorId]: { ...levers, [id]: value } }));
  };
  const nudge = (id) => {
    const lever = sector.levers.find((item) => item.id === id);
    const span = Math.max(Math.abs(lever.base) * 0.1, lever.step);
    const snapped = Math.round((levers[id] + span * lever.good) / lever.step) * lever.step;
    setLever(id, Math.min(lever.max, Math.max(lever.min, +snapped.toFixed(4))));
  };
  const reset = () => { setActiveScenario(null); setBySector((current) => ({ ...current, [sectorId]: baseLevers(sector) })); };
  const applyScenario = (name) => {
    setActiveScenario(name);
    setBySector((current) => ({ ...current, [sectorId]: { ...baseLevers(sector), ...sector.scenarios[name] } }));
  };
  const pickSector = (id) => {
    setSectorId(id);
    setActiveScenario(null);
    setBySector((current) => current[id] ? current : { ...current, [id]: baseLevers(getSector(id)) });
  };
  const go = (id) => { setTab(id); setControlsOpen(false); window.scrollTo({ top: 0, behavior: 'auto' }); };
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setShared(true); setTimeout(() => setShared(false), 1500); }
    catch { setNotice('Copy was blocked. Use the browser address bar to copy this view.'); }
  };
  const download = () => {
    const href = URL.createObjectURL(new Blob([exportWorkspace(workspace)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = href; link.download = `uae-decision-atlas-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    URL.revokeObjectURL(href);
    setNotice('Workspace exported.');
  };
  const importFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const next = importWorkspace(await file.text());
      setBySector(next.bySector); setPlays(next.plays); setIntercompany(next.intercompany); setOps(next.ops);
      setNotice('Workspace imported and saved locally.');
    } catch (error) { setNotice(error.message); }
  };
  const saveCase = () => {
    const name = caseName.trim() || `Decision case ${cases.length + 1}`;
    const clean = importWorkspace(exportWorkspace(workspace));
    const next = { id: crypto.randomUUID?.() ?? `${Date.now()}`, name: name.slice(0, 80), savedAt: new Date().toISOString(), sectorId, summary: currentSummary, workspace: clean };
    setCases((current) => [next, ...current].slice(0, 20));
    setSelectedCase(next.id);
    setCaseName('');
    setNotice(`Saved “${next.name}”.`);
  };
  const restoreCase = (item) => {
    const next = importWorkspace(JSON.stringify(item.workspace));
    setBySector(next.bySector); setPlays(next.plays); setIntercompany(next.intercompany); setOps(next.ops);
    if (SECTORS.some((sectorItem) => sectorItem.id === item.sectorId)) setSectorId(item.sectorId);
    setNotice(`Restored “${item.name}”.`);
    setCasesOpen(false);
  };
  const comparison = cases.find((item) => item.id === selectedCase) ?? cases[0];

  return <div className="decision-app">
    <LaunchFilm />
    <header className="top decision-top no-print">
      <div className="brand">
        <div className="atlas-mark" aria-hidden="true"><i /><i /><i /></div>
        <div><h1>UAE Decision Atlas</h1><div className="brand-sub">Market, entry and value creation</div></div>
      </div>
      <nav className="tabs decision-tabs" role="tablist" aria-label="Decision workspaces">
        {TABS.map((item) => <button ref={(node) => node ? tabs.current.set(item.id, node) : tabs.current.delete(item.id)} key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={`tab ${tab === item.id ? 'on' : ''}`} onClick={() => go(item.id)} title={`${item.group}: ${item.label}`}><small>{item.group}</small>{item.label}</button>)}
      </nav>
      <div className="player decision-actions">
        <ChecksButton result={checks} onOpen={() => setChecksOpen(true)} />
        <button className="ghost sm icon-btn" type="button" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} /></button>
        <button className="ghost sm" type="button" onClick={download}><Icon name="download" size={14} /> Export</button>
        <button className="ghost sm" type="button" onClick={() => setCasesOpen(true)}>Cases <b>{cases.length}</b></button>
        <button className="ghost sm" type="button" onClick={share}><Icon name="link" size={14} /> {shared ? 'Copied' : 'Share view'}</button>
        <button className="ghost sm import-button" type="button" onClick={() => importInput.current?.click()}>Import</button>
        <input ref={importInput} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Import workspace JSON" onChange={importFile} />
      </div>
    </header>

    <div className="decision-context no-print">
      <div><span>{active.group}</span><h2>{active.label}</h2><p>{active.description}</p></div>
      <div className="context-actions">
        <span className="save-state"><i />{saveState}</span>
        {(tab === 'value' || tab === 'portfolio') && <button type="button" className="action-primary" onClick={() => { if (tab !== 'value') go('value'); setControlsOpen(true); }}><Icon name="target" size={16} /> Adjust scenario</button>}
      </div>
    </div>

    {notice && <div className="app-notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">✕</button></div>}

    <main className="layout wide decision-layout">
      <div className="center" key={tab}>
        <Suspense fallback={<WorkspaceFallback />}>
          {tab === 'ops' && <OpsView ops={ops} setOps={setOps} checks={checks} cases={cases} portfolioSummary={currentSummary} onNavigate={go} />}
          {tab === 'regional' && <RegionalView />}
          {tab === 'pulse' && <PulseView />}
          {tab === 'market' && <MarketView />}
          {tab === 'entry' && <EntryView />}
          {tab === 'value' && <ValuePlanView sector={sector} levers={levers} e={evaluation} onNudge={nudge} onPickSector={pickSector} />}
          {tab === 'portfolio' && <PortfolioView bySector={bySector} plays={plays} setPlays={setPlays} intercompany={intercompany} setIntercompany={setIntercompany} onOpenSector={(id) => { pickSector(id); go('value'); setControlsOpen(true); }} />}
        </Suspense>
      </div>
    </main>

    <button type="button" className={`drawer-scrim ${controlsOpen ? 'show' : ''}`} onClick={() => setControlsOpen(false)} aria-label="Close scenario controls" />
    <aside ref={controlsDialog} className={`scenario-drawer no-print ${controlsOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="scenario-title" aria-hidden={!controlsOpen}>
      <header><div><span>Value creation</span><h2 id="scenario-title">Scenario controls</h2></div><button ref={controlsClose} type="button" onClick={() => setControlsOpen(false)} aria-label="Close scenario controls">✕</button></header>
      <label className="sector-select"><span>Operating model</span><select value={sectorId} onChange={(event) => pickSector(event.target.value)}>{SECTORS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><small>{sector.company} · {sector.scale}</small></label>
      <div className="scenario-summary"><div><span>Baseline EBITDA</span><b>{fmt.money(evaluation.cmp.base.ebitda)}</b></div><div><span>Scenario EBITDA</span><b className={evaluation.cmp.dEbitda >= 0 ? 'pos' : 'neg'}>{fmt.money(evaluation.cmp.scn.ebitda)}</b></div></div>
      <LeverPanel sector={sector} levers={levers} cost={cost} onChange={setLever} onReset={reset} onScenario={applyScenario} activeScenario={activeScenario} />
    </aside>

    <button type="button" className={`drawer-scrim ${casesOpen ? 'show' : ''}`} onClick={() => setCasesOpen(false)} aria-label="Close saved cases" />
    <aside ref={casesDialog} className={`scenario-drawer case-drawer no-print ${casesOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="cases-title" aria-hidden={!casesOpen}>
      <header><div><span>Decision memory</span><h2 id="cases-title">Saved cases</h2></div><button ref={casesClose} type="button" onClick={() => setCasesOpen(false)} aria-label="Close saved cases">✕</button></header>
      <div className="case-save"><label htmlFor="case-name">Case name</label><div><input id="case-name" value={caseName} maxLength={80} placeholder={`Decision case ${cases.length + 1}`} onChange={(event) => setCaseName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && saveCase()} /><button type="button" onClick={saveCase}>Save current</button></div><small>Captures every operating model, portfolio play and elimination.</small></div>
      <div className="case-current"><span>Current workspace</span><b>{fmt.money(currentSummary.scenario)}</b><small>{fmt.money(currentSummary.valueCreated, { sign: true })} versus baseline</small></div>
      {comparison && <section className="case-compare"><header><span>Compare with</span><select value={comparison.id} onChange={(event) => setSelectedCase(event.target.value)} aria-label="Case to compare">{cases.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></header><div className="comparison-grid"><div><span>Scenario value</span><b>{fmt.money(currentSummary.scenario - comparison.summary.scenario, { sign: true })}</b></div><div><span>Value created</span><b>{fmt.money(currentSummary.valueCreated - comparison.summary.valueCreated, { sign: true })}</b></div></div></section>}
      <div className="case-list">{cases.length ? cases.map((item) => <article key={item.id} className={comparison?.id === item.id ? 'on' : ''}><div><b>{item.name}</b><span>{new Date(item.savedAt).toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' })}</span></div><strong>{fmt.money(item.summary.scenario)}</strong><button type="button" onClick={() => restoreCase(item)}>Restore</button></article>) : <p className="empty-card">Save the current workspace to compare decisions over time.</p>}</div>
      <footer className="case-actions"><button type="button" className="ghost" onClick={download}>Export JSON</button><button type="button" className="ghost" onClick={() => window.print()}>Print / save PDF</button></footer>
    </aside>

    <ChecksDrawer open={checksOpen} onClose={() => setChecksOpen(false)} result={checks} />
    <footer className="foot no-print">Independent public-source analysis. Operating models and scenarios are illustrative, not investment or legal advice. Verify regulatory requirements with the relevant authority before acting.</footer>
  </div>;
}
