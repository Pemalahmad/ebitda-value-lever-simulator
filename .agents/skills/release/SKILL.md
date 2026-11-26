---
name: release
description: Use when a change is finished and must ship as a numbered release of this repo. Bumps the version, updates changelog and README counts, refreshes screenshots, runs ship-check, pushes to main, watches CI and confirms the Pages site.
---

# Release

Ships the working tree as one release commit on `main`. The goal, outputs and limits are in [spec.md](spec.md). Run every command from the repo root. If a step fights you, log it before moving on: `npm run papercut -- --area release --tried "..." --expected "..." --happened "..." --fix "..."`.

## Steps

### 1. Sync with origin

```bash
git fetch origin && git status -sb | head -1
```

Verify: the line is `## main...origin/main` with no `[behind N]`.

### 2. Bump the version

Use `patch` for fixes and tooling, `minor` for a new feature. The repo does not use git tags.

```bash
npm version patch --no-git-tag-version
```

Verify: `node -p "require('./package.json').version + ' ' + require('./package-lock.json').version"` prints the new version twice.

### 3. Write the changelog entry

Add a section at the top of `CHANGELOG.md` in the existing style: `## X.Y.Z (YYYY-MM-DD): Short title`, then short bullets that say what a user can now do.

```bash
grep -n "^## $(node -p "require('./package.json').version") (" CHANGELOG.md
```

Verify: the grep prints exactly one line, and it is the first `## ` heading in the file.

### 4. Update the README counts

Take the test count from the runner, never from memory. Set it in all three README places: the `tests-N%20passing` badge, the `npm test` row of the command table and the `tests/` line of the folder tree. Update the workbook-checks figure as well when checks were added.

```bash
node --test --test-reporter=tap tests/*.test.js | grep -E '^# (tests|fail) '
```

Verify: `npm run ship-check -- --fast` shows `PASS  readme test count`.

### 5. Refresh the screenshots

Skip this step when nothing on screen changed. For a new section, first add a `shot(...)` line to `scripts/capture.mjs`. Playwright is not a dependency, so install it without saving.

```bash
npm i --no-save playwright && npx playwright install chromium && npm run build && node scripts/capture.mjs --gif
```

Verify: `git status --short docs/` lists the changed PNGs and `docs/demo.gif`; open one PNG and check it shows the new state.

### 6. Run ship-check

```bash
npm run ship-check
```

Verify: the last line reads `ship-check: PASS`. Fix every `FAIL` line first; never push on a failure.

### 7. Commit the release

The subject says what changed for the user and ends in `(vX.Y.Z)`. No trailers.

```bash
git add -A && git -c user.name="Mohammad Alahmad" -c user.email="151056565+Pemalahmad@users.noreply.github.com" commit -m "What changed for the user (vX.Y.Z)"
```

Verify: `git log -1 --format='%an <%ae>%n%B'` shows that author and no trailer lines.

### 8. Push to main

```bash
git fetch origin && git push origin main
```

Verify: `git status -sb | head -1` shows `## main...origin/main` with no ahead or behind count.

### 9. Watch CI

```bash
gh run watch "$(gh run list --branch main --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
```

Verify: the command exits 0 and both the `test` and `deploy` jobs show a green tick.

### 10. Confirm the live site

```bash
curl -fsS https://pemalahmad.github.io/ebitda-value-lever-simulator/ | grep -c 'http-equiv="Content-Security-Policy"'
```

Verify: it prints `1`, and the page opened in a browser loads with no CSP errors in the console.

## Error recovery

| Failure | Fix |
|---|---|
| Step 1 shows `[behind N]` | `git pull --rebase origin main`, then rerun `npm run ship-check -- --fast` before going on |
| Lock version differs from `package.json` | `npm install --package-lock-only` rewrites the lock at the package version |
| `readme test count` fails | Copy the `# tests N` figure from step 4 into the badge, the command table and the folder tree |
| `readme images` fails | Add the missing `shot(...)` to `scripts/capture.mjs` and run step 5, or remove the dead image link |
| `audit` fails | `npm audit fix` for non-breaking fixes; otherwise bump or replace the package. Never lower `--audit-level` |
| `build` fails or has no CSP tag | Read the Vite error; the CSP meta tag is injected by `vite.config.js`, so restore it there rather than in `index.html` |
| `attribution` fails | `git commit --amend` on the unpushed commit and delete the trailer line; pushed history is never rewritten |
| Capture cannot find Playwright | `npm i --no-save playwright && npx playwright install chromium` |
| Push rejected as non-fast-forward | `git pull --rebase origin main`, rerun step 6, push again without `--force` |
| CI `test` job fails | `gh run view --log-failed`, fix it locally, rerun step 6, commit the fix as a new commit |
| Live page still shows the old version | `gh run list --workflow CI --limit 3` to check `deploy` finished, then reload with the cache bypassed |
