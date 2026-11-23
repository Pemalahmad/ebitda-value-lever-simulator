import React from 'react';
import { Source } from './Source.jsx';
import OFFICIAL from '../../../data/market/dld-official.json';

// Deal-level aggregate is optional: it exists only after `node scripts/ingest-dld.mjs <csv>`.
const optional = import.meta.glob('../../../data/market/dld-aggregate.json', { eager: true, import: 'default' });
const AGG = Object.values(optional)[0] ?? null;

const bn = (x) => `AED ${x.toLocaleString('en-US', { maximumFractionDigits: 1 })}bn`;
const n0 = (x) => x.toLocaleString('en-US');
const pctS = (x, dp = 1) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(dp)}%`;

export function MarketView() {
  const years = OFFICIAL.annual.filter((a) => a.valueAedBn);
  const maxV = Math.max(...years.map((a) => a.valueAedBn), ...OFFICIAL.periods.map((p) => p.valueAedBn ?? 0));
  const latest = years[years.length - 1];
  const prev = years[years.length - 2];
  return (
    <>
      <section className="card hero">
        <div className="eyebrow">Dubai real-estate market tracker</div>
        <h3>Track the market. Test the opportunity.</h3>
        <p className="card-sub">A market intelligence tracker built from Dubai Land Department publications and open transaction data. Follow transaction value, investor activity, community performance and deal-level momentum, then use the scenario tools to test the operating impact.</p>
        <div className="market-meta"><span>Market-data snapshot</span><b>{OFFICIAL.asOf}</b><span>Every published figure links to its source</span></div>
      </section>

      {latest && (
        <div className="tiles">
          <Tile label={`${latest.year} transactions`} value={latest.transactions ? n0(latest.transactions) : '—'} sub={prev?.transactions && latest.transactions ? `${pctS(latest.transactions / prev.transactions - 1)} vs ${prev.year}` : ''} src={latest.source} />
          <Tile label={`${latest.year} value`} value={bn(latest.valueAedBn)} sub={prev?.valueAedBn ? `${pctS(latest.valueAedBn / prev.valueAedBn - 1)} vs ${prev.year}` : ''} src={latest.source} />
          {latest.investors && <Tile label={`${latest.year} investors`} value={n0(latest.investors)} sub={latest.newInvestors ? `${n0(latest.newInvestors)} new` : ''} src={latest.investorsSource ?? latest.source} />}
          {OFFICIAL.periods.slice(-1).map((p) => (
            <Tile key={p.period} label={`${p.period} value`} value={p.valueAedBn ? bn(p.valueAedBn) : '—'} sub={p.transactions ? `${n0(p.transactions)} transactions` : ''} src={p.source} />
          ))}
        </div>
      )}

      <div className="grid-2">
        <section className="card">
          <h3>Transaction value by period</h3>
          <p className="card-sub">AED billions, all transaction types, as published. Striped bars are 2026 year-to-date.</p>
          <div className="vbars">
            {[...years.map((a) => ({ k: String(a.year), v: a.valueAedBn, s: a.source })), ...OFFICIAL.periods.filter((p) => p.valueAedBn).map((p) => ({ k: p.period, v: p.valueAedBn, s: p.source, partial: true }))].map((b) => (
              <div key={b.k} className="vb">
                <div className="vb-wrap"><div className={`vb-bar ${b.partial ? 'partial' : ''}`} style={{ height: `${(b.v / maxV) * 100}%` }} /></div>
                <div className="vb-val mono">{Math.round(b.v)}</div>
                <div className="vb-lbl">{b.k} <Source s={b.s} /></div>
              </div>
            ))}
          </div>
          {OFFICIAL.periodsNote && <p className="footnote">{OFFICIAL.periodsNote}</p>}
        </section>
        <section className="card">
          <h3>Top communities</h3>
          <p className="card-sub">{OFFICIAL.topAreasNote} <Source s={OFFICIAL.topAreasSource} /></p>
          <table className="data">
            <thead><tr><th>#</th><th>Community</th><th className="r">{OFFICIAL.topAreasLabel}</th><th className="r">Investment value</th></tr></thead>
            <tbody>
              {OFFICIAL.topAreas.map((a) => (
                <tr key={a.area}>
                  <td>{a.rank}</td>
                  <td>{a.area}</td>
                  <td className="r">{a.transactions ? n0(a.transactions) : '—'}</td>
                  <td className="r">{bn(a.valueAedBn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {OFFICIAL.signals?.length > 0 && (
        <section className="card">
          <h3>Market signals</h3>
          <div className="signals">
            {OFFICIAL.signals.map((s) => (
              <div key={s.text} className="signal"><span>{s.text}</span> <Source s={s.source} /></div>
            ))}
          </div>
        </section>
      )}

      {AGG ? <DealTracker agg={AGG} /> : <IngestHowTo />}
    </>
  );
}

function DealTracker({ agg }) {
  const maxM = Math.max(...agg.months.map((m) => m.valueAedBn));
  const ppsm = (x) => `AED ${Math.round(x).toLocaleString('en-US')}/m²`;
  return (
    <>
      <section className="card">
        <h3>Deal-level tracker · {agg.period.start} → {agg.period.end}</h3>
        <p className="card-sub">{n0(agg.totals.deals)} DLD transactions worth {bn(agg.totals.valueAedBn)}; {pctS(agg.totals.offPlanShare, 0).replace('+', '')} of sales off-plan; median sale {ppsm(agg.totals.medianSalePpsm)}. <Source s={{ url: agg.source.url, title: agg.source.name, date: agg.source.generated }} /></p>
        <div className="vbars months">
          {agg.months.map((m) => (
            <div key={m.month} className="vb">
              <div className="vb-wrap"><div className="vb-bar" style={{ height: `${(m.valueAedBn / maxM) * 100}%` }} /></div>
              <div className="vb-val mono">{m.valueAedBn.toFixed(1)}</div>
              <div className="vb-lbl">{m.month.slice(2)}</div>
            </div>
          ))}
        </div>
      </section>
      <div className="grid-2">
        <MomentumTable title="Biggest price increases" rows={agg.momentum.increases} w={agg.momentum.windowDays} ppsm={ppsm} />
        <MomentumTable title="Biggest price drops" rows={agg.momentum.drops} w={agg.momentum.windowDays} ppsm={ppsm} />
      </div>
      <section className="card">
        <h3>Top projects by sales value</h3>
        <table className="data">
          <thead><tr><th>Project</th><th>Area</th><th className="r">Deals</th><th className="r">Value</th></tr></thead>
          <tbody>{agg.projects.map((p) => <tr key={p.project}><td>{p.project}</td><td className="muted">{p.area}</td><td className="r">{n0(p.deals)}</td><td className="r">{bn(p.valueAedBn)}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}

function MomentumTable({ title, rows, w, ppsm }) {
  return (
    <section className="card">
      <h3>{title}</h3>
      <p className="card-sub">Median sale price per m², last {w} days vs the {w} days before (areas with enough deals in both windows).</p>
      <table className="data">
        <thead><tr><th>Area</th><th className="r">Now</th><th className="r">Before</th><th className="r">Change</th></tr></thead>
        <tbody>{rows.map((m) => <tr key={m.area}><td>{m.area}</td><td className="r">{ppsm(m.recentPpsm)}</td><td className="r">{ppsm(m.priorPpsm)}</td><td className={`r ${m.change >= 0 ? 'pos' : 'neg'}`}>{pctS(m.change)}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

function IngestHowTo() {
  return (
    <section className="card">
      <h3>Deal-level tracker (connect DLD open data)</h3>
      <p className="card-sub">Switch on area-level price momentum (drops and increases), monthly deal flow and top projects from official DLD transactions:</p>
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
