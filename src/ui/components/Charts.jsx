import React from 'react';
import { fmt } from '../../engine/index.js';

const { money } = fmt;

// Horizontal EBITDA bridge: baseline -> each lever -> scenario.
export function Waterfall({ bridge }) {
  const rows = [{ label: 'Baseline EBITDA', kind: 'total', from: 0, to: bridge.start }];
  let cum = bridge.start;
  for (const s of bridge.steps) {
    rows.push({ label: s.label, kind: s.delta >= 0 ? 'up' : 'down', from: cum, to: cum + s.delta, delta: s.delta });
    cum += s.delta;
  }
  rows.push({ label: 'Scenario EBITDA', kind: 'total', from: 0, to: bridge.end });
  const vals = rows.flatMap((r) => [r.from, r.to]);
  const max = Math.max(...vals);
  const min = Math.min(0, ...vals);
  // Zoom into the top of the range so small lever effects are visible.
  const lo = Math.max(min, Math.min(...rows.filter((r) => r.kind !== 'total').flatMap((r) => [r.from, r.to]), bridge.start, bridge.end) * 0.85);
  const scale = (x) => ((Math.max(x, lo) - lo) / (max - lo || 1)) * 100;
  return (
    <div className="waterfall" role="img" aria-label="EBITDA bridge from baseline to scenario">
      {rows.map((r, i) => {
        const a = scale(Math.min(r.from, r.to));
        const b = scale(Math.max(r.from, r.to));
        return (
          <div className="wf-row" key={i}>
            <div className="wf-label" title={r.label}>{r.label}</div>
            <div className="wf-track">
              <div className={`wf-bar ${r.kind}`} style={{ left: `${r.kind === 'total' ? 0 : a}%`, width: `${Math.max(0.6, r.kind === 'total' ? b : b - a)}%` }} />
            </div>
            <div className={`wf-val ${r.kind}`}>{r.kind === 'total' ? money(r.to) : money(r.delta, { sign: true })}</div>
          </div>
        );
      })}
      {lo > 0 && <div className="axis-note">Axis starts at {money(lo)} to show lever effects</div>}
    </div>
  );
}

// Tornado: EBITDA swing for ±10% on each lever.
export function Tornado({ rows, limit = 7 }) {
  const data = rows.slice(0, limit);
  const max = Math.max(...data.flatMap((r) => [Math.abs(r.dLow), Math.abs(r.dHigh)]), 1);
  return (
    <div className="tornado" role="img" aria-label="Sensitivity tornado">
      <div className="tor-head"><span>EBITDA falls</span><span>EBITDA rises</span></div>
      {data.map((r) => {
        const left = Math.min(r.dLow, r.dHigh);
        const right = Math.max(r.dLow, r.dHigh);
        return (
          <div className="tor-row" key={r.id}>
            <div className="tor-label" title={r.label}>{r.label}</div>
            <div className="tor-track">
              <div className="tor-mid" />
              {r.dLow !== 0 && <Bar value={r.dLow} max={max} />}
              {r.dHigh !== 0 && <Bar value={r.dHigh} max={max} />}
            </div>
            <div className="tor-val" title={`${money(left)} / ${money(right, { sign: true })}`}>±{money(r.swing / 2)}</div>
          </div>
        );
      })}
    </div>
  );
}

function Bar({ value, max }) {
  const w = (Math.abs(value) / max) * 50;
  return <div className={`tor-bar ${value >= 0 ? 'pos' : 'neg'}`} style={value >= 0 ? { left: '50%', width: `${w}%` } : { left: `${50 - w}%`, width: `${w}%` }} />;
}

// Two-way sensitivity heatmap.
export function Heatmap({ g }) {
  const all = g.cells.flat();
  const maxAbs = Math.max(...all.map((c) => Math.abs(c - g.current)), 1);
  const f = (l, x) => fmt.unitValue(x, l.unit);
  return (
    <div className="heatmap-wrap">
      <table className="heatmap">
        <thead>
          <tr>
            <th className="corner">{g.a.label} ↓ · {g.b.label} →</th>
            {g.cols.map((c, j) => <th key={j}>{f(g.b, c)}</th>)}
          </tr>
        </thead>
        <tbody>
          {g.rows.map((r, i) => (
            <tr key={i}>
              <th>{f(g.a, r)}</th>
              {g.cells[i].map((c, j) => {
                const d = (c - g.current) / maxAbs;
                const bg = d >= 0 ? `rgba(45,212,191,${0.08 + d * 0.55})` : `rgba(248,113,113,${0.08 + -d * 0.55})`;
                const isCur = i === 2 && j === 2;
                return <td key={j} style={{ background: bg }} className={isCur ? 'cur' : ''}>{money(c, { dp: 0 })}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Semicircle gauge for board confidence.
export function Gauge({ value }) {
  const r = 52;
  const c = Math.PI * r;
  const color = value >= 75 ? 'var(--pos)' : value >= 50 ? 'var(--amber)' : 'var(--neg)';
  return (
    <svg viewBox="0 0 120 70" className="gauge" role="img" aria-label={`Board confidence ${value} of 100`}>
      <path d="M8 62 A52 52 0 0 1 112 62" fill="none" stroke="var(--track)" strokeWidth="10" strokeLinecap="round" />
      <path d="M8 62 A52 52 0 0 1 112 62" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} style={{ transition: 'stroke-dasharray .4s ease, stroke .4s' }} />
      <text x="60" y="56" textAnchor="middle" className="gauge-num">{value}</text>
    </svg>
  );
}

// Year-by-year benefits realisation bars.
export function Phasing({ yearly, invest }) {
  const max = Math.max(...yearly.map(Math.abs), invest, 1);
  return (
    <div className="phasing">
      <div className="ph-col">
        <div className="ph-bar-wrap"><div className="ph-bar neg" style={{ height: `${(invest / max) * 100}%` }} /></div>
        <div className="ph-val">{money(-invest)}</div>
        <div className="ph-lbl">Year 0</div>
      </div>
      {yearly.map((y, i) => (
        <div className="ph-col" key={i}>
          <div className="ph-bar-wrap"><div className={`ph-bar ${y >= 0 ? 'pos' : 'neg'}`} style={{ height: `${(Math.abs(y) / max) * 100}%` }} /></div>
          <div className="ph-val">{money(y, { sign: true })}</div>
          <div className="ph-lbl">Year {i + 1}</div>
        </div>
      ))}
    </div>
  );
}
