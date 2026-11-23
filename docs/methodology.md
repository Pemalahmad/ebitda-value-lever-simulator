# Methodology

All money is in **AED millions** and all figures are annual run-rate unless stated otherwise. Every formula on this page is implemented in `src/engine/` and covered by `tests/engine.test.js`.

## 1. From levers to value

```
operating levers ──► driver-based P&L ──► EBITDA ──► enterprise value
        │                                   │
        └──► working capital ──► cash released          value created = ΔEV + cash released
        └──► one-off investment ──► business case (NPV, IRR, payback)
        └──► KPIs ──► Balanced Scorecard RAG + risk flags ──► board confidence
```

- **Enterprise value**: `EV = EBITDA × multiple`. Retail uses NOI capitalised at a cap rate (`EV = NOI / 7.25%`).
- **Value created**: `ΔEV + (WC_baseline − WC_scenario)`. Working-capital levers (construction cycle, DSO, procurement lead time, collections) create value through cash rather than EBITDA.
- **Investment**: each lever has a one-off `costPerUnit`, charged only when the lever moves in its value-creating direction. Moving a lever the "wrong" way (for example, cutting price) costs nothing, but it shows up as negative EBITDA.

### How costs are calibrated

Each lever's `costPerUnit` comes from a target payback for a 10% move at baseline: `cost per unit = EBITDA gain per unit × target payback months / 12`. Targets run from 12 months for quick wins (F&B cost ratio, collections) to 30 months for structural programmes (hotel energy retrofits). This keeps the trade-off honest: high-leverage levers are not free.

## 2. Driver trees and trade-offs

Every business model includes at least one **trade-off**, so the optimal plan is never "max every slider":

| Business | Trade-off built into the model |
|---|---|
| Real Estate | Price elasticity of demand −1.1 on sales velocity. Each point of broker commission cut below 4% loses 1.5% of velocity. |
| Hospitality | Realised occupancy = target occupancy × (ADR / base ADR)^−0.6, capped at 95%. |
| Leisure | New visitors = (base marketing / CAC) × (marketing / base)^0.5 × (yield / base)^−0.8, capped at park capacity (8.0m). Demand above capacity is lost. |
| Retail | Effective occupancy falls 0.35pp for every 1% of rent above base and 0.15pp for every point of tenant retention below 85%. |
| Community | Units under management = base × (10% new wins + retention) × fee-churn, where fee increases above 5% cause churn. |
| Urban Services | Work hours are set by the contract book. Utilisation sets the paid technician hours needed; the subcontract share sets make vs buy. Utilisation above 85% and procurement lead times above 30 days add SLA penalties. Bill rates above base lose volume at rebid (−0.6% per 1%). |

## 3. Risk flags and board confidence

Each business defines flags that fire when a lever enters a zone where the EBITDA gain carries a real operating risk (for example, hotel rooms labour below AED 135 per occupied room, tenant occupancy-cost ratio above 11.5%, or FM utilisation above 85%). Each flag has a severity, an explanation, a mitigation and an owner, and each one appears in the memo.

**Board confidence** (0–100) starts at 70 and then moves as follows:

- −18 for each high-severity flag, −8 for each medium, −3 for each low
- −10 to −25 when the programme exceeds the business's transformation budget
- up to +15 for positive NPV (scaled by NPV / baseline EV)
- +5 for payback within 24 months
- ±10 for Balanced Scorecard health (share of KPIs on target)

**Value score** = value created × confidence / 100.

**Ranks** need both value created (as % of baseline EV) and confidence:

| Rank | Value / EV | Confidence |
|---|---|---|
| Analyst | 0% | 0 |
| Associate | 2% | 0 |
| Manager | 5% | 50 |
| Director | 12% | 70 |
| Chief Value Officer | 20% | 80 |

## 4. Sensitivity analysis

- **EBITDA bridge**: the isolated effect of each moved lever (that lever alone moved from baseline), sorted by size, plus an explicit **interaction** bar so the bridge always reconciles to the scenario.
- **Tornado**: the EBITDA change for ±10% of each lever's base value from the current scenario, with all other levers held, sorted by swing.
- **Leverage ranking**: each lever moved a further 10% in its value-creating direction, ranked by value created (ΔEV + cash), with one-off cost and simple payback.
- **Two-way grid**: EBITDA across ±20% on the two most sensitive drivers.

## 5. Business case

For each moved lever (one initiative):

- **Run-rate EBITDA** = isolated effect + a pro-rata share of the interaction effect, so the initiatives sum exactly to the scenario's ΔEBITDA.
- **Ramp**: linear to run rate over `rampMonths`. Year-n realisation is the average of the monthly realisation over that year.
- **Cash flows**: year 0 = −investment. Years 1–5 = realised EBITDA × (1 − 9% UAE corporate tax), plus the working-capital release in year 1. There is no terminal value, which keeps the case conservative; the EV figure captures the perpetuity view.
- **NPV** at the business's WACC (8.5%–10%). **IRR** by bisection. **Payback** on monthly after-tax cumulative cash.

> EV created and NPV answer different questions. EV created is what the market would pay for the new run-rate EBITDA. NPV is the five-year cash return on this programme's investment. The memo reports both.

## 6. Balanced Scorecard

Six KPIs per business across Financial, Customer, Internal Process and Learning & Growth. Status:

- **Green**: meets the target
- **Amber**: within 5% of the target
- **Red**: more than 5% off the target

A perspective takes the status of its worst KPI. Customer-facing indices (guest satisfaction, handover quality, resident satisfaction, guest experience) are **model proxies**. They respond to labour, spec, utilisation and pricing decisions so that cost cuts have a visible customer cost. They are not survey data.

## 7. Memo logic

The verdict is:

- **Approve**: positive ΔEBITDA and NPV, no high-severity risks, within budget
- **Approve with conditions**: positive ΔEBITDA and NPV, but a high-severity risk or a budget overrun
- **Do not approve as framed**: otherwise

Every number in the memo is read from the engine's output for the same scenario.

## 8. Group plays (`src/engine/plays.js`)

Each play returns value-bridge lines that sum to its value, the cash raised or deployed, and the change in run-rate EBITDA:

| Play | Value lines |
|---|---|
| REIT carve-out | re-rating `NOI/listing yield − NOI/book yield` + development margin on redeployed cash `(cash × yield on cost)/listing yield − cash` − fees |
| Subsidiary IPO | `EBITDA × (IPO multiple × (1 − discount) − book multiple)`; cash = priced EV × stake floated |
| Land-bank JV | land revaluation `area × (market − book)` + group share of `area × (price − build − market land)` |
| Asset-light hospitality | `fee EBITDA × fee multiple − key money`; fee EBITDA = (base fee × revenue + incentive fee × GOP) × 70% conversion |
| Platform consolidation | `synergy × group multiple − one-off integration cost` |
| Bolt-on M&A | `EBITDA × (group − purchase multiple) + synergies × group multiple − fees` |
| Master-planned launch | NPV of development profit (`units × price × margin`) spread evenly over the delivery period |

The group value bridge adds the operating value created in each vertical (ΔEV + cash released) and the value of each active play to the modelled baseline EV.

## 9. Market tracker (`src/engine/market.js`)

The official aggregates are hand-curated from DLD and Dubai Media Office publications in `data/market/dld-official.json`, each with its source. The deal-level tracker reads the DLD open-data Transactions CSV:

- **Parser**: RFC 4180 CSV (quoted fields, BOM, CRLF); dates in `DD-MM-YYYY`.
- **Price per m²** = `Amount / Transaction Size (sq.m)` (falls back to Property Size).
- **Momentum** (the "drops and increases" view): median AED/m² of *sales* in the latest 90 days vs the 90 days before, per area, for areas with at least 20 sales in both windows.
- **Off-plan share** = sales with registration type Off-Plan ÷ all sales.

## Limitations

- The baselines and elasticities are illustrative, not fitted to data.
- The model is static run-rate economics with no seasonality, financing or capex lifecycle.
- Levers interact only through the explicit mechanisms above.
- Deterministic only. A Monte Carlo range is on the roadmap.
