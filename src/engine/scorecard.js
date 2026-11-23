// Balanced Scorecard: four perspectives, RAG status against target.
import { run } from './model.js';

export const PERSPECTIVES = ['Financial', 'Customer', 'Internal Process', 'Learning & Growth'];

export function rag(value, target, better, tolerance = 0.05) {
  const gap = better === 'higher' ? (value - target) / Math.abs(target) : (target - value) / Math.abs(target);
  if (gap >= 0) return 'green';
  if (gap >= -tolerance) return 'amber';
  return 'red';
}

export function scorecard(sector, levers) {
  const r = run(sector, levers);
  const items = sector.scorecard(r.levers, r).map((k) => ({ ...k, status: rag(k.value, k.target, k.better) }));
  const rank = { red: 0, amber: 1, green: 2 };
  const perspectives = PERSPECTIVES.map((p) => {
    const ks = items.filter((k) => k.perspective === p);
    const worst = ks.reduce((w, k) => (rank[k.status] < rank[w] ? k.status : w), 'green');
    return { name: p, status: worst, items: ks };
  });
  const greens = items.filter((k) => k.status === 'green').length;
  return { items, perspectives, health: greens / items.length };
}
