# Changelog

## 1.9.0 (2026-11-24): One palette, merged widgets, live plays

- **One palette** in light and dark mode:
  - Cloudy White `#F0F0F0` canvas, Galactic Violet `#105BFF` accent and Bubblegum `#FE8500` touches;
  - the old dark-mode rules that turned Market Tracker and Market Entry widgets navy are removed.
- **Merged widgets:**
  - Market Entry opens with one compact overview: profile, requirements, regulator, readiness, timeline and fees;
  - Market Tracker's four headline widgets share one row.
- **Portfolio plays:** a live-impact panel sits beside the cards. Its waterfall and figures redraw as plays are switched on or their sliders move.
- React Bits effects (dot grid headers, rolling KPI figures, spotlight cards, click sparks), vendored with their licence.
- **Market Entry set-up guide:**
  - where to set up, by business type;
  - every step per route, with platform, documents, cost, time and bottleneck;
  - a timeline, the memorandum of association, and VAT and corporate tax.

## 1.8.0 (2026-11-24): Variance, controls and new-company cases

- **Variance bridges on every tab**, drawn as waterfall charts:
  - **Market Tracker:** volume vs price, year on year.
  - **Market Entry:** cash before the first client.
  - **Value Plan:** EBITDA by lever or by P&L line.
  - **Portfolio Lab:** portfolio value and consolidated revenue.
  - **New company case:** EBITDA to free cash flow.
- **KPIs to watch** with thresholds and status (Value Plan and Live Market).
- **Rolling 12 months** of EBITDA as initiatives ramp.
- **Assumption sensitivity summary** for the selected business, at ±5%, ±10% or ±20%.
- **Intercompany elimination helper** with balance checks.
- **Logic checker and missing-data finder:** about 75 checks across every tab behind a Checks button.
- **New company case:** a capex and opex calculator with five editable templates.
- **Live Market:** the duplicated signal cards are replaced by one expandable signal register, and the side list became the KPI watchlist.
- 61 tests (new: bridge reconciliation, rolling 12 months, eliminations, sensitivity, new-company plan, workbook checks).

## 1.7.0 (2026-11-24): One design, five tabs

- **New visual system ("Dots"):**
  - a soft grey canvas with white rounded cards;
  - dot-matrix charts;
  - black-pill navigation and folder tabs;
  - one warm accent, in light and dark themes.

  Every tab uses the same shell, page header and numbered sections, so the design holds as you move between them.
- **Value Plan replaces four tabs:** Simulator, Balanced Scorecard, Business Case and Board Memo are now one document in five sections.
  - **Scorecard:** dot rings per perspective and KPI bars against target.
  - **Business case:** dotted yearly columns and a cumulative cash curve.
  - **Board memo:** a one-page decision showing the verdict, value by initiative, risks and decisions requested. The text memo is still one click away and downloadable.
  - **Old links:** `#tab=simulator`, `scorecard`, `case` and `memo` open the matching section.
- **Live Market:**
  - a headline chart you can switch between Brent, MSCI UAE, S&P 500, US 10-year yield, gold and VIX, with hover read-outs;
  - market groups under folder tabs; click a row to chart it.
- **Portfolio Lab:**
  - a dot composition of portfolio value; hover a business to isolate it, click to open its plan;
  - switchable views: composition, bridge, operating value and plays;
  - live play cards;
  - a swarm cursor, off for reduced motion and touch screens.
- Market Tracker and Market Entry widgets were moved onto the same surface, and their bars redrawn as dots.
- 54 tests (new: shared board-verdict logic).

## 1.6.0 (2026-11-24): UAE Market Entry

- **New tab, Market Entry:** a step-by-step UAE entry roadmap for any business, with a full virtual-asset track benchmarked on VARA.
  - **Entry profile:** business model and zone route to the right regulator (VARA, DFSA, FSRA, SCA) and flag traps such as custody needing its own entity.
  - **Company setup, product import and a self-custody licence map,** each step with a checklist saved in the browser.
  - **VARA licensing:** the two stages, what to file, what is allowed before the licence, and when fees fall due.
  - **Capital and fee calculator** across the eight VARA activities, with the licensed-custodian discount.
  - **Compliance, pitfalls and cited sources,** including the 2024 marketing rules and the Central Bank law of 2025.
- 53 tests (new: capital and fee maths, regulator routing, source integrity).

## 1.5.0 (2026-11-24): Integrated market decision workspace

- Integrated the live Market Pulse, source-health monitoring and browser-local decision journal into the market-first dashboard.
- Removed company-specific branding, benchmark datasets, organisation profiles and the company-specific opportunity screen.
- Removed XP, levels and mission counters from the visible product shell.
- Preserved the dark theme, responsive market tracker, scenario deck, SOP, local DLD import lab and neutral Portfolio Lab.
- Unified source-recency warnings, documentation and deployment assets around independent market analysis.

## 1.2.0 (2026-11-23): Market Tracker edition

- Repositioned the product as the **Dubai Real Estate Market Tracker** and made the market view the default landing experience.
- Removed organization-specific branding, company profiles, benchmark datasets and operating labels.
- Added a neutral **Portfolio Lab** that preserves the sum-of-the-parts and value-play tools without representing a named company.
- Clarified official-data snapshot dates, source links, local DLD CSV ingestion and illustrative-model limitations across the UI and documentation.

## 1.1.0 (2026-11-23): Portfolio and market expansion

- Added an official-data Dubai real-estate market tracker with annual flows, current periods, top communities and sourced market signals.
- Added DLD Transactions CSV ingestion for monthly deal flow, price momentum, off-plan share and top projects.
- Added portfolio sum-of-the-parts analysis and seven transparent value-creation play models.

## 1.0.0

- Initial six-sector EBITDA value-lever simulator, sensitivity analysis, Balanced Scorecard, business case, board memo, CLI and local API.
