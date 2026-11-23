import React, { useMemo, useState } from 'react';
import PULSE from '../../../data/pulse/pulse.json';
import { CHOKEPOINTS, CHECKLIST, STANCES, byCountry, byTheme, classify, noteErrors, reviewDue, signals, snapshotLevels, stats } from '../../engine/pulse.js';

const JOURNAL_KEY = 'vls.journal.v1';
const LEVEL = { alert: ['Act now', 'neg'], watch: ['Watch', 'amber'], positive: ['Tailwind', 'pos'] };
const GROUPS = ['Dubai & GCC', 'Global indices', 'Commodities', 'FX & rates', 'Risk & freight'];

const pct = (x) => (x == null ? '—' : `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`);
const tone = (x) => (x == null ? '' : x >= 0 ? 'pos' : 'neg');
const num = (v) => v.toLocaleString('en-US', { maximumFractionDigits: v >= 1000 ? 0 : 2 });
const ago = (iso) => { const h = (Date.now() - Date.parse(iso)) / 36e5; return h < 1 ? `${Math.max(1, Math.round(h * 60))} min ago` : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} d ago`; };
const stamp = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' }) + ' Dubai';

function Spark({ series, color = 'var(--accent)' }) {
  const v = series.slice(-63).map(([, x]) => x);
  if (v.length < 3) return <span className="muted">—</span>;
  const min = Math.min(...v), max = Math.max(...v), w = 90, h = 24;
  const d = v.map((x, i) => `${i ? 'L' : 'M'}${((i / (v.length - 1)) * w).toFixed(1)},${(h - 2 - ((x - min) / (max - min || 1)) * (h - 4)).toFixed(1)}`).join('');
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden><path d={d} fill="none" stroke={color} strokeWidth="1.4" /></svg>;
}

function Headline({ n }) {
  return (
    <li className="pulse-news">
      <a href={n.link} target="_blank" rel="noreferrer">{n.title}</a>
      <span className="muted"> · {n.source} · {ago(n.published)}</span>
    </li>
  );
}

function loadJournal() { try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) ?? '[]'); } catch { return []; } }
function saveJournal(j) { try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(j)); } catch { /* storage blocked */ } }

function Journal({ sigs }) {
  const [notes, setNotes] = useState(loadJournal);
  const blank = { title: '', stance: 'Hold', thesis: '', disconfirm: '', conviction: 3, horizon: '12 months', reviewOn: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10), signals: [], checks: [] };
  const [draft, setDraft] = useState(blank);
  const [shown, setShown] = useState(false);
  const errors = noteErrors(draft);
  const set = (p) => setDraft((d) => ({ ...d, ...p }));
  const toggle = (key, id) => set({ [key]: draft[key].includes(id) ? draft[key].filter((x) => x !== id) : [...draft[key], id] });
  const commit = (next) => { setNotes(next); saveJournal(next); };
  const save = () => {
    if (errors.length) { setShown(true); return; }
    commit([{ ...draft, id: `N-${Date.now().toString(36)}`, createdAt: new Date().toISOString(), levels: snapshotLevels(PULSE), dataAsOf: PULSE.generatedAt }, ...notes]);
    setDraft(blank); setShown(false);
  };
  const exportJson = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' }));
    a.download = `decision-journal-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  const importJson = async (file) => {
    try { const list = JSON.parse(await file.text()); if (Array.isArray(list)) commit([...list.filter((n) => n?.id && !notes.some((x) => x.id === n.id) && !noteErrors(n).length), ...notes]); } catch { /* not a journal file */ }
  };
  const now = PULSE.markets.length ? snapshotLevels(PULSE) : {};
  const due = notes.filter((n) => reviewDue(n));
  return (
    <section className="card">
      <h3>Decision journal</h3>
      <p className="card-sub">Write the call before you make it: the thesis, what would prove it wrong, the signals it rests on, and a date to review it. Market levels are saved with each note so a review shows what has moved since. Notes stay in this browser; export them to keep a copy.</p>
      {due.length > 0 && <p className="chip amber" style={{ display: 'inline-block', marginBottom: 12 }}>{due.length} decision{due.length > 1 ? 's' : ''} due for review</p>}
      <div className="journal-form">
        <label>Decision<input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Add to Dubai logistics platform" /></label>
        <label>Stance<select value={draft.stance} onChange={(e) => set({ stance: e.target.value })}>{STANCES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Conviction (1–5)<input type="number" min={1} max={5} value={draft.conviction} onChange={(e) => set({ conviction: Number(e.target.value) })} /></label>
        <label>Horizon<input value={draft.horizon} onChange={(e) => set({ horizon: e.target.value })} /></label>
        <label>Review on<input type="date" value={draft.reviewOn} onChange={(e) => set({ reviewOn: e.target.value })} /></label>
        <label className="wide">Thesis<textarea rows={3} value={draft.thesis} onChange={(e) => set({ thesis: e.target.value })} placeholder="Why this, why now, and what has to be true" /></label>
        <label className="wide">What would change my mind<textarea rows={2} value={draft.disconfirm} onChange={(e) => set({ disconfirm: e.target.value })} placeholder="The evidence that would make you reverse the call" /></label>
      </div>
      {sigs.length > 0 && <>
        <p className="tile-label" style={{ marginTop: 14 }}>Signals this rests on</p>
        <div className="chips">{sigs.map((s) => <button key={s.id} className={`chip sm ${draft.signals.includes(s.id) ? 'on' : ''}`} onClick={() => toggle('signals', s.id)}>{s.title}</button>)}</div>
      </>}
      <p className="tile-label" style={{ marginTop: 14 }}>Before you commit</p>
      <ul className="checklist">{CHECKLIST.map((c) => <li key={c.id}><label><input type="checkbox" checked={draft.checks.includes(c.id)} onChange={() => toggle('checks', c.id)} /> {c.label}</label></li>)}</ul>
      {shown && errors.length > 0 && <ul className="neg" style={{ margin: '8px 0', paddingLeft: 18 }}>{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <div className="row-actions">
        <button className="btn primary" onClick={save}>Save decision</button>
        <span className="muted">{draft.checks.length}/{CHECKLIST.length} checks</span>
        <span style={{ flex: 1 }} />
        <button className="btn" onClick={exportJson} disabled={!notes.length}>Export</button>
        <label className="btn">Import<input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} /></label>
      </div>
      {notes.length > 0 && (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="data">
            <thead><tr><th>Decision</th><th>Stance</th><th className="r">Conviction</th><th>Review</th><th>Since the note</th><th /></tr></thead>
            <tbody>{notes.map((n) => (
              <tr key={n.id}>
                <td><b>{n.title}</b><div className="muted" style={{ fontSize: 12 }}>{n.thesis}</div><div style={{ fontSize: 12 }}>Wrong if: {n.disconfirm}</div></td>
                <td>{n.stance}{n.closed ? ' · closed' : ''}</td>
                <td className="r">{n.conviction}/5</td>
                <td>{reviewDue(n) ? <span className="chip sm amber">Due {n.reviewOn}</span> : n.reviewOn}</td>
                <td style={{ fontSize: 12 }}>{Object.entries(n.levels ?? {}).map(([k, v]) => now[k] ? <div key={k}>{k}: <span className={tone(now[k] / v - 1)}>{pct(now[k] / v - 1)}</span></div> : null)}</td>
                <td><button className="chip sm" onClick={() => commit(notes.map((x) => (x.id === n.id ? { ...x, closed: !x.closed } : x)))}>{n.closed ? 'Reopen' : 'Close'}</button></td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function PulseView() {
  const sigs = useMemo(() => signals(PULSE), []);
  const themes = useMemo(() => byTheme(PULSE.news), []);
  const countries = useMemo(() => byCountry(PULSE.news), []);
  const [theme, setTheme] = useState('all');
  const [country, setCountry] = useState('all');
  const rows = useMemo(() => PULSE.markets.map((m) => ({ ...m, s: stats(m.series, m) })), []);
  const recent = PULSE.news.filter((n) => Date.now() - Date.parse(n.published) <= 3 * 864e5).map((n) => ({ ...n, ...classify(n.title) }));
  const filtered = PULSE.news.map((n) => ({ ...n, ...classify(n.title) }))
    .filter((n) => (theme === 'all' || n.themes.includes(theme)) && (country === 'all' || n.countries.includes(country)));
  const live = PULSE.sources.filter((s) => s.ok).length;
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

  return (
    <>
      <section className="card pulse-head">
        <div>
          <h3>Market Pulse</h3>
          <p className="card-sub">What moved, what it means for a Dubai portfolio, and what the local papers are saying, in one read before the investment committee. Data as of <b>{stamp(PULSE.generatedAt)}</b> · prices are delayed quotes · {live}/{PULSE.sources.length} sources live. Not investment advice. For live maps of conflicts, shipping and flights, open <a href="https://www.worldmonitor.app/" target="_blank" rel="noreferrer">World Monitor</a>.</p>
        </div>
      </section>

      <section className="card">
        <h3>Top signals</h3>
        <p className="card-sub">Moves past a set threshold, ranked by urgency. Each is a prompt to look closer, with the reason it matters here.</p>
        {sigs.length === 0 ? <p className="muted">No market or news signal past its threshold today.</p> : (
          <div className="pulse-signals">{sigs.map((s) => (
            <article key={s.id} className="pulse-signal">
              <span className={`chip sm ${LEVEL[s.level][1]}`}>{LEVEL[s.level][0]}</span>
              <h4>{s.title}</h4>
              <p>{s.why}</p>
              {s.evidence?.length > 0 && <p className="muted" style={{ fontSize: 12 }}>Based on: {s.evidence.map((id) => byId[id]?.label ?? id).join(', ')}</p>}
              {s.news?.length > 0 && <ul className="plain">{s.news.map((n) => <Headline key={n.link} n={n} />)}</ul>}
            </article>
          ))}</div>
        )}
      </section>

      <section className="card">
        <h3>Markets</h3>
        <p className="card-sub">Dubai and GCC first, then the global drivers that reach Dubai through the dollar peg, oil and capital flows. Three-month trend on the right.</p>
        <div className="pulse-markets">
          {GROUPS.map((g) => (
            <div key={g} className="table-wrap">
              <p className="tile-label">{g}</p>
              <table className="data">
                <thead><tr><th>Market</th><th className="r">Last</th><th className="r">1D</th><th className="r">1W</th><th className="r">1M</th><th className="r">3M</th><th className="r">Trend</th></tr></thead>
                <tbody>{rows.filter((r) => r.group === g).map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}
                      {Date.now() - Date.parse(r.s.asOf) > 4 * 864e5
                        ? <div className="neg" style={{ fontSize: 11 }}>Last update {r.s.asOf}: source unavailable since</div>
                        : r.s.stale && <div className="muted" style={{ fontSize: 11 }}>Recent history not published by the source</div>}</td>
                    <td className="r">{num(r.s.last)}{r.unit ? <span className="muted"> {r.unit}</span> : r.currency && r.currency !== 'USD' ? <span className="muted"> {r.currency}</span> : null}</td>
                    {['d1', 'w1', 'm1', 'm3'].map((k) => <td key={k} className={`r ${tone(r.invert && r.s[k] != null ? -r.s[k] : r.s[k])}`}>{pct(r.s[k])}</td>)}
                    <td className="r">{r.s.monthly ? <span className="muted">—</span> : <Spark series={r.series} color={r.s.m3 != null && (r.invert ? r.s.m3 > 0 : r.s.m3 < 0) ? 'var(--rust)' : 'var(--accent)'} />}</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <h3>Trade, maritime and logistics</h3>
          <p className="card-sub">Chokepoints that move oil, freight and insurance for the Gulf, by headlines in the last 3 days, with freight and oil alongside.</p>
          {CHOKEPOINTS.map((c) => {
            const items = recent.filter((n) => n.chokepoints.includes(c.id));
            const lvl = items.length >= 8 ? 'alert' : items.length >= 3 ? 'watch' : null;
            return (
              <div key={c.id} className="pulse-choke">
                <p><b>{c.label}</b> <span className={`chip sm ${lvl ? LEVEL[lvl][1] : ''}`}>{items.length} headlines{lvl ? ` · ${LEVEL[lvl][0]}` : ' · quiet'}</span></p>
                <p className="muted" style={{ fontSize: 12.5 }}>{c.why}</p>
                {items.length > 0 && <ul className="plain">{items.slice(0, 2).map((n) => <Headline key={n.link} n={n} />)}</ul>}
              </div>
            );
          })}
          <p style={{ fontSize: 13 }}>{['freight', 'brent'].map((id) => byId[id] && <span key={id} style={{ marginRight: 16 }}>{byId[id].label}: <b>{num(byId[id].s.last)}</b> <span className={tone(byId[id].s.m1)}>{pct(byId[id].s.m1)} 1M</span></span>)}</p>
        </section>
        <section className="card">
          <h3>Country movement</h3>
          <p className="card-sub">Who is in the news this week, and on what. "Last 2 days" against the rest of the week shows a story building or fading.</p>
          <table className="data">
            <thead><tr><th>Country</th><th className="r">Headlines</th><th className="r">Last 2 days</th><th>Main theme</th></tr></thead>
            <tbody>{countries.map((c) => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setCountry(country === c.id ? 'all' : c.id)}>
                <td>{country === c.id ? <b>{c.label}</b> : c.label}</td><td className="r">{c.total}</td>
                <td className={`r ${c.recent > c.prior ? 'neg' : ''}`}>{c.recent}{c.recent > c.prior ? ' · rising' : ''}</td><td>{c.dominant ?? '—'}</td>
              </tr>))}
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 12 }}>Click a country to filter the news below.</p>
        </section>
      </div>

      <section className="card">
        <h3>News by theme</h3>
        <p className="card-sub">Headlines from Gulf News, The National, Khaleej Times, WAM, Zawya, Arabian Business and the maritime press, sorted into resilience, security, economy, resources, infrastructure and society. Headlines link to the original article.</p>
        <div className="chips" style={{ marginBottom: 12 }}>
          <button className={`chip ${theme === 'all' ? 'on' : ''}`} onClick={() => setTheme('all')}>All</button>
          {themes.map((t) => <button key={t.id} className={`chip ${theme === t.id ? 'on' : ''}`} onClick={() => setTheme(t.id)}>{t.label} <span className="muted">{t.last7d}</span>{t.last24h ? <span> · {t.last24h} today</span> : null}</button>)}
          {country !== 'all' && <button className="chip on" onClick={() => setCountry('all')}>{countries.find((c) => c.id === country)?.label} ×</button>}
        </div>
        {filtered.length === 0 ? <p className="muted">No headlines match this filter this week.</p> : <ul className="plain pulse-list">{filtered.slice(0, 40).map((n) => <Headline key={n.link} n={n} />)}</ul>}
      </section>

      <Journal sigs={sigs} />

      <section className="card">
        <h3>Sources</h3>
        <p className="card-sub">Refreshed every 6 hours. If a source fails, its last good data is kept and marked here. Prices: Yahoo Finance delayed quotes. News: each publisher's own feed, or Google News where the site blocks direct reading. Only headlines and links are stored.</p>
        <div className="chips">{PULSE.sources.map((s) => <span key={s.name} className={`chip sm ${s.ok ? '' : 'neg'}`} title={s.ok ? `${s.kind}: ${s.count}` : `${s.kind}: ${s.error}`}>{s.ok ? '●' : '○'} {s.name}</span>)}</div>
      </section>
    </>
  );
}
