import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importWorkspace } from '../src/ui/state.js';

test('workspace imports accept supported data and clamp untrusted numeric input', () => {
  const workspace = importWorkspace(JSON.stringify({
    version: 2,
    bySector: { realEstate: { occupancy: 1e12, __proto__: { polluted: true } } },
    plays: {},
    intercompany: [{ from: 'realEstate', to: 'hospitality', amount: 25, margin: 12, treatment: 'opex' }],
  }));
  assert.equal({}.polluted, undefined);
  assert.equal(workspace.intercompany.length, 1);
  assert.ok(Object.values(workspace.bySector.realEstate).every(Number.isFinite));
});

test('workspace imports reject invalid and oversized files', () => {
  assert.throws(() => importWorkspace('{nope'), /valid workspace JSON/);
  assert.throws(() => importWorkspace('x'.repeat(2_000_001)), /too large/);
  assert.throws(() => importWorkspace('[]'), /not a supported/);
});
