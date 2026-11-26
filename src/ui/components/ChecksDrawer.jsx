// Workbook checks: the logic checker and the missing-data finder for every tab, in one drawer.
import React, { useEffect, useMemo, useState } from 'react';
import { logicChecks, dataGaps } from '../../engine/index.js';
import { FolderTabs, Dot, Status } from './Dots.jsx';
import OFFICIAL from '../../../data/market/dld-official.json';
import PULSE from '../../../data/pulse/pulse.json';

const optional = import.meta.glob('../../../data/market/dld-aggregate.json', { eager: true, import: 'default' });
const AGG = Object.values(optional)[0] ?? null;

export function useChecks(bySector, plays, intercompany, trackers) {
  return useMemo(() => {
    const checks = logicChecks({ bySector, plays, official: OFFICIAL, pulse: PULSE, trackers });
    const gaps = dataGaps({ official: OFFICIAL, pulse: PULSE, aggregate: AGG, bySector, intercompany });
    return { checks, gaps, fails: checks.filter((c) => c.status === 'fail').length, warns: checks.filter((c) => c.status === 'warn').length };
  }, [bySector, plays, intercompany, trackers]);
}

export function ChecksButton({ result, onOpen }) {
  const issues = result.fails + result.warns;
  return (
    <button type="button" className={`ghost sm checks-btn ${result.fails ? 'bad' : issues ? 'warn' : 'ok'}`} onClick={onOpen} title="Logic checks and missing data across all tabs">
      <Dot tone={result.fails ? 'red' : issues ? 'amber' : 'green'} /> Checks <b>{result.checks.length - issues}/{result.checks.length}</b>
    </button>
  );
}

export function ChecksDrawer({ open, onClose, result }) {
  const [view, setView] = useState('issues');
  useEffect(() => {
    if (!open) return undefined;
    const key = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [open, onClose]);
  if (!open) return null;
  const list = view === 'all' ? result.checks : result.checks.filter((c) => c.status !== 'pass');
  const areas = [...new Set(list.map((c) => c.area))];
  return (
    <div className="drawer-wrap" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label="Workbook checks" onClick={(e) => e.stopPropagation()}>
        <header>
          <div><span className="w-eyebrow">Workbook consistency</span><h3>Checks across every tab</h3>
            <p>{result.checks.length} logic checks: <b className="pos">{result.checks.length - result.fails - result.warns} pass</b>, <b className="amber-t">{result.warns} to watch</b>, <b className="neg">{result.fails} failing</b>. {result.gaps.length} data gaps.</p></div>
          <button type="button" className="ghost sm icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <FolderTabs value={view} onChange={setView} tabs={[{ id: 'issues', label: 'Issues', count: result.fails + result.warns }, { id: 'all', label: 'All checks', count: result.checks.length }, { id: 'gaps', label: 'Missing data', count: result.gaps.length }]} />
        <div className="drawer-body">
          {view === 'gaps' ? (
            <ul className="gap-list">{result.gaps.map((g) => (
              <li key={g.item}><div className="gap-top"><span className={`impact ${g.impact}`}>{g.impact} impact</span><span className="muted sm">{g.area}</span></div><b>{g.item}</b><p>{g.why}</p><p className="gap-fix"><span>Fix</span>{g.fix}</p></li>
            ))}</ul>
          ) : list.length === 0 ? <p className="empty-card">No issues. Every check passes.</p> : areas.map((a) => (
            <section key={a} className="check-group"><h4>{a}</h4>
              <ul>{list.filter((c) => c.area === a).map((c) => <li key={c.title}><Status s={c.status} /><div><b>{c.title}</b><span>{c.detail}</span></div></li>)}</ul>
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}
