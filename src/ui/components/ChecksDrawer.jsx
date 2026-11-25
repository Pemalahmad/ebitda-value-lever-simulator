// Workbook checks: the logic checker and the missing-data finder for every tab, in one drawer.
import React, { useEffect, useRef, useState } from 'react';
import { logicChecks, dataGaps } from '../../engine/index.js';
import { FolderTabs, Dot, Status } from './Dots.jsx';

const optional = import.meta.glob('../../../data/market/dld-aggregate.json', { import: 'default' });

export function useChecks(bySector, plays, intercompany) {
  const [result, setResult] = useState({ checks: [], gaps: [], fails: 0, warns: 0, loading: true });
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [officialModule, pulseModule] = await Promise.all([
        import('../../../data/market/dld-official.json'),
        import('../../../data/pulse/pulse.json'),
      ]);
      const aggregateLoader = Object.values(optional)[0];
      const aggregate = aggregateLoader ? await aggregateLoader() : null;
      const official = officialModule.default;
      const pulse = pulseModule.default;
      const checks = logicChecks({ bySector, plays, official, pulse });
      const gaps = dataGaps({ official, pulse, aggregate, bySector, intercompany });
      if (!cancelled) setResult({ checks, gaps, fails: checks.filter((check) => check.status === 'fail').length, warns: checks.filter((check) => check.status === 'warn').length, loading: false });
    };
    const id = typeof requestIdleCallback === 'function' ? requestIdleCallback(load, { timeout: 1400 }) : setTimeout(load, 250);
    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(id); else clearTimeout(id);
    };
  }, [bySector, plays, intercompany]);
  return result;
}

export function ChecksButton({ result, onOpen }) {
  if (result.loading) return <button type="button" className="ghost sm checks-btn" onClick={onOpen} title="Loading workbook integrity and data health"><Dot tone="amber" /> Integrity <b>checking</b></button>;
  const issues = result.fails + result.warns;
  const integrityTotal = result.checks.length - result.warns;
  const integrityPass = integrityTotal - result.fails;
  return (
    <button type="button" className={`ghost sm checks-btn ${result.fails ? 'bad' : issues ? 'warn' : 'ok'}`} onClick={onOpen} title="Logic checks and missing data across all tabs">
      <Dot tone={result.fails ? 'red' : issues ? 'amber' : 'green'} /> Integrity <b>{integrityPass}/{integrityTotal}</b>{result.warns > 0 && <span className="checks-watch">· {result.warns} watch</span>}
    </button>
  );
}

export function ChecksDrawer({ open, onClose, result }) {
  const [view, setView] = useState('issues');
  const dialog = useRef(null);
  const close = useRef(null);
  const restoreFocus = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    restoreFocus.current = document.activeElement;
    requestAnimationFrame(() => close.current?.focus());
    const key = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !dialog.current) return;
      const focusable = [...dialog.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((node) => !node.disabled);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    addEventListener('keydown', key);
    document.body.classList.add('overlay-open');
    return () => {
      removeEventListener('keydown', key);
      document.body.classList.remove('overlay-open');
      restoreFocus.current?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  if (result.loading) return (
    <div className="drawer-wrap" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Loading integrity checks"><header><div><span className="w-eyebrow">Workbook consistency</span><h3>Checking integrity and data health</h3><p>The model and source snapshot are being checked.</p></div><button type="button" className="ghost sm icon-btn" onClick={onClose} aria-label="Close checks">✕</button></header><div className="workspace-loading" role="status"><span /><b>Running checks</b></div></aside>
    </div>
  );
  const list = view === 'all' ? result.checks : result.checks.filter((c) => c.status !== 'pass');
  const areas = [...new Set(list.map((c) => c.area))];
  return (
    <div className="drawer-wrap" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside ref={dialog} className="drawer" role="dialog" aria-modal="true" aria-labelledby="checks-title">
        <header>
          <div><span className="w-eyebrow">Workbook consistency</span><h3 id="checks-title">Integrity and data health</h3>
            <p><b className={result.fails ? 'neg' : 'pos'}>{result.checks.length - result.warns - result.fails}/{result.checks.length - result.warns} integrity checks pass</b>. <b className="amber-t">{result.warns} freshness or review item{result.warns === 1 ? '' : 's'}</b>. {result.gaps.length} data gaps.</p></div>
          <button ref={close} type="button" className="ghost sm icon-btn" onClick={onClose} aria-label="Close checks">✕</button>
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
