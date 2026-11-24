// Thin adapters that fit the React Bits components (src/ui/vendor/reactbits) to this design:
// theme colours from the CSS tokens, card surfaces, and money figures that roll to their value.
import React, { useEffect, useState } from 'react';
import DotGrid from '../vendor/reactbits/DotGrid.jsx';
import SpotlightCard from '../vendor/reactbits/SpotlightCard.jsx';
import ClickSpark from '../vendor/reactbits/ClickSpark.jsx';
import CountUp from '../vendor/reactbits/CountUp.jsx';
import '../vendor/reactbits/DotGrid.css';
import '../vendor/reactbits/SpotlightCard.css';

const readVar = (name, fallback) => {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fallback;
};

// Re-reads the colour tokens whenever the light/dark theme changes.
export function useTokens() {
  const read = () => ({ text: readVar('--text', '#121212'), line: readVar('--line-2', '#d9d9d4'), accent: readVar('--gold', '#f05a28'), dark: document.documentElement.dataset.theme === 'dark' });
  const [t, setT] = useState(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setT(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return t;
}

// Interactive dot field behind the page header: dots swell and ripple under the cursor; click sends a shockwave.
export function HeaderGrid() {
  const t = useTokens();
  return (
    <div className="page-grid" aria-hidden="true">
      <DotGrid dotSize={3} gap={22} baseColor={t.line} activeColor={t.accent} proximity={120} strength={0.8} shockRadius={260} shockStrength={3} glow={0.3} fade={0.6} opacity={0.9} />
    </div>
  );
}

// A card with a soft spotlight that follows the cursor and lights the border.
export function SpotCard({ className = '', children, ...rest }) {
  const t = useTokens();
  return (
    <SpotlightCard className={`w-card spot ${className}`} theme={t.dark ? 'dark' : 'light'} spotlightColor={t.accent} intensity={t.dark ? 0.12 : 0.22} spotlightSize={260} borderGlow={0.7} proximity={60}
      style={{ '--spotlight-card-surface': 'var(--panel)', '--spotlight-card-border': 'var(--line)', '--spotlight-card-shadow': 'var(--shadow)' }} {...rest}>
      {children}
    </SpotlightCard>
  );
}

// A small burst of accent dots on every click inside the app.
export function Sparks({ children }) {
  const t = useTokens();
  return <ClickSpark sparkColor={[t.accent, t.text]} shape="dot" sparkCount={8} sparkRadius={22} sparkWidth={2.2} duration={420} randomness={0.35} className="sparks">{children}</ClickSpark>;
}

// A money figure (AED millions) that rolls to its new value, in the same format as fmt.money.
export function CountMoney({ value, sign = false }) {
  const abs = Math.abs(value);
  const bn = abs >= 1000;
  const to = bn ? abs / 1000 : abs;
  const decimals = bn ? 2 : abs >= 100 ? 0 : 1;
  const s = sign ? (value > 0 ? '+' : value < 0 ? '−' : '') : value < 0 ? '−' : '';
  return <CountUp to={to} from={0} decimals={decimals} separator="," prefix={`${s}AED `} suffix={bn ? 'bn' : 'm'} duration={0.9} trigger="load" />;
}

// A plain number that rolls to its value.
export function CountNumber({ value, decimals = 0, prefix = '', suffix = '' }) {
  return <CountUp to={value} from={0} decimals={decimals} separator="," prefix={prefix} suffix={suffix} duration={0.9} trigger="load" />;
}
