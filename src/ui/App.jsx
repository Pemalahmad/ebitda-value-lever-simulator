import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SECTORS, getSector, baseLevers, evaluate, investmentByLever, newAchievements, totalXp, fmt } from '../engine/index.js';
import { LeverPanel } from './components/Levers.jsx';
import { GamePanel, Toasts } from './components/GamePanel.jsx';
import { SimulatorView, ScorecardView, BusinessCaseView, MemoView } from './components/Views.jsx';
import { PortfolioView } from './components/PortfolioView.jsx';
import { MarketView } from './components/MarketView.jsx';
import { Icon } from './components/Icons.jsx';
import { readHash, writeHash, loadProgress, saveProgress } from './state.js';

const TABS = [
  { id: 'market', label: 'Market Tracker' },
  { id: 'simulator', label: 'Value Simulator' },
  { id: 'scorecard', label: 'Balanced Scorecard' },
  { id: 'case', label: 'Business Case' },
  { id: 'memo', label: 'Board Memo' },
  { id: 'portfolio', label: 'Portfolio Lab' },
];
const WIDE = ['market', 'portfolio'];
const XP_PER_LEVEL = 400;

export default function App() {
  const initial = useMemo(readHash, []);
  const [sectorId, setSectorId] = useState(initial.sector);
  const [tab, setTab] = useState(TABS.some((t) => t.id === initial.tab) ? initial.tab : 'market');
  const [bySector, setBySector] = useState(() => ({ [initial.sector]: { ...baseLevers(getSector(initial.sector)), ...initial.levers } }));
  const [activeScenario, setActiveScenario] = useState(null);
  const [progress, setProgress] = useState(loadProgress);
  const [toasts, setToasts] = useState([]);
  const [shared, setShared] = useState(false);
  const [plays, setPlays] = useState({});

  const sector = getSector(sectorId);
  const levers = bySector[sectorId] ?? baseLevers(sector);
  const e = useMemo(() => evaluate(sector, levers), [sector, levers]);
  const cost = useMemo(() => investmentByLever(sector, levers), [sector, levers]);

  useEffect(() => writeHash(sectorId, levers, baseLevers(sector), tab), [sectorId, levers, sector, tab]);

  // Award missions and achievements once, then keep them.
  const progressRef = useRef(progress);
  progressRef.current = progress;
  useEffect(() => {
    const p = progressRef.current;
    const fresh = [];
    const missions = { ...p.missions };
    for (const m of e.missions) {
      if (m.done && !missions[m.id]) {
        missions[m.id] = m.xp;
        fresh.push({ kind: 'mission', title: m.title, xp: m.xp });
      }
    }
    const ach = newAchievements(e, p.achievements);
    for (const a of ach) fresh.push({ kind: 'achievement', title: a.title, xp: a.xp });
    if (!fresh.length) return;
    const next = { achievements: [...p.achievements, ...ach.map((a) => a.id)], missions };
    setProgress(next);
    saveProgress(next);
    const stamped = fresh.map((t, i) => ({ ...t, key: `${Date.now()}-${i}` }));
    setToasts((ts) => [...ts, ...stamped].slice(-2));
    setTimeout(() => setToasts((ts) => ts.filter((t) => !stamped.includes(t))), 4200);
  }, [e]);

  const xp = totalXp(Object.values(progress.missions).reduce((a, b) => a + b, 0), progress.achievements);
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;

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
            <svg viewBox="0 0 32 32" width="30" height="30"><rect width="32" height="32" rx="8" fill="var(--text)" /><path d="M7 23l6-7 5 4 7-10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <h1>Dubai Real Estate Market Tracker</h1>
            <div className="brand-sub">Official market data · momentum signals · value scenarios</div>
          </div>
        </div>
        <div className="player">
          {!WIDE.includes(tab) && <><div className="lvl">LVL {level}</div>
            <div className="xpbox">
              <div className="xp-top"><span>{xp.toLocaleString('en-US')} XP</span><span className="muted">{XP_PER_LEVEL - (xp % XP_PER_LEVEL)} to LVL {level + 1}</span></div>
              <div className="bar gold"><span style={{ width: `${((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100}%` }} /></div>
            </div></>}
          <button className="ghost sm" onClick={share} title="Copy a link to this exact view"><Icon name="link" size={14} /> {shared ? 'Link copied' : WIDE.includes(tab) ? 'Share view' : 'Share scenario'}</button>
        </div>
      </header>

      {!WIDE.includes(tab) && <nav className="sectors no-print" aria-label="Operating model sectors">
        {SECTORS.map((s) => {
          const done = [...s.missions.map((m) => `${s.id}.${m.id}`), ...['selfFunding', 'cleanBoard', 'balanced'].map((m) => `${s.id}.${m}`)].filter((id) => progress.missions[id]).length;
          return (
            <button key={s.id} className={`sector ${s.id === sectorId ? 'on' : ''}`} onClick={() => pickSector(s.id)} aria-pressed={s.id === sectorId}>
              <Icon name={s.id} size={22} />
              <span className="s-name">{s.name}</span>
              <span className="s-tag">{s.tagline}</span>
              <span className="s-prog">{done}/{s.missions.length + 3} missions</span>
            </button>
          );
        })}
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
          {tab === 'market' && <MarketView />}
          {tab === 'simulator' && <SimulatorView sector={sector} levers={levers} e={e} onNudge={nudge} />}
          {tab === 'scorecard' && <ScorecardView e={e} />}
          {tab === 'case' && <BusinessCaseView sector={sector} e={e} />}
          {tab === 'memo' && <MemoView sector={sector} levers={levers} />}
        </div>
        <GamePanel e={e} sector={sector} unlocked={progress.achievements} missionLog={progress.missions} />
      </main>

      <footer className="foot no-print">
        Independent market analysis. Public figures link to their sources; operating models and scenarios are illustrative. Not affiliated with or endorsed by DLD. Method: <code>docs/methodology.md</code>.
      </footer>
      <Toasts toasts={toasts} />
    </div>
  );
}
