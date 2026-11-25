import React, { useMemo, useState } from 'react';
import PULSE from '../../../data/pulse/pulse.json';
import { PageHead, Section, Card, CardHead, KpiStrip, DotLine, FolderTabs, Pill, Status, DotTrack } from './Dots.jsx';
import { CHOKEPOINTS, CHECKLIST, STANCES, byCountry, byTheme, classify, noteErrors, reviewDue, signals, snapshotLevels, stats } from '../../engine/pulse.js';

const JOURNAL_KEY = 'vls.journal.v1';
const LEVEL = { alert: ['Act now', 'neg'], watch: ['Watch', 'amber'], positive: ['Tailwind', 'pos'] };
const GROUPS = ['Dubai & GCC', 'Global indices', 'Commodities', 'FX & rates', 'Risk & freight'];
const HEADLINE = ['brent', 'msci-uae', 'spx', 'us10y', 'gold', 'vix'];
const SHORT = { brent: 'Brent', 'msci-uae': 'MSCI UAE', spx: 'S&P 500', us10y: 'US 10Y', gold: 'Gold', vix: 'VIX' };

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
      <p className="card-sub">The thesis, what would prove it wrong, the signals it rests on, and a date to review it. Market levels are saved with each note so a review shows what has moved since. Notes stay in this browser; export them to keep a copy.</p>
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
  const [focus, setFocus] = useState('brent');
  const [group, setGroup] = useState(GROUPS[0]);
  const [openSig, setOpenSig] = useState(null);
  const rows = useMemo(() => PULSE.markets.map((m) => ({ ...m, s: stats(m.series, m) })), []);
  const recent = PULSE.news.filter((n) => Date.now() - Date.parse(n.published) <= 3 * 864e5).map((n) => ({ ...n, ...classify(n.title) }));
  const filtered = PULSE.news.map((n) => ({ ...n, ...classify(n.title) }))
    .filter((n) => (theme === 'all' || n.themes.includes(theme)) && (country === 'all' || n.countries.includes(country)));
  const live = PULSE.sources.filter((s) => s.ok).length;
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

  return (
    <div className="doc">
      <PageHead status={`Data as of ${stamp(PULSE.generatedAt)} · ${live}/${PULSE.sources.length} sources live`} title="Market pulse" muted="for a Dubai portfolio"
        sub={<>What moved, what it means, and what the local papers are saying, in one read before the investment committee. Delayed quotes; not investment advice. Live maps of conflicts and shipping: <a href="https://www.worldmonitor.app/" target="_blank" rel="noreferrer">World Monitor</a>.</>} />

      <Section n={1} title="Headline markets" sub="Pick a market to redraw the three-month chart. On the right, the KPIs to watch against the thresholds that trigger a signal.">
        <div className="split-main">
          <Card className="chart-card">
            <KpiStrip active={focus} onSelect={setFocus} items={HEADLINE.filter((id) => byId[id]).map((id) => { const r = byId[id]; const m = r.invert && r.s.m1 != null ? -r.s.m1 : r.s.m1; return { id, label: SHORT[id] ?? r.label, value: num(r.s.last), delta: r.s.m1 == null ? null : `${pct(r.s.m1)} 1M`, tone: tone(m) }; })} />
            {byId[focus] && (byId[focus].s.monthly
              ? <p className="empty-card">This source publishes only monthly history, so there is no daily chart. Last {num(byId[focus].s.last)} on {byId[focus].s.asOf}.</p>
              : <DotLine height={420} series={byId[focus].series.slice(-63).map(([d, v]) => ({ label: new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), value: v }))} format={(v) => num(v)} label={`${byId[focus].label}, three months`} />)}
            {byId[focus] && <p className="w-foot">{byId[focus].label}{byId[focus].unit ? `, ${byId[focus].unit}` : ''} · 1W {pct(byId[focus].s.w1)} · 3M {pct(byId[focus].s.m3)} · last {byId[focus].s.asOf}</p>}
          </Card>
          <WatchList byId={byId} />
        </div>
      </Section>

      <Section n={2} title="Signal register" sub="Every signal past its threshold, once. Open a row for the evidence and the headlines behind it.">
        <Card className="register">
          {sigs.length === 0 ? <p className="empty-card">No market or news signal past its threshold today.</p> : (
            <div className="table-wrap"><table className="data reg-table">
              <thead><tr><th>Level</th><th>Signal</th><th>Why it matters for a Dubai portfolio</th><th>Evidence</th><th /></tr></thead>
              <tbody>{sigs.map((x) => (
                <React.Fragment key={x.id}>
                  <tr className="clickable" onClick={() => setOpenSig(openSig === x.id ? null : x.id)} aria-expanded={openSig === x.id} role="button" tabIndex={0}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOpenSig(openSig === x.id ? null : x.id); } }}>
                    <td><span className={`chip sm ${LEVEL[x.level][1]}`}>{LEVEL[x.level][0]}</span></td>
                    <td><b>{x.title}</b></td>
                    <td className="muted reg-why">{x.why}</td>
                    <td className="muted sm">{x.evidence?.length ? x.evidence.map((id) => SHORT[id] ?? byId[id]?.label ?? id).join(', ') : `${x.news?.length ?? 0} headlines`}</td>
                    <td className="r"><span className={`reg-caret ${openSig === x.id ? 'on' : ''}`}>›</span></td>
                  </tr>
                  {openSig === x.id && <tr className="reg-open"><td /><td colSpan={4}>
                    {x.news?.length > 0 ? <ul className="plain">{x.news.map((n) => <Headline key={n.link} n={n} />)}</ul> : <p className="muted sm">Market signal: see the {x.evidence.map((id) => byId[id]?.label ?? id).join(' and ')} chart above.</p>}
                  </td></tr>}
                </React.Fragment>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      </Section>

      <Section n={3} title="Markets" sub="Dubai and GCC first, then the global drivers that reach Dubai through the dollar peg, oil and capital flows.">
        <FolderTabs value={group} onChange={setGroup} tabs={GROUPS.map((g) => ({ id: g, label: g, count: rows.filter((r) => r.group === g).length }))} />
        <Card className="folder-body">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Market</th><th className="r">Last</th><th className="r">1D</th><th className="r">1W</th><th className="r">1M</th><th className="r">3M</th><th className="r">Trend</th></tr></thead>
              <tbody>{rows.filter((r) => r.group === group).map((r) => (
                <tr key={r.id} className="clickable" role="button" tabIndex={0} onClick={() => { setFocus(r.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setFocus(r.id); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}>
                  <td>{r.label}
                    {Date.now() - Date.parse(r.s.asOf) > 4 * 864e5
                      ? <div className="neg" style={{ fontSize: 11 }}>Last updated {r.s.asOf}; source unavailable since then</div>
                      : r.s.stale && <div className="muted" style={{ fontSize: 11 }}>Recent history not published by the source</div>}</td>
                  <td className="r">{num(r.s.last)}{r.unit ? <span className="muted"> {r.unit}</span> : r.currency && r.currency !== 'USD' ? <span className="muted"> {r.currency}</span> : null}</td>
                  {['d1', 'w1', 'm1', 'm3'].map((k) => { const v = r.s[k]; return <td key={k} className="r">{v == null ? <span className="muted">—</span> : <Pill tone={tone(r.invert ? -v : v)}>{pct(v)}</Pill>}</td>; })}
                  <td className="r">{r.s.monthly ? <span className="muted">—</span> : <Spark series={r.series} color={r.s.m3 != null && (r.invert ? r.s.m3 > 0 : r.s.m3 < 0) ? 'var(--neg)' : 'var(--text)'} />}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
          <p className="w-foot">Click a row to chart it at the top.</p>
        </Card>
      </Section>

      <Section n={4} title="Trade, countries and news" sub="Shipping chokepoints, who is in the news, and the local headlines by theme.">
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
              <tr key={c.id} className="clickable" role="button" tabIndex={0} onClick={() => setCountry(country === c.id ? 'all' : c.id)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setCountry(country === c.id ? 'all' : c.id); } }}>
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

      </Section>

      <Section n={5} title="Decision journal" sub="Write the call before you make it, and review it against what moved.">
      <Journal sigs={sigs} />
      </Section>

      <Section n={6} title="Sources" sub="Refreshed every 6 hours; failed sources keep their last good data.">
      <section className="card">
        <p className="card-sub">Refreshed every 6 hours. If a source fails, its last good data is kept and marked here. Prices: Yahoo Finance delayed quotes. News: each publisher's own feed, or Google News where the site blocks direct reading. Only headlines and links are stored.</p>
        <div className="chips">{PULSE.sources.map((s) => <span key={s.name} className={`chip sm ${s.ok ? '' : 'neg'}`} title={s.ok ? `${s.kind}: ${s.count}` : `${s.kind}: ${s.error}`}>{s.ok ? '●' : '○'} {s.name}</span>)}</div>
      </section>
      </Section>
    </div>
  );
}

// The KPIs behind the signals, all of them, with how close each is to its trigger.
function WatchList({ byId }) {
  const g = (id) => byId[id]?.s;
  const bp = (id) => { const m = byId[id]; if (!m || m.series.length < 22) return null; return (m.series.at(-1)[1] - m.series.at(-22)[1]) * 100; };
  const rows = [
    { k: 'Brent, 1 month', v: g('brent')?.m1, fmt: (x) => pct(x), t: 0.1, tl: '±10%' },
    { k: 'US 10-year yield, 1 month', v: bp('us10y'), fmt: (x) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(0)} bp`, t: 25, tl: '±25 bp' },
    { k: 'Dollar index, 1 month', v: g('dxy')?.m1, fmt: (x) => pct(x), t: 0.03, tl: '±3%' },
    { k: 'VIX level', v: g('vix')?.last, fmt: (x) => x.toFixed(1), t: 25, tl: '≥ 25', level: true },
    { k: 'MSCI UAE vs S&P 500, 1 month', v: g('msci-uae')?.m1 != null && g('spx')?.m1 != null ? (g('msci-uae').m1 - g('spx').m1) * 100 : null, fmt: (x) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)} pts`, t: 5, tl: '±5 pts', upGood: true },
    { k: 'Emaar, 1 month', v: g('emaar')?.m1, fmt: (x) => pct(x), t: 0.1, tl: '±10%', upGood: true },
    { k: 'Dry-bulk freight, 1 month', v: g('freight')?.m1, fmt: (x) => pct(x), t: 0.15, tl: '±15%' },
  ].map((r) => { const ratio = r.v == null ? null : r.level ? r.v / r.t : Math.abs(r.v) / r.t; const s2 = ratio == null ? 'n/a' : r.upGood && r.v > 0 ? (ratio >= 1 ? 'tail' : 'ok') : ratio >= 1 ? 'breach' : ratio >= 0.7 ? 'near' : 'ok'; return { ...r, ratio, s: s2 }; });
  return (
    <Card className="signal-side">
      <CardHead title="KPIs to watch" sub={`${rows.filter((r) => r.s === 'breach').length} adverse past threshold · ${rows.filter((r) => r.s === 'near').length} near · ${rows.filter((r) => r.s === 'tail').length} tailwind`} />
      <ul className="watch watch-mkt">{rows.map((r) => (
        <li key={r.k}><span className="w-k">{r.k}<small>trigger {r.tl}</small></span><b>{r.v == null ? '—' : r.fmt(r.v)}</b><Status s={r.s} />
          {r.ratio != null && <span className="watch-track"><DotTrack to={Math.min(1, r.ratio / 1.5)} marker={1 / 1.5} tone={r.s === 'breach' ? 'neg' : r.s === 'near' ? 'amber' : 'pos'} slots={30} /></span>}</li>
      ))}</ul>
      <p className="w-foot">The ring marks the trigger. Past it, the signal enters the register below.</p>
    </Card>
  );
}
