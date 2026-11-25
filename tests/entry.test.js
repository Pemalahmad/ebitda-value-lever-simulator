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

test('legal rules identify primary authority sources and commercial estimates stay labelled', async () => {
  assert.equal(SOURCES.varaSchedule2.type, 'primary');
  assert.equal(new URL(SOURCES.varaSchedule2.url).hostname, 'rulebooks.vara.ae');
  assert.equal(SOURCES.varaCapital.type, 'primary');
  for (const source of Object.values(SOURCES)) {
    assert.ok(['primary', 'secondary', 'estimate'].includes(source.type), source.title);
    assert.match(source.verified, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(source.jurisdiction);
  }
  const { GUIDE_SOURCES } = await import('../src/engine/entryGuide.js');
  assert.ok(GUIDE_SOURCES.some((source) => source.type === 'estimate'));
  assert.ok(GUIDE_SOURCES.every((source) => source.verified && source.jurisdiction));
});

test('set-up guide: every step names a platform, cost and time for each route it applies to', async () => {
  const { STEPS, ROUTES, LOCATIONS, BUSINESS_TYPES, schedule, MOA, TAX } = await import('../src/engine/entryGuide.js');
  for (const s of STEPS) for (const [rid, r] of Object.entries(s.by)) {
    assert.ok(ROUTES.some((x) => x.id === rid), `${s.id}: unknown route ${rid}`);
    assert.ok(r.platform?.url?.startsWith('https://') && r.cost && r.weeks[0] <= r.weeks[1], `${s.id}/${rid}`);
    for (const a of s.after ?? []) assert.ok(STEPS.some((x) => x.id === a), `${s.id} after ${a}`);
  }
  for (const b of BUSINESS_TYPES) for (const [id] of b.rank) assert.ok(LOCATIONS.some((l) => l.id === id), `${b.id} → ${id}`);
  for (const l of LOCATIONS) assert.ok(ROUTES.some((r) => r.id === l.route) && l.cost[0] < l.cost[1], l.id);
  assert.ok(MOA.clauses.length >= 8 && TAX.vat.form.length >= 6);
});

test('timeline: steps never start before their predecessors, regulation lengthens the plan', async () => {
  const { STEPS, schedule } = await import('../src/engine/entryGuide.js');
  for (const route of ['dxbml', 'dxbfz', 'auhml', 'adgm', 'difc']) {
    const plain = schedule(route), reg = schedule(route, { regulated: true });
    const end = Object.fromEntries(plain.rows.map((r) => [r.id, r.end]));
    for (const r of plain.rows) for (const a of STEPS.find((s) => s.id === r.id).after ?? []) if (end[a] != null) assert.ok(r.start >= end[a] - 1e-9, `${route}: ${r.id} before ${a}`);
    assert.ok(reg.total > plain.total, route);
    assert.ok(plain.rows.some((r) => r.critical));
  }
  assert.ok(schedule('dxbfz', { use: 0 }).total < schedule('dxbfz', { use: 1 }).total);
});
