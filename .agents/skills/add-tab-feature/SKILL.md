---
name: add-tab-feature
description: Use when adding a new analysis section, widget or calculation to one of the five tabs. Covers the engine function, golden tests, workbook checks, the Dots-based view, the share link and the docs, then hands over to the release skill.
---

# Add a tab feature

Follows the pattern of the 100-day tracker (v1.10.0) and the variance bridges (v1.8.0). The goal, outputs and limits are in [spec.md](spec.md). Replace `feature` and `Feature` below with the real name. Log friction as you go: `npm run papercut -- --area ui --tried "..." --expected "..." --happened "..." --fix "..."`.

## Steps

### 1. Write the engine module

Create `src/engine/feature.js` with pure functions: inputs in, plain objects out, no DOM, no `fetch`, no imports from outside `src/engine`. Validate and clamp every input that can come from a user or a file.

```bash
node -e "import('./src/engine/feature.js').then((m) => console.log(Object.keys(m)))"
```

Verify: the command lists the exported function names and prints no error.

### 2. Export it from the engine index

Add one `export { ... } from './feature.js';` line to `src/engine/index.js`.

```bash
node -e "import('./src/engine/index.js').then((m) => console.log(typeof m.yourMainFunction))"
```

Verify: it prints `function`.

### 3. Write golden tests

Create `tests/feature.test.js` with `node:test` and `assert/strict`. Each case is a fixed input and an exact expected output; include at least one edge case (empty input, zero, bad value) and, for any CSV or text input, an injection case like those in `tests/tracker.test.js`.

```bash
node --test tests/feature.test.js
```

Verify: the output ends with `# fail 0`.

### 4. Add the workbook checks

When the feature produces numbers that must reconcile (bridges, totals, plan against actuals), add checks to `logicChecks` in `src/engine/checks.js` with a plain-language title and a hard or watch level.

```bash
node --test tests/variance.test.js tests/tracker.test.js
```

Verify: both files pass, and the new check titles appear in `node -e "import('./src/engine/checks.js').then((m) => console.log(m.logicChecks({}).map((c) => c.title)))"`.

### 5. Build the view from Dots

Create `src/ui/components/Feature.jsx` from the shared parts in `src/ui/components/Dots.jsx` (`Section`, `Card`, `CardHead`, `KpiStrip`, `DotLine`, `Waterfall`, `Pill`, `Status`). Colours come only from the CSS tokens; add any new styles under the Dots section of `src/ui/styles.css`.

```bash
grep -nE "#[0-9a-fA-F]{3,8}\b" src/ui/components/Feature.jsx; node --test tests/security.test.js
```

Verify: the grep prints nothing and the security tests end with `# fail 0`.

### 6. Wire the share link

Give the section an `id` and open it from the hash the way `#tab=tracker` does in `src/ui/App.jsx` (see the `LEGACY` map and the `vp-tracker` scroll).

```bash
npm run dev
```

Verify: opening `http://localhost:5173/#tab=feature` lands on the new section in light and dark mode.

### 7. Add the screenshot

Add a `shot('screenshot-feature', { ... selector: '#your-section-id' })` line to `scripts/capture.mjs` and an image line plus a short section under "The five tabs" in `README.md`.

```bash
grep -n "screenshot-feature" scripts/capture.mjs README.md
```

Verify: both files match; the PNG itself is written in step 5 of the release skill.

### 8. Document the feature

Add a short entry to `docs/user-guide.md` (what it shows, how to use it) and, for a new method, to `docs/methodology.md` or `docs/variance-and-controls.md`.

```bash
grep -n -i "feature" docs/user-guide.md
```

Verify: the grep finds the new entry.

### 9. Hand over to release

Ship with the release skill in [../release/SKILL.md](../release/SKILL.md). A new feature is a `minor` bump.

```bash
npm run ship-check -- --fast
```

Verify: every check passes except, until the release skill updates them, `readme test count` and `readme images`.

## Error recovery

| Failure | Fix |
|---|---|
| Engine import fails with `Cannot find module` | Use relative paths with the `.js` extension; the engine is plain ES modules |
| A golden test fails on a rounding difference | Round in the engine (the existing modules round to whole units or one decimal) and assert the rounded value, not a float |
| `security.test.js` flags raw HTML | Render text as JSX children; only `ValuePlanView.jsx` may use the escaping memo renderer |
| `security.test.js` flags `target="_blank"` | Add `rel="noreferrer"` to the link |
| The grep in step 5 finds a hex colour | Replace it with the matching token from the palette block in `src/ui/styles.css` |
| Dark mode looks different from light | Delete the dark-only rule; the palette tokens already switch with the theme |
| The browser console shows a CSP violation | Move the inline style or script into the bundle; do not add a source to the CSP |
| A new check fails on the example data | Fix the engine or the example plan so it reconciles; never relax the check's tolerance to pass |
