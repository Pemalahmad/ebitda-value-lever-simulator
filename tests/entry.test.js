import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VA_ACTIVITIES, JURISDICTIONS, SOURCES, COMPANY_STEPS, PRODUCT_STEPS, COMPLIANCE, capitalFor, varaCosts, assess } from '../src/engine/entry.js';

test('capital is the higher of the floor or the overhead share, lower with a licensed custodian', () => {
  assert.equal(capitalFor('advisory', 5e6), 100000);
  assert.equal(capitalFor('exchange', 0), 1500000);
  assert.equal(capitalFor('exchange', 10e6), 2500000);
  assert.equal(capitalFor('exchange', 0, true), 800000);
  assert.equal(capitalFor('broker', 4e6, true), 600000);
  assert.equal(capitalFor('issuance', 1e6), null);
});

test('VARA cost stack sums fees per activity and takes the highest capital floor', () => {
  const c = varaCosts(['exchange', 'broker'], { overheads: 2e6 });
  assert.equal(c.application, 200000);
  assert.equal(c.atiPayment, 100000);
  assert.equal(c.supervision, 400000);
  assert.equal(c.capitalFloor, 1500000);
  assert.equal(c.separateCustodyEntity, false);
  assert.equal(varaCosts(['exchange', 'custody']).separateCustodyEntity, true);
  assert.equal(varaCosts([]).capitalFloor, null);
});

test('assessment routes each model to the right regimes', () => {
  const general = assess({ model: 'general' });
  assert.equal(general.needs.length, 1);
  const vasp = assess({ model: 'vasp', jurisdiction: 'adgm', activities: ['custody'] });
  assert.ok(vasp.needs.some((n) => n.startsWith('FSRA licence')));
  assert.ok(vasp.needs.some((n) => n.includes('Central Bank')));
  const wallet = assess({ model: 'selfcustody', marketsInApp: true });
  assert.ok(wallet.needs.some((n) => n.startsWith('Product compliance')));
  assert.ok(wallet.flags.some((f) => f.includes('AED 10m')));
  assert.equal(assess({ model: 'selfcustody' }).flags.length, 0);
});

test('every activity has fees, every cited source exists, every step has a checklist', () => {
  for (const a of VA_ACTIVITIES) assert.ok(a.application > 0 && a.supervision > 0, a.id);
  const refs = [...JURISDICTIONS, ...COMPANY_STEPS, ...PRODUCT_STEPS, ...COMPLIANCE].map((x) => x.src).filter(Boolean);
  for (const r of refs) assert.ok(SOURCES[r]?.url?.startsWith('https://'), r);
  for (const s of [...COMPANY_STEPS, ...PRODUCT_STEPS]) assert.ok(s.checks.length > 0, s.id);
});
