export const OPS_SCHEMA_VERSION = 1;

const ACTION_STATUS = ['open', 'doing', 'review', 'done'];
const PRIORITIES = ['critical', 'high', 'normal', 'low'];
const WORKSPACES = ['regional', 'pulse', 'market', 'entry', 'value', 'portfolio'];
const DECISION_STATUS = ['draft', 'review', 'approved', 'implemented'];
const INITIATIVE_STATUS = ['on-track', 'watch', 'at-risk', 'complete'];

const text = (value, fallback = '', max = 160) => typeof value === 'string' ? value.trim().slice(0, max) : fallback;
const option = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
const number = (value, fallback = 0, min = 0, max = 1e9) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const date = (value, fallback) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : fallback;
const isoDay = (source = new Date(), offset = 0) => {
  const next = new Date(source);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + offset);
  return next.toISOString().slice(0, 10);
};

export function createOpsId(prefix = 'item') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`;
}

export function defaultOps(now = new Date()) {
  const today = isoDay(now);
  return {
    version: OPS_SCHEMA_VERSION,
    actions: [
      { id: 'action-market-evidence', title: 'Confirm the latest community transaction release', owner: 'Market intelligence', due: isoDay(now, -1), priority: 'critical', status: 'doing', impact: 18, workspace: 'market', note: 'Refresh the evidence pack before the weekly investment review.' },
      { id: 'action-vara-route', title: 'Review the preferred licensing route with counsel', owner: 'Market entry', due: isoDay(now, 1), priority: 'high', status: 'review', impact: 8, workspace: 'entry', note: 'Validate authority requirements before committing setup costs.' },
      { id: 'action-value-case', title: 'Lock the operating assumptions for the base case', owner: 'Value creation', due: isoDay(now, 4), priority: 'normal', status: 'open', impact: 32, workspace: 'value', note: 'Record the approved assumptions as a named decision case.' },
    ],
    initiatives: [
      { id: 'initiative-pricing', name: 'Pricing and mix programme', owner: 'Commercial', target: 24, actual: 15, status: 'on-track', review: isoDay(now, 5) },
      { id: 'initiative-procurement', name: 'Strategic procurement reset', owner: 'Operations', target: 16, actual: 7, status: 'watch', review: isoDay(now, 2) },
      { id: 'initiative-utilisation', name: 'Asset utilisation recovery', owner: 'Portfolio', target: 12, actual: 3, status: 'at-risk', review: today },
    ],
    decisions: [
      { id: 'decision-regional-base', title: 'Use the current GCC build-out horizon as the planning base', owner: 'Strategy', date: today, status: 'review', rationale: 'Keeps the operating case tied to visible projects and public evidence.', workspace: 'regional' },
    ],
    watchlist: [
      { id: 'watch-dubai-residential', label: 'Dubai residential communities', type: 'Market', workspace: 'market', signal: 'Review new transaction release', updated: today, state: 'watch' },
      { id: 'watch-vara', label: 'VARA licensing requirements', type: 'Regulation', workspace: 'entry', signal: 'Primary authority source', updated: today, state: 'stable' },
      { id: 'watch-gcc-industry', label: 'GCC industrial build-out', type: 'Regional', workspace: 'regional', signal: 'Construction horizon', updated: today, state: 'opportunity' },
    ],
    reviews: [
      { id: 'review-daily', label: 'Daily exception review', owner: 'Strategy office', due: today, cadence: 'Daily', status: 'due' },
      { id: 'review-weekly', label: 'Value delivery review', owner: 'Finance', due: isoDay(now, 3), cadence: 'Weekly', status: 'scheduled' },
      { id: 'review-monthly', label: 'Investment committee pack', owner: 'Portfolio', due: isoDay(now, 12), cadence: 'Monthly', status: 'scheduled' },
    ],
    acknowledged: [],
  };
}

export function normalizeOps(input, now = new Date()) {
  const fallback = defaultOps(now);
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fallback;
  const today = isoDay(now);
  const actions = Array.isArray(input.actions) ? input.actions.flatMap((item) => {
    if (!item || typeof item !== 'object' || !text(item.id) || !text(item.title)) return [];
    return [{
      id: text(item.id, createOpsId('action'), 90), title: text(item.title, '', 180), owner: text(item.owner, 'Unassigned', 80),
      due: date(item.due, today), priority: option(item.priority, PRIORITIES, 'normal'), status: option(item.status, ACTION_STATUS, 'open'),
      impact: number(item.impact, 0, 0, 1e6), workspace: option(item.workspace, WORKSPACES, 'value'), note: text(item.note, '', 400),
    }];
  }).slice(0, 200) : fallback.actions;
  const initiatives = Array.isArray(input.initiatives) ? input.initiatives.flatMap((item) => {
    if (!item || typeof item !== 'object' || !text(item.id) || !text(item.name)) return [];
    return [{ id: text(item.id, createOpsId('initiative'), 90), name: text(item.name, '', 180), owner: text(item.owner, 'Unassigned', 80), target: number(item.target, 0, 0, 1e6), actual: number(item.actual, 0, 0, 1e6), status: option(item.status, INITIATIVE_STATUS, 'watch'), review: date(item.review, today) }];
  }).slice(0, 100) : fallback.initiatives;
  const decisions = Array.isArray(input.decisions) ? input.decisions.flatMap((item) => {
    if (!item || typeof item !== 'object' || !text(item.id) || !text(item.title)) return [];
    return [{ id: text(item.id, createOpsId('decision'), 90), title: text(item.title, '', 180), owner: text(item.owner, 'Unassigned', 80), date: date(item.date, today), status: option(item.status, DECISION_STATUS, 'draft'), rationale: text(item.rationale, '', 500), workspace: option(item.workspace, WORKSPACES, 'value') }];
  }).slice(0, 100) : fallback.decisions;
  const watchlist = Array.isArray(input.watchlist) ? input.watchlist.flatMap((item) => {
    if (!item || typeof item !== 'object' || !text(item.id) || !text(item.label)) return [];
    return [{ id: text(item.id, createOpsId('watch'), 90), label: text(item.label, '', 160), type: text(item.type, 'Topic', 50), workspace: option(item.workspace, WORKSPACES, 'regional'), signal: text(item.signal, 'Review', 180), updated: date(item.updated, today), state: option(item.state, ['stable', 'watch', 'opportunity'], 'watch') }];
  }).slice(0, 100) : fallback.watchlist;
  const reviews = Array.isArray(input.reviews) ? input.reviews.flatMap((item) => {
    if (!item || typeof item !== 'object' || !text(item.id) || !text(item.label)) return [];
    return [{ id: text(item.id, createOpsId('review'), 90), label: text(item.label, '', 160), owner: text(item.owner, 'Unassigned', 80), due: date(item.due, today), cadence: text(item.cadence, 'Ad hoc', 40), status: option(item.status, ['due', 'scheduled', 'complete'], 'scheduled') }];
  }).slice(0, 100) : fallback.reviews;
  const acknowledged = Array.isArray(input.acknowledged) ? input.acknowledged.filter((id) => typeof id === 'string').map((id) => id.slice(0, 90)).slice(0, 200) : [];
  return { version: OPS_SCHEMA_VERSION, actions, initiatives, decisions, watchlist, reviews, acknowledged };
}

export function opsSummary(ops, now = new Date()) {
  const clean = normalizeOps(ops, now);
  const today = isoDay(now);
  const active = clean.actions.filter((item) => item.status !== 'done');
  const target = clean.initiatives.reduce((sum, item) => sum + item.target, 0);
  const actual = clean.initiatives.reduce((sum, item) => sum + item.actual, 0);
  return {
    open: active.length,
    overdue: active.filter((item) => item.due < today).length,
    dueToday: active.filter((item) => item.due === today).length,
    atRisk: clean.initiatives.filter((item) => item.status === 'at-risk').length,
    target,
    actual,
    realization: target ? actual / target : 0,
  };
}
