# Changelog

## 1.4.0 (2026-11-23): Market Pulse

- **New landing tab, Market Pulse:** a decision dashboard for an investment manager in Dubai.
  - **Top signals:** threshold moves in oil, US rates, the dollar, volatility, UAE vs US equities, Emaar and freight, plus shipping-chokepoint and regional-security news clusters, each with why it matters for a Dubai portfolio.
  - **Markets:** DFM, Tadawul, MSCI UAE and Dubai bellwethers, global indices, commodities, FX and rates, volatility and freight, with 1D/1W/1M/3M changes and trend lines.
  - **Trade, maritime and logistics:** Hormuz, the Red Sea and Bab el-Mandeb, and Suez.
  - **Country movement** and **news by theme** (resilience, security, economy, resources, infrastructure, society) from Gulf News, The National, Khaleej Times, WAM, Zawya, Arabian Business and the maritime press.
  - **Decision journal:** stance, conviction, thesis, what would change your mind, linked signals, a pre-commitment checklist and a review date, with market levels saved per note; export and import as JSON.
- **Fresh data every 6 hours:** `npm run pulse` collects delayed prices and headlines; CI runs it on a schedule and before each build, keeping the last good data for any source that fails. Only headlines and links are stored.
- **Honest numbers:** a change is never computed against history that is not really a month back (the DFM and Tadawul show level and daily move until their recent history is available).
- See [docs/market-pulse.md](docs/market-pulse.md) for widgets, signal thresholds and sources.

## 1.3.0 (2026-11-23): Paper design system

- **New visual system:**
  - **Surfaces:** paper cards on a warm canvas, soft layered shadows instead of borders.
  - **Colour:** a single ultramarine accent, with rust for negatives.
  - **Type:** Geist and Geist Mono, large light-weight numerals, dot labels in place of uppercase labels.
- **Redesigned widgets:**
  - segmented pill tabs and a black active business card;
  - ruler-tick lever sliders with a baseline marker;
  - a tick-ring dial for board confidence and a dark glowing score card;
  - pill KPI deltas, dark bars with an accent highlight, and black pill actions.
- **States:** hover, press, focus-visible and reduced-motion states throughout. KPI numerals scale to their card width instead of truncating.
- **Fix:** the score card was collapsing inside the height-capped game panel.

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
