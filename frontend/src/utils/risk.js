export function getRiskColor(score) {
  if (score >= 0.7) return 'var(--accent-red)';
  if (score >= 0.55) return 'var(--accent-orange)';
  if (score >= 0.35) return 'var(--accent-yellow)';
  return 'var(--accent-green)';
}

export function getRiskLabel(score) {
  if (score >= 0.7) return 'HIGH';
  if (score >= 0.55) return 'MEDIUM-HIGH';
  if (score >= 0.35) return 'MEDIUM';
  return 'LOW';
}

export function getRiskBg(score) {
  if (score >= 0.7) return 'rgba(248,81,73,0.12)';
  if (score >= 0.55) return 'rgba(227,179,65,0.12)';
  if (score >= 0.35) return 'rgba(210,153,34,0.12)';
  return 'rgba(63,185,80,0.12)';
}

export function pct(val) {
  return `${Math.round((val || 0) * 100)}%`;
}

export function fmt(val, decimals = 1) {
  return (val || 0).toFixed(decimals);
}

export function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
