import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { getRiskColor, getRiskLabel, getRiskBg, pct } from '../utils/risk.js';

const CITY_COORDS = {
  '400001': { city: 'Mumbai', state: 'MH', x: 18, y: 58 },
  '400050': { city: 'Mumbai West', state: 'MH', x: 16, y: 56 },
  '110001': { city: 'Delhi', state: 'DL', x: 45, y: 28 },
  '110020': { city: 'Delhi SW', state: 'DL', x: 42, y: 30 },
  '600001': { city: 'Chennai', state: 'TN', x: 50, y: 76 },
  '500001': { city: 'Hyderabad', state: 'TS', x: 46, y: 62 },
  '700001': { city: 'Kolkata', state: 'WB', x: 72, y: 42 },
  '560001': { city: 'Bangalore', state: 'KA', x: 44, y: 70 },
  '380001': { city: 'Ahmedabad', state: 'GJ', x: 28, y: 40 },
  '302001': { city: 'Jaipur', state: 'RJ', x: 36, y: 32 },
  '226001': { city: 'Lucknow', state: 'UP', x: 52, y: 30 },
  '800001': { city: 'Patna', state: 'BR', x: 60, y: 36 },
  '201301': { city: 'Noida', state: 'UP', x: 47, y: 28 },
  '411001': { city: 'Pune', state: 'MH', x: 22, y: 60 },
  '452001': { city: 'Indore', state: 'MP', x: 36, y: 46 },
};

export default function HighRiskMap() {
  const [pincodes, setPincodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.pincode.all()
      .then(data => {
        const list = Array.isArray(data) ? data : (data.pincodes || Object.entries(data).map(([pin, v]) => ({ pincode: pin, ...v })));
        setPincodes(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = pincodes.filter(p => {
    const score = p.consensus?.fraudRiskScore ?? p.fraudRiskScore ?? 0;
    if (filter === 'high') return score >= 0.7;
    if (filter === 'medium') return score >= 0.35 && score < 0.7;
    if (filter === 'low') return score < 0.35;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const sa = a.consensus?.fraudRiskScore ?? a.fraudRiskScore ?? 0;
    const sb = b.consensus?.fraudRiskScore ?? b.fraudRiskScore ?? 0;
    return sb - sa;
  });

  if (loading) return <div className="animate-pulse" style={{ color: 'var(--accent-blue)', padding: 40, textAlign: 'center', fontSize: 16 }}>Loading risk map telemetry...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>Risk Map</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            {pincodes.length} PIN codes · Interactive telemetry map
          </p>
        </div>
        <div className="glass-panel" style={{ display: 'flex', gap: 4, padding: '4px', borderRadius: '10px' }}>
          {['all', 'high', 'medium', 'low'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? 'var(--accent-indigo)' : 'transparent',
                border: 'none',
                borderRadius: '6px', padding: '8px 16px',
                color: filter === f ? 'white' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 13, textTransform: 'capitalize',
                fontWeight: filter === f ? 600 : 500,
                transition: 'all 0.2s',
                boxShadow: filter === f ? '0 2px 10px rgba(99,102,241,0.4)' : 'none'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        {/* India SVG Map (schematic) */}
        <div className="glass-panel" style={{
          padding: 24, position: 'relative', overflow: 'hidden',
          minHeight: 500, display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, textAlign: 'center', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            India — Schematic Risk Map
          </div>
          
          <div style={{ flex: 1, position: 'relative' }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', minHeight: 400 }}>
              {/* India outline simplified */}
              <path
                d="M35,10 L55,8 L70,15 L78,25 L82,38 L78,52 L72,62 L65,72 L58,80 L50,88 L44,82 L36,72 L28,60 L22,50 L18,38 L20,25 L28,16 Z"
                fill="rgba(99, 102, 241, 0.05)"
                stroke="var(--accent-indigo)"
                strokeWidth="0.5"
                opacity="0.5"
              />
              {/* Grid lines */}
              {[20, 40, 60, 80].map(v => (
                <React.Fragment key={v}>
                  <line x1={v} y1="5" x2={v} y2="95" stroke="var(--border)" strokeWidth="0.2" opacity="0.3" />
                  <line x1="5" y1={v} x2="95" y2={v} stroke="var(--border)" strokeWidth="0.2" opacity="0.3" />
                </React.Fragment>
              ))}

              {/* Pincode dots */}
              {sorted.map(p => {
                const pin = p.pincode;
                const score = p.consensus?.fraudRiskScore ?? p.fraudRiskScore ?? 0;
                const coords = CITY_COORDS[pin];
                if (!coords) return null;
                const isSelected = selected?.pincode === pin;
                const r = 2.5 + score * 3;

                return (
                  <g key={pin} onClick={() => setSelected(selected?.pincode === pin ? null : p)} style={{ cursor: 'pointer', transition: 'all 0.3s' }}>
                    {isSelected && (
                      <circle cx={coords.x} cy={coords.y} r={r + 6} fill={getRiskColor(score)} opacity="0.2" className="animate-pulse" />
                    )}
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r={r}
                      fill={getRiskColor(score)}
                      opacity="0.9"
                      stroke={isSelected ? 'white' : 'rgba(255,255,255,0.3)'}
                      strokeWidth={isSelected ? "0.8" : "0.3"}
                      style={{ transition: 'all 0.3s' }}
                    >
                      <title>{coords.city} ({pin}) — {Math.round(score * 100)}% risk</title>
                    </circle>
                    {(score >= 0.7 || isSelected) && (
                      <text x={coords.x + r + 2} y={coords.y + 1} fontSize="3" fill="var(--text)" opacity="0.9" fontWeight={isSelected ? 700 : 500}>
                        {coords.city}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 12, flexWrap: 'wrap', marginTop: 16 }}>
            {[
              { label: 'HIGH ≥70%', color: 'var(--accent-red)' },
              { label: 'MED ≥35%', color: 'var(--accent-yellow)' },
              { label: 'LOW <35%', color: 'var(--accent-green)' },
            ].map(l => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: l.color, display: 'inline-block', boxShadow: `0 0 8px ${l.color}` }} />
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{l.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Ranked list & Detail panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {selected && (() => {
            const score = selected.consensus?.fraudRiskScore ?? selected.fraudRiskScore ?? 0;
            const coords = CITY_COORDS[selected.pincode];
            return (
              <div className="glass-panel animate-fade-in-up" style={{
                padding: '20px 24px',
                background: `linear-gradient(135deg, ${getRiskColor(score)}10, transparent)`,
                borderLeft: `4px solid ${getRiskColor(score)}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                    {selected.pincode} {coords ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— {coords.city}, {coords.state}</span> : ''}
                  </h3>
                  <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 16, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.2)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}>×</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16 }}>
                  {[
                    { label: 'Fraud Risk', value: `${Math.round(score * 100)}%`, color: getRiskColor(score) },
                    { label: 'RTO Rate', value: pct(selected.consensus?.rtoRateAvg ?? selected.rtoRate) },
                    { label: 'Cancel Rate', value: pct(selected.consensus?.cancellationRateAvg ?? selected.cancellationRate) },
                    { label: 'Refund Rate', value: pct(selected.consensus?.refundRateAvg ?? selected.refundRate) },
                    { label: 'Decision', value: selected.consensus?.decision || selected.recommendation || '—', color: 'var(--accent-blue)' },
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{m.label}</div>
                      <div style={{ fontWeight: 700, color: m.color || 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 16 }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="glass-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
              Risk Rankings ({sorted.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: selected ? 300 : 500 }}>
              {sorted.map((p, i) => {
                const score = p.consensus?.fraudRiskScore ?? p.fraudRiskScore ?? 0;
                const rtoRate = p.consensus?.rtoRateAvg ?? p.rtoRate ?? 0;
                const coords = CITY_COORDS[p.pincode];
                const isSelected = selected?.pincode === p.pincode;

                return (
                  <div
                    key={p.pincode}
                    onClick={() => setSelected(isSelected ? null : p)}
                    style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 16,
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ width: 24, fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      #{i + 1}
                    </span>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: getRiskColor(score), flexShrink: 0,
                      boxShadow: `0 0 8px ${getRiskColor(score)}80`
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
                        {p.pincode}
                      </div>
                      {coords && <div style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{coords.city}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: getRiskColor(score), fontFamily: 'var(--font-mono)', fontSize: 15 }}>
                        {Math.round(score * 100)}%
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>RTO {pct(rtoRate)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
