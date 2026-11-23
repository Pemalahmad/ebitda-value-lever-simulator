// UAE market entry: a regulatory roadmap for any business entering the UAE, with a deep track for virtual-asset
// (crypto) businesses benchmarked on Dubai's VARA regime, and a track for consumer products sold into the UAE.
// Figures come from the cited sources as at November 2026. This is a planning aid, not legal advice: every number
// and rule must be confirmed with the regulator and UAE counsel before it is relied on.

export const AS_OF = '2026-11-24';

export const SOURCES = {
  varaRulebooks: { title: 'VARA Rulebooks (Company, Compliance & Risk, Technology, Market Conduct, activity rulebooks)', url: 'https://rulebooks.vara.ae/' },
  varaSite: { title: 'VARA: licensing process and licence applications', url: 'https://www.vara.ae/' },
  varaSchedule2: { title: 'VARA Regulations 2023, Schedule 2 fees (summarised by Neo Legal)', url: 'https://neolegal.ae/neolegal_vara_license', date: '2026' },
  varaCapital: { title: 'VARA Company Rulebook, paid-up capital by activity (summarised by Medici)', url: 'https://medici.expert/insights/vara-licence-full-cost', date: '2026-09-15' },
  varaMarketing: { title: 'VARA Regulations on the Marketing of Virtual Assets 2024 (analysis by Hoot)', url: 'https://hootlegal.com/position/must-follow-varas-marketing-rules-and-what-do-they-require', date: 'current as at 2026-07-01' },
  varaEvents: { title: 'VARA Marketing Regulations: physical events exemption', url: 'https://rulebooks.vara.ae/entiresection/419' },
  cbuaeLaw: { title: 'Federal Decree-Law No. 6 of 2025 (CBUAE law): transitional period ended 16 September 2026', url: 'https://mpelitesconsulting.com/updates/crypto-licensing-transition-16-september', date: '2026-08-31' },
  cbuaeLegislation: { title: 'Central Bank of the UAE: legislation and regulations', url: 'https://centralbank.ae/en/legislation/' },
  sca: { title: 'Securities and Commodities Authority (federal virtual-asset licensing outside the financial free zones)', url: 'https://www.sca.gov.ae/' },
  adgm: { title: 'ADGM Financial Services Regulatory Authority: virtual assets', url: 'https://www.adgm.com/financial-services-regulatory-authority' },
  dfsa: { title: 'DFSA: crypto token regime (DIFC)', url: 'https://www.dfsa.ae/' },
  tax: { title: 'UAE Federal Tax Authority: corporate tax and VAT registration', url: 'https://tax.gov.ae/' },
  pdpl: { title: 'UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021)', url: 'https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws' },
  tdra: { title: 'TDRA: type approval for telecom and wireless equipment', url: 'https://tdra.gov.ae/' },
  moiat: { title: 'Ministry of Industry and Advanced Technology: conformity (ECAS) schemes', url: 'https://moiat.gov.ae/' },
  mohre: { title: 'MoHRE: Emiratisation targets and the Wage Protection System', url: 'https://www.mohre.gov.ae/' },
  goaml: { title: 'UAE Financial Intelligence Unit: goAML registration', url: 'https://www.uaefiu.gov.ae/' },
};

// Where the business sits decides who regulates it. Virtual-asset activity is licensed by the authority of the zone.
export const JURISDICTIONS = [
  { id: 'dubai', label: 'Dubai mainland or a Dubai free zone (not DIFC)', vaRegulator: 'VARA', note: 'VARA licenses virtual-asset activity in and from Dubai, including the free zones (DMCC, DWTC and others), with the DIFC carved out.', src: 'varaCapital' },
  { id: 'difc', label: 'DIFC (Dubai International Financial Centre)', vaRegulator: 'DFSA', note: 'The DFSA authorises crypto-token firms under its own regime, in force in its current form since 12 January 2026. Common-law courts; suits institutional business.', src: 'varaCapital' },
  { id: 'adgm', label: 'ADGM (Abu Dhabi Global Market)', vaRegulator: 'FSRA', note: 'The FSRA grants a Financial Services Permission for virtual-asset activity, with its own capital and fee schedule. Suits institutional and fund business.', src: 'varaCapital' },
  { id: 'other', label: 'Another emirate, mainland or non-financial free zone', vaRegulator: 'SCA', note: 'Federal virtual-asset licensing by the Securities and Commodities Authority (Cabinet Decision 111 of 2022), unless a local authority licenses the activity.', src: 'sca' },
];

// The eight VARA activities. Fees: Schedule 2 of the 2023 Regulations. Capital: paid-up capital in the Company
// Rulebook, the higher of a floor or a share of fixed annual overheads; some activities are lower when a separately
// VARA-licensed custodian holds client assets.
export const VA_ACTIVITIES = [
  { id: 'advisory', label: 'Advisory services', application: 40000, supervision: 80000, capital: { floor: 100000, overheadShare: 0 } },
  { id: 'broker', label: 'Broker-dealer services', application: 100000, supervision: 200000, capital: { floor: 600000, overheadShare: 0.25 }, withCustodian: { floor: 400000, overheadShare: 0.15 } },
  { id: 'custody', label: 'Custody services', application: 100000, supervision: 200000, capital: { floor: 600000, overheadShare: 0.25 }, note: 'Must sit in its own legal entity with a standalone licence.' },
  { id: 'exchange', label: 'Exchange services', application: 100000, supervision: 200000, capital: { floor: 1500000, overheadShare: 0.25 }, withCustodian: { floor: 800000, overheadShare: 0.15 } },
  { id: 'lending', label: 'Lending and borrowing services', application: 100000, supervision: 200000, capital: { floor: 500000, overheadShare: 0.25 } },
  { id: 'management', label: 'VA management and investment services', application: 100000, supervision: 200000, capital: { floor: 500000, overheadShare: 0.25 }, withCustodian: { floor: 280000, overheadShare: 0.15 } },
  { id: 'transfer', label: 'VA transfer and settlement services', application: 40000, supervision: 80000, capital: { floor: 500000, overheadShare: 0.25 } },
  { id: 'issuance', label: 'VA issuance (token issuance)', application: 100000, supervision: 200000, capital: null, note: 'Capital and conditions are set by the VA Issuance Rulebook and the token category; agree them with VARA.' },
];

const activity = (id) => VA_ACTIVITIES.find((a) => a.id === id);

export function capitalFor(id, overheads = 0, usesCustodian = false) {
  const a = activity(id);
  if (!a?.capital) return null;
  const c = usesCustodian && a.withCustodian ? a.withCustodian : a.capital;
  return Math.max(c.floor, Math.round(c.overheadShare * Math.max(0, overheads)));
}

// Regulatory cost of a VARA licence for a set of activities. Application fees are summed per activity as an upper
// bound (VARA charges a reduced extension fee for additional activities); the Approval to Incorporate payment is
// typically half the application fee. Capital: the highest single-activity requirement is the floor.
export function varaCosts(ids, { overheads = 0, usesCustodian = false } = {}) {
  const acts = ids.map(activity).filter(Boolean);
  const application = acts.reduce((s, a) => s + a.application, 0);
  const supervision = acts.reduce((s, a) => s + a.supervision, 0);
  const caps = acts.map((a) => ({ id: a.id, label: a.label, capital: capitalFor(a.id, overheads, usesCustodian) }));
  const known = caps.filter((c) => c.capital != null).map((c) => c.capital);
  return {
    application, atiPayment: Math.round(application / 2), supervision,
    capitalFloor: known.length ? Math.max(...known) : null, capitalByActivity: caps,
    firstYear: application + supervision, separateCustodyEntity: ids.includes('custody') && ids.length > 1,
  };
}

// Business models the roadmap knows. Each maps to the regimes that apply.
export const MODELS = [
  { id: 'general', label: 'Trading, services or technology company (no virtual assets)', va: false, product: false },
  { id: 'product', label: 'Consumer product imported and sold in the UAE (online or retail)', va: false, product: true },
  { id: 'selfcustody', label: 'Self-custody crypto product (hardware or software wallet; the user holds the keys)', va: 'partners', product: true },
  { id: 'vasp', label: 'Virtual-asset service provider (exchange, broker, custody, lending, advisory, issuance)', va: true, product: false },
];

export function assess({ model = 'general', jurisdiction = 'dubai', activities = [], marketsInApp = false } = {}) {
  const m = MODELS.find((x) => x.id === model) ?? MODELS[0];
  const j = JURISDICTIONS.find((x) => x.id === jurisdiction) ?? JURISDICTIONS[0];
  const needs = ['Company setup: trade licence, UBO register, bank account, visas, tax registration'];
  const flags = [];
  if (m.product) needs.push('Product compliance: import code, conformity marks, Arabic labelling, consumer-protection terms');
  if (m.va === true) {
    needs.push(`${j.vaRegulator} licence for each virtual-asset activity before any activity or marketing`);
    if (!activities.length) flags.push('Pick the activities you will carry on: the licence, capital and fees follow from them.');
    if (j.vaRegulator === 'VARA' && activities.includes('custody') && activities.length > 1) flags.push('Custody must be licensed in a separate legal entity from exchange or broker-dealer activity.');
  }
  if (m.va === 'partners') {
    needs.push('No custody licence where the user alone holds the keys and the company never controls client assets: confirm the perimeter with the regulator in writing');
    if (marketsInApp) {
      needs.push('Buy, sell, swap or staking features offered to UAE users must be run by licensed providers, and promoting them is marketing of a virtual-asset activity');
      flags.push('Marketing a virtual-asset activity to the UAE is allowed only for a licensed firm or someone it approves to act on its behalf. Fines reach AED 10m per violation.');
    }
  }
  if (m.va) needs.push('Federal overlay: payment use of virtual assets or stablecoins falls under the Central Bank (Federal Decree-Law No. 6 of 2025)');
  return { model: m, jurisdiction: j, needs, flags };
}

// The general UAE entry roadmap, in order. Every business does these.
export const COMPANY_STEPS = [
  { id: 'c1', title: 'Choose the structure and the zone', detail: 'Mainland (Department of Economy and Tourism in Dubai) to trade anywhere in the UAE; a free zone for 100% foreign ownership in a defined activity and simpler setup; a branch of the foreign parent; or a financial free zone (DIFC, ADGM) for regulated financial business. Mainland now allows 100% foreign ownership for most activities.', checks: ['Activity list matched to the licence', 'Mainland vs free zone vs branch decided', 'Office or flexi-desk that meets the licence and visa quota'] },
  { id: 'c2', title: 'Reserve the trade name and get initial approval', detail: 'Name reservation and initial approval from the licensing authority. Regulated activities need the regulator\'s no-objection first: for virtual assets, the regulator\'s approval comes before incorporation.', checks: ['Trade name reserved', 'Regulator no-objection where the activity is regulated'] },
  { id: 'c3', title: 'Incorporate and register beneficial owners', detail: 'Memorandum of association, shareholder and manager documents (legalised and attested if issued abroad), and the ultimate beneficial owner register filed with the licensing authority (Cabinet Decision 109 of 2023).', checks: ['Constitutional documents attested', 'UBO register filed', 'Manager and signatories appointed'] },
  { id: 'c4', title: 'Open the corporate bank account', detail: 'Expect enhanced due diligence for regulated or crypto-linked business: source of funds, the business plan, the licence and the compliance framework. Allow weeks, not days.', checks: ['Source-of-funds file', 'Compliance manual ready for the bank', 'Account opened'] },
  { id: 'c5', title: 'Register for tax', detail: 'Corporate tax registration with the Federal Tax Authority for every company (9% above AED 375,000 of taxable profit; qualifying free-zone income can be 0%). VAT registration at 5% once taxable supplies exceed AED 375,000 a year.', checks: ['Corporate tax registration number', 'VAT registration when over the threshold', 'Transfer-pricing file if the parent charges the UAE entity'], src: 'tax' },
  { id: 'c6', title: 'Hire and get visas', detail: 'Establishment card, employment visas and Emirates ID; labour contracts through MoHRE (mainland) or the free zone. Salaries paid through the Wage Protection System. Mainland companies with 50 or more staff must raise their Emirati share by 2 percentage points a year.', checks: ['Establishment card', 'Visas and Emirates IDs', 'WPS payroll', 'Emiratisation plan if 50+ staff'], src: 'mohre' },
  { id: 'c7', title: 'Data protection and consumer terms', detail: 'Personal data of UAE customers falls under the federal data protection law outside DIFC and ADGM, which have their own laws. Consumer-facing terms, returns and warranty must meet the Consumer Protection Law (Federal Law No. 15 of 2020), with Arabic versions.', checks: ['Privacy notice and data map', 'Cross-border transfer basis', 'Arabic consumer terms and warranty'], src: 'pdpl' },
];

// Track for consumer products (including hardware devices) sold into the UAE.
export const PRODUCT_STEPS = [
  { id: 'p1', title: 'Customs and import', detail: 'A customs client code for the importing entity, correct HS codes, and a decision on who is importer of record: your own entity, a distributor or a fulfilment partner.', checks: ['Customs code', 'HS codes confirmed', 'Importer of record chosen'] },
  { id: 'p2', title: 'Wireless type approval', detail: 'Devices with Bluetooth, NFC, Wi-Fi or cellular radios need TDRA type approval before sale, and the seller registers as a dealer.', checks: ['TDRA type approval per model', 'Dealer registration'], src: 'tdra' },
  { id: 'p3', title: 'Conformity and labelling', detail: 'Check whether the product category falls under an Emirates Conformity Assessment Scheme (ECAS) or other MoIAT technical regulation. Arabic labelling on packaging, warranty card and instructions.', checks: ['ECAS or MoIAT check', 'Arabic labels and manuals'], src: 'moiat' },
  { id: 'p4', title: 'Channels', detail: 'Direct online store, marketplaces (Amazon.ae, Noon), electronics retailers and distributors. Each channel has its own onboarding, margin and returns terms; marketplaces often need the UAE trade licence and VAT number.', checks: ['Channel mix and margin plan', 'Marketplace seller accounts', 'Returns and warranty service in-country'] },
];

// The virtual-asset track: VARA's two stages, with what to file, what you may and may not do, and the fees.
export const VASP_STAGES = [
  {
    id: 'v1', title: 'Stage 1: Initial Disclosure Questionnaire and Approval to Incorporate',
    detail: 'Filed through Dubai Economy and Tourism or a Dubai free zone (not DIFC). VARA may meet the proposed Responsible Individuals before deciding.',
    file: ['Initial Disclosure Questionnaire: ownership, control, governance and intended activities', 'Business plan: activities, target markets and clients, products, organisation chart, technology architecture, revenue model and projections', 'Ultimate beneficial owner disclosures and source-of-funds and source-of-wealth evidence', 'Token white paper, where a token is issued', 'Early drafts of key controls (AML/CFT, risk)'],
    allowed: 'The Approval to Incorporate lets you incorporate, lease an office, hire and open accounts.',
    notAllowed: 'It does not allow any virtual-asset activity, onboarding of clients, or marketing of the activity.',
    fee: 'About half of the application fee is paid at this stage.',
  },
  {
    id: 'v2', title: 'Stage 2: Full licence application',
    detail: 'Show the firm is ready to run. Expect management interviews and technical review of systems and security.',
    file: ['Full policies against the Rulebooks: compliance and risk, AML/CFT, market conduct, technology and information security, plus the activity rulebook', 'Operations manuals, client terms and complaints process', 'Evidence of paid-up capital and a reserve account report', 'Insurance certificates', 'Financial projections and a wind-down plan', 'Office lease in Dubai and two approved full-time Responsible Individuals resident in the UAE', 'Independent technology or security audit where requested'],
    allowed: 'On issue, the licence covers only the activities named on it, often with conditions before full launch.',
    notAllowed: 'No activity outside the licence; changes in control, activities or key staff need VARA approval.',
    fee: 'The rest of the application fee and the first annual supervision fee are due before activity starts.',
  },
];

export const COMPLIANCE = [
  { id: 'aml', title: 'AML/CFT', points: ['Enterprise-wide risk assessment, board-approved', 'Client due diligence at onboarding: identity, beneficial owner, source of funds; enhanced checks for higher risk', 'Sanctions and PEP screening, ongoing', 'Transaction and blockchain-analytics monitoring', 'Travel Rule data with every transfer between providers', 'Suspicious transaction reports to the FIU through goAML; a named MLRO', 'Record keeping and independent AML audit'], src: 'goaml' },
  { id: 'capital', title: 'Capital and prudential', points: ['Paid-up capital at or above the activity floor, reconciled monthly', 'Higher of the floor or 15–25% of fixed annual overheads', 'Client assets segregated; custody in a separate licensed entity', 'Insurance and a tested wind-down plan'], src: 'varaCapital' },
  { id: 'marketing', title: 'Marketing', points: ['Only a licensed firm, or someone it approves, may market a virtual-asset activity to the UAE, including from abroad', 'Before the licence: no promotion, sign-ups or waitlists for the activity', 'Risk disclaimer on marketing about buying virtual assets', 'Privacy-token promotion is banned outright', 'Physical events in Dubai: unlicensed firms may exhibit with a not-licensed disclaimer and no onboarding', 'Fines up to AED 10m per violation'], src: 'varaMarketing' },
  { id: 'governance', title: 'Governance and people', points: ['Two Responsible Individuals: full-time, UAE resident, approved as fit and proper', 'Compliance officer and MLRO', 'Board oversight, conflicts policy, outsourcing register', 'Approval before changes of control, activities or key staff'], src: 'varaRulebooks' },
  { id: 'tech', title: 'Technology and security', points: ['Information-security programme and key management', 'Penetration testing and incident reporting', 'Business continuity and data location', 'Smart-contract audits where relevant'], src: 'varaRulebooks' },
];

export const PITFALLS = [
  'Incorporating, announcing or opening a waitlist before the regulator\'s approval.',
  'Marketing into the UAE from abroad: the marketing rules reach unlicensed and offshore firms.',
  'Choosing the zone last: VARA, DFSA, FSRA and SCA are separate regimes with separate entities, capital and fees.',
  'Budgeting only for the first payment: capital, insurance, office and two resident Responsible Individuals are due by Stage 2.',
  'Ignoring the Central Bank overlay: payments in virtual assets or stablecoins need Central Bank licensing (transition ended 16 September 2026).',
  'A "technology only" claim that does not survive scrutiny: regulators look at the economic function, not the label.',
  'Hardware sold without TDRA type approval, Arabic labelling or in-country warranty service.',
  'Bank account delays: banks run their own crypto risk review after the licence.',
];
