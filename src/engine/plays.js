// Group-level value-creation plays: the corporate-finance moves that holding
// groups and Gulf sovereign funds use on top of operational improvement.
// Each play is a small, transparent model: parameters -> value bridge lines.
// All money in AED millions.

const pct = (x) => x / 100;

export const PLAYS = [
  {
    id: 'reit',
    title: 'REIT carve-out & capital recycling',
    archetype: 'Asset recycling',
    summary: 'List stabilised income assets in a REIT at a tighter yield than the group carries them at, then redeploy the cash into development at a higher yield on cost.',
    params: [
      { id: 'noi', label: 'Stabilised NOI moved into the REIT', unit: 'AED m', base: 450, min: 100, max: 1500, step: 10 },
      { id: 'stake', label: 'Stake floated', unit: '%', base: 15, min: 5, max: 49, step: 1 },
      { id: 'listCap', label: 'Listing yield (NOI / listing value)', unit: '%', base: 6.5, min: 5, max: 12, step: 0.1 },
      { id: 'bookCap', label: 'Yield implied in group books', unit: '%', base: 7.5, min: 5, max: 12, step: 0.1 },
      { id: 'yoc', label: 'Yield on cost of redeployed cash', unit: '%', base: 9, min: 6, max: 14, step: 0.1 },
      { id: 'fees', label: 'Listing fees', unit: '%', base: 2.5, min: 1, max: 5, step: 0.1 },
    ],
    compute(p) {
      const gav = p.noi / pct(p.listCap);
      const bookGav = p.noi / pct(p.bookCap);
      const sold = gav * pct(p.stake);
      const fees = sold * pct(p.fees);
      const cash = sold - fees;
      const redeployNoi = cash * pct(p.yoc);
      const devMargin = redeployNoi / pct(p.listCap) - cash;
      const rerating = gav - bookGav;
      return {
        cash,
        ebitdaRunRate: redeployNoi - p.noi * pct(p.stake),
        lines: [
          { label: 'Re-rating of the portfolio to market yield', value: rerating },
          { label: 'Development margin on redeployed cash', value: devMargin },
          { label: 'Listing fees', value: -fees },
        ],
        notes: [`Portfolio valued at ${Math.round(gav).toLocaleString('en-US')}m on listing vs ${Math.round(bookGav).toLocaleString('en-US')}m in books.`],
        risks: p.listCap < 6 ? ['A listing yield under 6% assumes strong demand; price risk at book-build.'] : [],
      };
    },
  },
  {
    id: 'ipo',
    title: 'Subsidiary IPO (value crystallisation)',
    archetype: 'IPO / listing',
    summary: 'Float a minority of an operating business. The market multiple marks the whole holding to market, and the float raises cash.',
    params: [
      { id: 'ebitda', label: 'Subsidiary EBITDA', unit: 'AED m', base: 600, min: 100, max: 3000, step: 10 },
      { id: 'bookMultiple', label: 'Multiple implied in group value', unit: 'x', base: 9, min: 5, max: 16, step: 0.5 },
      { id: 'ipoMultiple', label: 'IPO EV/EBITDA multiple', unit: 'x', base: 12, min: 6, max: 20, step: 0.5 },
      { id: 'discount', label: 'IPO discount', unit: '%', base: 12, min: 0, max: 25, step: 1 },
      { id: 'stake', label: 'Stake floated', unit: '%', base: 20, min: 5, max: 49, step: 1 },
    ],
    compute(p) {
      const priced = p.ipoMultiple * (1 - pct(p.discount));
      const ev = p.ebitda * priced;
      const cash = ev * pct(p.stake);
      const mark = p.ebitda * (priced - p.bookMultiple);
      return {
        cash,
        ebitdaRunRate: 0,
        lines: [
          { label: 'Mark-to-market of the full holding', value: mark },
        ],
        notes: [`Priced at ${priced.toFixed(1)}x after the discount. Of the uplift, ${Math.round(mark * pct(p.stake)).toLocaleString('en-US')}m is realised in cash; the rest is a mark on the retained stake.`],
        risks: priced < p.bookMultiple ? ['The IPO prices below book value, so listing destroys value.'] : [],
      };
    },
  },
  {
    id: 'landJv',
    title: 'Land-bank joint venture',
    archetype: 'JV / partnership',
    summary: 'Contribute land at market value into a JV where a partner funds construction. Unlock land carried at historic cost without tying up group capital.',
    params: [
      { id: 'sqft', label: 'Sellable area (m sqft)', unit: 'm', base: 4, min: 1, max: 20, step: 0.5 },
      { id: 'bookLand', label: 'Land book value per sqft', unit: 'AED', base: 120, min: 20, max: 400, step: 5 },
      { id: 'marketLand', label: 'Land market value per sqft', unit: 'AED', base: 380, min: 100, max: 900, step: 10 },
      { id: 'price', label: 'Selling price per sqft', unit: 'AED', base: 2100, min: 1200, max: 4000, step: 25 },
      { id: 'build', label: 'Build & infrastructure cost per sqft', unit: 'AED', base: 980, min: 600, max: 1800, step: 10 },
      { id: 'share', label: 'Group share of JV profit', unit: '%', base: 50, min: 20, max: 80, step: 5 },
    ],
    compute(p) {
      const area = p.sqft * 1e6;
      const landUplift = (area * (p.marketLand - p.bookLand)) / 1e6;
      const profit = (area * (p.price - p.build - p.marketLand)) / 1e6;
      const groupProfit = profit * pct(p.share);
      return {
        cash: 0,
        ebitdaRunRate: 0,
        lines: [
          { label: 'Land revalued from book to market', value: landUplift },
          { label: 'Group share of development profit', value: groupProfit },
        ],
        notes: [`JV development profit of ${Math.round(profit).toLocaleString('en-US')}m before the partner's share.`],
        risks: profit < 0 ? ['Selling price does not cover build plus land at market value; the JV loses money.'] : [],
      };
    },
  },
  {
    id: 'assetLight',
    title: 'Asset-light hospitality expansion',
    archetype: 'International expansion',
    summary: 'Grow the hotel brand abroad through management contracts: fee income with little capital, valued at a fee-business multiple.',
    params: [
      { id: 'keys', label: 'New keys under management', unit: 'keys', base: 3000, min: 500, max: 15000, step: 100 },
      { id: 'revpar', label: 'RevPAR of managed hotels', unit: 'AED', base: 950, min: 400, max: 2000, step: 10 },
      { id: 'baseFee', label: 'Base fee (% of revenue)', unit: '%', base: 3, min: 1.5, max: 5, step: 0.1 },
      { id: 'incentive', label: 'Incentive fee (% of GOP)', unit: '%', base: 8, min: 0, max: 15, step: 0.5 },
      { id: 'multiple', label: 'Fee-business multiple', unit: 'x', base: 16, min: 8, max: 24, step: 0.5 },
      { id: 'keyMoney', label: 'Key money per key', unit: 'AED', base: 25000, min: 0, max: 100000, step: 1000 },
    ],
    compute(p) {
      const roomsRev = (p.keys * 365 * p.revpar) / 1e6;
      const totalRev = roomsRev / 0.62; // rooms ≈ 62% of total luxury hotel revenue
      const gop = totalRev * 0.38;
      const fees = totalRev * pct(p.baseFee) + gop * pct(p.incentive);
      const feeEbitda = fees * 0.7; // after regional overhead
      const keyMoney = (p.keys * p.keyMoney) / 1e6;
      return {
        cash: -keyMoney,
        ebitdaRunRate: feeEbitda,
        lines: [
          { label: 'Value of fee EBITDA at fee multiple', value: feeEbitda * p.multiple },
          { label: 'Key money invested', value: -keyMoney },
        ],
        notes: [`Fee income of ${fees.toFixed(0)}m on ${totalRev.toFixed(0)}m of managed revenue.`],
        risks: p.keys > 10000 ? ['Over 10,000 new keys means a multi-year pipeline. Opening delays defer the fees.'] : [],
      };
    },
  },
  {
    id: 'platform',
    title: 'Platform consolidation',
    archetype: 'Platform build',
    summary: 'Merge sister companies onto one platform (one brand, one operating model, shared services) and capture overhead and procurement synergies.',
    params: [
      { id: 'cost', label: 'Combined G&A and procurement base', unit: 'AED m', base: 2200, min: 500, max: 6000, step: 50 },
      { id: 'synergy', label: 'Synergy captured', unit: '%', base: 8, min: 2, max: 20, step: 0.5 },
      { id: 'integration', label: 'One-off integration cost (x synergies)', unit: 'x', base: 1.5, min: 0.5, max: 3, step: 0.1 },
      { id: 'multiple', label: 'Group EV/EBITDA multiple', unit: 'x', base: 10, min: 6, max: 16, step: 0.5 },
    ],
    compute(p) {
      const syn = p.cost * pct(p.synergy);
      const oneOff = syn * p.integration;
      return {
        cash: -oneOff,
        ebitdaRunRate: syn,
        lines: [
          { label: 'Capitalised run-rate synergies', value: syn * p.multiple },
          { label: 'One-off integration cost', value: -oneOff },
        ],
        notes: [`${syn.toFixed(0)}m of run-rate synergies a year.`],
        risks: p.synergy > 12 ? ['Synergies above 12% of the cost base are rarely delivered in full; plan a delivery haircut.'] : [],
      };
    },
  },
  {
    id: 'acquisition',
    title: 'Bolt-on acquisition',
    archetype: 'M&A',
    summary: 'Buy a business at a lower multiple than the group trades at, add synergies, and benefit from multiple arbitrage.',
    params: [
      { id: 'ebitda', label: 'Target EBITDA', unit: 'AED m', base: 250, min: 50, max: 2000, step: 10 },
      { id: 'buyMultiple', label: 'Purchase EV/EBITDA', unit: 'x', base: 9, min: 5, max: 18, step: 0.5 },
      { id: 'synergy', label: 'Synergies (% of target EBITDA)', unit: '%', base: 10, min: 0, max: 30, step: 1 },
      { id: 'groupMultiple', label: 'Multiple inside the group', unit: 'x', base: 11, min: 5, max: 18, step: 0.5 },
      { id: 'fees', label: 'Deal and integration costs', unit: '%', base: 3, min: 1, max: 8, step: 0.5 },
    ],
    compute(p) {
      const price = p.ebitda * p.buyMultiple;
      const fees = price * pct(p.fees);
      const synergy = p.ebitda * pct(p.synergy);
      return {
        cash: -(price + fees),
        ebitdaRunRate: p.ebitda + synergy,
        lines: [
          { label: 'Multiple arbitrage on target EBITDA', value: p.ebitda * (p.groupMultiple - p.buyMultiple) },
          { label: 'Capitalised synergies', value: synergy * p.groupMultiple },
          { label: 'Deal and integration costs', value: -fees },
        ],
        notes: [`Consideration ${Math.round(price).toLocaleString('en-US')}m.`],
        risks: p.buyMultiple > p.groupMultiple ? ['Paying more than the group multiple means synergies must carry the case.'] : [],
      };
    },
  },
  {
    id: 'masterplan',
    title: 'Master-planned destination launch',
    archetype: 'Giga-project / development',
    summary: 'Launch a new master-planned community off-plan. Pre-sales fund construction, and the margin is earned over the build period.',
    params: [
      { id: 'units', label: 'Units launched', unit: 'units', base: 6000, min: 1000, max: 30000, step: 250 },
      { id: 'price', label: 'Average unit price', unit: 'AED m', base: 4.5, min: 1, max: 25, step: 0.1 },
      { id: 'margin', label: 'Development margin', unit: '%', base: 32, min: 10, max: 50, step: 1 },
      { id: 'years', label: 'Delivery period', unit: 'years', base: 5, min: 2, max: 10, step: 1 },
      { id: 'rate', label: 'Discount rate', unit: '%', base: 10, min: 6, max: 16, step: 0.5 },
    ],
    compute(p) {
      const gdv = p.units * p.price;
      const profit = gdv * pct(p.margin);
      const perYear = profit / p.years;
      let npv = 0;
      for (let t = 1; t <= p.years; t++) npv += perYear / Math.pow(1 + pct(p.rate), t);
      return {
        cash: 0,
        ebitdaRunRate: perYear,
        lines: [
          { label: 'NPV of development profit', value: npv },
        ],
        notes: [`Gross development value ${Math.round(gdv).toLocaleString('en-US')}m; profit ${Math.round(profit).toLocaleString('en-US')}m recognised over ${p.years} years.`],
        risks: p.margin > 40 ? ['Margins above 40% assume land at historic cost and a strong pricing cycle.'] : [],
      };
    },
  },
];

export function playDefaults(play) {
  return Object.fromEntries(play.params.map((x) => [x.id, x.base]));
}

export function runPlay(play, params = {}) {
  const p = { ...playDefaults(play) };
  for (const x of play.params) {
    const n = Number(params[x.id]);
    if (params[x.id] !== undefined && Number.isFinite(n)) p[x.id] = Math.min(x.max, Math.max(x.min, n));
  }
  const r = play.compute(p);
  return { ...r, params: p, value: r.lines.reduce((a, l) => a + l.value, 0) };
}

export function getPlay(id) {
  const p = PLAYS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown play "${id}"`);
  return p;
}
