#!/usr/bin/env node
// Ship check: one command and a short pass/fail list before any push.
//   npm run ship-check              tests, audit, build and the repo consistency checks
//   npm run ship-check -- --fast    the same without the dependency audit and the build
// Exits 1 when any check fails. The pure functions are exported for tests/tooling.test.js.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { lintAll } from './lint-skills.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// Summary of a node:test run, from the TAP ("# tests 87") or spec ("ℹ tests 87") reporter.
export function parseTestSummary(output) {
  const n = (key) => {
    const m = output.match(new RegExp(`^(?:#|ℹ)\\s*${key}\\s+(\\d+)\\s*$`, 'm'));
    return m ? Number(m[1]) : null;
  };
  const tests = n('tests');
  return tests === null ? null : { tests, pass: n('pass') ?? 0, fail: n('fail') ?? 0 };
}

// Every test count the README states: the badge, the command table and the folder tree.
export function readmeTestCounts(readme) {
  const out = [];
  for (const [where, re] of [
    ['badge', /badge\/tests-(\d+)%20passing/g],
    ['command table', /`npm test` \| (\d+) Node tests/g],
    ['folder tree', /^tests\/\s+(\d+) tests/gm],
  ]) for (const m of readme.matchAll(re)) out.push({ where, n: Number(m[1]) });
  return out;
}

export function versionsMatch(pkg, lock) {
  const found = { 'package.json': pkg.version, 'package-lock.json': lock.version, 'package-lock.json packages[""]': lock.packages?.['']?.version };
  const bad = Object.entries(found).filter(([, v]) => v !== pkg.version || !v);
  return { ok: bad.length === 0 && Boolean(pkg.version), detail: bad.length ? bad.map(([k, v]) => `${k}=${v ?? 'missing'}`).join(', ') + ` (want ${pkg.version})` : `all at ${pkg.version}` };
}

// A release heading looks like "## 1.10.0 (2026-11-26): Title".
export function changelogHasEntry(changelog, version) {
  const esc = version.replace(/\./g, '\\.');
  return new RegExp(`^## ${esc} \\(\\d{4}-\\d{2}-\\d{2}\\)`, 'm').test(changelog);
}

// Local images and GIFs the README shows, from Markdown and <img> tags; remote URLs are skipped.
export function readmeImagePaths(readme) {
  const paths = new Set();
  for (const m of readme.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) paths.add(m[1]);
  for (const m of readme.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) paths.add(m[1]);
  return [...paths].filter((p) => !/^(https?:)?\/\//i.test(p) && !p.startsWith('data:')).map((p) => p.replace(/^\.\//, '').split('#')[0]);
}

// Lines in commit messages that credit a tool or an assistant instead of the author.
const ATTRIBUTION = [
  /^\s*co-authored-by:/i,
  /\bgenerated (with|by)\b/i,
  /\bAI[- ](generated|assisted|written)\b/i,
  /\u{1F916}/u,
];
export function attributionLines(messages) {
  return messages.flatMap((msg) => msg.split('\n').filter((line) => ATTRIBUTION.some((re) => re.test(line))).map((l) => l.trim()));
}

export function formatResults(results, { version, fast }) {
  const width = Math.max(...results.map((r) => r.name.length));
  const lines = [`ship-check v${version}${fast ? ' (fast)' : ''}`];
  for (const r of results) lines.push(`${r.skipped ? 'SKIP' : r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(width)}  ${r.detail}`);
  const ran = results.filter((r) => !r.skipped);
  const failed = ran.filter((r) => !r.ok);
  lines.push(`ship-check: ${failed.length ? 'FAIL' : 'PASS'} ${ran.length - failed.length}/${ran.length}${failed.length ? ` (failed: ${failed.map((r) => r.name).join(', ')})` : ''}`);
  return lines.join('\n');
}

const run = (cmd, args) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const tail = (s, n = 1) => s.trim().split('\n').slice(-n).join(' | ').slice(0, 160);
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

async function main() {
  const fast = process.argv.includes('--fast');
  const pkg = JSON.parse(read('package.json'));
  const readme = read('README.md');
  const results = [];
  const add = (name, ok, detail, skipped = false) => results.push({ name, ok, detail, skipped });

  const v = versionsMatch(pkg, JSON.parse(read('package-lock.json')));
  add('versions', v.ok, v.detail);
  add('changelog', changelogHasEntry(read('CHANGELOG.md'), pkg.version), `"## ${pkg.version} (date): title" in CHANGELOG.md`);

  const missing = readmeImagePaths(readme).filter((p) => !existsSync(join(ROOT, p)));
  add('readme images', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${readmeImagePaths(readme).length} found`);

  const skills = lintAll(join(ROOT, '.agents/skills'));
  const skillErrors = skills.flatMap((s) => s.errors.map((e) => `${s.name}/${e.rule}`));
  add('skills lint', skills.length > 0 && skillErrors.length === 0, skillErrors.length ? skillErrors.join(', ') : `${skills.length} skills pass`);

  const base = run('git', ['rev-parse', '--verify', '--quiet', 'origin/main']);
  if (base.status !== 0) add('attribution', false, 'origin/main not found: run git fetch origin');
  else {
    const log = run('git', ['log', 'origin/main..HEAD', '--format=%B%x1e']);
    const msgs = log.stdout.split('\x1e').map((s) => s.trim()).filter(Boolean);
    const bad = attributionLines(msgs);
    add('attribution', bad.length === 0, bad.length ? `remove: ${bad.join(' | ')}` : `${msgs.length} unpushed commit(s) clean`);
  }

  const files = readdirSync(join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).map((f) => join('tests', f));
  const t = run(process.execPath, ['--test', '--test-reporter=tap', ...files]);
  const sum = parseTestSummary(t.stdout);
  add('tests', t.status === 0 && sum && sum.fail === 0, sum ? `${sum.pass}/${sum.tests} pass` : `no summary: ${tail(t.stderr || t.stdout)}`);
  const counts = readmeTestCounts(readme);
  const wrong = sum ? counts.filter((c) => c.n !== sum.tests) : counts;
  add('readme test count', Boolean(sum) && counts.length > 0 && wrong.length === 0,
    !counts.length ? 'no test count found in README' : wrong.length ? `${wrong.map((c) => `${c.where} says ${c.n}`).join(', ')}; runner says ${sum?.tests ?? '?'}` : `${counts.length} mentions = ${sum.tests}`);

  if (fast) {
    add('audit', true, 'skipped in fast mode', true);
    add('build', true, 'skipped in fast mode', true);
  } else {
    const a = run('npm', ['audit', '--audit-level=high']);
    add('audit', a.status === 0, a.status === 0 ? tail(a.stdout) || 'no high or critical advisories' : tail(a.stdout, 2));
    const b = run('npm', ['run', 'build']);
    const html = join(ROOT, 'dist/index.html');
    const csp = existsSync(html) && /http-equiv="Content-Security-Policy"/.test(readFileSync(html, 'utf8'));
    add('build', b.status === 0 && csp, b.status !== 0 ? tail(b.stderr || b.stdout, 2) : csp ? 'dist/index.html carries the CSP meta tag' : 'dist/index.html has no CSP meta tag');
  }

  console.log(formatResults(results, { version: pkg.version, fast }));
  process.exitCode = results.some((r) => !r.skipped && !r.ok) ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
