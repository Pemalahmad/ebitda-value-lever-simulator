# Spec: release

## Goal

Ship a finished change as a numbered release: the version, changelog, README and screenshots agree with the code, CI is green and the live GitHub Pages site serves the new build with its Content-Security-Policy.

## Outputs

- `package.json` and `package-lock.json` at the new version (patch for tooling or fixes, minor for a feature).
- A `## X.Y.Z (YYYY-MM-DD): Title` entry at the top of `CHANGELOG.md`.
- README badges and counts that match the test runner and the code.
- Refreshed `docs/*.png` and `docs/demo.gif` when the interface changed.
- One commit on `main` whose subject ends in `(vX.Y.Z)`, pushed to `origin/main`.
- A green CI run and a live site that loads.

## Required

- Run `npm run ship-check` and get `ship-check: PASS` before pushing.
- Author every commit as `Mohammad Alahmad <151056565+Pemalahmad@users.noreply.github.com>`.
- `git fetch origin` before pushing and rebase onto `origin/main` if it moved.
- Watch the CI run to the end and check the live page afterwards.

## Forbidden

- Force-pushing, rewriting pushed history or pushing to any branch other than `main`.
- Co-Authored-By trailers or any tool or assistant credit in commits, docs or code.
- Editing test-count badges by guesswork: the number comes from the runner.
- Skipping `npm audit` failures, loosening the CSP or adding an effects library to get a release out.
