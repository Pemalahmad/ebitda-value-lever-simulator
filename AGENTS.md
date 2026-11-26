# Agent guide

Orientation for any coding agent or new contributor. Read this first; the skills in `.agents/skills/` hold the step-by-step procedures.

## The project

A Dubai market and value-creation workspace with five tabs (Live Market, Market Tracker, Market Entry, Value Plan, Portfolio Lab), deployed to GitHub Pages at https://pemalahmad.github.io/ebitda-value-lever-simulator/.

- `src/engine/`: pure, zero-dependency JavaScript. Every number on screen comes from a tested function here.
- `src/ui/`: React 18 and Vite 6. Shared design components live in `src/ui/components/Dots.jsx`.
- `server/`, `bin/`: static server with a JSON API, and the board-memo CLI.
- `scripts/`: market refresh, DLD ingest, screenshot capture and the developer tools below.
- `tests/`: `node:test` suites, including `security.test.js`.

## Commands

| Command | Use |
|---|---|
| `npm ci` | Install. Run it again whenever `node_modules` is stale |
| `npm test` | All tests |
| `npm run build` | Production build in `dist/` |
| `npm run ship-check` | Pass/fail list before any push (`-- --fast` skips audit and build) |
| `npm run lint:skills` | Lints `.agents/skills/` |
| `npm run papercut -- --summary` | Logged friction, grouped by area |

## Always-on rules

1. **Run `npm run ship-check` before every push** and push only on `ship-check: PASS`.
2. **Log papercuts.** When a command, doc or tool wastes your time, record it in one line, then carry on:
   `npm run papercut -- --area <release|tests|build|capture|data|ui|skills> --tried "..." --expected "..." --happened "..." --fix "..."`
3. **Release rule:** commits go straight to `main` and CI tests, builds and deploys them. A release bumps the version in `package.json` and `package-lock.json`, adds a `CHANGELOG.md` entry, updates the README badges and counts, refreshes the screenshots and GIF when the interface changed, and is checked live on Pages. Follow `.agents/skills/release/SKILL.md`.
4. **Git:** fetch before pushing; never force-push or rewrite pushed history. Author commits as `Mohammad Alahmad <151056565+Pemalahmad@users.noreply.github.com>`. No Co-Authored-By trailers and no tool or assistant credit in commits, code or docs.

## Security constraints

- The site ships a strict Content-Security-Policy (`vite.config.js` for the build, `server/index.js` for the API). Never loosen it; move inline code into the bundle instead.
- `npm audit --audit-level=high` must pass. CI enforces it.
- No new runtime dependencies without a clear need, and no new animation or effects libraries.
- No `dangerouslySetInnerHTML` (except the escaping memo renderer), `eval`, `javascript:` links or `target="_blank"` without `rel="noreferrer"`.
- CI actions stay pinned to commit SHAs with read-only permissions.

## Design rule

One palette and one visual system. Colours come only from the tokens in the "One palette" block of `src/ui/styles.css` (Cloudy White canvas, Galactic Violet accent, Bubblegum touches, green and red for gains and losses), in light and dark mode. Build views from the Dots components (`Section`, `Card`, `KpiStrip`, `DotLine`, `Waterfall`, `Pill`, `Status`); no raw hex colours in components and no second theme.

## Skills

| Skill | Use when |
|---|---|
| [release](.agents/skills/release/SKILL.md) | A change is finished and ships as a numbered release |
| [add-tab-feature](.agents/skills/add-tab-feature/SKILL.md) | Adding a section, widget or calculation to a tab |

Each skill folder has a `spec.md` (goal, outputs, required and forbidden actions) and a `SKILL.md` with numbered steps, a command and a check per step, and an error-recovery table. `npm run lint:skills` enforces that format in CI.
