#!/usr/bin/env node
// Papercut log: any developer or coding agent records friction in one line; the summary groups it by area.
//   npm run papercut -- --area release --tried "..." --expected "..." --happened "..." --fix "..."
//   npm run papercut -- --summary
// Writes JSON lines to .papercuts/log.jsonl (gitignored). PAPERCUTS_FILE overrides the path.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const FIELDS = ['tried', 'expected', 'happened', 'fix'];
const LOG = process.env.PAPERCUTS_FILE || join(dirname(fileURLToPath(import.meta.url)), '..', '.papercuts', 'log.jsonl');

// Builds one entry, or throws with every missing or invalid field named.
export function makeEntry(input, now = new Date()) {
  const problems = [];
  const area = String(input.area ?? '').trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(area)) problems.push('--area must be a lowercase word such as release, tests, build, capture, data, ui, skills');
  for (const f of FIELDS) if (!String(input[f] ?? '').trim()) problems.push(`--${f} is required`);
  if (problems.length) throw new Error(problems.join('; '));
  const entry = { ts: now.toISOString(), area };
  for (const f of FIELDS) entry[f] = String(input[f]).trim().replace(/\s+/g, ' ').slice(0, 500);
  return entry;
}

export function parseLog(text) {
  return text.split('\n').filter((l) => l.trim()).flatMap((l) => {
    try { const e = JSON.parse(l); return e && e.area ? [e] : []; } catch { return []; }
  });
}

// Areas by number of papercuts (ties by name), with the latest few and their suggested fixes.
export function summarise(entries, { latest = 3 } = {}) {
  if (!entries.length) return 'papercuts: none logged';
  const by = new Map();
  for (const e of entries) by.set(e.area, [...(by.get(e.area) ?? []), e]);
  const areas = [...by.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const lines = [`papercuts: ${entries.length} in ${areas.length} area(s)`];
  for (const [area, list] of areas) {
    lines.push(`${area} (${list.length})`);
    for (const e of [...list].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, latest)) lines.push(`  ${e.ts.slice(0, 10)}  ${e.happened}  ->  fix: ${e.fix}`);
  }
  return lines.join('\n');
}

function main() {
  const { values } = parseArgs({ options: { summary: { type: 'boolean' }, area: { type: 'string' }, ...Object.fromEntries(FIELDS.map((f) => [f, { type: 'string' }])) } });
  if (values.summary) { console.log(summarise(existsSync(LOG) ? parseLog(readFileSync(LOG, 'utf8')) : [])); return; }
  try {
    const entry = makeEntry(values);
    mkdirSync(dirname(LOG), { recursive: true });
    appendFileSync(LOG, JSON.stringify(entry) + '\n');
    console.log(`papercut logged: ${entry.area}`);
  } catch (err) {
    console.error(`papercut not logged: ${err.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
