// Developer tooling: golden cases for the ship-check functions, the skill linter and the papercut log.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseTestSummary, readmeTestCounts, versionsMatch, changelogHasEntry, readmeImagePaths, attributionLines, formatResults } from '../scripts/ship-check.mjs';
import { lintSkill, lintSkillText, lintAll, RULES, estimateTokens } from '../scripts/lint-skills.mjs';
import { makeEntry, parseLog, summarise } from '../scripts/log-papercut.mjs';

const FIX = fileURLToPath(new URL('./fixtures/skills/', import.meta.url));
const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('ship-check: test summary from TAP and spec reporter output', () => {
  assert.deepEqual(parseTestSummary('ok 1 - a\n1..87\n# tests 87\n# suites 0\n# pass 86\n# fail 1\n'), { tests: 87, pass: 86, fail: 1 });
  assert.deepEqual(parseTestSummary('✔ a (1ms)\nℹ tests 12\nℹ pass 12\nℹ fail 0\n'), { tests: 12, pass: 12, fail: 0 });
  assert.equal(parseTestSummary('Error: Cannot find module'), null);
});

test('ship-check: every README test count is found', () => {
  const readme = '![Tests](https://img.shields.io/badge/tests-87%20passing-1b9a59)\n| `npm test` | 86 Node tests (engine) |\ntests/                   87 tests, including security\n';
  assert.deepEqual(readmeTestCounts(readme), [{ where: 'badge', n: 87 }, { where: 'command table', n: 86 }, { where: 'folder tree', n: 87 }]);
  assert.deepEqual(readmeTestCounts('no counts here'), []);
});

test('ship-check: the real README agrees with itself', () => {
  const counts = readmeTestCounts(readFileSync(new URL('../README.md', import.meta.url), 'utf8'));
  assert.equal(counts.length, 3);
  assert.equal(new Set(counts.map((c) => c.n)).size, 1, JSON.stringify(counts));
});

test('ship-check: package and lock versions must match', () => {
  assert.deepEqual(versionsMatch({ version: '1.2.3' }, { version: '1.2.3', packages: { '': { version: '1.2.3' } } }), { ok: true, detail: 'all at 1.2.3' });
  const bad = versionsMatch({ version: '1.2.4' }, { version: '1.2.3', packages: { '': { version: '1.2.4' } } });
  assert.equal(bad.ok, false);
  assert.equal(bad.detail, 'package-lock.json=1.2.3 (want 1.2.4)');
  assert.equal(versionsMatch({ version: '1.0.0' }, { version: '1.0.0' }).ok, false, 'lock root package entry is required');
});

test('ship-check: changelog entry for the version', () => {
  const log = '# Changelog\n\n## 1.10.1 (2026-11-26): Tooling\n\n## 1.10.0 (2026-11-26): Tracker\n';
  assert.equal(changelogHasEntry(log, '1.10.1'), true);
  assert.equal(changelogHasEntry(log, '1.10.0'), true);
  assert.equal(changelogHasEntry(log, '1.10.2'), false);
  assert.equal(changelogHasEntry('## 1.1.0 (2026-01-01): x', '1.1'), false, 'no partial match');
  assert.equal(changelogHasEntry('## 1x10x1 (2026-01-01): x', '1.10.1'), false, 'dots are literal');
});

test('ship-check: README image paths, local only', () => {
  const readme = '![Demo](docs/demo.gif)\n![a](./docs/a.png#x)\n![CI](https://example.com/b.svg)\n<img src="docs/c.png" width="300">\n![Demo](docs/demo.gif)';
  assert.deepEqual(readmeImagePaths(readme), ['docs/demo.gif', 'docs/a.png', 'docs/c.png']);
});

test('ship-check: commit attribution lines are caught, ordinary messages pass', () => {
  const msgs = [
    'Add tracker (v1.10.0)\n\nCo-Authored-By: Someone <bot@example.com>',
    'Fix bridge\n\n\u{1F916} Generated with some tool',
    'Refresh screenshots for the new palette',
    'Note the AI-assisted review',
  ];
  assert.deepEqual(attributionLines(msgs), ['Co-Authored-By: Someone <bot@example.com>', '\u{1F916} Generated with some tool', 'Note the AI-assisted review']);
  assert.deepEqual(attributionLines(['Plain subject\n\nBody that mentions co-authors in passing']), []);
});

test('ship-check: result block and its last line', () => {
  const out = formatResults([{ name: 'tests', ok: true, detail: '9/9 pass' }, { name: 'audit', ok: true, detail: 'skipped', skipped: true }, { name: 'versions', ok: false, detail: 'x' }], { version: '1.0.0', fast: true });
  assert.equal(out, 'ship-check v1.0.0 (fast)\nPASS  tests     9/9 pass\nSKIP  audit     skipped\nFAIL  versions  x\nship-check: FAIL 1/2 (failed: versions)');
});

test('lint-skills: the passing fixture passes every rule', () => {
  assert.deepEqual(lintSkill(`${FIX}pass/good-skill`), []);
});

test('lint-skills: there is one failing fixture for every rule', () => {
  assert.deepEqual(readdirSync(`${FIX}fail`).sort(), [...RULES].sort());
});

for (const rule of RULES) {
  test(`lint-skills: failing fixture breaks only "${rule}"`, () => {
    const errors = lintSkill(`${FIX}fail/${rule}`);
    assert.ok(errors.length > 0, `${rule} fixture should fail`);
    assert.deepEqual([...new Set(errors.map((e) => e.rule))], [rule], JSON.stringify(errors));
  });
}

test('lint-skills: long descriptions and vague fixes fail; a missing SKILL.md fails', () => {
  const good = readFileSync(`${FIX}pass/good-skill/SKILL.md`, 'utf8');
  const spec = readFileSync(`${FIX}pass/good-skill/spec.md`, 'utf8');
  const long = good.replace(/^description: .*$/m, `description: Use when ${'testing the linter with a very long description '.repeat(12)}`);
  assert.ok(estimateTokens('Use when ' + 'word '.repeat(90)) > 100);
  assert.deepEqual(lintSkillText({ name: 'good-skill', skill: long, spec }).map((e) => e.rule), ['description']);
  const retry = good.replace(/\| `greeting.txt` is empty \| .* \|/, '| `greeting.txt` is empty | Retry |');
  assert.deepEqual(lintSkillText({ name: 'good-skill', skill: retry, spec }).map((e) => e.rule), ['error-recovery']);
  assert.deepEqual(lintSkill(`${FIX}fail`).map((e) => e.rule), ['frontmatter-name']);
});

test('lint-skills: the repo skills pass', () => {
  const results = lintAll(`${ROOT}.agents/skills`);
  assert.ok(results.length >= 2);
  for (const r of results) assert.deepEqual(r.errors, [], r.name);
});

test('papercuts: an entry needs an area and all four fields', () => {
  const e = makeEntry({ area: 'Release', tried: 'npm run ship-check', expected: 'PASS', happened: 'audit  timed out', fix: 'cache the audit' }, new Date('2026-11-26T10:00:00Z'));
  assert.deepEqual(e, { ts: '2026-11-26T10:00:00.000Z', area: 'release', tried: 'npm run ship-check', expected: 'PASS', happened: 'audit timed out', fix: 'cache the audit' });
  assert.throws(() => makeEntry({ area: 'two words', tried: 'x' }), /--area must be.*--expected is required; --happened is required; --fix is required/);
});

test('papercuts: the summary groups by area, busiest first, newest first', () => {
  const log = [
    { ts: '2026-11-20T00:00:00Z', area: 'capture', happened: 'no playwright', fix: 'document it' },
    { ts: '2026-11-21T00:00:00Z', area: 'release', happened: 'lock drifted', fix: 'use npm version' },
    { ts: '2026-11-22T00:00:00Z', area: 'release', happened: 'badge stale', fix: 'ship-check' },
  ].map((e) => JSON.stringify(e)).join('\n') + '\nnot json\n';
  const entries = parseLog(log);
  assert.equal(entries.length, 3);
  assert.equal(summarise(entries), [
    'papercuts: 3 in 2 area(s)',
    'release (2)',
    '  2026-11-22  badge stale  ->  fix: ship-check',
    '  2026-11-21  lock drifted  ->  fix: use npm version',
    'capture (1)',
    '  2026-11-20  no playwright  ->  fix: document it',
  ].join('\n'));
  assert.equal(summarise([]), 'papercuts: none logged');
});
