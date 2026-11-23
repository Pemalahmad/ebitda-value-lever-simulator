import React, { useEffect, useMemo, useState } from 'react';
import { Source } from './GroupView.jsx';
import OFFICIAL from '../../../data/market/dld-official.json';

// Deal-level aggregate is optional: it exists only after `node scripts/ingest-dld.mjs <csv>`.
const optional = import.meta.glob('../../../data/market/dld-aggregate.json', { eager: true, import: 'default' });
const AGG = Object.values(optional)[0] ?? null;

const AED_PER_USD = 3.6725; // the dirham's fixed peg

// Currency: AED and USD are exact (peg); EUR and GBP are fetched live when available.
function useCurrency() {
  const [cur, setCur] = useState('AED');
  const [rates, setRates] = useState({ AED: 1, USD: 1 / AED_PER_USD });
  const [asOf, setAsOf] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch('https://open.er-api.com/v6/latest/AED')
      .then((r) => r.json())
      .then((j) => {
        if (alive && j?.rates?.EUR && j?.rates?.GBP) {
          setRates((x) => ({ ...x, EUR: j.rates.EUR, GBP: j.rates.GBP }));
          setAsOf(j.time_last_update_utc?.slice(5, 16) ?? null);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const sym = { AED: 'AED ', USD: '$', EUR: '€', GBP: '£' }[cur];
  const conv = (aed) => aed * rates[cur];
  const bn = (aedBn) => `${sym}${conv(aedBn).toLocaleString('en-US', { maximumFractionDigits: 1 })}bn`;
  const ppsm = (aed) => `${sym}${Math.round(conv(aed)).toLocaleString('en-US')}/m²`;
  const amt = (aed) => {
    const v = conv(aed);
    return v >= 1e6 ? `${sym}${(v / 1e6).toFixed(2)}m` : `${sym}${Math.round(v / 1e3).toLocaleString('en-US')}k`;
  };
  return { cur, setCur, options: Object.keys(rates), asOf, bn, ppsm, amt };
}

const n0 = (x) => x.toLocaleString('en-US');
const pctS = (x, dp = 1) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(dp)}%`;

export function MarketView() {
  const fx = useCurrency();
  const years = OFFICIAL.annual;
  const latest = years[years.length - 1];
  const prev = years[years.length - 2];
  const maxV = Math.max(...years.map((a) => a.valueAedBn), ...OFFICIAL.periods.map((p) => p.valueAedBn ?? 0));
  return (
    <>
      <section className="card hero">
        <div className="hero-row">
          <div>
            <div className="eyebrow">Dubai real-estate market tracker</div>
            <h3>Where the market is, from official DLD data</h3>
            <p className="card-sub">Headline flows, prices, rents and investor origin from Dubai Land Department publications and the Dubai Media Office, each linked to its source. The deal-level tracker below switches on when a DLD open-data CSV is ingested.</p>
          </div>
          <div className="cur-switch" role="group" aria-label="Currency">
            {fx.options.map((c) => <button key={c} className={`chip ${fx.cur === c ? 'on' : ''}`} onClick={() => fx.setCur(c)}>{c}</button>)}
            <div className="muted sm">{fx.cur === 'AED' || fx.cur === 'USD' ? 'USD at the 3.6725 peg' : `Live rate ${fx.asOf ?? ''}`}</div>
          </div>
        </div>
      </section>

      <div className="tiles">
        <Tile label={`${latest.year} transactions`} value={n0(latest.transactions)} sub={`${pctS(latest.transactions / prev.transactions - 1)} vs ${prev.year}`} src={latest.source} />
        <Tile label={`${latest.year} value`} value={fx.bn(latest.valueAedBn)} sub={`${pctS(latest.valueAedBn / prev.valueAedBn - 1)} vs ${prev.year}`} src={latest.source} />
        <Tile label={`${latest.year} investors`} value={n0(latest.investors)} sub={`${n0(latest.newInvestors)} new`} src={latest.investorsSource ?? latest.source} />
        <Tile label="Avg unit price 2025" value={fx.ppsm(OFFICIAL.priceTrend.series[0].values.at(-1))} sub={`${pctS(OFFICIAL.priceTrend.series[0].values.at(-1) / OFFICIAL.priceTrend.series[0].values.at(-2) - 1)} y/y`} src={OFFICIAL.priceTrend.source} />
        {OFFICIAL.periods.slice(-1).map((p) => (
          <Tile key={p.period} label={`${p.period} value`} value={fx.bn(p.valueAedBn)} sub={`${n0(p.transactions)} transactions`} src={p.source} />
        ))}
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>Transaction value by period</h3>
          <p className="card-sub">All transaction types, as published. Striped bars are 2026 year to date.</p>
          <div className="vbars">
            {[...years.map((a) => ({ k: String(a.year), v: a.valueAedBn, s: a.source })), ...OFFICIAL.periods.map((p) => ({ k: p.period, v: p.valueAedBn, s: p.source, partial: true }))].map((b) => (
              <div key={b.k} className="vb">
                <div className="vb-wrap"><div className={`vb-bar ${b.partial ? 'partial' : ''}`} style={{ height: `${(b.v / maxV) * 100}%` }} /></div>
                <div className="vb-val mono">{fx.bn(b.v).replace(/bn$/, '')}</div>
                <div className="vb-lbl">{b.k} <Source s={b.s} /></div>
              </div>
            ))}
          </div>
          {OFFICIAL.periodsNote && <p className="footnote">{OFFICIAL.periodsNote}</p>}
        </section>
        <section className="card">
          <h3>Price per m² trend</h3>
          <p className="card-sub">{OFFICIAL.priceTrend.note} <Source s={OFFICIAL.priceTrend.source} /></p>
          <LineChart years={OFFICIAL.priceTrend.years} series={OFFICIAL.priceTrend.series} fmt={fx.ppsm} />
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>Market split, 2024 → 2025</h3>
          <p className="card-sub">By transaction type and by property category. <Source s={OFFICIAL.splits.source} /></p>
          <SplitBars rows={OFFICIAL.splits.byType} bn={fx.bn} />
          <div className="divider" />
          <SplitBars rows={OFFICIAL.splits.byCategory} bn={fx.bn} />
        </section>
        <section className="card">
          <h3>Where investors come from</h3>
          <p className="card-sub">Investment value by source region, 2024 vs 2025. <Source s={OFFICIAL.investorRegions.source} /></p>
          <PairBars rows={OFFICIAL.investorRegions.rows} bn={fx.bn} />
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <h3>Top communities by investment value (2025)</h3>
          <p className="card-sub">{OFFICIAL.topAreasNote} <Source s={OFFICIAL.topAreasSource} /></p>
          <table className="data">
            <thead><tr><th>#</th><th>Community</th><th className="r">{OFFICIAL.topAreasLabel}</th><th className="r">Investment value</th></tr></thead>
            <tbody>{OFFICIAL.topAreas.map((a) => <tr key={a.area}><td>{a.rank}</td><td>{a.area}</td><td className="r">{a.transactions ? n0(a.transactions) : '—'}</td><td className="r">{fx.bn(a.valueAedBn)}</td></tr>)}</tbody>
          </table>
        </section>
        <section className="card">
          <h3>Rental market</h3>
          <p className="card-sub">Top 10 communities by annual rent value in 2025, with year-on-year change. <Source s={OFFICIAL.rentCommunities.source} /></p>
          <table className="data">
            <thead><tr><th>Community</th><th className="r">Annual rent</th><th className="r">y/y</th></tr></thead>
            <tbody>{OFFICIAL.rentCommunities.rows.map(([a, v, g]) => <tr key={a}><td>{a}</td><td className="r">{fx.bn(v)}</td><td className="r pos">+{g}%</td></tr>)}</tbody>
          </table>
          <div className="rent-trend">
            {OFFICIAL.rentTrend.rows.map((r) => (
              <div key={r.name} className="metric"><b>{fx.ppsm(r.y2025).replace('/m²', '')}</b> /m²/yr {r.name.toLowerCase()} {r.y2024 ? <span className="pos">{pctS(r.y2025 / r.y2024 - 1)}</span> : null}</div>
            ))}
            <Source s={OFFICIAL.rentTrend.source} />
          </div>
        </section>
      </div>

      <FairValue fx={fx} />

      {OFFICIAL.signals?.length > 0 && (
        <section className="card">
          <h3>Market signals</h3>
          <div className="signals">
            {OFFICIAL.signals.map((s) => <div key={s.text} className="signal"><span>{s.text}</span> <Source s={s.source} /></div>)}
          </div>
        </section>
      )}

      {AGG ? <DealTracker agg={AGG} fx={fx} /> : <IngestHowTo />}
    </>
  );
}

// dxbtracker-style "is this price fair?" check, against official benchmarks
// (or ingested area medians when a DLD CSV has been loaded).
function FairValue({ fx }) {
  const options = useMemo(() => {
    const o = [
      { id: 'unit', label: 'Dubai average: apartment / unit', ppsm: OFFICIAL.priceTrend.series[0].values.at(-1), src: OFFICIAL.priceTrend.source },
      { id: 'villa', label: 'Dubai average: villa', ppsm: OFFICIAL.priceTrend.series[1].values.at(-1), src: OFFICIAL.priceTrend.source },
      { id: 'lux-unit', label: 'Dubai luxury: unit', ppsm: OFFICIAL.luxury.rows[0].y2025, src: OFFICIAL.luxury.source },
      { id: 'lux-villa', label: 'Dubai luxury: villa', ppsm: OFFICIAL.luxury.rows[1].y2025, src: OFFICIAL.luxury.source },
      ...OFFICIAL.luxury.communities.map((c) => ({ id: `${c.area}-${c.type}`, label: `${c.area}: luxury ${c.type}`, ppsm: c.ppsm, src: OFFICIAL.luxury.source })),
    ];
    if (AGG) for (const a of AGG.areas.filter((x) => Number.isFinite(x.medianPpsm))) o.push({ id: `agg-${a.area}`, label: `${a.area}: ingested DLD median`, ppsm: a.medianPpsm, src: { url: AGG.source.url, title: AGG.source.name } });
    return o;
  }, []);
  const [bench, setBench] = useState(options[0].id);
  const [size, setSize] = useState(110);
  const [price, setPrice] = useState(2400000);
  const b = options.find((o) => o.id === bench);
  const asked = price / size;
  const gap = asked / b.ppsm - 1;
  const verdict = gap > 0.1 ? ['Above market', 'neg'] : gap < -0.1 ? ['Below market', 'pos'] : ['Near market', 'amber'];
  return (
    <section className="card">
      <h3>Fair-value check</h3>
      <p className="card-sub">Compare an asking price with official DLD benchmark prices per m². This is the "market value vs listing" view, built on transacted prices rather than scraped listings. <Source s={b.src} /></p>
      <div className="fv">
        <label>Benchmark<select value={bench} onChange={(e) => setBench(e.target.value)}>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
        <label>Size (m²)<input type="number" min="20" max="5000" value={size} onChange={(e) => setSize(Math.max(1, Number(e.target.value) || 1))} /></label>
        <label>Asking price (AED)<input type="number" min="100000" step="50000" value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} /></label>
        <div className="fv-out">
          <div className="muted sm">Asking {fx.ppsm(asked)} vs benchmark {fx.ppsm(b.ppsm)}</div>
          <div className={`fv-verdict ${verdict[1]}`}>{verdict[0]} <span className="mono">{pctS(gap)}</span></div>
          <div className="muted sm">Benchmark value for this size: {fx.amt(b.ppsm * size)}</div>
        </div>
      </div>
      <p className="footnote">City-wide averages mix many locations and specifications; use an ingested area median for a like-for-like check.</p>
    </section>
  );
}

function LineChart({ years, series, fmt }) {
  const W = 520, H = 200, P = 34;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all) * 1.08, min = Math.min(...all) * 0.85;
  const x = (i) => P + (i * (W - P * 2)) / (years.length - 1);
  const y = (v) => H - 24 - ((v - min) / (max - min)) * (H - 44);
  const colors = ['var(--gold)', 'var(--pos)'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="linechart" role="img" aria-label="Average price per square metre, units and villas">
      {years.map((yr, i) => <text key={yr} x={x(i)} y={H - 6} textAnchor="middle" className="ax">{yr}</text>)}
      {series.map((s, k) => (
        <g key={s.name}>
          <polyline fill="none" stroke={colors[k]} strokeWidth="2.5" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
          {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={colors[k]} />)}
          <text x={x(s.values.length - 1) - 4} y={y(s.values.at(-1)) - 10} textAnchor="end" className="lbl" fill={colors[k]}>{s.name} {fmt(s.values.at(-1))}</text>
          <text x={x(0) + 6} y={y(s.values[0]) + 20} className="lbl muted-fill">{fmt(s.values[0])}</text>
        </g>
      ))}
    </svg>
  );
}

function SplitBars({ rows, bn }) {
  const max = Math.max(...rows.flatMap((r) => [r.y2024.aedBn, r.y2025.aedBn]));
  return (
    <div className="splits">
      {rows.map((r) => (
        <div key={r.name} className="split">
          <div className="split-top"><span>{r.name}</span><span className="mono sm">{n0(r.y2025.deals)} deals · {bn(r.y2025.aedBn)} <span className={r.y2025.aedBn >= r.y2024.aedBn ? 'pos' : 'neg'}>{pctS(r.y2025.aedBn / r.y2024.aedBn - 1, 0)}</span></span></div>
          <div className="pair"><span className="b24" style={{ width: `${(r.y2024.aedBn / max) * 100}%` }} /><span className="b25" style={{ width: `${(r.y2025.aedBn / max) * 100}%` }} /></div>
        </div>
      ))}
      <div className="legend sm"><span className="sw b24" /> 2024 <span className="sw b25" /> 2025</div>
    </div>
  );
}

function PairBars({ rows, bn }) {
  const max = Math.max(...rows.map((r) => r[2]));
  return (
    <div className="splits">
      {rows.map(([name, a, b]) => (
        <div key={name} className="split">
          <div className="split-top"><span>{name}</span><span className="mono sm">{bn(b)} <span className="pos">{pctS(b / a - 1, 0)}</span></span></div>
          <div className="pair"><span className="b24" style={{ width: `${(a / max) * 100}%` }} /><span className="b25" style={{ width: `${(b / max) * 100}%` }} /></div>
        </div>
      ))}
      <div className="legend sm"><span className="sw b24" /> 2024 <span className="sw b25" /> 2025</div>
    </div>
  );
}

function DealTracker({ agg, fx }) {
  const [f, setF] = useState({ type: 'All', reg: 'All', area: 'All', rooms: 'All' });
  const opts = (k) => ['All', ...new Set(agg.records.map((r) => r[k]).filter(Boolean))].sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)));
  const rows = agg.records.filter((r) => (f.type === 'All' || r.ty === f.type) && (f.reg === 'All' || r.rg === f.reg) && (f.area === 'All' || r.ar === f.area) && (f.rooms === 'All' || r.rm === f.rooms));
  const maxM = Math.max(...agg.months.map((m) => m.valueAedBn));
  const maxB = Math.max(...agg.priceBands.map((b) => b.deals), 1);
  const tr = agg.trend.filter((t) => Number.isFinite(t.rollingPpsm));
  return (
    <>
      <section className="card">
        <h3>Deal-level tracker · {agg.period.start} → {agg.period.end}</h3>
        <p className="card-sub">{n0(agg.totals.deals)} DLD transactions worth {fx.bn(agg.totals.valueAedBn)}; {(agg.totals.offPlanShare * 100).toFixed(0)}% of sales off-plan; median sale {fx.ppsm(agg.totals.medianSalePpsm)}; off-plan premium vs ready {pctS(agg.registration.offPlanPremium)}. <Source s={{ url: agg.source.url, title: agg.source.name, date: agg.source.generated }} /></p>
        <div className="vbars months">
          {agg.months.map((m) => (
            <div key={m.month} className="vb">
              <div className="vb-wrap"><div className="vb-bar" style={{ height: `${(m.valueAedBn / maxM) * 100}%` }} /></div>
              <div className="vb-val mono">{m.valueAedBn.toFixed(1)}</div>
              <div className="vb-lbl">{m.month.slice(2)}</div>
            </div>
          ))}
        </div>
        {tr.length > 7 && <LineChart years={tr.filter((_, i) => i % Math.ceil(tr.length / 8) === 0).map((t) => t.date.slice(5))} series={[{ name: '7-day median', values: tr.filter((_, i) => i % Math.ceil(tr.length / 8) === 0).map((t) => t.rollingPpsm) }]} fmt={fx.ppsm} />}
      </section>
      <div className="grid-2">
        <MomentumTable title="Biggest price increases" rows={agg.momentum.increases} w={agg.momentum.windowDays} fx={fx} />
        <MomentumTable title="Biggest price drops" rows={agg.momentum.drops} w={agg.momentum.windowDays} fx={fx} />
      </div>
      <div className="grid-2">
        <section className="card">
          <h3>Price by bedrooms</h3>
          <table className="data">
            <thead><tr><th>Rooms</th><th className="r">Deals</th><th className="r">Median price</th><th className="r">Median /m²</th></tr></thead>
            <tbody>{agg.byRooms.map((r) => <tr key={r.key}><td>{r.key}</td><td className="r">{n0(r.deals)}</td><td className="r">{fx.amt(r.medianPrice)}</td><td className="r">{fx.ppsm(r.medianPpsm)}</td></tr>)}</tbody>
          </table>
        </section>
        <section className="card">
          <h3>Price range distribution</h3>
          <div className="splits">
            {agg.priceBands.map((b) => (
              <div key={b.lo} className="split">
                <div className="split-top"><span>{fx.amt(b.lo)}{b.hi === null || b.hi === undefined || !Number.isFinite(b.hi) ? '+' : ` – ${fx.amt(b.hi)}`}</span><span className="mono sm">{n0(b.deals)}</span></div>
                <div className="pair"><span className="b25" style={{ width: `${(b.deals / maxB) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="card">
        <h3>Top deals</h3>
        <RecordTable rows={agg.topDeals} fx={fx} />
      </section>
      <section className="card">
        <h3>Transaction records</h3>
        <div className="filters">
          {[['type', 'ty', 'Type'], ['reg', 'rg', 'Registration'], ['area', 'ar', 'Area'], ['rooms', 'rm', 'Rooms']].map(([k, col, label]) => (
            <label key={k}>{label}<select value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>{opts(col).map((o) => <option key={o}>{o}</option>)}</select></label>
          ))}
          <span className="muted sm">{n0(rows.length)} of {n0(agg.records.length)} latest records</span>
        </div>
        <RecordTable rows={rows.slice(0, 30)} fx={fx} />
      </section>
    </>
  );
}

function RecordTable({ rows, fx }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead><tr><th>Date</th><th>Type</th><th>Reg.</th><th>Area</th><th>Project</th><th>Rooms</th><th className="r">Amount</th><th className="r">Size</th><th className="r">/m²</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}><td className="mono sm">{r.d}</td><td>{r.ty}</td><td>{r.rg}</td><td>{r.ar}</td><td className="muted sm">{r.pj}</td><td>{r.rm}</td><td className="r">{fx.amt(r.a)}</td><td className="r">{r.s} m²</td><td className="r">{r.s ? fx.ppsm(r.a / r.s) : '—'}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function MomentumTable({ title, rows, w, fx }) {
  return (
    <section className="card">
      <h3>{title}</h3>
      <p className="card-sub">Median sale price per m², last {w} days vs the {w} days before (areas with enough deals in both windows).</p>
      <table className="data">
        <thead><tr><th>Area</th><th className="r">Now</th><th className="r">Before</th><th className="r">Change</th></tr></thead>
        <tbody>{rows.map((m) => <tr key={m.area}><td>{m.area}</td><td className="r">{fx.ppsm(m.recentPpsm)}</td><td className="r">{fx.ppsm(m.priorPpsm)}</td><td className={`r ${m.change >= 0 ? 'pos' : 'neg'}`}>{pctS(m.change)}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

function IngestHowTo() {
  return (
    <section className="card">
      <h3>Deal-level tracker (connect DLD open data)</h3>
      <p className="card-sub">Switch on transaction records with filters, top deals, price by bedrooms, price bands, a 7-day price trend, off-plan premium, and area price drops and increases, all from official DLD transactions:</p>
      <ol className="steps">
        <li>Open <a href="https://dubailand.gov.ae/en/open-data/real-estate-data/" target="_blank" rel="noreferrer">DLD Open Data → Transactions</a>, choose a date range and click <b>Download as CSV</b>.</li>
        <li>Run <code>node scripts/ingest-dld.mjs path/to/transactions.csv</code></li>
        <li>Rebuild with <code>npm run build</code>; this panel then becomes the live tracker.</li>
      </ol>
    </section>
  );
}

function Tile({ label, value, sub, src }) {
  return (
    <div className="tile">
      <div className="tile-label">{label} <Source s={src} /></div>
      <div className="tile-value">{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  );
}
