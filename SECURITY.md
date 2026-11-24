# Security policy

## Reporting a vulnerability

Please report security issues privately through GitHub's **Report a vulnerability** button on the
Security tab of this repository, not in a public issue. You will get a reply within five working days.

## What is in place

| Area | Control |
|---|---|
| Browser | Content-Security-Policy on the built site: scripts only from this origin, fonts only from Google Fonts, no plugins, frames or form posts. Referrer policy `strict-origin-when-cross-origin`. |
| Rendering | React escapes all text. The one raw-HTML block (the board memo) is produced by `src/engine/markdown.js`, which escapes input before formatting. News links are accepted only with `http(s)` schemes. External links open with `rel="noreferrer"`. |
| Data in the browser | Journal notes, checklists and imported CSV files stay in the browser; nothing is uploaded. |
| API server | Security headers on every response (nosniff, frame denial, CSP, COOP/CORP, permissions policy); 64 KB body limit with a 413 reply; malformed URLs rejected with 400; static files confined to `dist/`; lever values validated and clamped; prototype-pollution keys ignored; no stack traces in errors; no CORS, so other sites cannot call it from a browser. |
| Supply chain | Zero runtime dependencies in the engine; the interface uses React and `motion`, plus four vendored React Bits components reviewed line by line (no network calls, no raw HTML, no eval); `npm audit --audit-level=high` in CI; GitHub Actions pinned to commit SHAs; Dependabot for npm and Actions; CI runs with read-only repository permissions and checkout without persisted credentials. |
| Secrets | No secrets are needed or stored; GitHub secret scanning and push protection are on. |

Run the security tests with `node --test tests/security.test.js`.
