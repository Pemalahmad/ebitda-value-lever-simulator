#!/usr/bin/env node
// Skill linter: pass/fail rules for every agent skill folder (SKILL.md + spec.md).
//   node scripts/lint-skills.mjs [skills-root]     default .agents/skills; exits 1 on any failure
// Rules (ids are what the output and the tests use):
//   frontmatter-name  frontmatter has a lowercase-hyphen `name` equal to the folder name
//   description       `description` is present, about 100 tokens or fewer, and says when to use the skill ("Use when")
//   body-length       the body after the frontmatter is 500 lines or fewer
//   numbered-steps    a "## Steps" section with "### 1. ...", "### 2. ..." headings numbered in order
//   one-objective     each step title names one objective (no "and", "then", "&", ";" or ",")
//   step-verify       each step has a "Verify:" line that says how to check its result
//   step-command      each step has a fenced code block with the concrete command
//   error-recovery    a "## Error recovery" table of failure -> fix; "try again" or "retry" alone is not a fix
//   spec              spec.md exists with Goal, Outputs, Required and Forbidden sections
//   links             every relative link in SKILL.md resolves to a file
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RULES = ['frontmatter-name', 'description', 'body-length', 'numbered-steps', 'one-objective', 'step-verify', 'step-command', 'error-recovery', 'spec', 'links'];
export const MAX_BODY_LINES = 500;
export const MAX_DESCRIPTION_TOKENS = 100;

export function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: null, body: text };
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  return { data, body: text.slice(m[0].length) };
}

// A rough token estimate that errs on the high side: the larger of chars/4 and words*1.3.
export const estimateTokens = (s) => Math.max(Math.ceil(s.length / 4), Math.ceil(s.split(/\s+/).filter(Boolean).length * 1.3));

// The text of one "## Heading" section, up to the next "## " heading.
function section(body, title) {
  const lines = body.split('\n');
  const start = lines.findIndex((l) => new RegExp(`^##\\s+${title}\\s*$`, 'i').test(l));
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n');
}

export function parseSteps(body) {
  const text = section(body, 'Steps');
  if (text === null) return null;
  return text.split(/^### /m).slice(1).map((chunk) => {
    const [head, ...rest] = chunk.split('\n');
    const m = head.match(/^(\d+)\.\s+(.+?)\s*$/);
    return { n: m ? Number(m[1]) : null, title: m ? m[2] : head.trim(), body: rest.join('\n') };
  });
}

function tableRows(text) {
  const rows = text.split('\n').filter((l) => /^\s*\|.*\|\s*$/.test(l)).map((l) => l.trim().slice(1, -1).split('|').map((c) => c.trim()));
  return rows.filter((r, i) => i > 0 && !r.every((c) => /^:?-{3,}:?$/.test(c)));
}

const VAGUE_FIX = /\btry (it )?again\b|^(just )?(retry|re-?run|run (it )?again|repeat)( it| the step)?\.?$/i;

// Lint one skill from its text. `exists(path)` answers whether a relative link target exists.
export function lintSkillText({ name, skill, spec, exists = () => true }) {
  const errors = [];
  const fail = (rule, message) => errors.push({ rule, message });
  const { data, body } = parseFrontmatter(skill ?? '');

  if (!data) fail('frontmatter-name', 'SKILL.md has no --- frontmatter block');
  else if (!data.name) fail('frontmatter-name', 'frontmatter has no name');
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.name)) fail('frontmatter-name', `name "${data.name}" is not lowercase-hyphen`);
  else if (data.name !== name) fail('frontmatter-name', `name "${data.name}" does not match folder "${name}"`);

  const desc = data?.description ?? '';
  if (!desc) fail('description', 'frontmatter has no description');
  else if (estimateTokens(desc) > MAX_DESCRIPTION_TOKENS) fail('description', `description is about ${estimateTokens(desc)} tokens (max ${MAX_DESCRIPTION_TOKENS})`);
  else if (!/\buse when\b/i.test(desc)) fail('description', 'description does not say when to use the skill ("Use when ...")');

  const bodyLines = body.split('\n').length;
  if (bodyLines > MAX_BODY_LINES) fail('body-length', `body is ${bodyLines} lines (max ${MAX_BODY_LINES})`);

  const steps = parseSteps(body);
  if (!steps || steps.length === 0) fail('numbered-steps', 'no "## Steps" section with "### 1. ..." steps');
  else {
    const bad = steps.findIndex((s, i) => s.n !== i + 1);
    if (bad >= 0) fail('numbered-steps', `step ${bad + 1} is "${steps[bad].title}"; steps must be numbered 1, 2, 3 in order`);
    for (const s of steps) {
      const label = `step ${s.n ?? '?'} "${s.title}"`;
      if (/\b(and|then)\b|[&;,]/i.test(s.title)) fail('one-objective', `${label} has more than one objective; split it`);
      if (!/^\s*(\*\*)?Verify:?(\*\*)?:?\s+\S/m.test(s.body)) fail('step-verify', `${label} has no "Verify:" line`);
      if (!/^```[\w-]*\n[\s\S]*?\S[\s\S]*?\n```/m.test(s.body)) fail('step-command', `${label} has no fenced command block`);
    }
  }

  const rec = section(body, 'Error recovery');
  const rows = rec === null ? [] : tableRows(rec);
  if (rec === null) fail('error-recovery', 'no "## Error recovery" section');
  else if (!rows.length) fail('error-recovery', 'error recovery has no failure | fix table rows');
  else for (const r of rows) {
    const fix = r[r.length - 1] ?? '';
    if (r.length < 2 || !fix) fail('error-recovery', `row "${r.join(' | ')}" has no fix`);
    else if (VAGUE_FIX.test(fix)) fail('error-recovery', `fix "${fix}" is not specific; say what to change`);
  }

  if (spec == null) fail('spec', 'spec.md is missing');
  else {
    const need = ['Goal', 'Outputs', 'Required', 'Forbidden'].filter((h) => !new RegExp(`^##\\s+${h}\\b`, 'mi').test(spec));
    if (need.length) fail('spec', `spec.md lacks sections: ${need.join(', ')}`);
  }

  const withoutCode = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  for (const m of withoutCode.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    if (!exists(target)) fail('links', `link target "${target}" does not exist`);
  }
  return errors;
}

export function lintSkill(dir) {
  const read = (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : null);
  const skill = read('SKILL.md');
  if (skill === null) return [{ rule: 'frontmatter-name', message: 'SKILL.md is missing' }];
  return lintSkillText({ name: basename(dir), skill, spec: read('spec.md'), exists: (p) => existsSync(resolve(dir, p)) });
}

export function lintAll(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root).filter((d) => statSync(join(root, d)).isDirectory()).sort()
    .map((name) => ({ name, errors: lintSkill(join(root, name)) }));
}

function main() {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '.agents/skills'));
  const results = lintAll(root);
  if (!results.length) { console.log(`lint-skills: FAIL no skill folders in ${root}`); process.exitCode = 1; return; }
  for (const r of results) {
    if (!r.errors.length) console.log(`PASS  ${r.name}`);
    for (const e of r.errors) console.log(`FAIL  ${r.name}  ${e.rule}  ${e.message}`);
  }
  const failed = results.filter((r) => r.errors.length);
  console.log(`lint-skills: ${failed.length ? 'FAIL' : 'PASS'} ${results.length - failed.length}/${results.length} skills (${RULES.length} rules)`);
  process.exitCode = failed.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
