import React, { useState } from 'react';
import { api } from '../utils/api.js';
import { getRiskColor, getRiskLabel, getRiskBg, pct, fmt } from '../utils/risk.js';

const DEMO_PINS = ['400001', '110001', '800001', '560001', '226001', '500001', '302001'];

function SourceCard({ name, data, weight }) {
  if (!data) return null;
  const isMock = data.isMock;
  const fraudVal = data.fraudRate ?? data.fraudRisk;
  const rtoVal = data.rtoRate ?? null;
  const cancelVal = data.cancellationRate ?? null;
  const refundVal = data.refundRate ?? null;
  return (
    <div className="glass-panel" style={{
      padding: '16px 20px',
      flex: '1 1 220px',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'default'
    }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)'; }}
       onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)'; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 14, fontFamily: 'var(--font-heading)' }}>{name}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isMock && (
            <span style={{ fontSize: 10, background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>MOCK</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>wt: {Math.round(weight * 100)}%</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', fontSize: 12 }}>
        <Metric label="Fraud Risk" value={pct(fraudVal)} color={getRiskColor(fraudVal)} />
        {rtoVal !== null ? <Metric label="RTO Rate" value={pct(rtoVal)} color={getRiskColor(rtoVal * 0.8)} /> : <Metric label="Weight" value={pct(data.weight)} />}
        {cancelVal !== null && <Metric label="Cancel Rate" value={pct(cancelVal)} />}
        {refundVal !== null && <Metric label="Refund Rate" value={pct(refundVal)} />}
        <Metric label="Confidence" value={pct(data.confidence)} />
        {data.sampleSize && <Metric label="Sample" value={data.sampleSize?.toLocaleString() || '—'} />}
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div>
      <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, color: color || 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>{value}</div>
    </div>
  );
}

export default function PinSearch() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ivrLoading, setIvrLoading] = useState(false);
  const [ivrResult, setIvrResult] = useState(null);

  async function search(pin) {
    const q = (pin || query).replace(/\D/g, '');
    if (!q || q.length !== 6) { setError('Enter a valid 6-digit PIN code'); return; }
    setLoading(true); setError(''); setResult(null); setIvrResult(null);
    try {
      const data = await api.pincode.consensus(q);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function triggerIVR() {
    if (!result) return;
    setIvrLoading(true); setIvrResult(null);
    try {
      const r = await api.ivr.trigger({
        pincode: result.pincode,
        orderId: `DEMO-${Date.now()}`,
        merchantPhone: '+919999999999',
        riskScore: result.consensus?.fraudRiskScore,
        rtoRate: result.consensus?.rtoRateAvg,
      });
      setIvrResult(r);
    } catch (e) {
      setIvrResult({ error: e.message });
    } finally {
      setIvrLoading(false);
    }
  }

  const c = result?.consensus;
  const score = c?.fraudRiskScore;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>PIN Code Risk Search</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          Multi-source consensus: <strong style={{color:'var(--text)'}}>Delhivery</strong> (35%) + <strong style={{color:'var(--text)'}}>Ekart</strong> (35%) + <strong style={{color:'var(--text)'}}>Shiprocket</strong> (30%)
        </p>
      </div>

      {/* Search box */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, maxWidth: 500 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Enter 6-digit PIN code..."
          style={{
            flex: 1, background: 'rgba(24, 24, 27, 0.4)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '12px 16px', color: 'var(--text)',
            fontSize: 16, fontFamily: 'var(--font-mono)', outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-indigo)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.2)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'; }}
          maxLength={6}
        />
        <button
          className="btn-primary"
          onClick={() => search()}
          disabled={loading}
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Checking...' : 'Analyze'}
        </button>
      </div>

      {/* Quick demo pins */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
        <span style={{ fontSize: 13, color: 'var(--text-dim)', alignSelf: 'center', fontWeight: 500 }}>Quick demo:</span>
        {DEMO_PINS.map(pin => (
          <button
            key={pin}
            onClick={() => { setQuery(pin); search(pin); }}
            style={{
              background: 'rgba(24, 24, 27, 0.6)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 12px', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-mono)',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.color = 'var(--accent-blue)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            {pin}
          </button>
        ))}
      </div>

      {error && (
        <div className="animate-fade-in-up" style={{ color: 'var(--accent-red)', fontSize: 14, marginBottom: 24, padding: '12px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="animate-fade-in-up delay-100">
          {/* Risk Summary */}
          <div className="glass-panel" style={{
            background: `linear-gradient(135deg, ${getRiskColor(score)}15, transparent)`,
            border: `1px solid ${getRiskColor(score)}40`,
            padding: '28px 32px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            flexWrap: 'wrap',
          }}>
            {/* Score */}
            <div style={{ textAlign: 'center', minWidth: 120 }}>
              <div style={{ fontSize: 56, fontWeight: 800, color: getRiskColor(score), fontFamily: 'var(--font-mono)', lineHeight: 1, textShadow: `0 0 20px ${getRiskColor(score)}40` }}>
                {Math.round(score * 100)}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>fraud risk</div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{result.pincode}</span>
                <span style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: getRiskBg(score), color: getRiskColor(score),
                  border: `1px solid ${getRiskColor(score)}50`,
                }}>
                  {getRiskLabel(score)}
                </span>
                {c.ivrTrigger && (
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(139,92,246,0.3)' }}>
                    IVR AUTO-TRIGGERED
                  </span>
                )}
                {c.whatsappAlert && (
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', border: '1px solid rgba(16,185,129,0.3)' }}>
                    WHATSAPP ALERT
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                <Metric label="RTO Rate" value={pct(c.rtoRateAvg)} color={getRiskColor(c.rtoRateAvg * 0.8)} />
                <Metric label="Cancel Rate" value={pct(c.cancellationRateAvg)} />
                <Metric label="Refund Rate" value={pct(c.refundRateAvg)} />
                <Metric label="Source Agreement" value={pct(c.sourceAgreement)} />
                <Metric label="Decision" value={c.decision || '—'} color="var(--accent-blue)" />
              </div>
            </div>

            {/* IVR trigger button */}
            {score >= 0.55 && (
              <button
                className="btn-primary"
                onClick={triggerIVR}
                disabled={ivrLoading}
                style={{
                  background: score >= 0.7 ? 'var(--gradient-critical)' : 'var(--gradient-high)',
                  opacity: ivrLoading ? 0.6 : 1,
                }}
              >
                {ivrLoading ? 'Calling...' : '📞 Trigger IVR'}
              </button>
            )}
          </div>

          {/* IVR result */}
          {ivrResult && (
            <div className="animate-fade-in-up" style={{
              marginBottom: 24, padding: '16px 20px',
              background: ivrResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)',
              border: `1px solid ${ivrResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(139,92,246,0.3)'}`,
              borderRadius: 12, fontSize: 14,
            }}>
              {ivrResult.error ? (
                <span style={{ color: 'var(--accent-red)' }}>IVR Error: {ivrResult.error}</span>
              ) : (
                <span style={{ color: 'var(--accent-purple)' }}>
                  ✓ IVR {ivrResult.isMock ? '(mock)' : ''} initiated · Call SID: <code style={{ fontFamily: 'var(--font-mono)' }}>{ivrResult.callSid}</code>
                </span>
              )}
            </div>
          )}

          {/* Risk bar */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
              <span>Risk Score Visualization</span>
              <span>{fmt(score * 100, 1)}% / 100%</span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, height: 12, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
              <div style={{
                width: `${Math.min(score * 100, 100)}%`,
                height: '100%',
                background: getRiskColor(score),
                borderRadius: 8,
                transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: `0 0 10px ${getRiskColor(score)}`
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 8, fontWeight: 500 }}>
              <span>IVR trigger ≥70%</span>
              <span>WhatsApp ≥55%</span>
              <span>Manual Review</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {/* Source breakdown */}
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
                Data Sources
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SourceCard name="Delhivery" data={result.sources?.delhivery} weight={0.35} />
                <SourceCard name="Ekart" data={result.sources?.ekart} weight={0.35} />
                <SourceCard name="Shiprocket" data={result.sources?.shiprocket} weight={0.30} />
              </div>
            </div>

            {/* Escalation path */}
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
                Escalation Path
              </h3>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Auto IVR', threshold: '≥70%', active: score >= 0.7, color: 'var(--accent-red)' },
                    { label: 'WhatsApp Alert', threshold: '≥55%', active: score >= 0.55 && score < 0.7, color: 'var(--accent-orange)' },
                    { label: 'Manual Review', threshold: 'low agreement', active: c.sourceAgreement < 0.6 && score < 0.7, color: 'var(--accent-yellow)' },
                    { label: 'Auto-Approve', threshold: '<35%', active: score < 0.35 && c.sourceAgreement >= 0.6, color: 'var(--accent-green)' },
                  ].map((step, i) => (
                    <div key={step.label} style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      opacity: step.active ? 1 : 0.4,
                      transition: 'opacity 0.3s'
                    }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: step.active ? step.color : 'var(--border)',
                        boxShadow: step.active ? `0 0 10px ${step.color}` : 'none'
                      }} />
                      <div style={{ flex: 1, padding: '12px 16px', borderRadius: 8, background: step.active ? `${step.color}15` : 'transparent', border: `1px solid ${step.active ? step.color + '40' : 'transparent'}` }}>
                        <div style={{ color: step.active ? step.color : 'var(--text)', fontWeight: 600, fontSize: 14 }}>{step.label}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{step.threshold}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
