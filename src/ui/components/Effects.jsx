import React from 'react';

// Deliberately quiet presentation primitives. The dashboard previously loaded more than
// 2,000 lines of pointer-following effects into every workspace; these keep the same
// component API without distracting from the decisions on screen.
export function HeaderGrid() {
  return <div className="page-grid" aria-hidden="true" />;
}

export function SpotCard({ className = '', children, ...rest }) {
  return <div className={`w-card spot ${className}`} {...rest}>{children}</div>;
}

export function Sparks({ children }) {
  return <>{children}</>;
}

export function CountMoney({ value, sign = false }) {
  const abs = Math.abs(value);
  const billions = abs >= 1000;
  const number = billions ? abs / 1000 : abs;
  const decimals = billions ? 2 : abs >= 100 ? 0 : 1;
  const prefix = sign ? (value > 0 ? '+' : value < 0 ? '−' : '') : value < 0 ? '−' : '';
  return <>{prefix}AED {number.toLocaleString('en', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{billions ? 'bn' : 'm'}</>;
}

export function CountNumber({ value, decimals = 0, prefix = '', suffix = '' }) {
  return <>{prefix}{Number(value).toLocaleString('en', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
}
