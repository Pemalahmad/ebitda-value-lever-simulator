# Market Pulse

The landing tab, built for an investment manager in Dubai: one read before the investment committee on what moved,
what it means for a Dubai real-estate, hospitality, retail and logistics portfolio, and what the local papers are saying,
with a journal that holds each decision to account. **It is a reading aid, not investment advice.**

## Widgets

| Widget | What it answers |
|---|---|
| **Top signals** | Which moves crossed a threshold today, ranked Act now / Watch / Tailwind, each with why it matters here and the data or headlines behind it. |
| **Markets** | DFM, Tadawul, MSCI UAE, Emaar, Emaar Development, Emirates NBD, DEWA, Salik; S&P 500, STOXX 600, Nikkei, emerging markets; Brent, gold, copper; the dollar index (the dirham is pegged to it), EUR/USD, the US 10-year yield; VIX and dry-bulk freight. 1-day, 1-week, 1-month and 3-month change with a 3-month trend line. |
| **Trade, maritime and logistics** | The Strait of Hormuz, the Red Sea and Bab el-Mandeb, and the Suez Canal: headlines in the last 3 days, why each matters to the Gulf, with freight and oil alongside. |
| **Country movement** | Which countries are in the news this week, on which theme, and whether the story is building (more in the last 2 days than the rest of the week). Click a country to filter the news. |
| **News by theme** | Local and trade headlines sorted into resilience, security, economy, resources, infrastructure and society, linked to the original articles. |
| **Decision journal** | The call before you make it: stance (Buy, Add, Hold, Trim, Exit, Wait), conviction, horizon, thesis, what would change your mind, the signals it rests on, a pre-commitment checklist and a review date. Market levels are saved with each note so a review shows what has moved since. Notes stay in the browser; export and import them as JSON. |

## Signals and their thresholds

| Signal | Fires when | Why it matters in Dubai |
|---|---|---|
| Oil | Brent moves 10% or more in a month | GCC budgets, liquidity and government-linked demand vs inflation, freight and airline costs |
| Rates | US 10-year yield moves 25 bp or more in a month | The dirham peg imports US rates into mortgages, development finance and cap rates |
| Dollar | Dollar index moves 3% or more in a month | What AED assets cost European, British and Asian buyers and visitors |
| Risk-off | VIX at 25 or above | IPO windows and foreign inflows slow; liquidity matters more |
| UAE vs US equities | DFM (or MSCI UAE when the DFM month is unavailable) leads or lags the S&P 500 by 5 points in a month | Local sentiment for listings and capital recycling |
| Property bellwether | Emaar moves 10% or more in a month | Off-plan sentiment and developer financing |
| Freight | Dry-bulk freight moves 15% or more in a month | Construction-material and import costs, logistics demand |
| Chokepoints | 3 or more headlines on a chokepoint in 3 days (8 or more: Act now) | Oil flows, Jebel Ali, Asia–Europe container routes, insurance |
| Regional security | 6 or more Gulf or Iran security headlines in 3 days | Tourism, insurance and buyer sentiment move before fundamentals |

## Sources and refresh

`npm run pulse` (`scripts/fetch-pulse.mjs`) writes `data/pulse/pulse.json`. CI runs it before every build on `main` and
every 6 hours, so the deployed site carries data at most about 6 hours old; the committed snapshot is the fallback.

- **Prices:** Yahoo Finance delayed quotes. The DFM and Tadawul indices only publish monthly history on this source,
  and it currently stops in March 2025, so they show today's level and daily move only. Changes are never computed
  against a point that is not really a month (or three months) back.
- **News:** Gulf News, The National and Arabian Business feeds; Khaleej Times, WAM and Zawya through Google News
  (their own feeds block automated readers); gCaptain and Splash247 for shipping; a Google News search for the three
  chokepoints. Only headlines, links, publisher names and dates are stored, never article text.
- **If a source fails,** its last good data is kept and the Sources card marks it.
- **World Monitor** (worldmonitor.app) is linked for live maps of conflicts, shipping and flights. Its API needs a
  key; with one, its maritime and country-risk data can be added to the collector.
