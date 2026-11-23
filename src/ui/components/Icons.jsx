import React from 'react';

const P = {
  realEstate: 'M4 21V9l6-4v16M10 21V3l10 5v13M2 21h20M13 9h2M13 13h2M13 17h2M6 12h2M6 16h2',
  hospitality: 'M3 18V8M3 14h18v4M21 18v-4a3 3 0 0 0-3-3h-7v3M7 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  leisure: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7M8 22l4-10 4 10',
  retail: 'M5 8h14l-1 13H6L5 8zM9 8V6a3 3 0 0 1 6 0v2',
  community: 'M3 11l5-4 5 4v9H3v-9zM13 13l4-3 4 3v7h-8M6 20v-4h4v4',
  urbanServices: 'M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.4 2.4-2.6-.6-.6-2.6 2.6-2.2z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3',
  target: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  reset: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  print: 'M6 9V3h12v6M6 18H4v-7h16v7h-2M6 14h12v7H6z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  check: 'M4 12l5 5L20 6',
  info: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 11v6M12 7.5v.5',
  moon: 'M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
};

export function Icon({ name, size = 18, className = '', strokeWidth = 1.8 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] || P.info} />
    </svg>
  );
}
