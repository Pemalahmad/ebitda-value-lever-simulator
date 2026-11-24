// A swarm of dots that flocks after the pointer. Canvas overlay, never blocks clicks,
// off for reduced motion and touch-only devices. Written for this project (no third-party code).
import React, { useEffect, useRef } from 'react';

export function SwarmCursor({ count = 34, scope }) {
  const ref = useRef(null);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: fine)').matches) return undefined;
    const canvas = ref.current, ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0, raf = 0, idle = 0;
    const target = { x: -100, y: -100, on: false };
    const color = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim() || '#f0592b';
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#111';
    const P = Array.from({ length: count }, (_, i) => ({ x: -100, y: -100, vx: 0, vy: 0, r: 1.4 + (i % 4) * 0.55, k: 0.012 + (i / count) * 0.03, a: i * 0.7 }));
    const size = () => { w = innerWidth; h = innerHeight; canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = `${w}px`; canvas.style.height = `${h}px`; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const inScope = (ev) => !scope?.current || scope.current.contains(ev.target);
    const move = (ev) => {
      target.on = inScope(ev); target.x = ev.clientX; target.y = ev.clientY; idle = 0;
      if (target.on && P[0].x < 0) P.forEach((p) => { p.x = target.x; p.y = target.y; });
    };
    const tick = (t) => {
      ctx.clearRect(0, 0, w, h);
      idle++;
      const alive = target.on && idle < 240;
      P.forEach((p, i) => {
        // Orbit a point near the cursor, so the swarm circles instead of collapsing into one dot.
        const ang = t / 900 + p.a;
        const rad = 14 + (i % 5) * 7;
        const tx = target.x + Math.cos(ang) * rad, ty = target.y + Math.sin(ang * 1.3) * rad;
        p.vx = (p.vx + (tx - p.x) * p.k) * 0.86;
        p.vy = (p.vy + (ty - p.y) * p.k) * 0.86;
        p.x += p.vx; p.y += p.vy;
        if (!alive) return;
        const speed = Math.min(1, Math.hypot(p.vx, p.vy) / 12);
        ctx.globalAlpha = 0.35 + 0.5 * (1 - i / count) * (1 - idle / 240);
        ctx.fillStyle = i % 3 === 0 ? ink : color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + speed * 1.6, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    size();
    addEventListener('resize', size);
    addEventListener('pointermove', move, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); removeEventListener('pointermove', move); };
  }, [count, scope]);
  return <canvas ref={ref} className="swarm" aria-hidden="true" />;
}
