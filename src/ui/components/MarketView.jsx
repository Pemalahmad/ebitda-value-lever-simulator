import React from 'react';
import { Source } from './Source.jsx';
import OFFICIAL from '../../../data/market/dld-official.json';

// Deal-level aggregate is optional: it exists only after `node scripts/ingest-dld.mjs <csv>`.
const optional = import.meta.glob('../../../data/market/dld-aggregate.json', { eager: true, import: 'default' });
const AGG = Object.values(optional)[0] ?? null;

const bn = (value) => `AED ${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}bn`;
const n0 = (value) => value.toLocaleString('en-US');
const pctS = (value, dp = 1) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value * 100).toFixed(dp)}%`;

export function MarketView() {
  const years = OFFICIAL.annual.filter((item) => item.valueAedBn);
  const latest = years.at(-1);
  const previous = years.at(-2);
  const currentPeriod = OFFICIAL.periods.at(-1);
  const valueChange = previous ? latest.valueAedBn / previous.valueAedBn - 1 : 0;
  const transactionChange = previous?.transactions ? latest.transactions / previous.transactions - 1 : 0;

  return <div className="market-board">
    <section className="market-opening">
      <div className="market-intro">
        <div className="market-status"><span aria-hidden="true" />Market snapshot <b>{OFFICIAL.asOf}</b></div>
        <h2>Dubai property,<br />read as a market.</h2>
        <p>Official flows, investor activity and community performance in one working view. Use the operating models only after the market signal is clear.</p>
        <div className="market-provenance">Published figures remain linked to source. Partial periods are labelled.</div>
      </div>
      <PulseWidget latest={latest} previous={previous} years={years} change={valueChange} />
    </section>

    <section className="instrument-grid" aria-label="Market headline instruments">
      <VelocityWidget latest={latest} previous={previous} years={years} change={transactionChange} />
      <InvestorWidget latest={latest} />
      <PeriodWidget period={currentPeriod} />
    </section>

    <section className="market-analysis-grid">
      <HistoryWidget years={years} />
      <CommunityLedger />
    </section>

    {OFFICIAL.signals?.length > 0 && <SignalLedger signals={OFFICIAL.signals} />}
    {AGG ? <DealTracker agg={AGG} /> : <IngestHowTo />}
  </div>;
}

function PulseWidget({ latest, previous, years, change }) {
  return <article className="pulse-widget">
    <header><div><span>Recorded market value</span><b>{latest.year} full year</b></div><Source s={latest.source} /></header>
    <div className="pulse-number">{bn(latest.valueAedBn)}</div>
    <div className="pulse-change"><strong>{pctS(change)}</strong><span>against {previous.year}</span></div>
    <Sparkline values={years.map((item) => item.valueAedBn)} />
    <footer><span>{n0(latest.transactions)} transactions</span><span>{n0(latest.investors)} investors</span></footer>
  </article>;
}

function VelocityWidget({ latest, previous, years, change }) {
  const max = Math.max(...years.map((item) => item.transactions ?? 0));
  return <article className="instrument velocity-widget">
    <header><span>Transaction velocity</span><Source s={latest.source} /></header>
    <div className="instrument-value">{n0(latest.transactions)}</div>
    <p><b>{pctS(change)}</b> year on year</p>
    <div className="mini-columns" aria-label="Annual transaction volume">
      {years.map((item) => <div key={item.year}><i style={{ height: `${(item.transactions / max) * 100}%` }} /><span>{String(item.year).slice(2)}</span></div>)}
    </div>
    <footer>{n0(previous.transactions)} in {previous.year}</footer>
  </article>;
}

function InvestorWidget({ latest }) {
  const newShare = latest.newInvestors / latest.investors;
  return <article className="instrument investor-widget">
    <header><span>Investor base</span><Source s={latest.investorsSource ?? latest.source} /></header>
    <div className="investor-body">
      <div className="investor-ring" style={{ '--share': `${newShare * 100}%` }}><span>{Math.round(newShare * 100)}%</span></div>
      <div><div className="instrument-value">{n0(latest.investors)}</div><p>active investors in {latest.year}</p></div>
    </div>
    <footer><b>{n0(latest.newInvestors)}</b> entered the market</footer>
  </article>;
}

function PeriodWidget({ period }) {
  const elapsed = Math.min(12, Number.parseInt(period.period, 10) || 12);
  return <article className="instrument period-widget">
    <header><span>Current reporting period</span><Source s={period.source} /></header>
    <div className="period-head"><div className="instrument-value">{bn(period.valueAedBn)}</div><span>{period.period}</span></div>
    <div className="period-track" aria-label={`${elapsed} months reported`}>{Array.from({ length: 12 }, (_, index) => <i key={index} className={index < elapsed ? 'on' : ''} />)}</div>
    <footer><b>{n0(period.transactions)}</b> transactions reported</footer>
  </article>;
}

function HistoryWidget({ years }) {
  const bars = [...years.map((item) => ({ label: String(item.year), value: item.valueAedBn, source: item.source })), ...OFFICIAL.periods.filter((item) => item.valueAedBn).map((item) => ({ label: item.period, value: item.valueAedBn, source: item.source, partial: true }))];
  const max = Math.max(...bars.map((item) => item.value));
  return <article className="history-widget">
    <header><div><h3>Transaction value</h3><p>AED billions across published full and partial periods</p></div><span className="chart-key"><i />Partial period</span></header>
    <div className="history-chart">
      {bars.map((item) => <div className="history-column" key={item.label}>
        <div className="history-bar-space"><i className={item.partial ? 'partial' : ''} style={{ height: `${(item.value / max) * 100}%` }} /></div>
        <b>{Math.round(item.value)}</b><span>{item.label} <Source s={item.source} /></span>
      </div>)}
    </div>
    {OFFICIAL.periodsNote && <footer>{OFFICIAL.periodsNote}</footer>}
  </article>;
}

function CommunityLedger() {
  return <article className="community-widget">
    <header><div><h3>Community ledger</h3><p>{OFFICIAL.topAreasNote}</p></div><Source s={OFFICIAL.topAreasSource} /></header>
    <div className="table-wrap"><table className="market-table">
      <thead><tr><th>Community</th><th>Investors</th><th>Value</th></tr></thead>
      <tbody>{OFFICIAL.topAreas.map((area) => <tr key={`${area.rank}-${area.area}`}><td><span>{area.rank}</span>{area.area}</td><td>{area.transactions ? n0(area.transactions) : '—'}</td><td>{bn(area.valueAedBn)}</td></tr>)}</tbody>
    </table></div>
  </article>;
}

function SignalLedger({ signals }) {
  return <section className="signal-ledger">
    <header><div><h3>Signals worth carrying forward</h3><p>Use these facts to frame a scenario—not as forecasts.</p></div><span>{signals.length} sourced observations</span></header>
    <div>{signals.map((signal) => <article key={signal.text}><i aria-hidden="true" /><p>{signal.text}</p><Source s={signal.source} /></article>)}</div>
  </section>;
}

function DealTracker({ agg }) {
  const maxMonth = Math.max(...agg.months.map((month) => month.valueAedBn));
  const ppsm = (value) => `AED ${Math.round(value).toLocaleString('en-US')}/m²`;
  return <section className="deal-workspace">
    <header><div><span>Connected transaction file</span><h3>{agg.period.start} to {agg.period.end}</h3></div><Source s={{ url: agg.source.url, title: agg.source.name, date: agg.source.generated }} /></header>
    <div className="deal-metrics"><Metric label="Deals" value={n0(agg.totals.deals)} /><Metric label="Total value" value={bn(agg.totals.valueAedBn)} /><Metric label="Off-plan" value={pctS(agg.totals.offPlanShare, 0).replace('+', '')} /><Metric label="Median sale" value={ppsm(agg.totals.medianSalePpsm)} /></div>
    <div className="month-strip">{agg.months.map((month) => <div key={month.month}><i style={{ height: `${(month.valueAedBn / maxMonth) * 100}%` }} /><span>{month.month.slice(2)}</span></div>)}</div>
    <div className="grid-2"><MomentumTable title="Price increases" rows={agg.momentum.increases} windowDays={agg.momentum.windowDays} ppsm={ppsm} /><MomentumTable title="Price drops" rows={agg.momentum.drops} windowDays={agg.momentum.windowDays} ppsm={ppsm} /></div>
  </section>;
}

function MomentumTable({ title, rows, windowDays, ppsm }) {
  return <article className="momentum-table"><h3>{title}</h3><p>Median AED/m², last {windowDays} days versus the preceding window.</p><table className="market-table"><thead><tr><th>Area</th><th>Now</th><th>Change</th></tr></thead><tbody>{rows.map((row) => <tr key={row.area}><td>{row.area}</td><td>{ppsm(row.recentPpsm)}</td><td className={row.change >= 0 ? 'pos' : 'neg'}>{pctS(row.change)}</td></tr>)}</tbody></table></article>;
}

function IngestHowTo() {
  return <section className="connect-strip">
    <div><span>Deal-level workspace</span><h3>Connect a DLD transaction file</h3><p>Add monthly flow, area momentum and project rankings without uploading the CSV.</p></div>
    <ol><li><b>1</b><span>Download Transactions CSV from <a href="https://dubailand.gov.ae/en/open-data/real-estate-data/" target="_blank" rel="noreferrer">DLD Open Data</a></span></li><li><b>2</b><span>Run <code>node scripts/ingest-dld.mjs path/to/transactions.csv</code></span></li><li><b>3</b><span>Rebuild with <code>npm run build</code></span></li></ol>
  </section>;
}

function Sparkline({ values }) {
  const width = 420, height = 112, pad = 8;
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const points = values.map((value, index) => `${pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2)},${height - pad - ((value - min) / range) * (height - pad * 2)}`).join(' ');
  const area = `${pad},${height - pad} ${points} ${width - pad},${height - pad}`;
  return <svg className="pulse-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Annual transaction value trend"><polygon points={area} /><polyline points={points} />{points.split(' ').map((point) => { const [cx, cy] = point.split(','); return <circle key={point} cx={cx} cy={cy} r="4" />; })}</svg>;
}

const Metric = ({ label, value }) => <div><span>{label}</span><b>{value}</b></div>;
