// Game layer: board confidence, value score, rank, missions and achievements.
// Deliberately rewards *credible* value, not just big numbers: risks, budget
// overruns and a red scorecard all cost board confidence, which scales the score.
import { compare, baseLevers, sanitize, movedLevers } from './model.js';
import { scorecard } from './scorecard.js';
import { businessCase } from './businessCase.js';

const SEVERITY_PENALTY = { high: 18, medium: 8, low: 3 };

export const RANKS = [
  { name: 'Analyst', min: 0 },
  { name: 'Associate', min: 0.02 },
  { name: 'Manager', min: 0.05, confidence: 50 },
  { name: 'Director', min: 0.12, confidence: 70 },
  { name: 'Chief Value Officer', min: 0.2, confidence: 80 },
];

export const GLOBAL_MISSIONS = [
  { id: 'selfFunding', title: 'Self-Funding Programme', xp: 150, desc: 'At least +5% EBITDA with payback of 18 months or less.',
    test: ({ cmp, bc }) => ({ progress: Math.max(0, Math.min(1, cmp.dEbitdaPct / 0.05)), done: cmp.dEbitdaPct >= 0.05 && bc.paybackMonths <= 18 }) },
  { id: 'cleanBoard', title: 'Clean Board', xp: 200, desc: 'At least +8% EBITDA with no risk flags and within budget.',
    test: ({ cmp }) => ({ progress: Math.max(0, Math.min(1, cmp.dEbitdaPct / 0.08)), done: cmp.dEbitdaPct >= 0.08 && cmp.scn.flags.length === 0 && !cmp.overBudget }) },
  { id: 'balanced', title: 'Balanced Scorecard', xp: 180, desc: 'Every scorecard perspective at amber or better, with at least four KPIs green.',
    test: ({ sc }) => { const ok = sc.perspectives.filter((p) => p.status !== 'red').length; const g = sc.items.filter((k) => k.status === 'green').length; return { progress: (ok / 4 + Math.min(1, g / 4)) / 2, done: ok === 4 && g >= 4 }; } },
];

export function boardConfidence(sector, cmp, sc, bc) {
  let c = 70;
  for (const f of cmp.scn.flags) c -= SEVERITY_PENALTY[f.severity] ?? 0;
  if (cmp.overBudget) c -= Math.min(25, 10 + ((cmp.invest - sector.budget) / sector.budget) * 30);
  if (cmp.dEbitda > 0 && bc.npv > 0) c += Math.min(15, (bc.npv / cmp.base.ev) * 300);
  if (bc.paybackMonths <= 24) c += 5;
  c += (sc.health - 0.5) * 20;
  return Math.round(Math.max(0, Math.min(100, c)));
}

export function rankFor(valueCreatedPct, confidence) {
  let r = RANKS[0];
  for (const x of RANKS) if (valueCreatedPct >= x.min && confidence >= (x.confidence ?? 0)) r = x;
  const idx = RANKS.indexOf(r);
  const next = RANKS[idx + 1] ?? null;
  return { ...r, index: idx, next, toNext: next ? Math.max(0, Math.min(1, valueCreatedPct / next.min)) : 1 };
}

export function evaluate(sector, levers) {
  const v = sanitize(sector, levers);
  const cmp = compare(sector, v);
  const sc = scorecard(sector, v);
  const bc = businessCase(sector, v);
  const confidence = boardConfidence(sector, cmp, sc, bc);
  const valueCreatedPct = cmp.valueCreated / cmp.base.ev;
  const ctx = { sector, levers: v, baseLevers: baseLevers(sector), base: cmp.base, scn: cmp.scn, cmp, sc, bc };
  const missions = [...sector.missions, ...GLOBAL_MISSIONS].map((m) => {
    const t = m.test(ctx);
    return { id: `${sector.id}.${m.id}`, title: m.title, desc: m.desc, xp: m.xp, progress: Math.max(0, Math.min(1, t.progress || 0)), done: !!t.done, global: GLOBAL_MISSIONS.includes(m) };
  });
  return {
    cmp,
    sc,
    bc,
    confidence,
    score: Math.max(0, Math.round(cmp.valueCreated * (confidence / 100))),
    rank: rankFor(valueCreatedPct, confidence),
    valueCreatedPct,
    missions,
    movedCount: movedLevers(sector, v).length,
  };
}

// Achievements are earned once and kept across sectors.
export const ACHIEVEMENTS = [
  { id: 'firstLever', title: 'First Lever', desc: 'Move any operational lever.', xp: 25, test: (e) => e.movedCount > 0 },
  { id: 'hundred', title: 'Value Hunter', desc: 'Create AED 100m of value in one business.', xp: 50, test: (e) => e.cmp.valueCreated >= 100 },
  { id: 'billion', title: 'Billion-Dirham Bridge', desc: 'Create AED 1bn of value in one business.', xp: 150, test: (e) => e.cmp.valueCreated >= 1000 },
  { id: 'cash', title: 'Cash Whisperer', desc: 'Release AED 100m of working capital.', xp: 75, test: (e) => e.cmp.cashRelease >= 100 },
  { id: 'trust', title: 'Trusted Advisor', desc: 'Reach board confidence of 90 with value created.', xp: 100, test: (e) => e.confidence >= 90 && e.cmp.valueCreated > 0 },
  { id: 'cvo', title: 'Chief Value Officer', desc: 'Reach the top rank in any business.', xp: 200, test: (e) => e.rank.name === 'Chief Value Officer' },
  { id: 'redTeam', title: 'Red Team', desc: 'Trigger three risk flags at once, and learn from it.', xp: 25, test: (e) => e.cmp.scn.flags.length >= 3 },
];

export function newAchievements(evaluation, unlocked = []) {
  return ACHIEVEMENTS.filter((a) => !unlocked.includes(a.id) && a.test(evaluation));
}

export function totalXp(completedMissionXp, unlockedAchievementIds) {
  return completedMissionXp + ACHIEVEMENTS.filter((a) => unlockedAchievementIds.includes(a.id)).reduce((s, a) => s + a.xp, 0);
}
