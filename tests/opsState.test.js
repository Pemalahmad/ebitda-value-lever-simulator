import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultOps, normalizeOps, opsSummary } from '../src/ui/opsState.js';

const NOW = new Date('2026-11-25T08:00:00Z');

test('daily operations start with actionable work and value tracking', () => {
  const ops = defaultOps(NOW);
  const summary = opsSummary(ops, NOW);
  assert.ok(ops.actions.length >= 3);
  assert.ok(ops.initiatives.length >= 3);
  assert.equal(summary.overdue, 1);
  assert.ok(summary.target > summary.actual);
});

test('daily operations imports keep only safe bounded fields', () => {
  const ops = normalizeOps({
    actions: [{ id: 'safe', title: 'Review evidence', owner: 'Strategy', due: 'bad-date', priority: 'urgent', status: 'doing', impact: 1e12, workspace: 'unknown', __proto__: { polluted: true } }],
    initiatives: [], decisions: [], watchlist: [], reviews: [], acknowledged: ['x'],
  }, NOW);
  assert.equal({}.polluted, undefined);
  assert.equal(ops.actions[0].priority, 'normal');
  assert.equal(ops.actions[0].workspace, 'value');
  assert.equal(ops.actions[0].due, '2026-11-25');
  assert.equal(ops.actions[0].impact, 1e6);
});

test('daily operations imports enforce collection limits', () => {
  const actions = Array.from({ length: 260 }, (_, index) => ({ id: `a-${index}`, title: `Action ${index}`, due: '2026-11-25' }));
  assert.equal(normalizeOps({ actions }, NOW).actions.length, 200);
});
