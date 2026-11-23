// Market Pulse engine: pure functions over data/pulse/pulse.json (see scripts/fetch-pulse.mjs).
// Reads the market, classifies headlines into themes, chokepoints and countries, and turns moves into signals that
// say what they mean for a Dubai real-estate, hospitality, retail and logistics portfolio. Not investment advice.

const DAY = 864e5;

// ---------- feeds ----------
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…' };
export const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z#0-9]+);/gi, (m, e) => ENTITIES[e.toLowerCase()] ?? m)
  .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const tag = (block, name) => { const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i')); return m ? decode(m[1]) : ''; };

/** RSS 2.0 or Atom → [{ title, link, published, source }]. Headlines only; descriptions are dropped. */
export function parseFeed(xml) {
  const out = [];
  for (const block of xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? []) {
    let title = tag(block, 'title');
    const link = tag(block, 'link') || (block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '');
    const date = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || tag(block, 'dc:date');
    const source = tag(block, 'source');
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));   // Google News suffix
    const t = Date.parse(date);
    if (!title || !/^https?:\/\//.test(link)) continue;
    out.push({ title, link, published: Number.isFinite(t) ? new Date(t).toISOString() : null, source: source || null });
  }
  return out;
}

// ---------- classification ----------
export const THEMES = [
  { id: 'resilience', label: 'Resilience', words: ['resilien', 'climate', 'flood', 'heat$', 'drought', 'storm', 'outage', 'blackout', 'cyber', 'pandemic', 'insurance', 'disaster', 'emergency', 'continuity', 'sanction'] },
  { id: 'security', label: 'Security', words: ['security', 'military', 'missile', 'drone strike', 'drone attack', 'attack', 'strike', 'war$', 'conflict', 'houthi', 'terror', 'defence', 'defense', 'navy', 'ceasefire', 'tension'] },
  { id: 'economy', label: 'Economy', words: ['econom', 'gdp', 'inflation', 'interest rate', 'rates$', 'central bank', 'bank', 'market', 'stock', 'shares', 'ipo', 'investment', 'invest', 'fund', 'profit', 'revenue', 'trade', 'tariff', 'budget', 'fiscal', 'property', 'real estate', 'tourism', 'retail', 'price', 'dirham', 'bond', 'sukuk'] },
  { id: 'resources', label: 'Resources', words: ['oil$', 'gas$', 'opec', 'crude', 'lng', 'energy', 'power$', 'solar', 'nuclear', 'water$', 'desalination', 'food', 'wheat', 'gold$', 'copper', 'aluminium', 'mining', 'hydrogen', 'refin'] },
  { id: 'infrastructure', label: 'Infrastructure', words: ['infrastructure', 'port$', 'airport', 'airline', 'rail', 'metro', 'road$', 'bridge', 'shipping', 'logistic', 'freight', 'cargo', 'container', 'vessel', 'tanker', 'construction', 'project', 'data centre', 'data center', 'grid$', 'pipeline', 'canal', 'strait'] },
  { id: 'society', label: 'Society', words: ['school', 'education', 'health', 'hospital', 'visa', 'residen', 'population', 'labour', 'labor', 'jobs$', 'salary', 'housing', 'rent$', 'rents$', 'rental', 'community', 'culture', 'law$', 'court', 'police', 'traffic', 'golden visa', 'emirati'] },
];
export const CHOKEPOINTS = [
  { id: 'hormuz', label: 'Strait of Hormuz', words: ['hormuz'], why: 'About a fifth of world oil flows through it; Jebel Ali and Gulf energy exports depend on it.' },
  { id: 'red-sea', label: 'Red Sea & Bab el-Mandeb', words: ['red sea', 'bab el-mandeb', 'bab al-mandab', 'houthi', 'aden$'], why: 'The Asia–Europe container route; disruption lengthens voyages round the Cape and lifts freight and insurance.' },
  { id: 'suez', label: 'Suez Canal', words: ['suez'], why: 'Links the Gulf and Asia to Europe; closures reroute cargo and delay supply chains.' },
];
export const COUNTRIES = [
  { id: 'AE', label: 'UAE', words: ['uae', 'emirates', 'emirati', 'dubai', 'abu dhabi', 'sharjah', 'ajman', 'ras al khaimah', 'fujairah'] },
  { id: 'SA', label: 'Saudi Arabia', words: ['saudi', 'riyadh', 'jeddah', 'neom', 'aramco', 'pif$'] },
  { id: 'QA', label: 'Qatar', words: ['qatar', 'doha'] },
  { id: 'KW', label: 'Kuwait', words: ['kuwait'] },
  { id: 'BH', label: 'Bahrain', words: ['bahrain', 'manama'] },
  { id: 'OM', label: 'Oman', words: ['oman$', 'omani', 'muscat'] },
  { id: 'IR', label: 'Iran', words: ['iran$', 'iranian', 'tehran'] },
  { id: 'US', label: 'United States', words: ['us$', 'u.s.', 'united states', 'washington', 'federal reserve', 'fed$'] },
  { id: 'CN', label: 'China', words: ['china', 'chinese', 'beijing'] },
];
// Words match at the start of a word ("econom" → "economy", "economic"); a word ending in "$" must match whole
// ("gold$" is not "Golden visa", "war$" is not "warning", "port$" is not "report").
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = new Map();
const pattern = (w) => {
  if (!patterns.has(w)) {
    const whole = w.endsWith('$'), core = esc((whole ? w.slice(0, -1) : w).trim());
    patterns.set(w, new RegExp(`(?:^|[^a-z0-9])${core}${whole ? '(?![a-z0-9])' : ''}`, 'i'));
  }
  return patterns.get(w);
};
const hits = (text, list) => list.filter((x) => x.words.some((w) => pattern(w).test(text))).map((x) => x.id);
export const classify = (title) => ({ themes: hits(title, THEMES), chokepoints: hits(title, CHOKEPOINTS), countries: hits(title, COUNTRIES) });

// ---------- market statistics ----------
/** Last value and its changes over 1 day, 1 week, 1 month and 3 months (trading-day offsets), plus 20-day volatility. */
export function stats(series, inst = {}) {
  const v = series.map(([, x]) => x);
  const last = v.at(-1);
  const monthly = inst.interval === '1mo';   // monthly history: offsets are months, and the day move comes from the previous close
  const back = (n) => (v.length > n ? v[v.length - 1 - n] : null);
  const chg = (n) => { const b = back(n); return b ? last / b - 1 : null; };
  if (monthly) {
    // Only compare with a point that really is about one (or three) months back: a source whose history stops early
    // must not turn a 20-month move into a "one-month" move.
    const end = Date.parse(series.at(-1)[0]);
    const near = (days, tol) => { const p = [...series].reverse().find(([d]) => Math.abs((end - Date.parse(d)) / DAY - days) <= tol); return p ? p[1] : null; };
    const b1 = near(30, 16), b3 = near(91, 20);
    return { last, asOf: series.at(-1)?.[0] ?? null, monthly: true, d1: inst.prevClose ? last / inst.prevClose - 1 : null, w1: null,
      m1: b1 ? last / b1 - 1 : null, m3: b3 ? last / b3 - 1 : null, vol: null, diff1m: b1 ? last - b1 : null, stale: !b1 };
  }
  const rets = v.slice(-21).map((x, i, a) => (i ? Math.log(x / a[i - 1]) : null)).filter((x) => x !== null && Number.isFinite(x));
  const mean = rets.reduce((s, x) => s + x, 0) / (rets.length || 1);
  const vol = rets.length > 2 ? Math.sqrt(rets.reduce((s, x) => s + (x - mean) ** 2, 0) / (rets.length - 1)) * Math.sqrt(252) : null;
  return { last, asOf: series.at(-1)?.[0] ?? null, d1: chg(1), w1: chg(5), m1: chg(21), m3: chg(63), vol, diff1m: back(21) !== null ? last - back(21) : null };
}

// ---------- signals ----------
const pct = (x) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(1)}%`;
/**
 * Rules that turn moves into decision prompts. Each signal: level ('alert' | 'watch' | 'positive'), what happened (with
 * the number), why it matters for a Dubai portfolio, and the evidence ids it rests on. Thresholds are deliberate and
 * listed in docs/market-pulse.md; a signal is a prompt to look closer, not a trade.
 */
export function signals(pulse, now = Date.now()) {
  const m = Object.fromEntries(pulse.markets.map((x) => [x.id, stats(x.series, x)]));
  const out = [];
  const add = (s) => out.push(s);
  if (m.brent?.m1 != null) {
    if (m.brent.m1 >= 0.1) add({ id: 'oil-up', level: 'watch', title: `Brent ${pct(m.brent.m1)} in a month`, why: 'Higher oil supports GCC budgets, liquidity and government-linked demand, but lifts inflation, freight and airline costs.', evidence: ['brent'] });
    else if (m.brent.m1 <= -0.1) add({ id: 'oil-down', level: 'alert', title: `Brent ${pct(m.brent.m1)} in a month`, why: 'Falling oil tightens GCC fiscal room and liquidity; watch government spending, off-plan demand and bank deposits.', evidence: ['brent'] });
  }
  if (m.us10y?.diff1m != null) {
    if (m.us10y.diff1m >= 0.25) add({ id: 'rates-up', level: 'alert', title: `US 10-year yield up ${(m.us10y.diff1m * 100).toFixed(0)} bp in a month`, why: 'The dirham peg imports US rates: mortgage and development financing get dearer and property cap rates face upward pressure.', evidence: ['us10y'] });
    else if (m.us10y.diff1m <= -0.25) add({ id: 'rates-down', level: 'positive', title: `US 10-year yield down ${Math.abs(m.us10y.diff1m * 100).toFixed(0)} bp in a month`, why: 'Easier financing through the peg supports leveraged real estate and valuations of income assets.', evidence: ['us10y'] });
  }
  if (m.dxy?.m1 != null && Math.abs(m.dxy.m1) >= 0.03) add({ id: 'usd', level: 'watch', title: `US dollar index ${pct(m.dxy.m1)} in a month`,
    why: m.dxy.m1 > 0 ? 'A stronger dollar makes AED assets dearer for European, British and Asian buyers and visitors.' : 'A weaker dollar makes AED assets and Dubai stays cheaper for foreign buyers and tourists.', evidence: ['dxy', 'eurusd'] });
  if (m.vix?.last != null && m.vix.last >= 25) add({ id: 'risk-off', level: 'alert', title: `Volatility high: VIX at ${m.vix.last.toFixed(1)}`, why: 'Global risk-off: IPO windows and foreign inflows tend to slow; liquidity and staged commitments matter more.', evidence: ['vix'] });
  // UAE equities against the US: the DFM index when its month is available, otherwise the daily MSCI UAE fund.
  const uae = m.dfm?.m1 != null ? { id: 'dfm', name: 'DFM', s: m.dfm } : m['msci-uae']?.m1 != null ? { id: 'msci-uae', name: 'MSCI UAE', s: m['msci-uae'] } : null;
  if (uae && m.spx?.m1 != null) {
    const rel = uae.s.m1 - m.spx.m1;
    if (Math.abs(rel) >= 0.05) add({ id: 'uae-rel', level: rel > 0 ? 'positive' : 'watch', title: `${uae.name} ${rel > 0 ? 'outperforming' : 'lagging'} the S&P 500 by ${Math.abs(rel * 100).toFixed(1)} pts over a month`,
      why: rel > 0 ? 'Local equity sentiment is stronger than global: supportive for listings and capital recycling.' : 'Local sentiment is weaker than global: check property developers and banks before new launches or listings.', evidence: [uae.id, 'spx'] });
  }
  if (m.emaar?.m1 != null && Math.abs(m.emaar.m1) >= 0.1) add({ id: 'property', level: m.emaar.m1 > 0 ? 'positive' : 'alert', title: `Emaar ${pct(m.emaar.m1)} in a month`, why: 'The market\'s real-estate bellwether: a proxy for off-plan sentiment and developer financing.', evidence: ['emaar', 'emaar-dev'] });
  if (m.freight?.m1 != null && Math.abs(m.freight.m1) >= 0.15) add({ id: 'freight', level: 'watch', title: `Dry-bulk freight ${pct(m.freight.m1)} in a month`, why: 'Freight swings feed into construction-material and import costs and logistics-park demand.', evidence: ['freight'] });
  const recent = pulse.news.filter((n) => now - Date.parse(n.published) <= 3 * DAY).map((n) => ({ ...n, ...classify(n.title) }));
  for (const c of CHOKEPOINTS) {
    const items = recent.filter((n) => n.chokepoints.includes(c.id));
    if (items.length >= 3) add({ id: `choke-${c.id}`, level: items.length >= 8 ? 'alert' : 'watch', title: `${c.label}: ${items.length} headlines in 3 days`, why: c.why, evidence: [], news: items.slice(0, 3) });
  }
  const sec = recent.filter((n) => n.themes.includes('security') && n.countries.some((x) => ['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'IR'].includes(x)));
  if (sec.length >= 6) add({ id: 'regional-security', level: 'watch', title: `Regional security in the news: ${sec.length} headlines in 3 days`, why: 'Perceived regional risk moves tourism, insurance premiums and foreign buyer demand before it moves fundamentals.', evidence: [], news: sec.slice(0, 3) });
  const order = { alert: 0, watch: 1, positive: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

// ---------- news views ----------
export function byTheme(news, now = Date.now()) {
  const tagged = news.map((n) => ({ ...n, ...classify(n.title) }));
  return THEMES.map((t) => {
    const items = tagged.filter((n) => n.themes.includes(t.id));
    return { ...t, items, last24h: items.filter((n) => now - Date.parse(n.published) <= DAY).length, last7d: items.length };
  });
}

export function byCountry(news, now = Date.now()) {
  const tagged = news.map((n) => ({ ...n, ...classify(n.title) }));
  return COUNTRIES.map((c) => {
    const items = tagged.filter((n) => n.countries.includes(c.id));
    const counts = Object.fromEntries(THEMES.map((t) => [t.id, items.filter((n) => n.themes.includes(t.id)).length]));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const recent = items.filter((n) => now - Date.parse(n.published) <= 2 * DAY).length, prior = items.length - recent;
    return { ...c, items, total: items.length, recent, prior, counts, dominant: top && top[1] > 0 ? THEMES.find((t) => t.id === top[0]).label : null };
  }).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
}

// ---------- decision journal ----------
export const STANCES = ['Buy', 'Add', 'Hold', 'Trim', 'Exit', 'Wait'];
export const CHECKLIST = [
  { id: 'base-rate', label: 'I checked how similar deals or cycles have played out before (base rate).' },
  { id: 'downside', label: 'I sized the downside and know the loss I can accept.' },
  { id: 'liquidity', label: 'Liquidity, funding and exit route are clear at today\'s rates.' },
  { id: 'mandate', label: 'It fits the fund\'s mandate, concentration and ESG limits.' },
  { id: 'sources', label: 'I read primary sources, not only headlines.' },
  { id: 'disconfirm', label: 'I wrote down what would prove me wrong.' },
];

/** What is still missing before a decision note can be saved. */
export function noteErrors(n) {
  const out = [];
  if (!n.title?.trim()) out.push('Name the decision.');
  if (!STANCES.includes(n.stance)) out.push('Choose a stance.');
  if (!n.thesis?.trim() || n.thesis.trim().length < 20) out.push('Write the thesis (at least a sentence).');
  if (!n.disconfirm?.trim()) out.push('Write what would change your mind.');
  if (!(n.conviction >= 1 && n.conviction <= 5)) out.push('Set conviction from 1 to 5.');
  if (!n.reviewOn || !Number.isFinite(Date.parse(n.reviewOn))) out.push('Set a review date.');
  return out;
}

export const reviewDue = (n, now = Date.now()) => !n.closed && Date.parse(n.reviewOn) <= now;

/** Market levels at the time of the note, so a later review can see what has moved since. */
export function snapshotLevels(pulse, ids = ['dfm', 'emaar', 'brent', 'us10y', 'dxy', 'vix']) {
  return Object.fromEntries(pulse.markets.filter((m) => ids.includes(m.id)).map((m) => [m.id, m.series.at(-1)[1]]));
}
