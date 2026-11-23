# Changelog

## 1.2.0 (2026-11-23): Market analysis and opportunity screen

- **Opportunities tab**: cited market analysis (2026 downturn, supply wave, 2027 rebound); 10 sectors, 13 themes and 19 target companies scored on five criteria with live, adjustable committee weights; Model it loads each target into its value play
- **Written analysis**: `docs/market-opportunity-analysis.md`
- **Market Tracker**:
  - currency switch (AED/USD at the peg; EUR/GBP live), price-per-m² trend 2021–2025, market splits by type and category, investor origin regions, top rental communities, and a fair-value check against official benchmarks
  - with an ingested DLD CSV: transaction records with filters, top deals, price by bedrooms, price bands, a 7-day rolling trend and the off-plan premium
- 45 tests (new: opportunity scoring, data-integrity checks that every figure is sourced and every preset runs, extended DLD aggregation)

## 1.1.0 (2026-11-23): Dubai Holding edition

- **Group & Funds tab**: cited Dubai Holding profile and strategic pillars; group sum-of-the-parts and value bridge; seven value-creation plays (REIT carve-out, subsidiary IPO, land-bank JV, asset-light hospitality, platform consolidation, bolt-on M&A, master-planned launch); 12 cited Dubai Holding moves from 2024–2026 with "Model it" presets (the REIT IPO preset reproduces the AED 2.1bn raised); a benchmark of PIF, ADIA, ICD, Mubadala, QIA and L'imad/ADQ with a playbook matrix
- **Market Tracker tab**: official DLD and Dubai Media Office aggregates (2023–2025, Q1 2026, 9M 2026 media tally flagged), top communities, prices, rents, Strategy 2033 and Dubai 2040 signals
- **DLD ingest**: `scripts/ingest-dld.mjs` parses the DLD open-data Transactions CSV into a deal-level tracker (monthly flow, top projects, area price drops and increases)
- Verticals renamed to Dubai Holding's businesses; operating models remain illustrative and are labelled as such
- 41 tests (new: plays, CSV parser, DLD aggregation on a synthetic fixture)

## 1.0.0 (2026-11-23)

First release.

- Driver-based value models for six businesses: Real Estate & Land, Hospitality, Leisure & Entertainment, Retail & Asset Management, Community Management, Integrated Urban Services
- Analytics: EBITDA bridge with interaction effects, ±10% sensitivity tornado, value-ranked leverage table with one-click *Play*, two-way sensitivity heatmap, P&L variance
- Balanced Scorecard across four perspectives with RAG status
- Business case: initiative register, linear ramp phasing, 5-year NPV/IRR/payback after 9% UAE corporate tax
- Executive Co-Pilot: a deterministic, answer-first board memo (UI, API, CLI)
- Game layer: board confidence, value score, five ranks, 21 missions (18 business-specific + 3 cross-business), 7 achievements, XP and levels, shareable scenario URLs
- Zero-dependency Node API (`/api/sectors`, `/api/simulate`, `/api/sensitivity`, `/api/memo`) and the `value-memo` CLI
- 32 tests (engine invariants, API, CLI); CI and GitHub Pages deploy
