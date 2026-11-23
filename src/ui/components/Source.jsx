import React from 'react';

export function Source({ s }) {
  if (!s?.url) return null;
  const detail = `${s.title ?? 'Source'}${s.date ? ` (${s.date})` : ''}${s.quote ? `: “${s.quote}”` : ''}`;
  return <a className="src" href={s.url} target="_blank" rel="noreferrer" title={detail}>[source]</a>;
}
