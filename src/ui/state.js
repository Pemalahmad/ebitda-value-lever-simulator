// URL (shareable scenarios) and local progress persistence.
import { PLAYS, SECTORS } from '../engine/index.js';

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

const WORKSPACE_KEY = 'evls.workspace.v2';

function cleanWorkspace(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const bySector = {};
  for (const sector of SECTORS) {
    const source = input.bySector?.[sector.id];
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
    bySector[sector.id] = Object.fromEntries(sector.levers.flatMap((lever) => {
      const value = Number(source[lever.id]);
      return Number.isFinite(value) ? [[lever.id, Math.min(lever.max, Math.max(lever.min, value))]] : [];
    }));
  }

  const plays = {};
  for (const play of PLAYS) {
    const source = input.plays?.[play.id];
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
    const params = Object.fromEntries(play.params.flatMap((parameter) => {
      const value = Number(source.params?.[parameter.id]);
      return Number.isFinite(value) ? [[parameter.id, Math.min(parameter.max, Math.max(parameter.min, value))]] : [];
    }));
    plays[play.id] = { on: source.on === true, params };
  }

  const ids = new Set(SECTORS.map((sector) => sector.id));
  const intercompany = Array.isArray(input.intercompany) ? input.intercompany.flatMap((flow) => {
    if (!flow || typeof flow !== 'object' || !ids.has(flow.from) || !ids.has(flow.to) || flow.from === flow.to) return [];
    const amount = Number(flow.amount);
    const margin = Number(flow.margin);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(margin)) return [];
    return [{ from: flow.from, to: flow.to, amount: Math.min(amount, 1e7), treatment: flow.treatment === 'capex' ? 'capex' : 'opex', margin: Math.min(100, Math.max(0, margin)) }];
  }).slice(0, 100) : [];

  return { version: 2, bySector, plays, intercompany };
}

export function loadWorkspace() {
  try {
    return cleanWorkspace(JSON.parse(window.localStorage.getItem(WORKSPACE_KEY) || 'null'));
  } catch {
    return null;
  }
}

export function saveWorkspace(workspace) {
  try {
    const clean = cleanWorkspace(workspace);
    if (clean) window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ ...clean, savedAt: new Date().toISOString() }));
    return Boolean(clean);
  } catch {
    return false;
  }
}

export function exportWorkspace(workspace) {
  const clean = cleanWorkspace(workspace);
  if (!clean) throw new Error('Workspace data is not valid.');
  return JSON.stringify({ product: 'UAE Decision Atlas', exportedAt: new Date().toISOString(), ...clean }, null, 2);
}

export function importWorkspace(text) {
  if (typeof text !== 'string' || text.length > 2_000_000) throw new Error('The workspace file is too large.');
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('Choose a valid workspace JSON file.'); }
  const clean = cleanWorkspace(parsed);
  if (!clean) throw new Error('This file is not a supported workspace export.');
  return clean;
}
