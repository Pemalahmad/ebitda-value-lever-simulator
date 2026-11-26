import React, { useEffect, useMemo, useState } from 'react';
import { getSector, baseLevers, evaluate, investmentByLever, examplePlan } from '../engine/index.js';
import { LeverPanel } from './components/Levers.jsx';
import { ValuePlanView } from './components/ValuePlanView.jsx';
import { PortfolioView } from './components/PortfolioView.jsx';
import { MarketView } from './components/MarketView.jsx';
import { PulseView } from './components/PulseView.jsx';
import { EntryView } from './components/EntryView.jsx';
import { Icon } from './components/Icons.jsx';
import { ChecksButton, ChecksDrawer, useChecks } from './components/ChecksDrawer.jsx';
import { Sparks } from './components/Effects.jsx';
import { readHash, writeHash, loadTrackers, saveTrackers } from './state.js';

const TABS = [
  { id: 'pulse', label: 'Live Market' },
  { id: 'market', label: 'Market Tracker' },
  { id: 'entry', label: 'Market Entry' },
  { id: 'value', label: 'Value Plan' },
  { id: 'portfolio', label: 'Portfolio Lab' },
];
// Old links (#tab=simulator, scorecard, case, memo) open the matching section of the Value Plan.
const LEGACY = { simulator: 'vp-value', scorecard: 'vp-scorecard', case: 'vp-case', memo: 'vp-memo', tracker: 'vp-tracker' };
const WIDE = ['pulse', 'market', 'entry', 'portfolio'];
const THEME_KEY = 'market-tracker-theme';

function initialTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage can be unavailable in locked-down browser contexts.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const initial = useMemo(readHash, []);
  const [sectorId, setSectorId] = useState(initial.sector);
  const [tab, setTab] = useState(LEGACY[initial.tab] ? 'value' : TABS.some((t) => t.id === initial.tab) ? initial.tab : 'pulse');
  const [bySector, setBySector] = useState(() => ({ [initial.sector]: { ...baseLevers(getSector(initial.sector)), ...initial.levers } }));
  const [activeScenario, setActiveScenario] = useState(null);
  const [shared, setShared] = useState(false);
  const [plays, setPlays] = useState({});
  const [intercompany, setIntercompany] = useState([]);
  const [checksOpen, setChecksOpen] = useState(false);
  const [theme, setTheme] = useState(initialTheme);
  const [trackers, setTrackers] = useState(loadTrackers);

  const sector = getSector(sectorId);
  const levers = bySector[sectorId] ?? baseLevers(sector);
  const e = useMemo(() => evaluate(sector, levers), [sector, levers]);
  const cost = useMemo(() => investmentByLever(sector, levers), [sector, levers]);
  const checks = useChecks(bySector, plays, intercompany, trackers);

  useEffect(() => writeHash(sectorId, levers, baseLevers(sector), tab), [sectorId, levers, sector, tab]);
  useEffect(() => { const id = LEGACY[initial.tab]; if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 60); }, [initial.tab]);
  const go = (id) => { setTab(id); window.scrollTo({ top: 0 }); };
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* Keep the in-session preference. */ }
  }, [theme]);

  useEffect(() => saveTrackers(trackers), [trackers]);
  const setPlan = (plan) => setTrackers((t) => ({ ...t, [plan.sectorId]: plan }));
  const loadLevers = (targets) => {
    setActiveScenario(null);
    setBySector((s) => ({ ...s, [sectorId]: { ...baseLevers(sector), ...targets } }));
  };
  const importPlan = (plan) => {
    setPlan(plan);
    if (plan.sectorId !== sectorId) pickSector(plan.sectorId);
  };
  const deletePlan = () => setTrackers((t) => Object.fromEntries(Object.entries(t).filter(([k]) => k !== sectorId)));
  const openExample = () => {
    const plan = trackers.urbanServices ?? examplePlan();
    setPlan(plan);
    setActiveScenario(null);
    setSectorId('urbanServices');
    setBySector((s) => ({ ...s, urbanServices: { ...baseLevers(getSector('urbanServices')), ...plan.targets } }));
    setTimeout(() => document.getElementById('vp-tracker')?.scrollIntoView({ block: 'start' }), 60);
  };

  const setLever = (id, value) => {
    setActiveScenario(null);
    setBySector((s) => ({ ...s, [sectorId]: { ...levers, [id]: value } }));
  };
  const nudge = (id) => {
    const l = sector.levers.find((x) => x.id === id);
    const span = Math.max(Math.abs(l.base) * 0.1, l.step);
    const raw = levers[id] + span * l.good;
    const snapped = Math.round(raw / l.step) * l.step;
    setLever(id, Math.min(l.max, Math.max(l.min, +snapped.toFixed(4))));
  };
  const reset = () => {
    setActiveScenario(null);
    setBySector((s) => ({ ...s, [sectorId]: baseLevers(sector) }));
  };
  const applyScenario = (name) => {
    setActiveScenario(name);
    setBySector((s) => ({ ...s, [sectorId]: { ...baseLevers(sector), ...sector.scenarios[name] } }));
  };
  const pickSector = (id) => {
    setSectorId(id);
    setActiveScenario(null);
    setBySector((s) => (s[id] ? s : { ...s, [id]: baseLevers(getSector(id)) }));
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="app">
      <header className="top no-print">
        <div className="brand">
          <div className="logo" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="30" height="30"><rect width="32" height="32" rx="9" fill="var(--text)" /><circle cx="10" cy="21" r="2.2" fill="var(--bg)" /><circle cx="16" cy="15" r="2.2" fill="var(--bg)" /><circle cx="22" cy="11" r="2.2" fill="var(--gold)" /></svg>
          </div>
          <div>
            <h1>Value Lever</h1>
            <div className="brand-sub">Dubai market &amp; value tracker</div>
          </div>
        </div>
        <nav className="tabs" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => go(t.id)}>{t.label}</button>
          ))}
        </nav>
        <div className="player">
          <ChecksButton result={checks} onOpen={() => setChecksOpen(true)} />
          <button className="ghost sm icon-btn" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
          </button>
          <button className="ghost sm" onClick={share} title="Copy a link to this exact view"><Icon name="link" size={14} /> {shared ? 'Copied' : 'Share'}</button>
        </div>
      </header>

      <Sparks>
      <main className={`layout ${WIDE.includes(tab) ? 'wide' : ''}`}>
        {tab === 'value' && <LeverPanel sector={sector} levers={levers} cost={cost} onChange={setLever} onReset={reset} onScenario={applyScenario} activeScenario={activeScenario} />}
        <div className="center" key={tab}>
          {tab === 'portfolio' && <PortfolioView bySector={bySector} plays={plays} setPlays={setPlays} intercompany={intercompany} setIntercompany={setIntercompany} onOpenSector={(id) => { pickSector(id); go('value'); }} />}
          {tab === 'pulse' && <PulseView />}
          {tab === 'market' && <MarketView />}
          {tab === 'entry' && <EntryView />}
          {tab === 'value' && <ValuePlanView sector={sector} levers={levers} e={e} onNudge={nudge} onPickSector={pickSector} tracker={{ plan: trackers[sectorId] ?? null, onChange: setPlan, onImport: importPlan, onLoadLevers: loadLevers, onOpenExample: openExample, onDelete: deletePlan }} />}
        </div>
      </main>
      </Sparks>

      <ChecksDrawer open={checksOpen} onClose={() => setChecksOpen(false)} result={checks} />
      <footer className="foot no-print">
        Independent market analysis. Public figures link to their sources; operating models and scenarios are illustrative. Not affiliated with or endorsed by DLD. Method: <code>docs/methodology.md</code>.
      </footer>
    </div>
  );
}
