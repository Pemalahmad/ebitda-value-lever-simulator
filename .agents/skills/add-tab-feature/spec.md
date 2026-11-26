# Spec: add-tab-feature

## Goal

Add an analysis feature to one of the five tabs (Live Market, Market Tracker, Market Entry, Value Plan, Portfolio Lab) the way earlier features were built: a pure, tested engine function, workbook checks for its numbers, a view made from the shared Dots components, a share link and documentation.

## Outputs

- `src/engine/<feature>.js`: pure functions with no imports outside `src/engine`, exported from `src/engine/index.js`.
- `tests/<feature>.test.js`: golden cases with fixed inputs and exact expected outputs.
- New checks in `src/engine/checks.js` when the feature produces numbers that must reconcile.
- `src/ui/components/<Feature>.jsx` built from `Dots.jsx`, using the palette tokens in `src/ui/styles.css`.
- A `#tab=...` share link, a README section with a screenshot and a user-guide entry.

## Required

- Every number on screen comes from an engine function that a test covers.
- Use the existing single palette (Cloudy White canvas, Galactic Violet accent, Bubblegum touches) through CSS tokens.
- Untrusted text (CSV cells, feeds, user input) is validated in the engine and rendered as text.
- `node --test tests/security.test.js` passes.
- Hand over to the `release` skill to ship.

## Forbidden

- New runtime dependencies, in particular animation or effects libraries.
- Raw hex colours in components, a second palette or one-off dark-mode overrides.
- `dangerouslySetInnerHTML`, `eval`, inline event-handler strings or `javascript:` links.
- Network calls from the browser outside the existing data files; changes that loosen the CSP in `vite.config.js` or `server/index.js`.
