import React, { useMemo, useState } from 'react';
import { Card, PageHead, Section, Status } from './Dots.jsx';

const LAYERS = [
  { id: 'energy', label: 'Energy transition', color: '#e9a23b', brief: 'Utility-scale solar, grid capacity and storage shape the next industrial locations.', signals: ['Generation and storage', 'Grid-linked industrial zones', 'Green-power procurement'], source: ['IRENA', 'UAE Ministry of Energy & Infrastructure'], url: 'https://www.irena.org/' },
  { id: 'urban', label: 'Urban growth', color: '#d97732', brief: 'Transaction activity, new supply and infrastructure reveal where demand is becoming durable.', signals: ['Real-estate transactions', 'Supply pipeline', 'Mobility-led catchments'], source: ['Dubai Land Department', 'Municipal planning authorities'], url: 'https://dubailand.gov.ae/' },
  { id: 'industry', label: 'Advanced industry', color: '#44a79a', brief: 'Manufacturing, logistics and compute capacity increasingly share the same investment corridors.', signals: ['Industrial clusters', 'Data and compute capacity', 'Logistics connectivity'], source: ['Ministry of Industry and Advanced Technology'], url: 'https://moiat.gov.ae/' },
  { id: 'aviation', label: 'Aviation', color: '#71a9c3', brief: 'Passenger, cargo and maintenance ecosystems connect the region’s growth platforms.', signals: ['Airport capacity', 'Cargo corridors', 'Maintenance ecosystems'], source: ['UAE General Civil Aviation Authority'], url: 'https://www.gcaa.gov.ae/' },
  { id: 'maritime', label: 'Maritime', color: '#3d6f89', brief: 'One consolidated maritime layer tracks trade access, port capacity and route exposure.', signals: ['Port and free-zone capacity', 'Trade-route exposure', 'Intermodal links'], source: ['UNCTAD Review of Maritime Transport'], url: 'https://unctad.org/topic/transport-and-trade-logistics/review-of-maritime-transport' },
  { id: 'resilience', label: 'Strategic resilience', color: '#9b7367', brief: 'Public advisories and infrastructure dependencies frame resilience without simulating live defence activity.', signals: ['Public travel and airspace advisories', 'Critical infrastructure dependencies', 'Supply-chain redundancy'], source: ['Public government advisories only'], url: 'https://www.mofa.gov.ae/' },
];

const HUBS = [
  { id: 'dubai', name: 'Dubai', x: 67, y: 47, note: 'Trade, aviation, real estate and digital services' },
  { id: 'abudhabi', name: 'Abu Dhabi', x: 60, y: 58, note: 'Energy, industry, capital and advanced technology' },
  { id: 'riyadh', name: 'Riyadh', x: 37, y: 51, note: 'Regional headquarters, services and national-scale demand' },
  { id: 'doha', name: 'Doha', x: 53, y: 40, note: 'Energy, aviation and services' },
  { id: 'muscat', name: 'Muscat', x: 77, y: 68, note: 'Ports, logistics, tourism and industrial diversification' },
  { id: 'jeddah', name: 'Jeddah', x: 22, y: 68, note: 'Red Sea trade, aviation and urban development' },
];

const WINDOWS = [
  ['now', 'Current', 'Observed public evidence and the latest dataset carried by this dashboard.'],
  ['build', 'Build-out', 'Projects and capacity additions that are funded, awarded or under construction.'],
  ['horizon', 'Horizon', 'Published policy targets and long-range plans; not treated as delivered capacity.'],
];

export function RegionalView() {
  const [layerId, setLayerId] = useState('energy');
  const [hubId, setHubId] = useState('dubai');
  const [windowId, setWindowId] = useState('now');
  const layer = useMemo(() => LAYERS.find((item) => item.id === layerId), [layerId]);
  const hub = HUBS.find((item) => item.id === hubId);
  const window = WINDOWS.find(([id]) => id === windowId);

  return <div className="doc regional-view">
    <PageHead status="Public-source context · no live operational tracking" title="Regional intelligence" muted="from orbit to decision"
      sub="A monochrome GCC context layer for the industries changing location, demand and portfolio value. Select a layer, then open a hub to frame the decision." />

    <Section id="ri-map" n={1} title="GCC transformation map" sub="A decision aid, not a surveillance product. Planned activity stays visually separate from observed evidence.">
      <div className="regional-layout">
        <Card className="regional-map-card">
          <div className="map-toolbar" role="tablist" aria-label="Regional intelligence layer">
            {LAYERS.map((item) => <button type="button" role="tab" aria-selected={item.id === layerId} key={item.id} className={item.id === layerId ? 'on' : ''} onClick={() => setLayerId(item.id)}><i style={{ background: item.color }} />{item.label}</button>)}
          </div>
          <div className="satellite-map" style={{ '--layer': layer.color }}>
            <svg viewBox="0 0 900 520" role="img" aria-label="Stylised map of the Gulf region with selectable decision hubs">
              <defs><pattern id="terrain" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" /></pattern></defs>
              <rect width="900" height="520" className="map-sea" />
              <path className="map-land" d="M0 0h900v100l-78 28-44 72-31 38-54-18-42 33-62-8-41-55-81-28-62 26-90-13-61 49-31 104-79 34-45 108H0z" />
              <path className="map-grid" d="M0 105C180 130 250 85 398 145s294 42 502-15M0 260c190-60 325-45 470 10s276 85 430 42M178 0c-4 145 42 276 4 520M420 0c-22 180 58 292 35 520M690 0c-45 170 38 315 10 520" />
              <path className="map-route" d="M210 354C330 274 493 286 600 302s168-18 208-91" />
              <path className="map-route secondary" d="M340 250C430 212 540 191 690 223" />
            </svg>
            {HUBS.map((item) => <button type="button" key={item.id} className={`map-hub ${hubId === item.id ? 'on' : ''}`} style={{ left: `${item.x}%`, top: `${item.y}%` }} onClick={() => setHubId(item.id)} aria-label={`Open ${item.name}`}><span /><b>{item.name}</b></button>)}
            <div className="map-stamp"><span>CONTEXT LAYER</span><b>{layer.label}</b><small>Public evidence · indicative geography</small></div>
          </div>
        </Card>

        <aside className="regional-brief" aria-live="polite">
          <div className="brief-heading"><span style={{ background: layer.color }} /><div><small>Selected layer</small><h3>{layer.label}</h3></div></div>
          <p>{layer.brief}</p>
          <ul>{layer.signals.map((signal) => <li key={signal}>{signal}</li>)}</ul>
          <div className="hub-brief"><small>Decision hub</small><h4>{hub.name}</h4><p>{hub.note}</p></div>
          <div className="source-provenance"><Status s="warn" /><div><b>Verify before commitment</b><span>Planning layers can change. Open the underlying public source and record a verification date in the decision pack.</span></div></div>
          <a className="ghost" href={layer.url} target="_blank" rel="noreferrer">Open primary source</a>
        </aside>
      </div>
    </Section>

    <Section id="ri-time" n={2} title="Evidence horizon" sub="Separate what exists now from what is being built and what remains a policy ambition.">
      <Card className="evidence-horizon">
        <div className="horizon-tabs" role="tablist" aria-label="Evidence horizon">
          {WINDOWS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={id === windowId} className={id === windowId ? 'on' : ''} onClick={() => setWindowId(id)}>{label}</button>)}
        </div>
        <div className="horizon-line"><i className="past" /><i className="current" /><i className="future" /></div>
        <div className="horizon-copy"><b>{window[1]}</b><p>{window[2]}</p></div>
      </Card>
    </Section>

    <Section id="ri-sources" n={3} title="Source discipline" sub="The map is only useful when every signal can be traced, dated and challenged.">
      <div className="source-principles">
        <Card><b>Observed</b><p>Official statistics or an authority announcement with a publication date.</p></Card>
        <Card><b>Committed</b><p>Funded, awarded or under construction. The owner and expected delivery window are recorded.</p></Card>
        <Card><b>Planned</b><p>Policy target or announced ambition. Never added to delivered capacity or current value.</p></Card>
      </div>
      <p className="w-foot">Layer sources: {layer.source.join(' · ')}. Public resilience context excludes tactical locations, sensitive assets and simulated live defence data.</p>
    </Section>
  </div>;
}
