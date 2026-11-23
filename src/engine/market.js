// Dubai market analytics over Dubai Land Department (DLD) open-data transactions.
// Input rows follow the DLD "Transactions" CSV download schema
// (dubailand.gov.ae -> Open Data -> Real Estate Data -> Transactions).

export const DLD_COLUMNS = {
  number: 'Transaction Number',
  date: 'Transaction Date',
  type: 'Transaction Type',
  subType: 'Transaction sub type',
  registration: 'Registration type',
  freehold: 'Is Free Hold?',
  usage: 'Usage',
  area: 'Area',
  propertyType: 'Property Type',
  propertySubType: 'Property Sub Type',
  amount: 'Amount',
  size: 'Transaction Size (sq.m)',
  propertySize: 'Property Size (sq.m)',
  rooms: 'Room(s)',
  masterProject: 'Master Project',
  project: 'Project',
};

// RFC 4180-style CSV parser (quoted fields, escaped quotes, CRLF).
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.replace(/^﻿/, '').trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, j) => [h, (r[j] ?? '').trim()])));
}

// DLD dates come as DD-MM-YYYY (optionally with time) or ISO.
export function parseDate(s) {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const num = (s) => {
  const n = Number(String(s ?? '').replace(/[, ]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

export function normalise(raw) {
  const g = (k) => raw[DLD_COLUMNS[k]] ?? '';
  const date = parseDate(g('date'));
  const amount = num(g('amount'));
  const size = num(g('size')) || num(g('propertySize'));
  return {
    date,
    type: g('type'), // Sales | Mortgages | Gifts
    registration: g('registration'), // Off-Plan | Ready (Existing Properties)
    usage: g('usage'),
    area: g('area'),
    propertyType: g('propertyType'),
    rooms: g('rooms'),
    project: g('project'),
    masterProject: g('masterProject'),
    amount,
    size,
    ppsm: Number.isFinite(amount) && size > 0 ? amount / size : NaN,
  };
}

const median = (xs) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return NaN;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const isSale = (t) => /sale/i.test(t.type);
const isOffPlan = (t) => /off/i.test(t.registration);
const ym = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

// Aggregate normalised transactions into the dashboard's market snapshot.
// `window` is the momentum comparison window in days (latest vs the one before).
export function aggregate(txns, { window = 90, minDeals = 20, top = 15 } = {}) {
  const valid = txns.filter((t) => t.date && Number.isFinite(t.amount) && t.amount > 0);
  if (!valid.length) throw new Error('No valid transactions found. Check the file matches the DLD Transactions CSV schema.');
  const end = new Date(Math.max(...valid.map((t) => t.date.getTime())));
  const start = new Date(Math.min(...valid.map((t) => t.date.getTime())));
  const sales = valid.filter(isSale);

  const byMonth = {};
  for (const t of valid) {
    const k = ym(t.date);
    byMonth[k] ??= { month: k, deals: 0, valueAedBn: 0, sales: 0, offPlan: 0 };
    byMonth[k].deals++;
    byMonth[k].valueAedBn += t.amount / 1e9;
    if (isSale(t)) { byMonth[k].sales++; if (isOffPlan(t)) byMonth[k].offPlan++; }
  }

  const byArea = {};
  for (const t of sales) {
    byArea[t.area] ??= { area: t.area, deals: 0, valueAedBn: 0, offPlan: 0, ppsm: [] };
    const a = byArea[t.area];
    a.deals++;
    a.valueAedBn += t.amount / 1e9;
    if (isOffPlan(t)) a.offPlan++;
    if (/unit|apartment|villa/i.test(t.propertyType + t.rooms) || t.size < 2000) a.ppsm.push(t.ppsm);
  }
  const areas = Object.values(byArea)
    .map((a) => ({ area: a.area, deals: a.deals, valueAedBn: a.valueAedBn, offPlanShare: a.offPlan / a.deals, medianPpsm: median(a.ppsm) }))
    .sort((x, y) => y.valueAedBn - x.valueAedBn);

  // Momentum: median AED/m² of sales in the latest window vs the prior window, per area.
  const ms = window * 864e5;
  const cut1 = end.getTime() - ms;
  const cut0 = cut1 - ms;
  const momentum = Object.values(byArea)
    .map(({ area }) => {
      const recent = sales.filter((t) => t.area === area && t.date.getTime() > cut1).map((t) => t.ppsm);
      const prior = sales.filter((t) => t.area === area && t.date.getTime() > cut0 && t.date.getTime() <= cut1).map((t) => t.ppsm);
      if (recent.length < minDeals || prior.length < minDeals) return null;
      const r = median(recent), p = median(prior);
      return { area, recentPpsm: r, priorPpsm: p, change: r / p - 1, recentDeals: recent.length, priorDeals: prior.length };
    })
    .filter(Boolean)
    .sort((a, b) => b.change - a.change);

  const projects = {};
  for (const t of sales) {
    const k = t.project || t.masterProject;
    if (!k) continue;
    projects[k] ??= { project: k, master: t.masterProject, area: t.area, deals: 0, valueAedBn: 0 };
    projects[k].deals++;
    projects[k].valueAedBn += t.amount / 1e9;
  }

  return {
    period: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
    totals: {
      deals: valid.length,
      valueAedBn: valid.reduce((a, t) => a + t.amount, 0) / 1e9,
      sales: sales.length,
      salesValueAedBn: sales.reduce((a, t) => a + t.amount, 0) / 1e9,
      offPlanShare: sales.filter(isOffPlan).length / (sales.length || 1),
      medianSalePpsm: median(sales.map((t) => t.ppsm)),
    },
    months: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)),
    areas: areas.slice(0, top * 2),
    momentum: { windowDays: window, minDeals, increases: momentum.filter((m) => m.change > 0).slice(0, top), drops: momentum.filter((m) => m.change < 0).reverse().slice(0, top) },
    projects: Object.values(projects).sort((a, b) => b.valueAedBn - a.valueAedBn).slice(0, top),
  };
}
