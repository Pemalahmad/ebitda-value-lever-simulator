import React from 'react';
import { fmt } from '../../engine/index.js';
import { Icon } from './Icons.jsx';

const GROUPS = ['Revenue', 'Cost', 'Capital'];

export function LeverPanel({ sector, levers, cost, onChange, onReset, onScenario, activeScenario }) {
  return (
    <aside className="panel levers" aria-label="Operational levers">
      <div className="panel-head">
        <h2>Operational levers</h2>
        <button className="ghost sm" onClick={onReset} title="Reset all levers to baseline"><Icon name="reset" size={14} /> Baseline</button>
      </div>
      <div className="scenario-chips" role="group" aria-label="Scenario presets">
        {Object.keys(sector.scenarios).map((name) => (
          <button key={name} className={`chip ${activeScenario === name ? 'on' : ''}`} onClick={() => onScenario(name)}>{name}</button>
        ))}
      </div>
      {GROUPS.map((g) => {
        const ls = sector.levers.filter((l) => l.group === g);
        if (!ls.length) return null;
        return (
          <div key={g} className="lever-group">
            <div className="group-title">{g === 'Capital' ? 'Working capital' : `${g} levers`}</div>
            {ls.map((l) => (
              <Lever key={l.id} l={l} value={levers[l.id]} cost={cost[l.id]} onChange={(v) => onChange(l.id, v)} />
            ))}
          </div>
        );
      })}
    </aside>
  );
}

function Lever({ l, value, cost, onChange }) {
  const delta = value - l.base;
  const good = delta * l.good > 0;
  const moved = Math.abs(delta) > 1e-9;
  const basePos = ((l.base - l.min) / (l.max - l.min)) * 100;
  const pos = ((value - l.min) / (l.max - l.min)) * 100;
  // Colour the span between baseline and current value: green if it creates value, red if not.
  const a = Math.min(basePos, pos);
  const b = Math.max(basePos, pos);
  const c = good ? 'var(--pos)' : 'var(--neg)';
  const fill = `linear-gradient(90deg, var(--track) ${a}%, ${c} ${a}%, ${c} ${b}%, var(--track) ${b}%)`;
  const dp = l.step < 1 ? (l.step < 0.1 ? 2 : 1) : 0;
  return (
    <div className={`lever ${moved ? 'moved' : ''}`}>
      <div className="lever-top">
        <label htmlFor={`lv-${l.id}`} title={l.hint || ''}>
          {l.label}
          {l.hint && <span className="hint-dot" aria-hidden="true"><Icon name="info" size={12} /></span>}
        </label>
        <span className="lever-val">{fmt.unitValue(value, l.unit, dp)}</span>
      </div>
      <div className="slider-wrap">
        <input
          id={`lv-${l.id}`}
          type="range"
          min={l.min}
          max={l.max}
          step={l.step}
          value={value}
          style={{ background: fill }}
          onChange={(e) => onChange(Number(e.target.value))}
          onDoubleClick={() => onChange(l.base)}
          aria-describedby={`lv-${l.id}-meta`}
        />
        <span className="base-tick" style={{ left: `calc(${basePos}% + ${(0.5 - basePos / 100) * 16}px)` }} title={`Baseline ${fmt.unitValue(l.base, l.unit, dp)}`} />
      </div>
      <div className="lever-meta" id={`lv-${l.id}-meta`}>
        {moved ? (
          <>
            <span className={`delta ${good ? 'pos' : 'neg'}`}>{delta > 0 ? '+' : '−'}{fmt.unitValue(Math.abs(delta), l.unit === 'AED m' ? 'AED m' : l.unit === '%' ? '' : l.unit, dp)}{l.unit === '%' ? ' pts' : ''} vs base</span>
            {cost > 0 && <span className="cost">invest {fmt.money(cost)}</span>}
          </>
        ) : (
          <span className="muted">Baseline · {l.owner}</span>
        )}
      </div>
    </div>
  );
}
