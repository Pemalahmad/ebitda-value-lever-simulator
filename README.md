# EBITDA Value Lever Simulator

**Move an operational lever and watch it reach EBITDA, enterprise value, the Balanced Scorecard and a board memo.**

[![CI](https://github.com/Pemalahmad/ebitda-value-lever-simulator/actions/workflows/ci.yml/badge.svg)](https://github.com/Pemalahmad/ebitda-value-lever-simulator/actions/workflows/ci.yml)
![Tests](https://img.shields.io/badge/tests-32%20passing-2dd4bf)
![Node](https://img.shields.io/badge/node-%E2%89%A520-339933)
![Dependencies](https://img.shields.io/badge/engine-zero%20dependencies-e5b95c)
![License](https://img.shields.io/badge/license-MIT-blue)

**[▶ Open the live simulator](https://pemalahmad.github.io/ebitda-value-lever-simulator/)**

![Demo: moving levers in Integrated Urban Services, completing missions, then the scorecard, business case and board memo](docs/demo.gif)

## The problem

Leadership teams struggle to say what *"cut churn by 1.5 points"*, *"shorten procurement lead times"* or *"lift utilisation"* is worth in EBITDA and valuation, or what it puts at risk. The answer is usually spread across a spreadsheet, a slide deck and a risk register that never meet.

This simulator puts them in one place. Each slider is a real operating KPI. Every move flows through a driver-based P&L to EBITDA, enterprise value and cash, and it is checked against a Balanced Scorecard and a library of operating risks. An Executive Co-Pilot then writes the board memo.

## What it covers

It models a fictional diversified group with **six businesses**, each with its own driver tree:

| Business | Example levers | Valuation |
|---|---|---|
| Real Estate & Land | sales velocity, price/sqft (elasticity −1.1), construction cost, infrastructure phasing, broker commission, construction cycle | 8x EBITDA |
| Hospitality | occupancy, ADR (elasticity −0.6), F&B spend, OTA distribution cost (CAC), rooms labour, F&B cost ratio, energy | 14x EBITDA |
| Leisure & Entertainment | marketing spend (diminishing returns), CAC, annual-pass retention, ticket yield, per-cap spend, staffing (capacity-capped) | 11x EBITDA |
| Retail & Asset Management | occupancy, base rent, footfall, turnover rent, service-charge recovery, opex/sqm, tenant retention | NOI at 7.25% cap rate |
| Community Management | management fee (RERA approval), collection rate, amenity income, contract retention, procurement savings, self-service adoption | 10x EBITDA |
| Integrated Urban Services (FM) | technician utilisation, bill rate, make-vs-buy subcontract share, SLA penalties, procurement lead time, DSO | 8x EBITDA |

## How it maps to a Strategy & Value Creation role

| Responsibility | Where it lives in the app |
|---|---|
| Strategic planning and the **Balanced Scorecard** cycle | *Balanced Scorecard* tab: four perspectives, KPIs with targets, RAG status that moves with every lever |
| **Financial models, scenarios and business cases**, and tracking benefits through to execution | Driver-based P&L per business; *Business Case* tab with NPV, IRR, payback after 9% UAE corporate tax, ramp-up phasing and a PMO initiative register with owners |
| **KPI dashboards**, performance reports and **executive presentations** | *Value Simulator* tab: EBITDA bridge, sensitivity tornado, two-way heatmap, P&L variance. *Board Memo* tab: an answer-first memo, exportable to Markdown or PDF |
| Evaluating commercial opportunities | *Where to play next* ranks every lever by value created per move, cost and payback |
| Risk governance | Each business has risk flags for levers pushed too far (service standards, tenant affordability, SLA burnout, regulatory approval), each with a mitigation and an owner |
| Strategy, **PMO** and **Technology Transformation** pillars | Digital levers (CRM/direct booking, CAFM predictive maintenance, resident self-service) sit next to commercial and operational ones |

## The game layer

The game makes the trade-offs easy to feel. It does not reward big numbers on their own:

- **Value score** = AED value created × *board confidence*. Pushing a lever into a risk zone, going over the transformation budget or turning the scorecard red all cost confidence.
- **Ranks**: Analyst → Associate → Manager → Director → Chief Value Officer. The top ranks need both value created (as a share of EV) and board confidence.
- **Missions**: three per business plus three that apply everywhere (*Self-Funding Programme*, *Clean Board*, *Balanced Scorecard*). They earn XP and levels.
- **Achievements** persist in your browser across businesses.
- **Play** buttons apply the next-best 10% move in one click. Every scenario has a shareable URL.

| Simulator | Balanced Scorecard |
|---|---|
| ![Simulator](docs/screenshot-simulator.png) | ![Scorecard](docs/screenshot-scorecard.png) |
| **Business case** | **Board memo** |
| ![Business case](docs/screenshot-business-case.png) | ![Memo](docs/screenshot-memo.png) |

## Executive Co-Pilot (the board memo)

The memo is generated **deterministically from the model**, so every figure can be traced to the engine and none is invented. It follows the Pyramid Principle and leads with the answer:

1. **Recommendation**: Approve / Approve with conditions / Do not approve, with value, NPV, IRR, payback, confidence and budget
2. Baseline vs scenario (P&L and operating KPIs)
3. EBITDA bridge, with the *so what*
4. Highest-leverage value drivers and sensitivity
5. Trade-offs and risks, with mitigation and owner
6. Balanced Scorecard impact
7. Benefits realisation plan (year 1–3 phasing, owners, governance cadence)
8. Decisions requested

It is available in the UI, from the API (`POST /api/memo`) and from the CLI.

## Quick start

```bash
git clone https://github.com/Pemalahmad/ebitda-value-lever-simulator.git
cd ebitda-value-lever-simulator
npm install
npm run dev          # dashboard at http://localhost:5173
npm test             # 32 tests: engine, API, CLI
```

Serve the built dashboard and the JSON API from Node:

```bash
npm run build && npm start      # http://localhost:8787
curl -s localhost:8787/api/sectors | head -c 300
curl -s -X POST localhost:8787/api/simulate \
  -H 'content-type: application/json' \
  -d '{"sector":"urbanServices","levers":{"utilisation":75,"dso":80}}'
```

Write a board memo from the command line:

```bash
node bin/value-memo.js --list
node bin/value-memo.js --sector hospitality --set occupancy=78,labourPOR=152 > memo.md
node bin/value-memo.js --sector retail --scenario "Destination upgrade" --summary
node bin/value-memo.js --sector urbanServices --file data/scenarios/fm-utilisation-and-cash.json
```

## Architecture

```
src/engine/            pure JavaScript, zero dependencies; runs in the browser and in Node
  sectors/*.js         six driver trees: levers, P&L, KPIs, risk flags, scorecard, missions
  model.js             levers → P&L → EBITDA → EV, investment, comparison vs baseline
  analysis.js          EBITDA bridge, tornado, leverage ranking, two-way grid
  businessCase.js      initiative phasing, NPV, IRR, payback (UAE CT 9%)
  scorecard.js         Balanced Scorecard RAG
  game.js              board confidence, ranks, missions, achievements
  memo.js              Executive Co-Pilot board memo (Markdown)
src/ui/                React dashboard with hand-built SVG charts and no chart library
server/index.js        zero-dependency Node HTTP server: static app + JSON API
bin/value-memo.js      CLI memo generator
tests/                 node:test suites for engine invariants, API and CLI
```

The same engine powers the UI, the API and the CLI, so a number on screen, in the API and in the memo always comes from the same code.

## Documentation

- [User guide](docs/user-guide.md): a five-minute walkthrough
- [Methodology](docs/methodology.md): every formula, elasticity, valuation basis and the business-case maths

## Roadmap

This repo is the first of a planned series of operations-strategy tools:

- **Margin-leakage triage agent**: ingest messy refunds, tickets and invoices, classify failure modes, and output a Pareto action plan with ROI per fix
- **Supply-chain war-gaming engine**: stress-test a bill of materials or vendor base for single points of failure and working-capital shocks
- **SOP-to-workflow process mining kit**: compare SOPs with event logs and generate a to-be process map in Mermaid
- **Ops-strategy skills library**: constraint auditor, make-vs-buy engine, PMI synergy tracker, 100-day plan generator
- In this app: an ERP/CSV import to replace the illustrative baselines with real ones, and a Monte Carlo range on top of the deterministic case

## Disclaimer

The group, its companies and all numbers are **fictional and illustrative**. They are calibrated to be plausible for the GCC market, not to describe any real company. This is not investment advice.

## License

[MIT](LICENSE)
