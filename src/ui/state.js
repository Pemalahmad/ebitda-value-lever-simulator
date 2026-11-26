// URL (shareable scenarios) and local progress persistence.
import { SECTORS, normalisePlan, examplePlan } from '../engine/index.js';

export function readHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const s = params.get('s');
  const sector = SECTORS.find((x) => x.id === s) ? s : SECTORS[0].id;
  const levers = {};
  for (const [k, v] of params.entries()) if (k !== 's' && k !== 'tab' && Number.isFinite(Number(v))) levers[k] = Number(v);
  return { sector, levers, tab: params.get('tab') || 'market' };
}

export function writeHash(sectorId, levers, base, tab) {
  if (tab === 'market') {
    if (window.location.hash) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    return;
  }
  const params = new URLSearchParams();
  params.set('s', sectorId);
  if (tab) params.set('tab', tab);
  for (const [k, v] of Object.entries(levers)) if (base[k] !== v) params.set(k, String(+v.toFixed(4)));
  const next = `#${params.toString()}`;
  if (window.location.hash !== next) window.history.replaceState(null, '', next);
}

const KEY = 'evls.progress.v1';
export function loadProgress() {
  try {
    const p = JSON.parse(window.localStorage.getItem(KEY) || '{}');
    return { achievements: p.achievements || [], missions: p.missions || {} };
  } catch {
    return { achievements: [], missions: {} };
  }
}
export function saveProgress(p) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode: progress lives for this session only */
  }
}

// 100-day tracker plans, one per business. First visit seeds the labelled example plan.
const TRACKER_KEY = 'evls.tracker.v1';
export function loadTrackers() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(TRACKER_KEY) || 'null');
    if (raw && typeof raw === 'object' && raw.plans && typeof raw.plans === 'object') {
      const out = {};
      for (const p of Object.values(raw.plans)) { const n = normalisePlan(p); if (n) out[n.sectorId] = n; }
      return out;
    }
  } catch {
    /* unreadable or blocked storage: fall back to the example */
  }
  return { urbanServices: examplePlan() };
}
export function saveTrackers(plans) {
  try {
    window.localStorage.setItem(TRACKER_KEY, JSON.stringify({ version: 1, plans }));
  } catch {
    /* private mode: the plan lives for this session only */
  }
}
