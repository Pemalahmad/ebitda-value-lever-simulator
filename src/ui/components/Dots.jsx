// The shared visual language: dot-matrix charts, KPI strips, folder tabs and document sections.
// Every tab is built from these, so moving between tabs keeps one design.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HeaderGrid, CountMoney, CountNumber } from './Effects.jsx';

/* ---------- Document structure ---------- */

export function PageHead({ status, title, muted, sub, meta = [], actions }) {
  return (
    <header className="page-head">
      <HeaderGrid />
      <div className="page-head-main">
        {status && <div className="page-status"><i aria-hidden="true" />{status}</div>}
        <h2>{title}{muted && <span> {muted}</span>}</h2>
        {sub && <p>{sub}</p>}
        {meta.length > 0 && <dl className="page-meta">{meta.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Section({ id, n, title, sub, actions, children }) {
  return (
    <section className="doc-section" id={id}>
      <header>
        {n && <span className="doc-n">{String(n).padStart(2, '0')}</span>}
        <div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
        {actions && <div className="doc-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

export function Contents({ items }) {
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  return (
    <nav className="contents" aria-label="Contents">
      {items.map((it, i) => <button key={it.id} type="button" onClick={() => go(it.id)}><span>{String(i + 1).padStart(2, '0')}</span>{it.label}</button>)}
    </nav>
  );
}

export const Card = ({ className = '', children, ...rest }) => <article className={`w-card ${className}`} {...rest}>{children}</article>;

export function CardHead({ title, sub, right }) {
  return <header className="w-head"><div><h4>{title}</h4>{sub && <p>{sub}</p>}</div>{right}</header>;
}

/* ---------- Controls ---------- */

export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([id, text]) => <button key={id} type="button" className={value === id ? 'on' : ''} aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>)}
    </div>
  );
}

export function FolderTabs({ tabs, value, onChange, right }) {
  return (
    <div className="folder-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} className={value === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>
          {t.label}{t.count != null && <span>{t.count}</span>}
        </button>
      ))}
      {right && <div className="folder-right">{right}</div>}
    </div>
  );
}

export function Pill({ value, tone, children }) {
  const t = tone ?? (value > 0 ? 'pos' : value < 0 ? 'neg' : '');
  return <span className={`pill ${t}`}>{t === 'pos' ? '↗ ' : t === 'neg' ? '↘ ' : ''}{children}</span>;
}

// Ledger-style KPI strip. With onSelect, each KPI switches the chart below it.
export function KpiStrip({ items, active, onSelect }) {
  return (
    <div className={`kpi-strip ${onSelect ? 'selectable' : ''}`} style={{ '--n': items.length }}>
      {items.map((k) => {
        const on = active === k.id;
        const Tag = onSelect ? 'button' : 'div';
        return (
          <Tag key={k.id} type={onSelect ? 'button' : undefined} className={`kpi ${on ? 'on' : ''}`} onClick={onSelect ? () => onSelect(k.id) : undefined} aria-pressed={onSelect ? on : undefined}>
            <span className="kpi-label"><i style={{ background: k.color ?? (on ? 'var(--text)' : 'var(--line-2)') }} />{k.label}</span>
            <span className="kpi-value">{k.money != null ? <CountMoney value={k.money} sign={k.sign} /> : k.num != null ? <CountNumber value={k.num} decimals={k.decimals} prefix={k.prefix} suffix={k.suffix} /> : k.value}{k.delta && <Pill tone={k.tone}>{k.delta}</Pill>}</span>
            {k.sub && <span className="kpi-sub">{k.sub}</span>}
            {onSelect && <span className="kpi-rule" aria-hidden="true" />}
          </Tag>
        );
      })}
    </div>
  );
}

/* ---------- Dot charts ---------- */

// Dot-matrix line chart with a hover guide and tooltip.
export function DotLine({ series, baseline, format = (v) => v, height = 230, label = 'Trend', xLabels = 4 }) {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const box = useRef(null);
  const [W, setW] = useState(640);
  // Draw at the real pixel width so axis text and dots stay the same size in any card.
  useEffect(() => {
    if (!box.current || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const H = height, padL = 52, padR = 12, padT = 12, padB = 24;
  const geo = useMemo(() => {
    const vals = series.map((p) => p.value).concat(baseline != null ? [baseline] : []);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { min -= Math.abs(min) * 0.05 || 1; max += Math.abs(max) * 0.05 || 1; }
    const pad = (max - min) * 0.12; min -= pad; max += pad;
    const x = (i) => padL + (series.length < 2 ? (W - padL - padR) / 2 : (i / (series.length - 1)) * (W - padL - padR));
    const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
    const pts = series.map((p, i) => [x(i), y(p.value)]);
    // Sample the polyline every ~7px so the line reads as a string of dots.
    const trail = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 7));
      for (let k = 0; k < n; k++) trail.push([x1 + ((x2 - x1) * k) / n, y1 + ((y2 - y1) * k) / n]);
    }
    if (pts.length) trail.push(pts.at(-1));
    const ticks = Array.from({ length: 4 }, (_, i) => min + ((max - min) * (i + 0.5)) / 4);
    return { x, y, pts, trail, ticks };
  }, [series, baseline, H, W]);
  const move = (ev) => {
    const r = ref.current.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    let best = 0;
    geo.pts.forEach(([x], i) => { if (Math.abs(x - px) < Math.abs(geo.pts[best][0] - px)) best = i; });
    setHover(best);
  };
  const step = Math.max(1, Math.ceil(series.length / Math.max(2, Math.min(xLabels + Math.floor(W / 260), 8))));
  const hv = hover != null ? series[hover] : null;
  return (
    <div className="dotline" ref={box} onMouseLeave={() => setHover(null)}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseMove={move}>
        {geo.ticks.map((t) => <g key={t}><line x1={padL} x2={W - padR} y1={geo.y(t)} y2={geo.y(t)} className="dl-grid" /><text x={padL - 8} y={geo.y(t) + 3} textAnchor="end" className="dl-axis">{format(t)}</text></g>)}
        {geo.pts.map(([x, y], i) => i % Math.max(1, Math.round(series.length / 40)) === 0 && Array.from({ length: Math.floor((H - padB - y) / 9) }, (_, k) => <circle key={`${i}-${k}`} cx={x} cy={y + 9 * (k + 1)} r="1.1" className="dl-fill" />))}
        {baseline != null && <line x1={padL} x2={W - padR} y1={geo.y(baseline)} y2={geo.y(baseline)} className="dl-base" />}
        {geo.trail.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.1" className="dl-dot" />)}
        {geo.pts.length <= 12 && geo.pts.map(([x, y], i) => <circle key={`p${i}`} cx={x} cy={y} r="3.6" className="dl-pt" />)}
        {series.map((p, i) => (i % step === 0 || i === series.length - 1) && <text key={`x${i}`} x={geo.x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === series.length - 1 ? 'end' : 'middle'} className="dl-axis">{p.label}</text>)}
        {hv && <g><line x1={geo.pts[hover][0]} x2={geo.pts[hover][0]} y1={padT} y2={H - padB} className="dl-guide" /><circle cx={geo.pts[hover][0]} cy={geo.pts[hover][1]} r="5" className="dl-hot" /></g>}
      </svg>
      {hv && <div className="dl-tip" style={{ left: `${(geo.pts[hover][0] / W) * 100}%`, top: `${(geo.pts[hover][1] / H) * 100}%` }}><b>{format(hv.value)}</b><span>{hv.label}</span></div>}
    </div>
  );
}

// One row of dot slots; slots between `from` and `to` (0..1) are lit.
export function DotTrack({ from = 0, to, tone = 'ink', slots = 24, marker }) {
  const a = Math.round(Math.min(from, to) * slots), b = Math.round(Math.max(from, to) * slots);
  const m = marker != null ? Math.min(slots - 1, Math.round(marker * slots)) : null;
  return (
    <span className="dot-track" style={{ '--slots': slots }} aria-hidden="true">
      {Array.from({ length: slots }, (_, i) => <i key={i} className={`${i >= a && i < Math.max(b, a + 1) ? `on ${tone}` : ''} ${i === m ? 'mark' : ''}`} />)}
    </span>
  );
}

// Labelled rows of dot tracks: bars, ranges (waterfalls) or centred swings (tornado).
export function DotRows({ rows, valueWidth = 92, onRow }) {
  return (
    <div className="dot-rows" style={{ '--vw': `${valueWidth}px` }}>
      {rows.map((r) => (
        <div key={r.id ?? r.label} className={`dot-row ${onRow ? 'clickable' : ''} ${r.dim ? 'dim' : ''}`} onClick={onRow ? () => onRow(r) : undefined} title={r.title ?? r.label}>
          <span className="dr-label">{r.label}</span>
          <DotTrack from={r.from ?? 0} to={r.to} tone={r.tone} marker={r.marker} slots={r.slots} />
          <span className={`dr-value ${r.tone === 'pos' || r.tone === 'neg' ? r.tone : ''}`}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// Ring of dots, lit up to `value` (0..1): goal and share rings.
export function DotRing({ value, label, sub, size = 132, n = 44, tone = 'accent' }) {
  const lit = Math.round(Math.max(0, Math.min(1, value)) * n);
  const c = size / 2, r = size / 2 - 7;
  return (
    <div className="dot-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${Math.round(value * 100)}%`}>
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          return <circle key={i} cx={c + r * Math.cos(a)} cy={c + r * Math.sin(a)} r={i < lit ? 3.4 : 2.2} className={i < lit ? `ring-on ${tone}` : 'ring-off'} style={{ transitionDelay: `${i * 8}ms` }} />;
        })}
      </svg>
      <div className="ring-center"><b>{label}</b>{sub && <span>{sub}</span>}</div>
    </div>
  );
}

// Vertical columns of stacked dots, signed around a baseline. For year-by-year phasing.
export function DotColumns({ cols, format, rows = 12 }) {
  const max = Math.max(1e-9, ...cols.map((c) => Math.abs(c.value)));
  const [hover, setHover] = useState(null);
  return (
    <div className="dot-cols" onMouseLeave={() => setHover(null)}>
      {cols.map((c, i) => {
        const k = Math.max(c.value ? 1 : 0, Math.round((Math.abs(c.value) / max) * rows));
        const neg = c.value < 0;
        return (
          <div key={c.label} className={`dc ${hover === i ? 'hot' : ''}`} onMouseEnter={() => setHover(i)}>
            <span className="dc-val">{format(c.value)}</span>
            <span className="dc-up">{Array.from({ length: rows }, (_, j) => <i key={j} className={!neg && j >= rows - k ? `on ${c.tone ?? 'pos'}` : ''} />)}</span>
            <span className="dc-down">{Array.from({ length: Math.ceil(rows / 2) }, (_, j) => <i key={j} className={neg && j < Math.min(k, Math.ceil(rows / 2)) ? 'on neg' : ''} />)}</span>
            <span className="dc-label">{c.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Severity / status dot.
export const Dot = ({ tone }) => <i className={`sdot ${tone}`} aria-hidden="true" />;

// Vertical waterfall for any bridge { start, end, steps }. Movements are filled with a dot texture,
// totals are solid. The axis zooms in (and says so) when the movements are small next to the totals.
export function Waterfall({ bridge, startLabel = 'Start', endLabel = 'End', format = (v) => v, height = 280, zoom = true }) {
  const box = useRef(null);
  const [W, setW] = useState(720);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    if (!box.current || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const bars = [{ label: startLabel, from: 0, to: bridge.start, kind: 'total' }];
  let cum = bridge.start;
  for (const s of bridge.steps) { bars.push({ label: s.label, from: cum, to: cum + s.delta, kind: Math.abs(s.delta) < 1e-9 ? 'flat' : s.delta > 0 ? 'up' : 'down', delta: s.delta }); cum += s.delta; }
  bars.push({ label: endLabel, from: 0, to: bridge.end, kind: 'end' });
  const vals = bars.flatMap((b) => [b.from, b.to]);
  const max = Math.max(0, ...vals), minV = Math.min(0, ...vals);
  const moves = bars.filter((b) => b.kind === 'up' || b.kind === 'down').flatMap((b) => [b.from, b.to]);
  const span = moves.length ? Math.max(...moves) - Math.min(...moves) : 0;
  const lo = zoom && minV >= 0 && moves.length && span < max * 0.35 ? Math.max(0, Math.min(...moves, bridge.start, bridge.end) - span * 1.2) : minV;
  const padT = 26, padB = 46, H = height, n = bars.length, slot = W / n, bw = Math.min(64, slot * 0.58);
  const y = (v) => padT + (1 - (Math.max(v, lo) - lo) / (max - lo || 1)) * (H - padT - padB);
  const id = useMemo(() => `wf${Math.random().toString(36).slice(2, 7)}`, []);
  const tone = { total: 'var(--text)', end: 'var(--gold)', up: 'var(--pos)', down: 'var(--neg)', flat: 'var(--line-2)' };
  return (
    <div className="waterfall-v" ref={box} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Waterfall from ${startLabel} to ${endLabel}`}>
        <defs>{['up', 'down'].map((k) => <pattern key={k} id={`${id}-${k}`} width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill={tone[k]} opacity=".14" /><circle cx="3" cy="3" r="1.7" fill={tone[k]} /></pattern>)}</defs>
        {lo > 0 && <text x="0" y={H - padB + 36} className="dl-axis">Axis from {format(lo)}</text>}
        <line x1="0" x2={W} y1={y(Math.max(lo, 0))} y2={y(Math.max(lo, 0))} className="wf-axis" />
        {bars.map((b, i) => {
          const x = i * slot + (slot - bw) / 2;
          const top = y(Math.max(b.from, b.to)), bot = y(Math.min(b.from, b.to));
          const next = bars[i + 1];
          return (
            <g key={i} onMouseEnter={() => setHover(i)} className={hover != null && hover !== i ? 'wf-dim' : ''}>
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              <rect x={x} y={top} width={bw} height={Math.max(2, bot - top)} rx="5" fill={b.kind === 'up' || b.kind === 'down' ? `url(#${id}-${b.kind})` : tone[b.kind]} stroke={tone[b.kind]} strokeWidth={b.kind === 'up' || b.kind === 'down' ? 1 : 0} />
              {next && <line x1={x + bw} x2={(i + 1) * slot + (slot - bw) / 2} y1={y(b.to)} y2={y(b.to)} className="wf-link" />}
              <text x={x + bw / 2} y={top - 8} textAnchor="middle" className={`wf-val ${b.kind}`}>{b.kind === 'flat' ? '—' : b.delta != null ? `${b.delta >= 0 ? '+' : '−'}${format(Math.abs(b.delta))}` : format(b.to)}</text>
              <foreignObject x={i * slot + 2} y={H - padB + 6} width={slot - 4} height={padB - 6}><div className="wf-label" title={b.label}>{b.label}</div></foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Status chip used by watchlists and checks.
export const Status = ({ s }) => <span className={`status ${s}`}>{{ pass: 'Pass', ok: 'On track', warn: 'Watch', near: 'Near', fail: 'Fail', breach: 'Breach', tail: 'Tailwind' }[s] ?? s}</span>;
