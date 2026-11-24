// UAE set-up guide: where to set up for each kind of business, and every step for each route with the
// platform to use, documents, indicative cost, time and the bottleneck to expect. As at November 2026.
// Costs are indicative ranges from published adviser estimates; government fee schedules change and
// agent packages differ, so every figure points to the authority's own fee page to confirm.

export const GUIDE_AS_OF = '2026-11-24';

export const ROUTES = [
  { id: 'dxbml', label: 'Dubai mainland', authority: 'Department of Economy and Tourism (DET)', portal: { name: 'Invest in Dubai', url: 'https://investindubai.gov.ae/' } },
  { id: 'dxbfz', label: 'Dubai free zone', authority: 'Free-zone authority (DMCC, IFZA, Meydan, JAFZA, DIC…)', portal: { name: 'The free zone’s own portal', url: 'https://www.dmcc.ae/' } },
  { id: 'auhml', label: 'Abu Dhabi mainland', authority: 'Abu Dhabi Department of Economic Development (ADDED)', portal: { name: 'TAMM', url: 'https://www.tamm.abudhabi/' } },
  { id: 'adgm', label: 'ADGM (Abu Dhabi)', authority: 'ADGM Registration Authority; FSRA if regulated', portal: { name: 'ADGM Access', url: 'https://www.adgm.com/' } },
  { id: 'difc', label: 'DIFC (Dubai)', authority: 'DIFC Registrar; DFSA if regulated', portal: { name: 'DIFC Client Portal', url: 'https://www.difc.com/' } },
];

const P = {
  investDubai: { name: 'Invest in Dubai (DET)', url: 'https://investindubai.gov.ae/' },
  tamm: { name: 'TAMM (ADDED)', url: 'https://www.tamm.abudhabi/' },
  dmcc: { name: 'DMCC Member Portal', url: 'https://www.dmcc.ae/' },
  ifza: { name: 'IFZA portal', url: 'https://ifza.com/' },
  meydan: { name: 'Meydan Free Zone portal', url: 'https://www.meydanfz.ae/' },
  adgm: { name: 'ADGM Access', url: 'https://www.adgm.com/' },
  difc: { name: 'DIFC Client Portal', url: 'https://www.difc.com/' },
  ejari: { name: 'Ejari (Dubai REST app, DLD)', url: 'https://dubailand.gov.ae/' },
  tawtheeq: { name: 'Tawtheeq (via TAMM)', url: 'https://www.tamm.abudhabi/' },
  mofa: { name: 'MOFA attestation (UAE)', url: 'https://www.mofa.gov.ae/' },
  notary: { name: 'Notary public / UAE PASS e-signature', url: 'https://www.moj.gov.ae/' },
  gdrfa: { name: 'GDRFA Dubai', url: 'https://gdrfad.gov.ae/' },
  icp: { name: 'ICP (federal, Abu Dhabi)', url: 'https://icp.gov.ae/' },
  mohre: { name: 'MoHRE', url: 'https://www.mohre.gov.ae/' },
  emaratax: { name: 'EmaraTax (FTA)', url: 'https://eservices.tax.gov.ae/' },
  vara: { name: 'VARA', url: 'https://www.vara.ae/' },
  dfsa: { name: 'DFSA', url: 'https://www.dfsa.ae/' },
  fsra: { name: 'ADGM FSRA', url: 'https://www.adgm.com/financial-services-regulatory-authority' },
  cbuae: { name: 'Central Bank of the UAE', url: 'https://www.centralbank.ae/' },
  dubaiTrade: { name: 'Dubai Trade (customs code)', url: 'https://www.dubaitrade.ae/' },
  atlp: { name: 'ATLP (Abu Dhabi customs)', url: 'https://www.atlp.ae/' },
  goaml: { name: 'goAML (UAE FIU)', url: 'https://www.uaefiu.gov.ae/' },
  dubaiChamber: { name: 'Dubai Chambers', url: 'https://www.dubaichamber.com/' },
  adChamber: { name: 'Abu Dhabi Chamber', url: 'https://www.abudhabichamber.ae/' },
};

// Where to set up. Indicative first-year cost covers licence and a basic office or desk, before visas,
// unless stated. Ranges are adviser estimates (sources below), not government quotes.
export const LOCATIONS = [
  { id: 'dxbml', name: 'Dubai mainland (e.g. Business Bay, Barsha Heights)', emirate: 'Dubai', route: 'dxbml', cost: [25000, 60000], setupWeeks: [1, 4],
    onshore: 'Trade anywhere in the UAE, including government contracts', office: 'Physical office with an Ejari-registered lease; no virtual address for a standard licence',
    best: 'Service companies, consultancies, retail, F&B, clinics and anyone selling to UAE customers or government', watch: 'Office rent drives cost and visa quota; some activities need external approvals' },
  { id: 'dmcc', name: 'DMCC (Jumeirah Lakes Towers)', emirate: 'Dubai', route: 'dxbfz', cost: [35000, 55000], setupWeeks: [1, 3], vaCost: [53000, 150000],
    onshore: 'International and free-zone trade; onshore sales need a distributor or dual licence', office: 'Flexi-desk to full office in JLT',
    best: 'Commodities, trading, crypto and Web3 start-ups (DMCC Crypto Centre), holding of regional operations', watch: 'Crypto activity serving UAE clients still needs a VARA licence on top' },
  { id: 'ifza', name: 'IFZA or Meydan (low-cost Dubai free zones)', emirate: 'Dubai', route: 'dxbfz', cost: [12500, 22000], setupWeeks: [0.5, 2],
    onshore: 'International and free-zone trade; onshore needs a distributor or dual licence', office: 'Flexi-desk included in packages',
    best: 'Founders launching a small international service or e-commerce business at the lowest cost', watch: 'Banks may ask for more substance; not suited to regulated finance' },
  { id: 'jafza', name: 'JAFZA (Jebel Ali)', emirate: 'Dubai', route: 'dxbfz', cost: [30000, 70000], setupWeeks: [1, 3],
    onshore: 'Re-export and regional distribution; onshore through a distributor', office: 'Office, warehouse or land next to Jebel Ali port',
    best: 'Importers, distributors and logistics needing bonded warehousing and the port', watch: 'Warehouse costs dominate; plan customs and duty from day one' },
  { id: 'difc', name: 'DIFC (Dubai International Financial Centre)', emirate: 'Dubai', route: 'difc', cost: [55000, 120000], setupWeeks: [2, 6], vaCost: [100000, 400000],
    onshore: 'Financial services into the UAE and region under DFSA; common-law courts', office: 'Office or serviced desk in DIFC',
    best: 'Asset managers, institutional crypto and tokenisation (DFSA), family offices and holding structures', watch: 'Highest cost; DFSA authorisation takes months and needs resident senior staff' },
  { id: 'auhml', name: 'Abu Dhabi mainland', emirate: 'Abu Dhabi', route: 'auhml', cost: [15000, 45000], setupWeeks: [1, 4],
    onshore: 'Trade anywhere in the UAE; strongest for Abu Dhabi government work', office: 'Tawtheeq-registered lease (Tajer licence allows starting without premises for some activities)',
    best: 'Suppliers to Abu Dhabi government and energy, contracting, services', watch: 'Some activities need sector approvals (DoH, ADEK, ITC)' },
  { id: 'adgm', name: 'ADGM (Al Maryah Island)', emirate: 'Abu Dhabi', route: 'adgm', cost: [10000, 40000], setupWeeks: [2, 6], vaCost: [75000, 450000],
    onshore: 'Financial services under FSRA; English common law', office: 'Office or co-working in ADGM; Hub71 for tech start-ups',
    best: 'Institutional crypto and custody (FSRA), fintech sandbox, holding companies, foundations, venture-backed start-ups via Hub71', watch: 'Regulated licences need capital, resident officers and months of review' },
  { id: 'kezad', name: 'KEZAD or Masdar City (Abu Dhabi free zones)', emirate: 'Abu Dhabi', route: 'adgm', cost: [7000, 30000], setupWeeks: [1, 3],
    onshore: 'Industrial, logistics and clean-tech; onshore through a distributor or dual licence', office: 'Desk, warehouse or industrial plot',
    best: 'Manufacturing, industrial logistics (KEZAD), clean-tech and R&D (Masdar City)', watch: 'Industrial permits and utilities add lead time' },
];

export const BUSINESS_TYPES = [
  { id: 'vasp', label: 'Crypto service (exchange, broker, custody)', rank: [['dmcc', 'VARA-licensed from DMCC: the largest crypto cluster and lowest entry cost in Dubai'], ['adgm', 'FSRA is the most established framework for institutional custody and exchanges'], ['difc', 'DFSA crypto-token regime for institutional clients and tokenisation; highest cost']] },
  { id: 'cryptoproduct', label: 'Crypto product, non-custodial (hardware or software wallet)', rank: [['dmcc', 'Product company in the Crypto Centre; partner with licensed firms for buy and swap features'], ['jafza', 'If you hold stock and ship regionally, bonded warehousing next to the port'], ['dxbml', 'If you will run your own retail store or sell directly onshore']] },
  { id: 'smalloffice', label: 'Small office launch (consulting, services, agency)', rank: [['dxbml', 'Business Bay or Barsha Heights office: sell to any UAE client and government, credible with banks'], ['ifza', 'Lowest cost if clients are mostly outside the UAE or in free zones'], ['auhml', 'If your clients are Abu Dhabi government entities']] },
  { id: 'trading', label: 'Trading, import and distribution', rank: [['jafza', 'Port, bonded storage and re-export'], ['dmcc', 'Commodities and trading houses'], ['dxbml', 'Local distribution and retail onshore']] },
  { id: 'tech', label: 'Tech or SaaS start-up', rank: [['adgm', 'Hub71 incentives, venture ecosystem and ADGM’s tech licence'], ['dmcc', 'Large tech and Web3 community, flexible desks'], ['ifza', 'Lowest-cost licence while you find product-market fit']] },
  { id: 'fintech', label: 'Fintech or payments (not crypto)', rank: [['adgm', 'FSRA RegLab sandbox and payment licences'], ['difc', 'DFSA Innovation Testing Licence and FinTech Hive'], ['dxbml', 'Onshore payments need a Central Bank licence; start in a financial free zone first']] },
  { id: 'onshoreretail', label: 'F&B, retail, clinic or salon (customer-facing onshore)', rank: [['dxbml', 'Must be onshore; DET licence plus the sector approval (DHA for health, Dubai Municipality for food)'], ['auhml', 'Same in Abu Dhabi with DoH, ADAFSA or ADDED approvals'], ['dmcc', 'Only for outlets inside the free zone itself']] },
  { id: 'holding', label: 'Holding company or family office', rank: [['adgm', 'Common law, foundations and holding structures at moderate cost'], ['difc', 'Family-office regime and foundations, prestige address'], ['dmcc', 'Simple holding of regional subsidiaries']] },
  { id: 'industrial', label: 'Manufacturing or industrial', rank: [['kezad', 'Industrial land, utilities and logistics in Abu Dhabi'], ['jafza', 'Industrial plots next to Jebel Ali port'], ['dxbml', 'Dubai Industrial City and mainland industrial licences']] },
];

// The procedure. `by` holds route-specific platform, cost, time and notes; `weeks` is [min, max] per route
// (null = step not needed on that route); `after` lists the steps that must finish first.
export const STEPS = [
  { id: 'activity', title: 'Choose the activity and legal form', owner: 'Founder',
    what: 'Pick the exact licensed activities (they must match what you will do and what you invoice) and the legal form: LLC, sole establishment, branch of a foreign company, or a free-zone company.',
    docs: ['Short business plan', 'Shareholder list with nationalities and percentages'],
    bottleneck: 'Activities that need an external approval (health, education, finance, crypto, food) add weeks; some cannot be combined on one licence.',
    tip: 'Use the authority’s activity search before you name anything; the activity decides the regulator, office rules and visa quota.',
    by: { dxbml: { platform: P.investDubai, cost: 'Free', weeks: [0.2, 0.5] }, dxbfz: { platform: P.dmcc, cost: 'Free', weeks: [0.2, 0.5] }, auhml: { platform: P.tamm, cost: 'Free', weeks: [0.2, 0.5] }, adgm: { platform: P.adgm, cost: 'Free', weeks: [0.2, 0.5] }, difc: { platform: P.difc, cost: 'Free', weeks: [0.2, 0.5] } } },
  { id: 'name', title: 'Reserve the trade name and get initial approval', owner: 'Founder or PRO', after: ['activity'],
    what: 'Reserve a name that carries the legal form (e.g. “LLC”) and obtain initial approval, which confirms the activity and shareholders can be licensed.',
    docs: ['Passport copies of shareholders and manager', 'Emirates ID if resident', 'Three name options'],
    bottleneck: 'Names are rejected for religious or political terms, other companies’ brands, or abbreviations that do not match the activity.',
    tip: 'Initial approval is not a licence: do not sign long leases or announce until the licence is issued.',
    by: { dxbml: { platform: P.investDubai, cost: 'About AED 620 name + AED 120 initial approval (indicative)', weeks: [0.2, 0.6] }, dxbfz: { platform: P.dmcc, cost: 'Usually inside the free-zone package', weeks: [0.2, 0.6] }, auhml: { platform: P.tamm, cost: 'Small government fee (indicative, see TAMM)', weeks: [0.2, 0.6] }, adgm: { platform: P.adgm, cost: 'Included in registration', weeks: [0.3, 1] }, difc: { platform: P.difc, cost: 'Included in registration', weeks: [0.3, 1] } } },
  { id: 'regulator', title: 'Regulatory approval, if the activity is regulated', owner: 'Compliance', after: ['name'],
    what: 'Get the regulator’s approval before the licence: VARA for crypto in Dubai (outside DIFC), DFSA in DIFC, FSRA in ADGM, the Central Bank for payments and lending, and sector bodies such as DHA or DoH for health, KHDA or ADEK for education.',
    docs: ['Regulatory business plan', 'Policies (AML, risk, compliance)', 'CVs and fit-and-proper forms of key people', 'Source of funds and wealth', 'Proof of capital'],
    bottleneck: 'The longest step: four to twelve months for financial and crypto licences, with questions in several rounds.',
    tip: 'Hire the resident compliance officer early; regulators interview them.',
    by: { dxbml: { platform: P.vara, cost: 'From AED 40,000 application + supervision for VARA activities; sector approvals vary', weeks: [16, 48], optional: true }, dxbfz: { platform: P.vara, cost: 'VARA fees as above for crypto; others vary', weeks: [16, 48], optional: true }, auhml: { platform: P.cbuae, cost: 'Depends on the regulator', weeks: [8, 40], optional: true }, adgm: { platform: P.fsra, cost: 'FSRA application and annual fees by category', weeks: [16, 40], optional: true }, difc: { platform: P.dfsa, cost: 'DFSA application and annual fees by category', weeks: [16, 48], optional: true } } },
  { id: 'docs', title: 'Prepare, attest and translate documents', owner: 'Founder and legal', after: ['activity'],
    what: 'Individuals need passports (and Emirates ID if resident). A corporate shareholder needs its certificate of incorporation, constitution, board resolution, good-standing certificate and register of shareholders, apostilled or legalised in the home country and attested by MOFA in the UAE. Mainland files need a certified Arabic translation.',
    docs: ['Certificate of incorporation and constitution of any corporate shareholder', 'Board resolution appointing the manager', 'Good-standing certificate (under three months old)', 'Power of attorney if someone signs for you'],
    bottleneck: 'Overseas attestation takes one to three weeks per country; documents expire after about three months.',
    tip: 'Start attestation on day one, in parallel with the name; order two sets.',
    by: { dxbml: { platform: P.mofa, cost: 'Translation about AED 100–500 a page; attestation fees per document', weeks: [1, 3] }, dxbfz: { platform: P.mofa, cost: 'Attestation fees per document; translation rarely needed', weeks: [1, 3] }, auhml: { platform: P.mofa, cost: 'Translation about AED 100–500 a page; attestation per document', weeks: [1, 3] }, adgm: { platform: P.mofa, cost: 'Attestation per document; English accepted', weeks: [1, 3] }, difc: { platform: P.mofa, cost: 'Attestation per document; English accepted', weeks: [1, 3] } } },
  { id: 'moa', title: 'Draft and sign the memorandum or articles of association', owner: 'Legal', after: ['name', 'docs'],
    what: 'The constitution of the company: who owns it, the capital, who manages it and how decisions, profits and share transfers work. See the memorandum guide below for the clauses and templates.',
    docs: ['Agreed share split and capital', 'Manager appointment', 'Arabic version for mainland'],
    bottleneck: 'Disagreements between partners on control and exit clauses; Arabic wording that differs from the English.',
    tip: 'Use the authority’s standard template unless you need investor protections; a custom memorandum adds translation and review time.',
    by: { dxbml: { platform: P.notary, cost: 'About AED 1,000–4,000 notarisation plus translation (indicative)', weeks: [0.5, 1.5] }, dxbfz: { platform: P.dmcc, cost: 'Standard articles included; custom articles cost more', weeks: [0.2, 1] }, auhml: { platform: P.notary, cost: 'Notarisation plus translation', weeks: [0.5, 1.5] }, adgm: { platform: P.adgm, cost: 'Model articles free; bespoke articles via counsel', weeks: [0.3, 1] }, difc: { platform: P.difc, cost: 'Model articles free; bespoke articles via counsel', weeks: [0.3, 1] } } },
  { id: 'office', title: 'Secure the office and register the lease', owner: 'Founder', after: ['name'],
    what: 'Rent premises that suit the activity and the number of visas you need, and register the lease: Ejari in Dubai, Tawtheeq in Abu Dhabi. Free zones and ADGM or DIFC issue their own lease or desk agreement.',
    docs: ['Signed lease in the company’s name (or initial-approval name)', 'Landlord’s title deed copy and ID'],
    bottleneck: 'Mainland visa quota follows office size; a virtual address is not accepted for a standard mainland licence.',
    tip: 'For a small launch, a serviced office in Business Bay or Barsha Heights with Ejari included is quickest.',
    by: { dxbml: { platform: P.ejari, cost: 'Rent varies by area and size; Ejari registration fee is small', weeks: [0.5, 2] }, dxbfz: { platform: P.dmcc, cost: 'Flexi-desk inside the package; offices extra', weeks: [0.2, 1] }, auhml: { platform: P.tawtheeq, cost: 'Rent varies; Tawtheeq registration fee is small', weeks: [0.5, 2] }, adgm: { platform: P.adgm, cost: 'Co-working or office in ADGM', weeks: [0.5, 2] }, difc: { platform: P.difc, cost: 'Serviced desk or office in DIFC', weeks: [0.5, 2] } } },
  { id: 'licence', title: 'Pay the fees and receive the licence', owner: 'PRO', after: ['moa', 'office', 'regulator'],
    what: 'Submit the signed constitution and lease, pay the licence fees and receive the trade licence. Join the chamber of commerce where required.',
    docs: ['Notarised memorandum', 'Registered lease', 'Regulator approval if any'],
    bottleneck: 'Missing external approvals block issuance; fee calculation depends on activities and rent.',
    tip: 'Download the licence and verify it on the authority’s portal; banks will check it.',
    by: { dxbml: { platform: P.investDubai, cost: 'Licence about AED 10,000–25,000 a year depending on activities (indicative) + Dubai Chambers membership', weeks: [0.2, 1] }, dxbfz: { platform: P.dmcc, cost: 'IFZA/Meydan about AED 12,500–15,000 without visas; DMCC about AED 35,000–55,000 first year (indicative)', weeks: [0.2, 1] }, auhml: { platform: P.tamm, cost: 'About AED 10,000–25,000 a year; Tajer licence from about AED 790 for eligible activities (indicative)', weeks: [0.2, 1] }, adgm: { platform: P.adgm, cost: 'Non-financial licence from about USD 1,500–2,500 a year (indicative)', weeks: [0.5, 2] }, difc: { platform: P.difc, cost: 'Non-regulated registration and licence from about USD 5,000–12,000 a year (indicative)', weeks: [0.5, 2] } } },
  { id: 'ubo', title: 'File the beneficial-owner register', owner: 'Legal', after: ['licence'],
    what: 'Record every individual who ultimately owns or controls 25% or more, or controls the company by other means, and file it with the licensing authority (Cabinet Decision No. 109 of 2023). Keep it updated within 15 days of any change.',
    docs: ['Ownership chart up to the individuals', 'Passports and addresses of beneficial owners'],
    bottleneck: 'Chains of holding companies abroad; nominee arrangements must be disclosed.',
    tip: 'Prepare the chart once; the bank asks for the same thing.',
    by: { dxbml: { platform: P.investDubai, cost: 'Free; fines for late or wrong filing', weeks: [0.2, 0.5] }, dxbfz: { platform: P.dmcc, cost: 'Free', weeks: [0.2, 0.5] }, auhml: { platform: P.tamm, cost: 'Free', weeks: [0.2, 0.5] }, adgm: { platform: P.adgm, cost: 'Free', weeks: [0.2, 0.5] }, difc: { platform: P.difc, cost: 'Free', weeks: [0.2, 0.5] } } },
  { id: 'estcard', title: 'Open the immigration and labour files', owner: 'PRO', after: ['licence'],
    what: 'Get the establishment card (immigration file) and, on the mainland, the MoHRE labour file. These let the company sponsor visas.',
    docs: ['Trade licence', 'Lease', 'Manager’s passport and Emirates ID'],
    bottleneck: 'Mismatched names or passport numbers across documents send the file back.',
    tip: 'Free zones and ADGM or DIFC do this through their own government-services desk.',
    by: { dxbml: { platform: P.gdrfa, cost: 'About AED 2,000 (indicative)', weeks: [0.5, 1] }, dxbfz: { platform: P.dmcc, cost: 'Inside most packages', weeks: [0.3, 1] }, auhml: { platform: P.icp, cost: 'About AED 2,000 (indicative)', weeks: [0.5, 1] }, adgm: { platform: P.adgm, cost: 'Via ADGM government services', weeks: [0.5, 1] }, difc: { platform: P.difc, cost: 'Via DIFC government services', weeks: [0.5, 1] } } },
  { id: 'bank', title: 'Open the corporate bank account', owner: 'Founder and finance', after: ['licence', 'ubo'],
    what: 'Apply to two or three banks (traditional and digital) at once. Expect enhanced due diligence on ownership, source of funds and the business model.',
    docs: ['Licence, memorandum and lease', 'Passports and Emirates IDs of shareholders and signatories', 'Beneficial-owner chart', 'Business plan, expected volumes and counterparties', 'Source-of-funds evidence, contracts or invoices', 'For regulated firms: the licence and compliance manual'],
    bottleneck: 'The most common delay for every company, worst for crypto and cross-border payments: two to eight weeks, sometimes longer.',
    tip: 'Show substance: a real office, a resident manager, contracts and a clear flow of funds. Digital banks are faster for a first account.',
    by: { dxbml: { platform: { name: 'Banks (traditional and digital)', url: 'https://www.centralbank.ae/' }, cost: 'Minimum balance commonly AED 0–50,000 depending on bank', weeks: [2, 8] }, dxbfz: { platform: { name: 'Banks (traditional and digital)', url: 'https://www.centralbank.ae/' }, cost: 'As mainland', weeks: [2, 8] }, auhml: { platform: { name: 'Banks (traditional and digital)', url: 'https://www.centralbank.ae/' }, cost: 'As mainland', weeks: [2, 8] }, adgm: { platform: { name: 'Banks (traditional and digital)', url: 'https://www.centralbank.ae/' }, cost: 'As mainland', weeks: [2, 8] }, difc: { platform: { name: 'Banks (traditional and digital)', url: 'https://www.centralbank.ae/' }, cost: 'As mainland', weeks: [2, 8] } } },
  { id: 'ct', title: 'Register for corporate tax', owner: 'Finance', after: ['licence'],
    what: 'Every company registers for corporate tax on EmaraTax. Companies incorporated on or after 1 March 2024 must register within three months of incorporation.',
    docs: ['Trade licence', 'Memorandum', 'Passport and Emirates ID of the authorised signatory', 'Financial year chosen'],
    bottleneck: 'A fixed AED 10,000 penalty for late registration.',
    tip: 'Register in week one; it is free and the tax number is needed by banks and clients.',
    by: { dxbml: { platform: P.emaratax, cost: 'Free', weeks: [0.2, 1] }, dxbfz: { platform: P.emaratax, cost: 'Free', weeks: [0.2, 1] }, auhml: { platform: P.emaratax, cost: 'Free', weeks: [0.2, 1] }, adgm: { platform: P.emaratax, cost: 'Free', weeks: [0.2, 1] }, difc: { platform: P.emaratax, cost: 'Free', weeks: [0.2, 1] } } },
  { id: 'vat', title: 'Register for VAT when you cross the threshold', owner: 'Finance', after: ['bank'],
    what: 'Register within 30 days once taxable supplies and imports pass AED 375,000 over the last 12 months, or are expected to in the next 30 days. You may register voluntarily from AED 187,500. See the VAT guide below for what to fill in.',
    docs: ['Licence and memorandum', 'Bank account letter', 'Turnover evidence: invoices, contracts, bank statements', 'Customs code if you import'],
    bottleneck: 'AED 10,000 penalty for late registration, plus VAT due from the date you should have registered.',
    tip: 'If you import or sell to VAT-registered businesses, registering early lets you recover input VAT.',
    by: { dxbml: { platform: P.emaratax, cost: 'Free', weeks: [1, 4] }, dxbfz: { platform: P.emaratax, cost: 'Free', weeks: [1, 4] }, auhml: { platform: P.emaratax, cost: 'Free', weeks: [1, 4] }, adgm: { platform: P.emaratax, cost: 'Free', weeks: [1, 4] }, difc: { platform: P.emaratax, cost: 'Free', weeks: [1, 4] } } },
  { id: 'visas', title: 'Hire and issue visas', owner: 'HR and PRO', after: ['estcard'],
    what: 'For each employee: entry permit, change of status or entry, medical fitness test, Emirates ID biometrics, labour contract and residence visa. Pay salaries through the Wage Protection System (mainland).',
    docs: ['Passport and photo', 'Attested degree for some job titles', 'Signed offer and labour contract'],
    bottleneck: 'Visa quota tied to office size; attested degrees for professional titles; Emiratisation targets for mainland companies with 50 or more staff.',
    tip: 'Apply for the investor or manager visa first so a resident signatory can sign bank and government forms.',
    by: { dxbml: { platform: P.gdrfa, cost: 'About AED 3,500–7,500 per visa (indicative)', weeks: [2, 4] }, dxbfz: { platform: P.dmcc, cost: 'About AED 3,500–7,500 per visa (indicative)', weeks: [1.5, 3] }, auhml: { platform: P.icp, cost: 'About AED 3,500–7,500 per visa (indicative)', weeks: [2, 4] }, adgm: { platform: P.adgm, cost: 'About AED 3,500–7,500 per visa (indicative)', weeks: [2, 4] }, difc: { platform: P.difc, cost: 'About AED 3,500–7,500 per visa (indicative)', weeks: [2, 4] } } },
  { id: 'ongoing', title: 'Run the compliance calendar', owner: 'Finance and compliance', after: ['vat', 'visas'],
    what: 'Renew the licence and lease every year; file VAT returns quarterly within 28 days of each period end; file the corporate tax return within nine months of the year end; keep records for at least five years; register on goAML if you are a designated business (real estate, precious metals, company services, VASPs); keep the beneficial-owner register current. Free zones and qualifying free-zone status require audited accounts.',
    docs: ['Accounting system with VAT-compliant invoices', 'Audit engagement where required', 'Customs code if importing'],
    bottleneck: 'Missed renewals block visas and bank activity; late filings carry fixed penalties.',
    tip: 'Put every deadline in one calendar the day the licence is issued.',
    by: { dxbml: { platform: P.dubaiChamber, cost: 'Annual licence renewal + audit fees', weeks: [0.5, 1] }, dxbfz: { platform: P.dmcc, cost: 'Annual renewal + audit', weeks: [0.5, 1] }, auhml: { platform: P.adChamber, cost: 'Annual renewal + audit', weeks: [0.5, 1] }, adgm: { platform: P.adgm, cost: 'Annual renewal + accounts filing', weeks: [0.5, 1] }, difc: { platform: P.difc, cost: 'Annual renewal + accounts filing', weeks: [0.5, 1] } } },
];

// Earliest-start schedule for a route, in weeks, using the upper estimate so the plan is not optimistic.
export function schedule(route, { regulated = false, use = 1 } = {}) {
  const end = {};
  const rows = [];
  for (const s of STEPS) {
    const r = s.by[route];
    if (!r || (r.optional && !regulated)) { end[s.id] = Math.max(0, ...(s.after ?? []).map((a) => end[a] ?? 0)); continue; }
    const start = Math.max(0, ...(s.after ?? []).map((a) => end[a] ?? 0));
    const dur = r.weeks[0] + (r.weeks[1] - r.weeks[0]) * use;
    end[s.id] = start + dur;
    rows.push({ id: s.id, title: s.title, start, end: start + dur, dur });
  }
  const total = Math.max(...rows.map((r) => r.end));
  const critical = new Set();
  // Walk back from the last step along the predecessors that set each start.
  let cur = rows.find((r) => r.end === total);
  while (cur) {
    critical.add(cur.id);
    const step = STEPS.find((s) => s.id === cur.id);
    const prev = (step.after ?? []).map((a) => rows.find((r) => r.id === a)).filter(Boolean).sort((a, b) => b.end - a.end)[0];
    cur = prev && Math.abs(prev.end - cur.start) < 1e-9 ? prev : null;
  }
  return { rows: rows.map((r) => ({ ...r, critical: critical.has(r.id) })), total };
}

export const MOA = {
  what: 'For a mainland LLC the memorandum of association is the company’s constitution, required by the Commercial Companies Law (Federal Decree-Law No. 32 of 2021). Free zones, ADGM and DIFC call it articles of association and provide model versions.',
  clauses: [
    ['Name and legal form', 'Exactly as reserved, ending in “LLC” (or the free-zone form).'],
    ['Objects', 'The licensed activities, worded as on the initial approval.'],
    ['Registered office', 'The emirate and address on the registered lease.'],
    ['Shareholders', 'Full names, nationalities, addresses and IDs of each partner (two to fifty for an LLC; one is allowed).'],
    ['Capital and shares', 'Total share capital, number and value of shares, each partner’s holding, and any in-kind contributions with their valuation.'],
    ['Management', 'Manager(s) appointed, term, powers, signing authority and limits (e.g. borrowing, property, guarantees).'],
    ['Decisions', 'General assembly rules: notice, quorum, voting and reserved matters needing a special majority.'],
    ['Profit and loss', 'How profits are distributed and losses borne; statutory reserve where applicable.'],
    ['Share transfers', 'Pre-emption rights, consent rules, drag- and tag-along, and what happens on death or exit.'],
    ['Duration, dissolution and disputes', 'Term of the company, winding-up, governing law and dispute forum.'],
  ],
  steps: [
    ['Agree the terms', 'Share split, capital, manager, reserved matters and exit rights, ideally in a short term sheet.'],
    ['Draft', 'Start from the authority’s standard template (Invest in Dubai generates one; free zones, ADGM and DIFC publish model articles). Add a shareholders’ agreement for investor protections rather than overloading the memorandum.'],
    ['Translate (mainland)', 'Bilingual Arabic–English, with Arabic controlling, by a Ministry of Justice-licensed legal translator.'],
    ['Sign and notarise', 'Before a notary public, or electronically with UAE PASS where the authority allows. Shareholders abroad sign before a notary there or give an attested power of attorney.'],
    ['Submit', 'Upload to the licensing portal with the lease to issue the licence. Keep certified copies: banks, immigration and the tax authority will ask.'],
  ],
  templates: [
    { name: 'Dubai mainland: standard memorandum generated on Invest in Dubai', url: 'https://investindubai.gov.ae/' },
    { name: 'Abu Dhabi mainland: memorandum on TAMM', url: 'https://www.tamm.abudhabi/' },
    { name: 'ADGM: model articles under the Companies Regulations 2020', url: 'https://www.adgm.com/' },
    { name: 'DIFC: model articles under the Companies Law', url: 'https://www.difc.com/' },
    { name: 'DMCC: standard articles on the member portal', url: 'https://www.dmcc.ae/' },
  ],
  cost: 'Mainland notarisation about AED 1,000–4,000 depending on shareholders, plus legal translation at about AED 100–500 a page (indicative). Free-zone and ADGM or DIFC model articles are usually included.',
  pitfalls: ['Arabic and English versions that say different things (the Arabic prevails)', 'Objects wider or narrower than the licence', 'No deadlock or exit clause between 50/50 partners', 'Capital promised but never paid in, which banks and auditors check'],
};

export const TAX = {
  ct: {
    rules: [
      ['Who', 'Every company and free-zone company, including those with no profit.'],
      ['When', 'Within three months of incorporation for companies formed on or after 1 March 2024.'],
      ['Rate', '0% up to AED 375,000 of taxable profit, 9% above. Qualifying free-zone income can be 0%. Small business relief may apply for revenue up to AED 3 million (check the FTA for the periods covered).'],
      ['Return', 'Within nine months of the financial year end, on EmaraTax.'],
      ['Penalty', 'AED 10,000 for late registration; further penalties for late returns.'],
    ],
  },
  vat: {
    rules: [
      ['Mandatory', 'Taxable supplies and imports over AED 375,000 in the last 12 months, or expected in the next 30 days: apply within 30 days.'],
      ['Voluntary', 'From AED 187,500 of supplies or expenses: useful to recover input VAT early.'],
      ['Rate', '5% standard; some supplies zero-rated (exports, international transport) or exempt (some financial services, residential rent).'],
      ['Processing', 'Usually up to about 20 business days for a complete application.'],
      ['Returns', 'Quarterly (or monthly if assigned), within 28 days of the period end, paid by the same date.'],
      ['Records', 'Keep invoices and records for at least five years; tax invoices must show your tax number.'],
      ['Penalty', 'AED 10,000 for late registration, plus VAT due from the date registration was required.'],
    ],
    form: [
      ['About the applicant', 'Legal name in English and Arabic, legal form, trade licence number, issuing authority and expiry.'],
      ['Identification', 'Trade licence, memorandum, and passport and Emirates ID of the owners and authorised signatory.'],
      ['Contact and address', 'Registered address matching the lease, phone, email, and the authorised signatory’s details.'],
      ['Banking', 'IBAN and bank name, with a bank letter in the company’s name.'],
      ['Business relationships', 'Related companies and partners in the UAE; whether you belong to a tax group.'],
      ['Turnover declaration', 'Taxable supplies in the last 12 months and expected in the next 30 days, by type, with evidence: invoices, contracts, bank statements.'],
      ['Customs', 'Customs registration number if you import or export (Dubai Trade or ATLP).'],
      ['Declaration', 'Authorised signatory confirms the information; upload proof of authority if not the owner.'],
    ],
  },
};

export const BOTTLENECKS = [
  { area: 'Banking', issue: 'Corporate account takes two to eight weeks; crypto and cross-border payment businesses are often refused.', impact: 'high', fix: 'Apply to three banks at once, include a digital bank, show substance (office, resident manager, contracts) and a clear flow of funds.' },
  { area: 'Regulator', issue: 'VARA, DFSA, FSRA or Central Bank approval takes four to twelve months with several rounds of questions.', impact: 'high', fix: 'Submit a complete file first time, hire the resident compliance officer early, and budget for capital and insurance before stage two.' },
  { area: 'Documents', issue: 'Overseas attestation and Arabic translation of corporate documents add one to three weeks and expire after about three months.', impact: 'medium', fix: 'Start on day one, order two attested sets, and keep the good-standing certificate fresh.' },
  { area: 'Office', issue: 'Mainland licences need a registered physical lease; visa quota depends on office size.', impact: 'medium', fix: 'Use a serviced office with Ejari or Tawtheeq included for the launch, sized for the visas you need in year one.' },
  { area: 'Activities', issue: 'Activities that need external approval (health, education, food, finance) or cannot be combined on one licence.', impact: 'medium', fix: 'Confirm the activity codes and approvals before reserving a name.' },
  { area: 'Visas', issue: 'Attested degrees for professional titles, medical and biometrics appointments, Emiratisation targets at 50+ mainland staff.', impact: 'medium', fix: 'Attest degrees before hiring, book medicals as soon as entry permits arrive, and plan Emirati hiring early.' },
  { area: 'Tax', issue: 'Late corporate tax or VAT registration costs AED 10,000 each, plus back-dated VAT.', impact: 'medium', fix: 'Register for corporate tax in week one; monitor the rolling 12-month VAT threshold monthly.' },
  { area: 'Marketing (crypto)', issue: 'Marketing a virtual-asset activity to the UAE before the licence is banned, with fines up to AED 10 million.', impact: 'high', fix: 'No launch campaigns, waitlists or sign-ups for the activity until the licence is issued.' },
];

export const GUIDE_SOURCES = [
  { title: 'DET: mainland licensing and the Instant Licence', url: 'https://investindubai.gov.ae/' },
  { title: 'Dubai mainland costs and timeline, 2026 (adviser estimates)', url: 'https://uppersetup.com/en/blog/dubai-mainland-det-licences-visa-quotas-taxes-and-the-real' },
  { title: 'Abu Dhabi mainland and Tajer licence costs, 2026 (adviser estimates)', url: 'https://taxadepts.com/abu-dhabi-mainland-company-setup-guide' },
  { title: 'DMCC vs DIFC vs ADGM fintech and crypto costs, 2026 (adviser estimates)', url: 'https://uaefreezonefinder.com/uae-fintech-licence-2026-adgm-difc-dmcc-real-costs-timelines' },
  { title: 'IFZA and Meydan costs, 2026 (adviser estimates)', url: 'https://aedbs.com/blogs/news/ifza-vs-meydan-free-zone-in-2026-real-costs-visa-quotas-and-who-should-pick-which' },
  { title: 'VAT and corporate tax registration on EmaraTax, 2026 (adviser guide)', url: 'https://www.countify.ae/blog/fta-registration-emaratax-guide' },
  { title: 'Memorandum of association drafting and translation (adviser guide)', url: 'https://arnifi.com/blog/memorandum-of-association-uae-meaning-requirements/' },
  { title: 'Federal Tax Authority', url: 'https://tax.gov.ae/' },
];
