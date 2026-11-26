// 100-day value-creation tracker: turns the levers selected in the Value Plan into initiatives with
// owners, dates, milestones and status, and tracks realised EBITDA against the modelled plan.
// Planned impact is never typed in: it is the lever's run-rate EBITDA from the business case at the
// plan's lever targets, phased day by day along the lever's ramp. Pure functions, AED m.
import { SECTORS, getSector } from './sectors/index.js';
import { baseLevers, sanitize } from './model.js';
import { businessCase } from './businessCase.js';
import { reconciles } from './variance.js';
import { parseCsv } from './market.js';

export const STATUSES = ['Not started', 'On track', 'At risk', 'Late', 'Done'];
export const WINDOW_DAYS = 100;
// Reporting months inside the 100 days. The last one is the ten-day close-out.
export const PLAN_MONTHS = [
  { k: 1, label: 'Month 1', days: 'Days 1–30', from: 1, to: 30 },
  { k: 2, label: 'Month 2', days: 'Days 31–60', from: 31, to: 60 },
  { k: 3, label: 'Month 3', days: 'Days 61–90', from: 61, to: 90 },
  { k: 4, label: 'Close-out', days: 'Days 91–100', from: 91, to: 100 },
];
export const DEFAULT_THRESHOLD = 0.8;
const DAY = 864e5;
const DAYS_PER_MONTH = 365.25 / 12;
const MAX_INITIATIVES = 40;
const MAX_TEXT = 140;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const isIso = (s) => typeof s === 'string' && ISO.test(s) && Number.isFinite(Date.parse(s));
export const addDays = (iso, n) => new Date(Date.parse(iso) + n * DAY).toISOString().slice(0, 10);
// Plan day number: the plan start date is day 1.
export const dayNo = (planStart, iso) => Math.round((Date.parse(iso) - Date.parse(planStart)) / DAY) + 1;
const text = (s, max = MAX_TEXT) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

export function defaultMilestones(planStart, due) {
  const cap = (iso) => (due && iso > due ? due : iso);
  return [
    { label: 'Day 30', due: cap(addDays(planStart, 29)), done: false },
    { label: 'Day 60', due: cap(addDays(planStart, 59)), done: false },
    { label: 'Day 100', due: cap(addDays(planStart, 99)), done: false },
  ];
}

// Lever targets the plan was built on: only levers moved away from baseline, clamped to range.
export function planTargets(sector, levers) {
  const v = sanitize(sector, levers);
  const base = baseLevers(sector);
  return Object.fromEntries(sector.levers.filter((l) => Math.abs(v[l.id] - base[l.id]) > 1e-9).map((l) => [l.id, v[l.id]]));
}

export function newInitiative(sector, plan, leverId, n = plan.initiatives.length + 1) {
  const l = sector.levers.find((x) => x.id === leverId);
  const due = addDays(plan.start, WINDOW_DAYS - 1);
  return {
    id: `I${n}-${Math.random().toString(36).slice(2, 6)}`,
    leverId: l ? l.id : '',
    title: l ? `${l.label} programme` : 'New initiative',
    owner: l?.owner ?? '',
    start: plan.start,
    due,
    status: 'Not started',
    milestones: defaultMilestones(plan.start, due),
    actuals: {},
    note: '',
  };
}

// A new plan from the levers moved in the Value Plan: one initiative per moved lever.
export function newPlan(sector, levers, today) {
  const start = isIso(today) ? today : new Date().toISOString().slice(0, 10);
  const targets = planTargets(sector, levers);
  const plan = { version: 1, sectorId: sector.id, start, asOf: start, threshold: DEFAULT_THRESHOLD, example: false, targets, initiatives: [] };
  plan.initiatives = Object.keys(targets).map((id, i) => newInitiative(sector, plan, id, i + 1));
  return plan;
}

// Re-point the plan at new lever targets (the initiatives and actuals are kept).
export const rebasePlan = (sector, plan, levers) => ({ ...plan, targets: planTargets(sector, levers), example: false });
export const updateInitiative = (plan, id, patch) => ({ ...plan, initiatives: plan.initiatives.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
export const removeInitiative = (plan, id) => ({ ...plan, initiatives: plan.initiatives.filter((i) => i.id !== id) });
export function addInitiative(sector, plan) {
  const covered = new Set(plan.initiatives.map((i) => i.leverId));
  const next = Object.keys(plan.targets).find((id) => !covered.has(id)) ?? Object.keys(plan.targets)[0] ?? sector.levers[0].id;
  return { ...plan, initiatives: [...plan.initiatives, newInitiative(sector, plan, next)] };
}
export function setActual(plan, id, k, raw) {
  const v = raw === '' || raw == null ? null : Number(raw);
  return updateInitiative(plan, id, {
    actuals: Object.fromEntries(Object.entries({ ...plan.initiatives.find((i) => i.id === id)?.actuals, [`m${k}`]: v }).filter(([, x]) => x != null && Number.isFinite(x))),
  });
}
export function setMilestone(plan, id, j, patch) {
  const init = plan.initiatives.find((i) => i.id === id);
  return updateInitiative(plan, id, { milestones: init.milestones.map((m, i) => (i === j ? { ...m, ...patch } : m)) });
}

// Run-rate EBITDA per lever from the business case at the plan's targets.
export function leverRunRates(sector, targets) {
  const bc = businessCase(sector, { ...baseLevers(sector), ...targets });
  return { bc, byLever: Object.fromEntries(bc.initiatives.map((i) => [i.id, i])) };
}

// Planned EBITDA in each reporting month: the run rate ramps linearly from the initiative's start
// over the lever's ramp months, accrued day by day.
export function plannedByMonth(runRate, rampMonths, startDay = 1) {
  const rampDays = Math.max(1, rampMonths * DAYS_PER_MONTH);
  return PLAN_MONTHS.map((m) => {
    let s = 0;
    for (let d = m.from; d <= m.to; d++) if (d >= startDay) s += (runRate / 365) * Math.min(1, (d - startDay + 1) / rampDays);
    return s;
  });
}

const sum = (xs) => xs.reduce((a, x) => a + x, 0);

// The whole tracker for one plan: rows, totals, the planned-vs-realised bridge and the risks.
export function trackPlan(sector, plan) {
  const threshold = plan.threshold ?? DEFAULT_THRESHOLD;
  const { bc, byLever } = leverRunRates(sector, plan.targets);
  const asOfDay = dayNo(plan.start, plan.asOf);
  const closed = PLAN_MONTHS.filter((m) => m.to <= asOfDay).map((m) => m.k);
  const perLever = {};
  for (const i of plan.initiatives) if (byLever[i.leverId]) perLever[i.leverId] = (perLever[i.leverId] ?? 0) + 1;

  const rows = plan.initiatives.map((i) => {
    const lever = sector.levers.find((l) => l.id === i.leverId);
    const model = byLever[i.leverId];
    const linked = Boolean(lever && model);
    const runRate = linked ? model.runRate / perLever[i.leverId] : 0;
    const monthly = plannedByMonth(runRate, lever?.rampMonths ?? 12, Math.max(1, dayNo(plan.start, i.start)));
    const plannedToDate = sum(closed.map((k) => monthly[k - 1]));
    const realisedToDate = sum(closed.map((k) => Number(i.actuals?.[`m${k}`]) || 0));
    const ratio = plannedToDate > 1e-9 ? realisedToDate / plannedToDate : null;
    const over = realisedToDate > plannedToDate + 1e-6;
    const lateMilestones = i.milestones.filter((m) => !m.done && dayNo(plan.start, m.due) < asOfDay);
    return {
      ...i, lever, linked, runRate, monthly, plannedToDate, realisedToDate, ratio, over,
      overFlagged: over && text(i.note).length > 0,
      cashOnly: linked && Math.abs(runRate) < 0.05,
      pastDue: i.status !== 'Done' && dayNo(plan.start, i.due) < asOfDay,
      lateMilestones,
      futureActuals: Object.keys(i.actuals ?? {}).map((k) => Number(k.slice(1))).filter((k) => !closed.includes(k)),
    };
  });

  const plannedToDate = sum(rows.map((r) => r.plannedToDate));
  const realisedToDate = sum(rows.map((r) => r.realisedToDate));
  const bridge = {
    start: plannedToDate,
    end: realisedToDate,
    steps: rows.filter((r) => Math.abs(r.realisedToDate - r.plannedToDate) > 1e-9).map((r) => ({ id: r.id, label: r.title, delta: r.realisedToDate - r.plannedToDate })),
  };

  const risks = [];
  const risk = (severity, title, detail, owner) => risks.push({ severity, title, detail, owner });
  for (const r of rows) {
    if (r.pastDue) risk('high', `${r.title} is past its due date`, `Due ${r.due}, status ${r.status}.`, r.owner);
    for (const m of r.lateMilestones) {
      const late = asOfDay - dayNo(plan.start, m.due);
      risk(late > 14 ? 'high' : 'medium', `${m.label} milestone late: ${r.title}`, `Due ${m.due}, ${late} day${late === 1 ? '' : 's'} overdue.`, r.owner);
    }
    if (r.ratio != null && r.ratio < threshold) risk(r.ratio < threshold / 2 ? 'high' : 'medium', `${r.title} at ${Math.round(r.ratio * 100)}% of plan`, `Below the ${Math.round(threshold * 100)}% threshold: ${r.realisedToDate.toFixed(2)} realised vs ${r.plannedToDate.toFixed(2)} planned to date (AED m).`, r.owner);
    if (r.over && !r.overFlagged) risk('medium', `${r.title} is above plan with no explanation`, 'Realised exceeds plan. Record why (timing, one-off, scope) before it is banked.', r.owner);
    if (r.status === 'On track' && r.ratio != null && r.ratio < threshold) risk('low', `${r.title} is marked On track but is behind plan`, 'Status and numbers disagree; review the status.', r.owner);
  }
  const order = { high: 0, medium: 1, low: 2 };
  risks.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    plan, rows, threshold, asOfDay, closed, bc, byLever,
    plannedRunRate: sum(rows.map((r) => r.runRate)),
    plannedToDate, realisedToDate,
    ratio: plannedToDate > 1e-9 ? realisedToDate / plannedToDate : null,
    onTrack: rows.filter((r) => r.status === 'On track' || r.status === 'Done').length,
    bridge, risks,
  };
}

// Workbook checks for one plan, in the logic checker's format.
export function trackerChecks(sector, plan, levers) {
  const t = trackPlan(sector, plan);
  const out = [];
  const add = (title, ok, detail, level = 'fail') => out.push({ title, ok, detail, level });
  const unlinked = t.rows.filter((r) => !r.linked);
  add('Every initiative is linked to a lever in the plan', !unlinked.length, unlinked.length ? `Not linked: ${unlinked.map((r) => r.title).join(', ')}` : `${t.rows.length} initiatives linked.`);
  const badDates = t.rows.filter((r) => !isIso(r.start) || !isIso(r.due) || r.due < r.start || r.start < plan.start);
  add('Start and due dates are in order', isIso(plan.start) && isIso(plan.asOf) && !badDates.length, badDates.length ? `Check: ${badDates.map((r) => r.title).join(', ')}` : 'Every initiative starts on or after the plan start and before its due date.');
  const badMs = t.rows.filter((r) => r.milestones.some((m, j) => !isIso(m.due) || m.due < r.start || m.due > r.due || (j && m.due < r.milestones[j - 1].due)));
  add('Milestones are in order inside each initiative', !badMs.length, badMs.length ? `Out of order: ${badMs.map((r) => r.title).join(', ')}` : `${t.rows.reduce((a, r) => a + r.milestones.length, 0)} milestones checked.`);
  const covered = [...new Set(t.rows.filter((r) => r.linked).map((r) => r.leverId))];
  const model = covered.reduce((a, id) => a + t.byLever[id].runRate, 0);
  add('Planned impact equals the modelled lever value', Math.abs(model - t.plannedRunRate) < 1e-6, `Run rate ${t.plannedRunRate.toFixed(2)} from ${covered.length} lever${covered.length === 1 ? '' : 's'} of the business case.`);
  const silent = t.rows.filter((r) => r.over && !r.overFlagged);
  add('Realised never exceeds plan without a flag', !silent.length, silent.length ? `Above plan, unexplained: ${silent.map((r) => r.title).join(', ')}` : `${t.rows.filter((r) => r.over).length} above plan, each explained.`);
  add('Planned-vs-realised bridge reconciles', reconciles(t.bridge, 1e-9), `Planned ${t.plannedToDate.toFixed(2)} + ${t.bridge.steps.length} variances = realised ${t.realisedToDate.toFixed(2)}.`);
  const future = t.rows.filter((r) => r.futureActuals.length);
  add('Actuals are entered only for closed months', !future.length, future.length ? `Open months with actuals: ${future.map((r) => r.title).join(', ')} (left out of the bridge)` : `${t.closed.length} closed month${t.closed.length === 1 ? '' : 's'} at day ${t.asOfDay}.`, 'warn');
  const noOwner = t.rows.filter((r) => !text(r.owner));
  add('Every initiative has an owner', !noOwner.length, noOwner.length ? `No owner: ${noOwner.map((r) => r.title).join(', ')}` : 'One owner per initiative.', 'warn');
  const orphan = Object.keys(plan.targets).filter((id) => !t.rows.some((r) => r.leverId === id));
  add('Every planned lever has an initiative', !orphan.length, orphan.length ? `No initiative: ${orphan.map((id) => sector.levers.find((l) => l.id === id)?.label ?? id).join(', ')}` : `${Object.keys(plan.targets).length} levers covered.`, 'warn');
  const mismatch = t.rows.filter((r) => r.pastDue && r.status !== 'Late' || (r.status === 'Done' && r.milestones.some((m) => !m.done)));
  add('Status agrees with dates and milestones', !mismatch.length, mismatch.length ? `Review: ${mismatch.map((r) => r.title).join(', ')}` : 'Past-due work is marked Late; Done work has every milestone ticked.', 'warn');
  if (levers) {
    const now = planTargets(sector, levers);
    const same = Object.keys(now).length === Object.keys(plan.targets).length && Object.entries(now).every(([k, v]) => Math.abs((plan.targets[k] ?? NaN) - v) < 1e-9);
    add('Plan targets match the Value Plan levers', same, same ? 'The plan tracks the scenario on screen.' : 'The Value Plan levers differ from the targets the plan was built on. Rebase the plan, or load its targets back into the levers.', 'warn');
  }
  return out;
}

/* ---------- Storage, CSV export and import ---------- */

// Validate and clean a plan from storage or a file. Returns null when it cannot be used.
export function normalisePlan(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const sector = SECTORS.find((s) => s.id === raw.sectorId);
  if (!sector || !isIso(raw.start)) return null;
  const targets = {};
  for (const l of sector.levers) {
    const v = Number(raw.targets?.[l.id]);
    if (raw.targets && Object.hasOwn(raw.targets, l.id) && Number.isFinite(v)) targets[l.id] = Math.min(l.max, Math.max(l.min, v));
  }
  const threshold = Number(raw.threshold);
  const initiatives = (Array.isArray(raw.initiatives) ? raw.initiatives : []).slice(0, MAX_INITIATIVES).map((i, n) => ({
    id: text(i?.id, 40) || `I${n + 1}`,
    leverId: sector.levers.some((l) => l.id === i?.leverId) ? i.leverId : '',
    title: text(i?.title) || 'Untitled initiative',
    owner: text(i?.owner),
    start: isIso(i?.start) ? i.start : raw.start,
    due: isIso(i?.due) ? i.due : addDays(raw.start, WINDOW_DAYS - 1),
    status: STATUSES.includes(i?.status) ? i.status : 'Not started',
    milestones: (Array.isArray(i?.milestones) ? i.milestones : []).slice(0, 3).map((m) => ({ label: text(m?.label, 40) || 'Milestone', due: isIso(m?.due) ? m.due : raw.start, done: Boolean(m?.done) })),
    actuals: Object.fromEntries(PLAN_MONTHS.flatMap((m) => {
      const raw = i?.actuals?.[`m${m.k}`];
      const v = Number(raw);
      return raw === '' || raw == null || !Number.isFinite(v) ? [] : [[`m${m.k}`, v]];
    })),
    note: text(i?.note, 280),
  }));
  return {
    version: 1, sectorId: sector.id, start: raw.start, asOf: isIso(raw.asOf) ? raw.asOf : raw.start,
    threshold: threshold > 0 && threshold <= 1 ? threshold : DEFAULT_THRESHOLD,
    example: Boolean(raw.example), targets, initiatives,
  };
}

const CSV_COLUMNS = ['sector', 'plan_start', 'as_of', 'threshold', 'example', 'id', 'lever', 'lever_target', 'title', 'owner', 'start', 'due', 'status',
  'm1_label', 'm1_due', 'm1_done', 'm2_label', 'm2_due', 'm2_done', 'm3_label', 'm3_due', 'm3_done', 'actual_m1', 'actual_m2', 'actual_m3', 'actual_m4', 'note', 'planned_run_rate_aed_m'];

// Spreadsheet-safe cell: quote when needed, and neutralise text that a spreadsheet would run as a formula.
export function csvCell(v, isText = false) {
  let s = v == null ? '' : String(v);
  if (isText && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function planToCsv(sector, plan) {
  const t = trackPlan(sector, plan);
  const rows = t.rows.map((r) => {
    const ms = [0, 1, 2].flatMap((j) => { const m = r.milestones[j]; return m ? [csvCell(m.label, true), m.due, m.done ? 'yes' : 'no'] : ['', '', '']; });
    return [plan.sectorId, plan.start, plan.asOf, plan.threshold, plan.example ? 'yes' : 'no', csvCell(r.id, true), r.leverId, plan.targets[r.leverId] ?? '',
      csvCell(r.title, true), csvCell(r.owner, true), r.start, r.due, r.status, ...ms,
      ...PLAN_MONTHS.map((m) => r.actuals[`m${m.k}`] ?? ''), csvCell(r.note, true), r.runRate.toFixed(4)].join(',');
  });
  return [CSV_COLUMNS.join(','), ...rows].join('\n') + '\n';
}

export function planFromCsv(textIn) {
  const errors = [];
  if (typeof textIn !== 'string' || textIn.length > 200_000) return { plan: null, errors: ['The file is empty or larger than 200 KB.'] };
  const rows = parseCsv(textIn);
  if (!rows.length) return { plan: null, errors: ['No initiatives in the file.'] };
  const missing = ['sector', 'plan_start', 'lever', 'title', 'start', 'due', 'status'].filter((c) => !(c in rows[0]));
  if (missing.length) return { plan: null, errors: [`Missing columns: ${missing.join(', ')}.`] };
  if (rows.length > MAX_INITIATIVES) errors.push(`At most ${MAX_INITIATIVES} initiatives per plan.`);
  const un = (s) => (/^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s);
  const first = rows[0];
  let sector;
  try { sector = getSector(first.sector); } catch { return { plan: null, errors: [`Unknown business "${text(first.sector, 40)}".`] }; }
  if (rows.some((r) => r.sector !== first.sector || r.plan_start !== first.plan_start)) errors.push('Every row must share one business and plan start.');
  if (!isIso(first.plan_start)) errors.push('plan_start must be a date (YYYY-MM-DD).');
  const targets = {};
  rows.forEach((r, n) => {
    const line = n + 2;
    const l = sector.levers.find((x) => x.id === r.lever);
    if (!l) errors.push(`Row ${line}: unknown lever "${text(r.lever, 40)}".`);
    if (!STATUSES.includes(r.status)) errors.push(`Row ${line}: status must be one of ${STATUSES.join(', ')}.`);
    for (const c of ['start', 'due']) if (!isIso(r[c])) errors.push(`Row ${line}: ${c} must be a date (YYYY-MM-DD).`);
    for (const m of PLAN_MONTHS) if (r[`actual_m${m.k}`] && !Number.isFinite(Number(r[`actual_m${m.k}`]))) errors.push(`Row ${line}: actual_m${m.k} must be a number.`);
    if (l && r.lever_target !== '' && r.lever_target != null) {
      const v = Number(r.lever_target);
      if (!Number.isFinite(v)) errors.push(`Row ${line}: lever_target must be a number.`);
      else if (targets[l.id] != null && targets[l.id] !== v) errors.push(`Row ${line}: ${l.label} has two different targets.`);
      else targets[l.id] = v;
    }
  });
  if (errors.length) return { plan: null, errors: errors.slice(0, 12) };
  const plan = normalisePlan({
    sectorId: sector.id, start: first.plan_start, asOf: first.as_of, threshold: first.threshold, example: first.example === 'yes', targets,
    initiatives: rows.map((r) => ({
      id: un(r.id), leverId: r.lever, title: un(r.title), owner: un(r.owner ?? ''), start: r.start, due: r.due, status: r.status, note: un(r.note ?? ''),
      milestones: [1, 2, 3].filter((j) => r[`m${j}_label`] || r[`m${j}_due`]).map((j) => ({ label: un(r[`m${j}_label`]), due: r[`m${j}_due`], done: /^(yes|true|1)$/i.test(r[`m${j}_done`] ?? '') })),
      actuals: Object.fromEntries(PLAN_MONTHS.map((m) => [`m${m.k}`, r[`actual_m${m.k}`]])),
    })),
  });
  return { plan, errors: [] };
}

/* ---------- Example plan ---------- */

// A clearly labelled example built from the repo's showcase scenario for the illustrative Dubai
// integrated urban services model. Owners are roles from the model, not people; actuals are sample
// figures chosen to show each state (on plan, behind, late, above plan with an explanation).
export const EXAMPLE_TARGETS = { utilisation: 76, subShare: 22, sla: 1.8, dso: 78, leadDays: 32 };
export function examplePlan() {
  const start = '2026-09-01';
  const d = (n) => addDays(start, n - 1);
  return normalisePlan({
    sectorId: 'urbanServices', start, asOf: '2026-11-26', threshold: DEFAULT_THRESHOLD, example: true, targets: EXAMPLE_TARGETS,
    initiatives: [
      { id: 'EX1', leverId: 'utilisation', title: 'Scheduling and dispatch reset', owner: 'Operations', start: d(1), due: d(100), status: 'On track',
        milestones: [{ label: 'Day 30', due: d(30), done: true }, { label: 'Day 60', due: d(60), done: true }, { label: 'Day 100', due: d(100), done: false }],
        actuals: { m1: 0.28, m2: 0.84 } },
      { id: 'EX2', leverId: 'subShare', title: 'Bring core MEP work in-house', owner: 'Operations', start: d(15), due: d(100), status: 'At risk',
        milestones: [{ label: 'Day 30', due: d(30), done: true }, { label: 'Day 60', due: d(60), done: false }, { label: 'Day 100', due: d(100), done: false }],
        actuals: { m1: 0.01, m2: 0.03 } },
      { id: 'EX3', leverId: 'sla', title: 'Predictive maintenance on the CAFM platform', owner: 'Quality & HSE', start: d(1), due: d(81), status: 'Late',
        milestones: [{ label: 'Day 30', due: d(30), done: true }, { label: 'Day 60', due: d(60), done: false }, { label: 'Go-live', due: d(81), done: false }],
        actuals: { m1: 0.02, m2: 0.07 } },
      { id: 'EX4', leverId: 'dso', title: 'Collections sprint and e-invoicing', owner: 'Finance', start: d(1), due: d(60), status: 'Done',
        milestones: [{ label: 'Day 30', due: d(30), done: true }, { label: 'Day 60', due: d(60), done: true }],
        actuals: {} },
      { id: 'EX5', leverId: 'leadDays', title: 'Spares framework agreements', owner: 'Procurement', start: d(1), due: d(90), status: 'On track',
        milestones: [{ label: 'Day 30', due: d(30), done: true }, { label: 'Day 60', due: d(60), done: true }, { label: 'Day 90', due: d(90), done: false }],
        actuals: { m1: 0.03, m2: 0.07 }, note: 'Two framework agreements signed in week 3, ahead of the plan; the gain is timing, not extra scope.' },
    ],
  });
}
