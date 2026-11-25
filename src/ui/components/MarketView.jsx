import React, { useEffect, useMemo, useState } from 'react';
import { Source } from './Source.jsx';
import { PageHead, Card, CardHead, Waterfall, Segmented, KpiStrip } from './Dots.jsx';
import { priceVolumeBridge } from '../../engine/index.js';
import { BeforeAfterCard, ImportLab, MobileCommandDock, ReleaseCalendar, ScenarioDeck } from './MarketWorkspace.jsx';
import OFFICIAL from '../../../data/market/dld-official.json';

// Deal-level aggregate is optional: it exists only after `node scripts/ingest-dld.mjs <csv>`.
const optional = import.meta.glob('../../../data/market/dld-aggregate.json', { eager: true, import: 'default' });
const AGG = Object.values(optional)[0] ?? null;

const bn = (value) => `AED ${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}bn`;
const n0 = (value) => value.toLocaleString('en-US');
const pctS = (value, dp = 1) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value * 100).toFixed(dp)}%`;
const CHART_METRICS = {
  valueAedBn: { label: 'Value', title: 'Transaction value', unit: 'AED billions', format: bn },
  transactions: { label: 'Transactions', title: 'Transaction volume', unit: 'published transactions', format: n0 },
  investors: { label: 'Investors', title: 'Investor base', unit: 'active investors', format: n0 },
};
const SOP_STEPS = [
  { id: 'validate', label: 'Validate evidence', owner: 'Market intelligence', sla: '4 hours', gate: 'Confirm the source, reporting period and metric definition.', evidence: ['Official or named source', 'Period and scope recorded', 'Partial data labelled'], output: 'Verified signal record' },
  { id: 'classify', label: 'Classify materiality', owner: 'Strategy', sla: '1 business day', gate: 'Test the move against agreed materiality thresholds.', evidence: ['Value movement ≥ 10%', 'Volume movement ≥ 10%', 'Investor movement ≥ 8%'], output: 'Watch, model or escalate' },
  { id: 'decide', label: 'Set the response', owner: 'Business owner', sla: '2 business days', gate: 'Choose the response and name the accountable owner.', evidence: ['Scenario impact quantified', 'Downside case reviewed', 'Decision owner assigned'], output: 'Approved response plan' },
  { id: 'record', label: 'Record and review', owner: 'PMO', sla: 'Weekly', gate: 'Log the rationale, evidence and next review date.', evidence: ['Decision log updated', 'Source link retained', 'Review date scheduled'], output: 'Auditable decision trail' },
];

export function MarketView() {
  const [selectedCase, setSelectedCase] = useState('base');
  const [importedAggregate, setImportedAggregate] = useState(null);
  const years = OFFICIAL.annual.filter((item) => item.valueAedBn);
  const latest = years.at(-1);
  const previous = years.at(-2);
  const currentPeriod = OFFICIAL.periods.at(-1);
  const valueChange = previous ? latest.valueAedBn / previous.valueAedBn - 1 : 0;
  const transactionChange = previous?.transactions ? latest.transactions / previous.transactions - 1 : 0;

  const activeAggregate = importedAggregate ?? AGG;

  return <div className="market-board doc">
    <PageHead status={`Official snapshot · ${OFFICIAL.asOf}`} title="Market tracker" muted="Dubai real estate"
      sub="Official flows, investor activity and community performance, every figure linked to its source." />
    <section className="market-top" id="market-pulse">
      <PulseWidget latest={latest} previous={previous} years={years} change={valueChange} />
      <VelocityWidget latest={latest} previous={previous} years={years} change={transactionChange} />
      <InvestorWidget latest={latest} />
      <PeriodWidget period={currentPeriod} />
    </section>

    <MarketVariance years={years} />

    <ReleaseCalendar />

    <section className="market-analysis-grid" id="market-history">
      <HistoryWidget years={years} />
      <CommunityLedger />
    </section>

    <section className="scenario-workspace">
      <ScenarioDeck latest={latest} selectedId={selectedCase} onSelect={setSelectedCase} />
      <BeforeAfterCard latest={latest} scenarioId={selectedCase} />
    </section>

    {OFFICIAL.signals?.length > 0 && <SignalLedger signals={OFFICIAL.signals} />}
    <div id="market-sop"><SignalSop /></div>
    {activeAggregate && <DealTracker agg={activeAggregate} />}
    <ImportLab onImport={setImportedAggregate} bundledAggregate={AGG} />
    <MobileCommandDock />
  </div>;
}

function PulseWidget({ latest, previous, years, change }) {
  const [metric, setMetric] = useState('value');
  const metrics = {
    value: { short: 'Value', label: 'Recorded market value', value: bn(latest.valueAedBn), change, series: years.map((item) => item.valueAedBn), source: latest.source, footer: [`${n0(latest.transactions)} transactions`, `${n0(latest.investors)} investors`] },
    volume: { short: 'Volume', label: 'Transaction volume', value: n0(latest.transactions), change: latest.transactions / previous.transactions - 1, series: years.map((item) => item.transactions), source: latest.source, footer: [`${bn(latest.valueAedBn)} value`, `${n0(previous.transactions)} in ${previous.year}`] },
    investors: { short: 'Investors', label: 'Active investor base', value: n0(latest.investors), change: latest.investors / previous.investors - 1, series: years.map((item) => item.investors), source: latest.investorsSource ?? latest.source, footer: [`${n0(latest.newInvestors)} new investors`, `${n0(previous.investors)} in ${previous.year}`] },
  };
  const current = metrics[metric];
  return <article className="pulse-widget">
    <header><div><span>{current.label}</span><b>{latest.year} full year</b></div><div className="pulse-actions"><div className="pulse-switch" aria-label="Headline metric">{Object.entries(metrics).map(([id, item]) => <button type="button" key={id} className={metric === id ? 'on' : ''} onClick={() => setMetric(id)} aria-pressed={metric === id}>{item.short}</button>)}</div><Source s={current.source} /></div></header>
    <div className="pulse-number" key={metric}>{current.value}</div>
    <div className="pulse-change"><strong>{pctS(current.change)}</strong><span>against {previous.year}</span></div>
    <Sparkline values={current.series} label={`${current.label} annual trend`} />
    <footer><span>{current.footer[0]}</span><span>{current.footer[1]}</span></footer>
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
  const [metric, setMetric] = useState('valueAedBn');
  const [selectedId, setSelectedId] = useState(`annual-${years.at(-1).year}`);
  const definition = CHART_METRICS[metric];
  const bars = useMemo(() => [
    ...years.map((item) => ({ ...item, id: `annual-${item.year}`, label: String(item.year), partial: false })),
    ...OFFICIAL.periods.map((item) => ({ ...item, id: `period-${item.period}`, label: item.period, partial: true })),
  ].filter((item) => Number.isFinite(item[metric])), [years, metric]);
  const selected = bars.find((item) => item.id === selectedId) ?? bars.at(-1);
  const max = Math.max(...bars.map((item) => item[metric]));
  const previousAnnual = !selected.partial ? years.find((item) => item.year === selected.year - 1) : null;
  const annualChange = previousAnnual?.[metric] ? selected[metric] / previousAnnual[metric] - 1 : null;
  const selectedSource = metric === 'investors' ? selected.investorsSource ?? selected.source : selected.source;

  useEffect(() => {
    if (!bars.some((item) => item.id === selectedId)) setSelectedId(bars.at(-1).id);
  }, [bars, selectedId]);

  return <article className="history-widget">
    <header><div><h3>{definition.title}</h3><p>{definition.unit} across comparable published periods</p></div><span className="chart-key"><i />Partial period</span></header>
    <div className="chart-controls" aria-label="Chart metric">
      {Object.entries(CHART_METRICS).map(([id, item]) => <button key={id} type="button" className={metric === id ? 'on' : ''} aria-pressed={metric === id} onClick={() => setMetric(id)}>{item.label}</button>)}
    </div>
    <div className="history-chart">
      {bars.map((item) => <button type="button" className={`history-column ${selected.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => setSelectedId(item.id)} aria-pressed={selected.id === item.id} aria-label={`${item.label}: ${definition.format(item[metric])}`}>
        <span className="history-bar-space"><i className={item.partial ? 'partial' : ''} style={{ height: `${(item[metric] / max) * 100}%` }} /></span>
        <b>{metric === 'valueAedBn' ? Math.round(item[metric]) : Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(item[metric])}</b><span>{item.label}</span>
      </button>)}
    </div>
    <div className="chart-inspector" role="status" aria-live="polite">
      <div><span>Selected period</span><b>{selected.label}</b></div>
      <div><span>{definition.label}</span><b>{definition.format(selected[metric])}</b></div>
      <div><span>Comparison</span><b>{selected.partial ? 'Partial period' : annualChange === null ? 'First published point' : `${pctS(annualChange)} vs ${previousAnnual.year}`}</b></div>
      <Source s={selectedSource} />
    </div>
    {OFFICIAL.periodsNote && <footer>{OFFICIAL.periodsNote}</footer>}
  </article>;
}

function CommunityLedger() {
  const [selected, setSelected] = useState(OFFICIAL.topAreas[0]?.area);
  const positions = {
    'Business Bay': [61, 38], 'Marsa Dubai': [34, 53], 'Madinat Al Mataar': [20, 78],
    'Dubai Investment Park Second': [21, 66], 'Al Barsha South Fourth': [43, 55], 'Palm Jumeirah': [34, 42],
    'Wadi Al Safa 5': [52, 66], 'Wadi Al Safa 3': [58, 70], 'Hadaeq Sheikh MBR': [56, 49], 'Burj Khalifa': [63, 34],
  };
  const max = Math.max(...OFFICIAL.topAreas.map((area) => area.valueAedBn));
  return <article className="community-widget">
    <header><div><h3>Community footprint</h3><p>{OFFICIAL.topAreasNote}</p></div><Source s={OFFICIAL.topAreasSource} /></header>
    <div className="community-layout"><div className="community-map" role="region" aria-label="Schematic Dubai community activity map; bubble size represents published transaction value">
      <div className="coastline" aria-hidden="true" />
      {OFFICIAL.topAreas.map((area) => { const [x, y] = positions[area.area] ?? [50, 50]; const size = 12 + (area.valueAedBn / max) * 26; return <button type="button" key={area.area} className={selected === area.area ? 'on' : ''} style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }} onClick={() => setSelected(area.area)} aria-label={`${area.area}: ${bn(area.valueAedBn)}`} title={`${area.area}: ${bn(area.valueAedBn)}`}><span>{area.rank}</span></button>; })}
      <p>Schematic geography · bubble size = published value</p>
    </div><div className="table-wrap"><table className="market-table">
      <thead><tr><th>Community</th><th>Investors</th><th>Value</th></tr></thead>
      <tbody>{OFFICIAL.topAreas.map((area) => <tr key={`${area.rank}-${area.area}`} className={selected === area.area ? 'on' : ''} onClick={() => setSelected(area.area)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(area.area); } }}><td><span>{area.rank}</span>{area.area}</td><td>{area.transactions ? n0(area.transactions) : '—'}</td><td>{bn(area.valueAedBn)}</td></tr>)}</tbody>
    </table></div></div>
  </article>;
}

function SignalLedger({ signals }) {
  return <section className="signal-ledger">
    <header><div><h3>Signals worth carrying forward</h3><p>Use these facts to frame a scenario—not as forecasts.</p></div><span>{signals.length} sourced observations</span></header>
    <div>{signals.map((signal) => <article key={signal.text}><i aria-hidden="true" /><p>{signal.text}</p><Source s={signal.source} /></article>)}</div>
  </section>;
}

function readSopProgress() {
  if (typeof window === 'undefined') return { completed: [], decision: 'Model scenario' };
  try {
    const value = JSON.parse(window.localStorage.getItem('market-signal-sop') || '{}');
    return { completed: Array.isArray(value.completed) ? value.completed : [], decision: value.decision || 'Model scenario' };
  } catch {
    return { completed: [], decision: 'Model scenario' };
  }
}

function SignalSop() {
  const initial = useMemo(readSopProgress, []);
  const [active, setActive] = useState(0);
  const [completed, setCompleted] = useState(initial.completed);
  const [decision, setDecision] = useState(initial.decision);
  const step = SOP_STEPS[active];
  const isComplete = completed.includes(step.id);

  useEffect(() => {
    try { window.localStorage.setItem('market-signal-sop', JSON.stringify({ completed, decision })); } catch { /* Keep the in-session state. */ }
  }, [completed, decision]);

  const toggleStep = () => setCompleted((items) => items.includes(step.id) ? items.filter((id) => id !== step.id) : [...items, step.id]);

  return <section className="sop-console">
    <header>
      <div><span>Standard operating procedure</span><h3>Market signal response</h3><p>Move a sourced observation from evidence to an auditable decision.</p></div>
      <div className="sop-progress"><b>{completed.length}/{SOP_STEPS.length}</b><span>gates cleared</span></div>
    </header>
    <div className="sop-layout">
      <nav className="sop-steps" aria-label="SOP stages">
        {SOP_STEPS.map((item, index) => <button type="button" key={item.id} className={`${active === index ? 'on' : ''} ${completed.includes(item.id) ? 'done' : ''}`} onClick={() => setActive(index)} aria-current={active === index ? 'step' : undefined}>
          <span>{completed.includes(item.id) ? '✓' : index + 1}</span><span><b>{item.label}</b><small>{item.owner}</small></span>
        </button>)}
      </nav>
      <article className="sop-detail">
        <div className="sop-meta"><span>Owner <b>{step.owner}</b></span><span>Service level <b>{step.sla}</b></span></div>
        <h4>{step.gate}</h4>
        <ul>{step.evidence.map((item) => <li key={item}><span aria-hidden="true">{isComplete ? '✓' : '○'}</span>{item}</li>)}</ul>
        {step.id === 'decide' && <fieldset className="decision-set"><legend>Response</legend>{['Watch market', 'Model scenario', 'Escalate now'].map((item) => <label key={item}><input type="radio" name="market-response" value={item} checked={decision === item} onChange={(event) => setDecision(event.target.value)} />{item}</label>)}</fieldset>}
        <div className="sop-output"><span>Required output</span><b>{step.output}</b></div>
        <div className="sop-actions">
          <button type="button" className={`sop-complete ${isComplete ? 'done' : ''}`} onClick={toggleStep}>{isComplete ? 'Reopen step' : 'Mark step complete'}</button>
          {active < SOP_STEPS.length - 1 && <button type="button" className="ghost sm" onClick={() => setActive((index) => index + 1)}>Continue</button>}
        </div>
      </article>
    </div>
  </section>;
}

function DealTracker({ agg }) {
  const maxMonth = Math.max(...agg.months.map((month) => month.valueAedBn));
  const ppsm = (value) => `AED ${Math.round(value).toLocaleString('en-US')}/m²`;
  return <section className="deal-workspace">
    <header><div><span>Connected transaction file</span><h3>{agg.period.start} to {agg.period.end}</h3></div>{agg.source?.url ? <Source s={{ url: agg.source.url, title: agg.source.name, date: agg.source.generated }} /> : <span className="src">[local file]</span>}</header>
    <div className="deal-metrics"><Metric label="Deals" value={n0(agg.totals.deals)} /><Metric label="Total value" value={bn(agg.totals.valueAedBn)} /><Metric label="Off-plan" value={pctS(agg.totals.offPlanShare, 0).replace('+', '')} /><Metric label="Median sale" value={ppsm(agg.totals.medianSalePpsm)} /></div>
    <div className="month-strip">{agg.months.map((month) => <div key={month.month}><i style={{ height: `${(month.valueAedBn / maxMonth) * 100}%` }} /><span>{month.month.slice(2)}</span></div>)}</div>
    <div className="grid-2"><MomentumTable title="Price increases" rows={agg.momentum.increases} windowDays={agg.momentum.windowDays} ppsm={ppsm} /><MomentumTable title="Price drops" rows={agg.momentum.drops} windowDays={agg.momentum.windowDays} ppsm={ppsm} /></div>
  </section>;
}

function MomentumTable({ title, rows, windowDays, ppsm }) {
  return <article className="momentum-table"><h3>{title}</h3><p>Median AED/m², last {windowDays} days versus the preceding window.</p><table className="market-table"><thead><tr><th>Area</th><th>Now</th><th>Change</th></tr></thead><tbody>{rows.map((row) => <tr key={row.area}><td>{row.area}</td><td>{ppsm(row.recentPpsm)}</td><td className={row.change >= 0 ? 'pos' : 'neg'}>{pctS(row.change)}</td></tr>)}</tbody></table></article>;
}

function Sparkline({ values, label = 'Annual transaction value trend' }) {
  const width = 420, height = 112, pad = 8;
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const points = values.map((value, index) => `${pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2)},${height - pad - ((value - min) / range) * (height - pad * 2)}`).join(' ');
  const area = `${pad},${height - pad} ${points} ${width - pad},${height - pad}`;
  return <svg className="pulse-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}><polygon points={area} /><polyline points={points} />{points.split(' ').map((point) => { const [cx, cy] = point.split(','); return <circle key={point} cx={cx} cy={cy} r="4" />; })}</svg>;
}

const Metric = ({ label, value }) => <div><span>{label}</span><b>{value}</b></div>;

// Year-on-year variance: how much of the change in market value came from more deals vs a higher ticket.
function MarketVariance({ years }) {
  const pairs = years.slice(1).map((y, i) => [years[i], y]);
  const [pick, setPick] = useState(pairs.length - 1);
  const [a, b] = pairs[pick];
  const br = priceVolumeBridge({ value: a.valueAedBn, volume: a.transactions }, { value: b.valueAedBn, volume: b.transactions });
  const share = br.steps[0].delta / (br.end - br.start);
  return <Card className="market-variance">
    <CardHead title="Variance bridge: volume vs price" sub={`What drove the change in recorded value from ${a.year} to ${b.year}. Volume at the ${a.year} average ticket; price and mix at ${b.year} volume.`} right={<Segmented value={pick} onChange={setPick} label="Years" options={pairs.map(([x, y], i) => [i, `${y.year} vs ${x.year}`])} />} />
    <div className="split-main">
      <Waterfall bridge={br} startLabel={`${a.year} value`} endLabel={`${b.year} value`} format={(v) => `AED ${v.toFixed(0)}bn`} height={260} />
      <KpiStrip items={[
        { id: 'vol', label: 'Volume effect', value: `AED ${br.steps[0].delta.toFixed(0)}bn`, sub: `${pctS(b.transactions / a.transactions - 1)} transactions` },
        { id: 'px', label: 'Price & mix effect', value: `AED ${br.steps[1].delta.toFixed(0)}bn`, sub: `ticket AED ${(br.ticket.prev * 1000).toFixed(2)}m → ${(br.ticket.cur * 1000).toFixed(2)}m` },
        { id: 'share', label: 'Growth from volume', value: `${Math.round(share * 100)}%`, sub: share > 0.6 ? 'activity-led market' : share < 0.4 ? 'price-led market' : 'balanced growth' },
      ]} />
    </div>
    <footer className="w-foot">Source: the annual DLD and Dubai Media Office figures above. Partial periods are excluded because they are not comparable.</footer>
  </Card>;
}
