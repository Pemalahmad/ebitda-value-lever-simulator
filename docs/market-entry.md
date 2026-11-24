# UAE Market Entry

A step-by-step regulatory roadmap for entering the UAE, for any business, with a full track for virtual-asset (crypto)
businesses benchmarked on Dubai's VARA regime and its ADGM and DIFC equivalents. Rules and figures are as at
24 November 2026 and come from the sources listed below. **It is a planning aid, not legal advice:** confirm every
requirement with the regulator and UAE counsel before relying on it.

## The set-up guide (all businesses)

Data in `src/engine/entryGuide.js`, tested in `tests/entry.test.js`.

1. **Where to set up.** Choose what you are launching:
   - crypto service, or a non-custodial crypto product;
   - small-office launch, or trading and import;
   - tech or SaaS, fintech, or onshore F&B, retail or clinic;
   - holding company, or manufacturing.

   The three best locations are ranked with the reason. Each shows the indicative first-year cost, set-up time, whether it can sell onshore, the office rule and what to watch. A table compares all eight locations: Dubai mainland, DMCC, IFZA/Meydan, JAFZA, DIFC, Abu Dhabi mainland, ADGM, and KEZAD/Masdar.
2. **Step by step** for the chosen route: Dubai mainland (DET), a Dubai free zone, Abu Dhabi mainland (ADDED via TAMM), ADGM or DIFC.
   - **The 14 steps:**
     1. activity and legal form;
     2. name and initial approval;
     3. regulatory approval;
     4. attestation and translation;
     5. memorandum of association;
     6. office lease (Ejari or Tawtheeq);
     7. licence;
     8. beneficial-owner register;
     9. immigration and labour files;
     10. bank account;
     11. corporate tax;
     12. VAT;
     13. visas;
     14. the compliance calendar.
   - **Each step shows** the platform with a link, the documents (tickable), the indicative cost and time, the bottleneck and a tip.
3. **Timeline.** A schedule that runs steps in parallel where possible, with best-case, typical and prudent estimates. The critical path is highlighted.
4. **Memorandum of association.**
   - the ten clauses to write;
   - how to execute it: agree, draft, translate, notarise or e-sign, submit;
   - official template sources, cost and pitfalls.
5. **VAT and corporate tax.**
   - registration rules, rates, deadlines, returns and penalties;
   - what the EmaraTax VAT application asks for, section by section.
6. **Compliance bottlenecks**, ranked by impact with how to clear each.

Costs are indicative ranges from published 2026 adviser estimates, which disagree with each other. Each step links the authority's own portal so the figure can be confirmed before budgeting.

## How the tab works

1. **Entry profile.** Pick the business model and where the entity sits. The page tells you which regimes apply and
   which regulator licenses virtual-asset activity in that zone, and flags structural traps.
   - Models: a trading, services or technology company; a consumer product sold in the UAE; a self-custody crypto
     product (hardware or software wallet where the user holds the keys); a virtual-asset service provider.
   - Zones: Dubai mainland or a Dubai free zone (VARA), DIFC (DFSA), ADGM (FSRA), or another emirate (SCA).
2. **Set up the company.** Seven steps every business follows, each with a checklist.
3. **Bring the product in.** Customs, TDRA type approval for wireless devices, conformity and Arabic labelling, channels.
4. **Self-custody: where the licence line sits.** Feature by feature: what stays a product sale and what becomes a
   regulated activity (custody, brokerage, lending, payments, marketing).
5. **Get licensed.** VARA's two stages, with what to file, what is and is not allowed at each stage, and when fees fall due.
6. **Capital and fee calculator.** Pick VARA activities and fixed annual overheads; see application and supervision fees
   and the paid-up capital floor.
7. **Compliance from day one,** **pitfalls,** and **sources.**

Checklist progress and choices stay in the browser (`localStorage`); nothing is sent anywhere.

## The VARA process

### Stage 1: Initial Disclosure Questionnaire (IDQ) and Approval to Incorporate (ATI)

- Filed through Dubai Economy and Tourism or a Dubai free zone (not DIFC).
- File: the IDQ (ownership, control, governance, intended activities); a business plan (activities, target markets and
  clients, products, organisation chart, technology architecture, revenue model and projections); beneficial-owner
  disclosures with source-of-funds and source-of-wealth evidence; a token white paper where a token is issued; early
  drafts of key controls.
- The ATI allows incorporation, an office lease, hiring and bank accounts. It does **not** allow any virtual-asset
  activity, client onboarding or marketing of the activity.
- About half of the application fee is paid at this stage.

### Stage 2: Full licence

- File: full policies against the Rulebooks (compliance and risk, AML/CFT, market conduct, technology and information
  security, and the activity rulebook); operations manuals, client terms and complaints process; evidence of paid-up
  capital and a reserve account report; insurance; projections and a wind-down plan; a Dubai office lease; two approved
  full-time Responsible Individuals resident in the UAE.
- Expect management interviews and technical review.
- The rest of the application fee and the first annual supervision fee are due before activity starts.
- Typical timeline across both stages: four to twelve months.

## Fees and capital (VARA)

| Activity | Application fee | Annual supervision | Paid-up capital (higher of) |
|---|---|---|---|
| Advisory | AED 40,000 | AED 80,000 | AED 100,000 |
| Broker-dealer | AED 100,000 | AED 200,000 | AED 600,000 or 25% of overheads (AED 400,000 or 15% with a licensed custodian) |
| Custody (separate entity) | AED 100,000 | AED 200,000 | AED 600,000 or 25% of overheads |
| Exchange | AED 100,000 | AED 200,000 | AED 1,500,000 or 25% of overheads (AED 800,000 or 15% with a licensed custodian) |
| Lending and borrowing | AED 100,000 | AED 200,000 | AED 500,000 or 25% of overheads |
| VA management and investment | AED 100,000 | AED 200,000 | AED 500,000 or 25% of overheads (AED 280,000 or 15% with a licensed custodian) |
| VA transfer and settlement | AED 40,000 | AED 80,000 | AED 500,000 or 25% of overheads |
| VA issuance | AED 100,000 | AED 200,000 | Set by the VA Issuance Rulebook and token category |

Additional activities attract a reduced extension fee, so the calculator's summed application fee is an upper bound.
With several activities, the calculator shows the highest single requirement as the capital floor; VARA may require more.

## Core compliance

- **AML/CFT:** enterprise risk assessment; client due diligence and enhanced checks; sanctions and PEP screening;
  transaction and blockchain-analytics monitoring; the Travel Rule; suspicious transaction reports through goAML; a named
  MLRO; record keeping and independent audit.
- **Marketing:** only a licensed firm, or someone it approves to act on its behalf, may market a virtual-asset activity
  to the UAE, including from abroad. Nothing before the licence: no promotion, sign-ups or waitlists. Risk disclaimers
  on marketing about buying virtual assets; privacy-token promotion is banned; unlicensed firms may exhibit at physical
  events in Dubai with a not-licensed disclaimer and no onboarding. Fines up to AED 10m per violation.
- **Central Bank overlay:** Federal Decree-Law No. 6 of 2025 brings payment services using virtual assets and
  stablecoins under the Central Bank; its one-year transition ended on 16 September 2026.

## Sources

- [VARA Rulebooks](https://rulebooks.vara.ae/) and [VARA](https://www.vara.ae/)
- [Schedule 2 fees, summarised by Neo Legal](https://neolegal.ae/neolegal_vara_license)
- [Capital by activity and the two-stage process, summarised by Medici (15 Sep 2026)](https://medici.expert/insights/vara-licence-full-cost)
- [VARA Marketing Regulations 2024, analysis by Hoot (current as at 1 Jul 2026)](https://hootlegal.com/position/must-follow-varas-marketing-rules-and-what-do-they-require) and the [physical events exemption](https://rulebooks.vara.ae/entiresection/419)
- [Federal Decree-Law No. 6 of 2025 transition](https://mpelitesconsulting.com/updates/crypto-licensing-transition-16-september) and [CBUAE legislation](https://centralbank.ae/en/legislation/)
- [SCA](https://www.sca.gov.ae/), [ADGM FSRA](https://www.adgm.com/financial-services-regulatory-authority), [DFSA](https://www.dfsa.ae/)
- [Federal Tax Authority](https://tax.gov.ae/), [data protection law](https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws), [TDRA](https://tdra.gov.ae/), [MoIAT](https://moiat.gov.ae/), [MoHRE](https://www.mohre.gov.ae/), [UAE FIU (goAML)](https://www.uaefiu.gov.ae/)

Fee and capital figures are taken from adviser summaries of VARA's Schedule 2 and Company Rulebook; read the primary
rulebooks before relying on them.
