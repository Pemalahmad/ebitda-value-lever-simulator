// 100-day value-creation tracker: the Value Plan's levers as an execution plan. Register, timeline,
// monthly actuals, a planned-vs-realised bridge and the risks to the plan. Planned figures are read
// from the model; only owners, dates, status, milestones and actuals are entered.
import React, { useMemo, useState } from 'react';
import { fmt, STATUSES, PLAN_MONTHS, WINDOW_DAYS, trackPlan, newPlan, rebasePlan, addInitiative, removeInitiative, updateInitiative, setActual, setMilestone, planToCsv, planFromCsv, planTargets, dayNo } from '../../engine/index.js';
import { Section, Card, CardHead, KpiStrip, FolderTabs, Pill, Dot, Segmented, Waterfall } from './Dots.jsx';
import { Icon } from './Icons.jsx';

const { money, unitValue } = fmt;
const STATUS_CLASS = { 'Not started': '', 'On track': 'ok', 'At risk': 'near', Late: 'breach', Done: 'pass' };
const small = (v) => money(v, { dp: Math.abs(v) < 10 ? 2 : undefined });
const today = () => new Date().toISOString().slice(0, 10);
const clampDay = (d) => Math.min(WINDOW_DAYS, Math.max(1, d));
const SUB = 'Turn the levers above into initiatives with owners, dates and milestones, then track realised EBITDA against the modelled plan. Planned impact is read from the business case, never typed in.';

export function TrackerStatus({ s }) {
  return <span className={`status ${STATUS_CLASS[s] ?? ''}`}>{s}</span>;
}

export function ValueTracker({ sector, levers, plan, onChange, onImport, onLoadLevers, onOpenExample, onDelete }) {
  const [view, setView] = useState('register');
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState(null);
  const t = useMemo(() => (plan ? trackPlan(sector, plan) : null), [sector, plan]);
  const moved = useMemo(() => planTargets(sector, levers), [sector, levers]);

  const importCsv = async (file) => {
    if (!file) return;
    if (file.size > 200_000) { setMsg({ tone: 'neg', lines: ['The file is larger than 200 KB.'] }); return; }
    const r = planFromCsv(await file.text());
    if (r.errors.length) { setMsg({ tone: 'neg', lines: r.errors }); return; }
    onImport(r.plan);
    setMsg({ tone: 'pos', lines: [`Imported ${r.plan.initiatives.length} initiatives.`] });
  };
  const exportCsv = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([planToCsv(sector, plan)], { type: 'text/csv' }));
    a.download = `100-day-plan-${sector.id}-${plan.asOf}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  const importButton = <label className="ghost sm tr-import">Import CSV<input type="file" accept=".csv,text/csv" hidden onChange={(e) => { importCsv(e.target.files?.[0]); e.target.value = ''; }} /></label>;
  const message = msg && <ul className={`tr-msg ${msg.tone}`}>{msg.lines.map((l) => <li key={l}>{l}</li>)}</ul>;

  if (!plan) {
    const n = Object.keys(moved).length;
    return (
      <Section id="vp-tracker" n={8} title="100-day value-creation tracker" sub={SUB} actions={importButton}>
        {message}
        <Card className="empty-card tr-empty">
          <p>No plan for this business yet. {n ? `Start one from the ${n} lever${n > 1 ? 's' : ''} moved above: each becomes an initiative with Day 30, 60 and 100 milestones.` : 'Move a lever above first, or open the example plan.'}</p>
          <div className="row-actions">
            <button type="button" className="btn primary" disabled={!n} onClick={() => onChange(newPlan(sector, levers, today()))}>Start a plan from these levers</button>
            <button type="button" className="btn" onClick={onOpenExample}>Open the example plan</button>
          </div>
        </Card>
      </Section>
    );
  }

  const set = (p) => onChange({ ...plan, ...p });
  const differs = JSON.stringify(Object.entries(moved).sort()) !== JSON.stringify(Object.entries(plan.targets).sort());
  const day = clampDay(t.asOfDay);
  const leverLabel = (id) => sector.levers.find((l) => l.id === id)?.label ?? 'No lever';

  return (
    <Section id="vp-tracker" n={8} title="100-day value-creation tracker" sub={SUB} actions={<>
      <button type="button" className="ghost sm" onClick={exportCsv}><Icon name="download" size={14} /> Export CSV</button>
      {importButton}
      <button type="button" className="ghost sm" onClick={() => { if (window.confirm('Delete this plan from this browser? Export it first to keep a copy.')) { onDelete(); setEditing(null); } }}>Delete plan</button>
    </>}>
      {message}
      {plan.example && (
        <div className="tr-note">
          <span className="status warn">Example</span>
          <p>Illustrative example plan built from the {sector.company} and its showcase scenario. Owners are the model's roles, planned figures come from the model and actuals are sample numbers: none of it is real-world data.</p>
          <button type="button" className="ghost sm" onClick={() => { onChange(newPlan(sector, levers, today())); setEditing(null); }} disabled={!Object.keys(moved).length}>Replace with a plan from my levers</button>
        </div>
      )}
      {differs && (
        <div className="tr-note">
          <span className="status near">Levers moved</span>
          <p>The levers above differ from the targets this plan was built on, so planned impact still follows the plan's targets.</p>
          <span className="tr-note-actions">
            <button type="button" className="ghost sm" onClick={() => onLoadLevers(plan.targets)}>Load plan targets into the levers</button>
            <button type="button" className="ghost sm" onClick={() => onChange(rebasePlan(sector, plan, levers))} disabled={!Object.keys(moved).length}>Rebase plan on these levers</button>
          </span>
        </div>
      )}

      <Card className="chart-card">
        <div className="tr-settings">
          <label>Plan start<input type="date" value={plan.start} onChange={(e) => e.target.value && set({ start: e.target.value })} /></label>
          <label>Report as of<input type="date" value={plan.asOf} onChange={(e) => e.target.value && set({ asOf: e.target.value })} /></label>
          <div className="tr-thr"><span>Flag initiatives below</span><Segmented value={plan.threshold} onChange={(v) => set({ threshold: v })} label="Below-plan threshold" options={[[0.7, '70%'], [0.8, '80%'], [0.9, '90%']]} /><span>of plan</span></div>
        </div>
        <KpiStrip items={[
          { id: 'rr', label: 'Planned run-rate EBITDA', money: t.plannedRunRate, sub: `${Object.keys(plan.targets).length} levers, from the business case` },
          { id: 'ptd', label: 'Planned to date', value: small(t.plannedToDate), sub: t.closed.length ? `${t.closed.length} closed month${t.closed.length > 1 ? 's' : ''}, ramping` : 'no month closed yet' },
          { id: 'rtd', label: 'Realised to date', value: small(t.realisedToDate), delta: t.ratio != null ? `${Math.round(t.ratio * 100)}% of plan` : null, tone: t.ratio == null ? '' : t.ratio >= t.threshold ? 'pos' : 'neg', sub: 'entered actuals, closed months' },
          { id: 'day', label: 'Delivery', value: `Day ${day} of ${WINDOW_DAYS}`, sub: `${t.onTrack} of ${t.rows.length} on track or done` },
        ]} />
      </Card>

      <div className="split-main">
        <Card>
          <CardHead title="Planned vs realised EBITDA, to date" sub={t.closed.length ? `Closed months only · ${t.bridge.steps.length} initiative variance${t.bridge.steps.length === 1 ? '' : 's'}` : 'The bridge fills once the first month closes'} />
          {t.closed.length
            ? <Waterfall bridge={t.bridge} startLabel="Planned to date" endLabel="Realised to date" format={small} height={330} />
            : <p className="empty-card">Month 1 closes on day 30. Enter actuals then to see the bridge.</p>}
        </Card>
        <Card>
          <CardHead title="Risks to the plan" sub={t.risks.length ? `${t.risks.length} open, ${t.risks.filter((r) => r.severity === 'high').length} high` : 'Nothing late or below plan'} />
          {t.risks.length
            ? <ul className="risk-list">{t.risks.slice(0, 8).map((r) => <li key={r.title}><Dot tone={r.severity === 'high' ? 'red' : r.severity === 'medium' ? 'amber' : 'green'} /><div><b>{r.title}</b><span>{r.detail} · {r.owner || 'no owner'}</span></div></li>)}</ul>
            : <p className="muted sm">Every milestone due so far is done and every initiative is at or above {Math.round(t.threshold * 100)}% of plan.</p>}
          {t.risks.length > 8 && <p className="w-foot">{t.risks.length - 8} more in the register.</p>}
        </Card>
      </div>

      <FolderTabs value={view} onChange={setView} tabs={[{ id: 'register', label: 'Initiative register', count: t.rows.length }, { id: 'timeline', label: '100-day timeline' }, { id: 'actuals', label: 'Actuals by month', count: t.closed.length }]} />
      <Card className="folder-body">
        {view === 'register' && <>
          <div className="table-wrap"><table className="data tr-table">
            <thead><tr><th>Initiative</th><th>Owner</th><th>Dates</th><th>Status</th><th className="r">Run-rate plan</th><th className="r">Plan to date</th><th className="r">Realised</th><th className="r">Of plan</th><th /></tr></thead>
            <tbody>{t.rows.map((r) => (
              <React.Fragment key={r.id}>
                <tr className={editing === r.id ? 'tr-open' : ''}>
                  <td><b>{r.title}</b><small className="tr-lever">{r.linked ? `${leverLabel(r.leverId)} → ${unitValue(plan.targets[r.leverId], r.lever.unit)}` : <span className="neg">Not linked to a planned lever</span>}</small></td>
                  <td className="muted">{r.owner || <span className="neg">No owner</span>}</td>
                  <td className="mono sm">{r.start} → {r.due}</td>
                  <td><TrackerStatus s={r.status} /></td>
                  <td className="r">{r.cashOnly ? <span className="muted">cash lever</span> : money(r.runRate)}</td>
                  <td className="r">{small(r.plannedToDate)}</td>
                  <td className="r">{small(r.realisedToDate)}</td>
                  <td className="r">{r.ratio == null ? '—' : <Pill tone={r.ratio >= t.threshold ? 'pos' : 'neg'}>{Math.round(r.ratio * 100)}%</Pill>}{r.over && <span className={`tr-flag ${r.overFlagged ? '' : 'bad'}`} title={r.overFlagged ? r.note : 'Above plan with no explanation'}>{r.overFlagged ? 'above plan, explained' : 'above plan, explain'}</span>}</td>
                  <td className="tr-acts"><button type="button" className="ghost sm" onClick={() => setEditing(editing === r.id ? null : r.id)} aria-expanded={editing === r.id}>{editing === r.id ? 'Close' : 'Edit'}</button></td>
                </tr>
                {editing === r.id && <tr className="tr-edit"><td colSpan={9}><InitiativeForm sector={sector} plan={plan} r={r} onChange={onChange} onRemove={() => { onChange(removeInitiative(plan, r.id)); setEditing(null); }} /></td></tr>}
              </React.Fragment>
            ))}</tbody>
            <tfoot><tr className="total"><td colSpan={4}>Plan</td><td className="r">{money(t.plannedRunRate)}</td><td className="r">{small(t.plannedToDate)}</td><td className="r">{small(t.realisedToDate)}</td><td className="r">{t.ratio == null ? '—' : `${Math.round(t.ratio * 100)}%`}</td><td /></tr></tfoot>
          </table></div>
          <div className="row-actions">
            <button type="button" className="btn" onClick={() => { const next = addInitiative(sector, plan); onChange(next); setEditing(next.initiatives.at(-1).id); }}>Add initiative</button>
            <span className="muted sm">Run-rate plan is the lever's EBITDA in the business case at the plan's targets; plan to date follows the lever's ramp from each start date. Several initiatives on one lever share its value.</span>
          </div>
        </>}

        {view === 'timeline' && <div className="gantt tr-gantt">
          {t.rows.map((r) => {
            const s = clampDay(dayNo(plan.start, r.start)), e = clampDay(dayNo(plan.start, r.due));
            return (
              <div key={r.id} className={`g-row ${r.status === 'Late' || r.status === 'At risk' ? 'crit' : ''} ${r.status === 'Done' ? 'tr-done' : ''}`}>
                <span className="g-label" title={r.title}>{r.title}</span>
                <span className="g-track">
                  <i style={{ left: `${((s - 1) / WINDOW_DAYS) * 100}%`, width: `${Math.max(1.2, ((e - s + 1) / WINDOW_DAYS) * 100)}%` }} title={`Day ${s} to day ${e}`} />
                  {r.milestones.map((m) => {
                    const d = clampDay(dayNo(plan.start, m.due));
                    const late = !m.done && dayNo(plan.start, m.due) < t.asOfDay;
                    return <b key={m.label + m.due} className={`tr-ms ${m.done ? 'done' : late ? 'late' : ''}`} style={{ left: `${((d - 0.5) / WINDOW_DAYS) * 100}%` }} title={`${m.label}: ${m.due}${m.done ? ', done' : late ? ', late' : ''}`} />;
                  })}
                  <em className="tr-now" style={{ left: `${(day / WINDOW_DAYS) * 100}%` }} aria-hidden="true" />
                </span>
                <span className="g-val"><TrackerStatus s={r.status} /></span>
              </div>
            );
          })}
          <div className="g-axis">{[1, 25, 50, 75, 100].map((d) => <span key={d}>day {d}</span>)}</div>
          <p className="legend tr-legend"><b className="tr-ms done" /> milestone done <b className="tr-ms" /> milestone open <b className="tr-ms late" /> milestone late <em className="tr-now-key" /> report date, day {day}</p>
        </div>}

        {view === 'actuals' && <>
          <div className="table-wrap"><table className="data tr-table">
            <thead><tr><th>Initiative</th>{PLAN_MONTHS.map((m) => <th key={m.k} className="r">{m.label}<small className="tr-th">{m.days}{t.closed.includes(m.k) ? '' : ' · open'}</small></th>)}<th className="r">Realised</th><th className="r">Plan</th></tr></thead>
            <tbody>{t.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.title}<small className="tr-lever">{r.owner}</small></td>
                {PLAN_MONTHS.map((m) => {
                  const open = !t.closed.includes(m.k);
                  return (
                    <td key={m.k} className="r">
                      <input className="tr-num" type="number" step="0.01" inputMode="decimal" aria-label={`${r.title}, ${m.label} realised EBITDA, AED m`} disabled={open && r.actuals[`m${m.k}`] == null} title={open ? `Opens on day ${m.to}` : undefined}
                        value={r.actuals[`m${m.k}`] ?? ''} placeholder="—" onChange={(e) => onChange(setActual(plan, r.id, m.k, e.target.value))} />
                      <small className="tr-plan">plan {r.monthly[m.k - 1].toFixed(2)}</small>
                    </td>
                  );
                })}
                <td className="r">{small(r.realisedToDate)}</td>
                <td className="r muted">{small(r.plannedToDate)}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <p className="w-foot">Realised EBITDA impact against baseline, AED m, by reporting month. A month opens for entry once it closes on the report date; only closed months count towards the bridge.</p>
        </>}
      </Card>
    </Section>
  );
}

function InitiativeForm({ sector, plan, r, onChange, onRemove }) {
  const up = (patch) => onChange(updateInitiative(plan, r.id, patch));
  return (
    <div className="tr-form">
      <div className="journal-form">
        <label>Initiative<input value={r.title} maxLength={140} onChange={(e) => up({ title: e.target.value })} /></label>
        <label>Linked lever<select value={r.leverId} onChange={(e) => up({ leverId: e.target.value })}>
          {!r.leverId && <option value="">Choose a lever</option>}
          {sector.levers.map((l) => <option key={l.id} value={l.id}>{l.label}{plan.targets[l.id] == null ? ' (not in the plan)' : ''}</option>)}
        </select></label>
        <label>Owner<input value={r.owner} maxLength={140} onChange={(e) => up({ owner: e.target.value })} placeholder="Role or name" /></label>
        <label>Status<select value={r.status} onChange={(e) => up({ status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Start<input type="date" value={r.start} onChange={(e) => e.target.value && up({ start: e.target.value })} /></label>
        <label>Due<input type="date" value={r.due} onChange={(e) => e.target.value && up({ due: e.target.value })} /></label>
      </div>
      <p className="tile-label tr-sub">Milestones</p>
      <div className="tr-ms-form">{r.milestones.map((m, j) => (
        <div key={j} className="tr-ms-row">
          <input value={m.label} maxLength={40} aria-label={`Milestone ${j + 1} name`} onChange={(e) => onChange(setMilestone(plan, r.id, j, { label: e.target.value }))} />
          <input type="date" value={m.due} aria-label={`Milestone ${j + 1} due`} onChange={(e) => e.target.value && onChange(setMilestone(plan, r.id, j, { due: e.target.value }))} />
          <label className="tr-check"><input type="checkbox" checked={m.done} onChange={(e) => onChange(setMilestone(plan, r.id, j, { done: e.target.checked }))} /> Done</label>
        </div>
      ))}</div>
      <label className="tr-note-field">Why realised is above plan{r.over ? <b className={r.overFlagged ? 'pos' : 'neg'}>{r.overFlagged ? ' · recorded' : ' · required: realised exceeds plan'}</b> : <span className="muted"> · only needed when it is</span>}
        <textarea rows={2} maxLength={280} value={r.note} onChange={(e) => up({ note: e.target.value })} placeholder="Timing, one-off, extra scope…" />
      </label>
      <div className="row-actions">
        <span className="muted sm">Planned impact for this lever: {r.linked ? (r.cashOnly ? 'cash only, no EBITDA' : `${money(r.runRate)} run rate`) : 'none until the lever is in the plan'}.</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="ghost sm" onClick={onRemove}>Remove initiative</button>
      </div>
    </div>
  );
}
