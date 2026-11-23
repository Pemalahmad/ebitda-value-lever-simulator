import React, { useEffect, useMemo, useState } from 'react';
import { SECTORS, getSector, baseLevers, evaluate, investmentByLever, fmt } from '../engine/index.js';
import { LeverPanel } from './components/Levers.jsx';
import { SimulatorView, ScorecardView, BusinessCaseView, MemoView } from './components/Views.jsx';
import { PortfolioView } from './components/PortfolioView.jsx';
import { MarketView } from './components/MarketView.jsx';
import { PulseView } from './components/PulseView.jsx';
import { EntryView } from './components/EntryView.jsx';
import { Icon } from './components/Icons.jsx';
import { readHash, writeHash } from './state.js';

const TABS = [
  { id: 'pulse', label: 'Live Market' },
  { id: 'market', label: 'Market Tracker' },
  { id: 'entry', label: 'Market Entry' },
  { id: 'simulator', label: 'Value Simulator' },
  { id: 'scorecard', label: 'Balanced Scorecard' },
  { id: 'case', label: 'Business Case' },
  { id: 'memo', label: 'Board Memo' },
  { id: 'portfolio', label: 'Portfolio Lab' },
];
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
  const [tab, setTab] = useState(TABS.some((t) => t.id === initial.tab) ? initial.tab : 'market');
  const [bySector, setBySector] = useState(() => ({ [initial.sector]: { ...baseLevers(getSector(initial.sector)), ...initial.levers } }));
  const [activeScenario, setActiveScenario] = useState(null);
  const [shared, setShared] = useState(false);
  const [plays, setPlays] = useState({});
  const [theme, setTheme] = useState(initialTheme);

  const sector = getSector(sectorId);
  const levers = bySector[sectorId] ?? baseLevers(sector);
  const e = useMemo(() => evaluate(sector, levers), [sector, levers]);
  const cost = useMemo(() => investmentByLever(sector, levers), [sector, levers]);

  useEffect(() => writeHash(sectorId, levers, baseLevers(sector), tab), [sectorId, levers, sector, tab]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* Keep the in-session preference. */ }
  }, [theme]);

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
            <svg viewBox="0 0 32 32" width="30" height="30"><rect width="32" height="32" rx="8" fill="var(--text)" /><path d="M7 23l6-7 5 4 7-10" stroke="var(--bg)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <h1>Dubai Market &amp; Value Tracker</h1>
            <div className="brand-sub">Live signals · official real-estate evidence · value scenarios</div>
          </div>
        </div>
        <div className="player">
          <button className="ghost sm theme-toggle" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <button className="ghost sm" onClick={share} title="Copy a link to this exact view"><Icon name="link" size={14} /> {shared ? 'Link copied' : WIDE.includes(tab) ? 'Share view' : 'Share scenario'}</button>
        </div>
      </header>

      {!WIDE.includes(tab) && <nav className="sectors no-print" aria-label="Operating model sectors">
        {SECTORS.map((s) => (
            <button key={s.id} className={`sector ${s.id === sectorId ? 'on' : ''}`} onClick={() => pickSector(s.id)} aria-pressed={s.id === sectorId}>
              <Icon name={s.id} size={22} />
              <span className="s-name">{s.name}</span>
              <span className="s-tag">{s.tagline}</span>
            </button>
        ))}
      </nav>}

      {!WIDE.includes(tab) && <div className="context no-print">
        <div>
          <b>{sector.company}</b> <span className="muted">· {sector.scale} · illustrative operating model for scenario analysis</span>
        </div>
        <div className="muted">Baseline EBITDA {fmt.money(e.cmp.base.ebitda)} · EV {fmt.money(e.cmp.base.ev)}</div>
      </div>}

      <main className={`layout ${WIDE.includes(tab) ? 'wide' : ''}`}>
        <LeverPanel sector={sector} levers={levers} cost={cost} onChange={setLever} onReset={reset} onScenario={applyScenario} activeScenario={activeScenario} />
        <div className="center">
          <div className="tabs no-print" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>
          {tab === 'portfolio' && <PortfolioView bySector={bySector} plays={plays} setPlays={setPlays} onOpenSector={(id) => { pickSector(id); setTab('simulator'); }} />}
          {tab === 'pulse' && <PulseView />}
          {tab === 'market' && <MarketView />}
          {tab === 'entry' && <EntryView />}
          {tab === 'simulator' && <SimulatorView sector={sector} levers={levers} e={e} onNudge={nudge} />}
          {tab === 'scorecard' && <ScorecardView e={e} />}
          {tab === 'case' && <BusinessCaseView sector={sector} e={e} />}
          {tab === 'memo' && <MemoView sector={sector} levers={levers} />}
        </div>
      </main>

      <footer className="foot no-print">
        Independent market analysis. Public figures link to their sources; operating models and scenarios are illustrative. Not affiliated with or endorsed by DLD. Method: <code>docs/methodology.md</code>.
      </footer>
    </div>
  );
}
