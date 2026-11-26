# Variance, controls and new-company cases

How the variance bridges, rolling twelve months, intercompany eliminations, sensitivity summary,
logic checker and capex/opex calculator work. Every calculation lives in `src/engine/variance.js`,
`src/engine/checks.js` and `src/engine/newco.js`, and is covered by `tests/variance.test.js`.

## Variance bridges on every tab

Every bridge is `{ start, end, steps }` and must reconcile: start + the sum of the steps = end. The
logic checker tests this for every business on every change.

| Tab | Bridge | Method |
|---|---|---|
| Market Tracker | Recorded value, year on year | Value = transactions × average ticket. Volume effect at last year's ticket; price and mix effect at this year's volume. The two add up exactly. |
| Market Entry | Cash needed before the first client | Application fees + first-year supervision + paid-up capital, for the VARA activities selected. |
| Value Plan | EBITDA, baseline to scenario | By lever (with the interaction effect shown separately), or by P&L line. |
| Portfolio Lab | Portfolio value; consolidated revenue | Baseline EV to scenario value by business and play; sum of revenues to consolidated revenue by intercompany flow. |
| New company case | Year-1 EBITDA to free cash flow | EBITDA − tax − capex − change in working capital. |
| 100-day tracker | Planned to realised EBITDA, to date | Planned EBITDA to date + one variance per initiative (realised − planned, closed months only) = realised EBITDA to date. |

## 100-day value-creation tracker

Code: `src/engine/tracker.js`, tests: `tests/tracker.test.js`.

- **Planned run rate per initiative:** the lever's run-rate EBITDA in the business case, at the lever targets the plan was built on. It includes the lever's share of the interaction effect. When several initiatives link to one lever, they share its value equally, so the plan total always equals the model.
- **Planned EBITDA by month:** run rate ÷ 365 per day, ramping linearly from the initiative's start date over the lever's ramp months. It is summed over four reporting months (days 1–30, 31–60, 61–90 and a 91–100 close-out).
- **To date:** only months closed at the report date count. Actuals entered for an open month are flagged and kept out of the bridge.
- **Risks to the plan:** past-due initiatives, milestones not done by their due date (high after 14 days), initiatives below the chosen threshold of plan (high below half of it), realised above plan without an explanation, and an "On track" status on a plan that is behind.
- **CSV:** one row per initiative, with plan-level columns repeated on each row. Text cells that start with `=`, `+`, `-` or `@` are prefixed with `'` so a spreadsheet cannot run them, and the prefix is removed on import. An import is validated in full (business, levers, statuses, dates, numbers, at most 40 rows and 200 KB) and nothing is loaded if any row fails.

## Rolling twelve months

Monthly EBITDA = baseline / 12 + each initiative's run-rate / 12 × min(1, month / ramp months). The
twelve months before the plan run at baseline, so month 1 of the rolling sum is 11 baseline months
plus one ramping month. With all initiatives ramped, the rolling sum equals run-rate EBITDA.

## Intercompany eliminations

For each flow (seller, buyer, amount, treatment):

- **Operating cost:** remove the amount from group revenue and from group cost. EBITDA is unchanged.
- **Capitalised asset:** remove the amount from revenue and from group capex, and remove the seller's
  margin on it (unrealised profit) from EBITDA.

Checks: opex eliminations net to zero in EBITDA; no flow is larger than the seller's revenue; the
margin on a capitalised flow is between 0 and 100%.

## Assumption sensitivity summary

For the selected business and its current levers, each assumption is moved by ±5%, ±10% or ±20%
(within its range) and EBITDA is recomputed. The summary shows the downside and upside swing, each
driver's share of the total swing, its elasticity (% EBITDA per 1% of the driver) and the headroom
left in its value-creating direction.

## KPIs to watch

- **Value Plan:** margin vs baseline, payback ≤ 24 months, envelope ≤ 100%, NPV > 0, board confidence
  ≥ 70, scorecard on target ≥ 75%, no high-severity risks.
- **Live Market:** the same thresholds that trigger a signal (Brent ±10%, US 10-year ±25 bp, dollar
  ±3%, VIX ≥ 25, UAE vs US ±5 pts, Emaar ±10%, freight ±15%), with how close each is to its trigger.
  Upside moves in UAE equities show as a tailwind, not a breach.

## Logic checker and missing data

The **Checks** button in the top bar runs about 75 checks across the workbook:

- **Operating models:** lever ranges, scenario presets, P&L lines adding up to EBITDA, valuation, both
  bridges reconciling, NPV recomputing, rolling 12 months converging, margin range, envelope.
- **Portfolio plays:** value equals the sum of each play's lines.
- **Market data:**
  - years in order;
  - every figure sourced;
  - plausible average tickets;
  - unofficial periods flagged.
- **Live snapshot:**
  - series in date order;
  - no missing prices;
  - freshness;
  - source fallbacks.

The missing-data list says what is absent, why it limits the model, and what would fix it. For
example: deal-level DLD transactions, monthly actuals, capex and opex by business, intercompany flows,
and daily history for the DFM and Tadawul.

## New company case: capex and opex

Inputs:
- **Revenue:** year-1 revenue and growth, and gross margin.
- **Opex:**
  - overhead headcount and cost per head;
  - rent, marketing, G&A and other;
  - headcount grows at half the revenue growth; rent and G&A rise 3% a year.
- **Capex:**
  - fit-out, equipment, technology and other set-up spend;
  - asset life and maintenance capex.
- **Working capital:** debtor, creditor and stock days.
- **Valuation:** discount rate and exit multiple.

Tax is 9% UAE corporate tax above AED 375k. Outputs:
- the yearly P&L and cash flow;
- peak funding need (the deepest cumulative cash);
- EBITDA breakeven year and payback;
- NPV, IRR and MOIC with a year-5 exit;
- a year-1 EBITDA-to-cash waterfall;
- plausibility checks.

The five templates (logistics hub, clinic, F&B group, B2B software, EV charging) are starting points to
edit, not benchmarks for a named company.
