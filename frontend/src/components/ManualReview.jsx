import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { getRiskColor, getRiskLabel, getRiskBg, pct, timeAgo } from '../utils/risk.js';

export default function ManualReview() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState({});
  const [filter, setFilter] = useState('pending');

  async function load() {
    try {
      const [reviewData, statsData] = await Promise.all([
        api.review.list(),
        api.review.stats(),
      ]);
      setItems(Array.isArray(reviewData) ? reviewData : (reviewData.reviews || []));
      setStats(statsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function resolve(id, action) {
    setResolving(r => ({ ...r, [id]: true }));
    try {
      await api.review.resolve(id, { action, resolvedBy: 'dashboard-operator', notes: `Resolved via dashboard: ${action}` });
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setResolving(r => ({ ...r, [id]: false }));
    }
  }

  const displayed = items.filter(i => {
    if (filter === 'all') return true;
    return i.status === filter;
  });

  if (loading) return <div className="animate-pulse" style={{ color: 'var(--accent-yellow)', padding: 40, textAlign: 'center', fontSize: 16 }}>Loading review queue...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>Manual Review Queue</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>Orders flagged for human decision — low source agreement or borderline risk</p>
        </div>
        <button onClick={load} className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: 14 }}>
          ↺ Refresh Queue
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'Pending', value: stats.pending, color: 'var(--accent-yellow)', bg: 'rgba(245, 158, 11, 0.1)' },
            { label: 'Approved', value: stats.approved, color: 'var(--accent-green)', bg: 'rgba(16, 185, 129, 0.1)' },
            { label: 'Rejected', value: stats.rejected, color: 'var(--accent-red)', bg: 'rgba(239, 68, 68, 0.1)' },
            { label: 'Escalated', value: stats.escalated, color: 'var(--accent-purple)', bg: 'rgba(139, 92, 246, 0.1)' },
            { label: 'Total', value: stats.total, color: 'var(--text)', bg: 'rgba(255, 255, 255, 0.05)' },
          ].map((s, i) => (
            <div key={s.label} className={`glass-panel animate-fade-in-up delay-${(i+1)*100}`} style={{
              padding: '16px 24px', minWidth: 120, textAlign: 'center', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: s.bg, opacity: 0.5 }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 32, color: s.color, fontFamily: 'var(--font-heading)', lineHeight: 1, marginBottom: 8 }}>{s.value ?? 0}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="glass-panel" style={{ display: 'inline-flex', gap: 4, padding: '4px', borderRadius: '10px', marginBottom: 24 }}>
        {['all', 'pending', 'approved', 'rejected', 'escalated'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none',
              borderRadius: '6px', padding: '8px 16px',
              color: filter === f ? 'var(--text)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: 13, textTransform: 'capitalize',
              fontWeight: filter === f ? 600 : 500,
              transition: 'all 0.2s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Queue */}
      {displayed.length === 0 ? (
        <div className="glass-panel animate-fade-in" style={{
          padding: '60px 20px', textAlign: 'center',
          color: 'var(--text-muted)', fontSize: 15,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>☕</div>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>No items in "{filter}" queue</div>
          {filter === 'pending' && (
            <div style={{ fontSize: 13, marginTop: 8 }}>
              Run a PIN search or simulate a Shopify order to trigger alerts
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {displayed.map((item, i) => {
            const score = item.riskScore ?? 0;
            const isPending = item.status === 'pending';

            return (
              <div
                key={item.reviewId}
                className={`glass-panel animate-fade-in-up delay-${(i%5)*100}`}
                style={{
                  padding: '20px 24px',
                  borderLeft: `4px solid ${getRiskColor(score)}`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
                        {item.orderId}
                      </span>
                      <span style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: getRiskBg(score), color: getRiskColor(score),
                      }}>
                        {getRiskLabel(score)}
                      </span>
                      <span style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: item.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                        color: item.status === 'pending' ? 'var(--accent-yellow)' : 'var(--accent-green)',
                        textTransform: 'uppercase'
                      }}>
                        {item.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', fontSize: 13, background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>PIN <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginLeft: 6 }}>{item.pincode}</span></span>
                      <span style={{ color: 'var(--text-muted)' }}>Risk <span style={{ color: getRiskColor(score), fontWeight: 700, fontFamily: 'var(--font-mono)', marginLeft: 6 }}>{Math.round(score * 100)}%</span></span>
                      <span style={{ color: 'var(--text-muted)' }}>RTO <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', marginLeft: 6 }}>{pct(item.rtoRate)}</span></span>
                      <span style={{ color: 'var(--text-muted)' }}>Agreement <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', marginLeft: 6 }}>{pct(item.sourceAgreement)}</span></span>
                      <span style={{ color: 'var(--text-muted)' }}>Added <span style={{ color: 'var(--text)', marginLeft: 6 }}>{timeAgo(item.addedAt)}</span></span>
                    </div>

                    {item.reason && (
                      <div style={{ marginTop: 12, fontSize: 13, color: 'var(--accent-orange)', background: 'rgba(249,115,22,0.1)', padding: '8px 12px', borderRadius: '6px', borderLeft: '2px solid var(--accent-orange)' }}>
                        <strong>Flag Reason:</strong> {item.reason}
                      </div>
                    )}
                  </div>

                  {isPending && (
                    <div style={{ display: 'flex', gap: 12, alignSelf: 'center' }}>
                      <button
                        onClick={() => resolve(item.reviewId, 'approve')}
                        disabled={resolving[item.reviewId]}
                        style={{
                          background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
                          borderRadius: '8px', padding: '10px 16px', color: 'var(--accent-green)',
                          cursor: 'pointer', fontSize: 13, fontWeight: 600,
                          opacity: resolving[item.reviewId] ? 0.5 : 1, transition: 'all 0.2s'
                        }}
                        onMouseOver={e=> { if(!resolving[item.reviewId]) e.currentTarget.style.background='rgba(16,185,129,0.25)' }}
                        onMouseOut={e=> { if(!resolving[item.reviewId]) e.currentTarget.style.background='rgba(16,185,129,0.15)' }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => resolve(item.reviewId, 'reject')}
                        disabled={resolving[item.reviewId]}
                        style={{
                          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
                          borderRadius: '8px', padding: '10px 16px', color: 'var(--accent-red)',
                          cursor: 'pointer', fontSize: 13, fontWeight: 600,
                          opacity: resolving[item.reviewId] ? 0.5 : 1, transition: 'all 0.2s'
                        }}
                        onMouseOver={e=> { if(!resolving[item.reviewId]) e.currentTarget.style.background='rgba(239,68,68,0.25)' }}
                        onMouseOut={e=> { if(!resolving[item.reviewId]) e.currentTarget.style.background='rgba(239,68,68,0.15)' }}
                      >
                        ✗ Reject
                      </button>
                      <button
                        onClick={() => resolve(item.reviewId, 'escalate')}
                        disabled={resolving[item.reviewId]}
                        style={{
                          background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)',
                          borderRadius: '8px', padding: '10px 16px', color: 'var(--accent-purple)',
                          cursor: 'pointer', fontSize: 13, fontWeight: 600,
                          opacity: resolving[item.reviewId] ? 0.5 : 1, transition: 'all 0.2s'
                        }}
                        onMouseOver={e=> { if(!resolving[item.reviewId]) e.currentTarget.style.background='rgba(139,92,246,0.25)' }}
                        onMouseOut={e=> { if(!resolving[item.reviewId]) e.currentTarget.style.background='rgba(139,92,246,0.15)' }}
                      >
                        ↑ Escalate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
