import React from 'react';
import { ACHIEVEMENTS, RANKS, fmt } from '../../engine/index.js';
import { Gauge } from './Charts.jsx';
import { Icon } from './Icons.jsx';

export function GamePanel({ e, sector, unlocked, missionLog }) {
  const { rank } = e;
  return (
    <aside className="panel game" aria-label="Score and missions">
      <div className="score-card">
        <div className="score-label">Value score</div>
        <div className="score-num">{e.score.toLocaleString('en-US')}</div>
        <div className="score-sub">AED m of value created × board confidence</div>
      </div>

      <div className="rank-card">
        <div className="rank-ladder" aria-label="Rank ladder">
          {RANKS.map((r, i) => (
            <span key={r.name} className={`rung ${i <= rank.index ? 'on' : ''}`} title={`${r.name}: ${(r.min * 100).toFixed(0)}%+ value/EV${r.confidence ? `, confidence ≥ ${r.confidence}` : ''}`} />
          ))}
        </div>
        <div className="rank-name"><Icon name="trophy" size={16} /> {rank.name}</div>
        {rank.next ? (
          <div className="rank-next">
            Next: <b>{rank.next.name}</b> at {(rank.next.min * 100).toFixed(0)}% of EV created{rank.next.confidence ? ` with confidence ≥ ${rank.next.confidence}` : ''}
            <div className="bar"><span style={{ width: `${rank.toNext * 100}%` }} /></div>
          </div>
        ) : (
          <div className="rank-next">Top of the ladder.</div>
        )}
      </div>

      <div className="confidence">
        <div className="section-title"><Icon name="shield" size={14} /> Board confidence</div>
        <Gauge value={e.confidence} />
        <div className="conf-notes">
          {e.cmp.scn.flags.length === 0 && !e.cmp.overBudget ? <span className="pos">No open risks</span> : null}
          {e.cmp.scn.flags.map((f) => (
            <span key={f.id} className={`risk ${f.severity}`} title={f.detail}>{f.title}</span>
          ))}
          {e.cmp.overBudget && <span className="risk high">Over budget by {fmt.money(e.cmp.invest - sector.budget)}</span>}
        </div>
      </div>

      <div className="missions">
        <div className="section-title"><Icon name="target" size={14} /> Missions</div>
        {e.missions.map((m) => {
          const ever = !!missionLog[m.id];
          return (
            <div key={m.id} className={`mission ${m.done ? 'done' : ''} ${ever && !m.done ? 'ever' : ''}`}>
              <div className="m-top">
                <span className="m-title">{m.done || ever ? <Icon name="check" size={13} /> : null}{m.title}</span>
                <span className="xp">+{m.xp} XP</span>
              </div>
              <div className="m-desc">{m.desc}</div>
              <div className="bar"><span style={{ width: `${(m.done ? 1 : m.progress) * 100}%` }} /></div>
              {m.global && <span className="tag">Every business</span>}
            </div>
          );
        })}
      </div>

      <div className="achievements">
        <div className="section-title"><Icon name="bolt" size={14} /> Achievements</div>
        <div className="badges">
          {ACHIEVEMENTS.map((a) => {
            const on = unlocked.includes(a.id);
            return (
              <div key={a.id} className={`badge ${on ? 'on' : ''}`} title={`${a.title}: ${a.desc} (+${a.xp} XP)`}>
                <Icon name={on ? 'trophy' : 'lock'} size={16} />
                <span>{a.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export function Toasts({ toasts }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.key} className={`toast ${t.kind}`}>
          <div className="burst" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--a': `${i * 30}deg` }} />)}</div>
          <Icon name={t.kind === 'mission' ? 'target' : 'trophy'} size={18} />
          <div>
            <div className="t-kind">{t.kind === 'mission' ? 'Mission complete' : 'Achievement unlocked'}</div>
            <div className="t-title">{t.title} <span className="xp">+{t.xp} XP</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}
