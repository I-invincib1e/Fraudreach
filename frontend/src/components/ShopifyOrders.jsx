import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { getRiskColor, getRiskLabel, getRiskBg, pct, timeAgo } from '../utils/risk.js';

const DEMO_ORDERS = [
  { name: '#1001 — Mumbai High-Risk', pincode: '800001', city: 'Patna', amount: 2499, customer: 'Rahul Sharma', phone: '+919876543210' },
  { name: '#1002 — Delhi Medium', pincode: '110020', city: 'Delhi SW', amount: 1299, customer: 'Priya Singh', phone: '+919812345678' },
  { name: '#1003 — Bangalore Safe', pincode: '560001', city: 'Bangalore', amount: 3599, customer: 'Ankit Kumar', phone: '+919823456789' },
];

function StatusBadge({ status }) {
  const map = {
    pending_review: { label: 'PENDING REVIEW', bg: 'rgba(245,158,11,0.15)', color: 'var(--accent-yellow)' },
    flagged: { label: 'FLAGGED', bg: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' },
    approved: { label: 'APPROVED', bg: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' },
    hold: { label: 'ON HOLD', bg: 'rgba(249,115,22,0.15)', color: 'var(--accent-orange)' },
    ivr_triggered: { label: 'IVR TRIGGERED', bg: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple)' },
  };
  const s = map[status] || { label: status?.toUpperCase() || 'UNKNOWN', bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' };
  return (
    <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, letterSpacing: '0.05em' }}>
      {s.label}
    </span>
  );
}

export default function ShopifyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);

  async function load() {
    try {
      const data = await api.shopify.orders();
      const list = Array.isArray(data) ? data : (data.orders || []);
      setOrders(list);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function simulate(demo) {
    setSimulating(true); setSimResult(null);
    try {
      const result = await api.shopify.simulate({
        orderName: demo.name,
        shippingAddress: { zip: demo.pincode, city: demo.city },
        totalPrice: `${demo.amount}.00`,
        currency: 'INR',
        customer: { firstName: demo.customer.split(' ')[0], lastName: demo.customer.split(' ')[1], phone: demo.phone },
        lineItems: [{ title: 'Demo Product', quantity: 1, price: `${demo.amount}.00` }],
      });
      setSimResult(result);
      await load();
    } catch (e) {
      setSimResult({ error: e.message });
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>Shopify Orders</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          Incoming <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 6 }}>orders/create</code> webhook →
          PIN fraud check → auto hold / approve / IVR
        </p>
      </div>

      {/* Webhook info banner */}
      <div className="glass-panel" style={{
        padding: '24px', marginBottom: 32, fontSize: 14,
        background: 'linear-gradient(135deg, rgba(59,130,246,0.1), transparent)',
        borderLeft: '4px solid var(--accent-blue)',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--accent-blue)', fontSize: 16 }}>
          📡 Webhook Endpoint
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent-indigo)', background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderRadius: '8px', fontWeight: 600 }}>
            POST /api/shopify/webhooks/orders/created
          </code>
          <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
            Topic: <strong style={{ color: 'var(--text)' }}>orders/create</strong> · HMAC verified in production
          </span>
        </div>
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>📦 Order received</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>🔍 Extract shipping ZIP</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>⚡ Run consensus engine</div>
          <div style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 8 }}>📞 IVR if risk ≥70%</div>
          <div style={{ color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 8 }}>💬 WhatsApp if ≥55%</div>
          <div style={{ color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', gap: 8 }}>📋 Manual review if agreement low</div>
          <div style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 8 }}>✓ Auto-approve if safe</div>
        </div>
      </div>

      {/* Demo simulators */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Simulate Demo Orders
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {DEMO_ORDERS.map((demo, i) => (
            <button
              key={demo.name}
              className={`glass-panel animate-fade-in-up delay-${(i+1)*100}`}
              onClick={() => simulate(demo)}
              disabled={simulating}
              style={{
                padding: '16px 20px', cursor: 'pointer',
                textAlign: 'left', opacity: simulating ? 0.6 : 1,
                transition: 'all 0.2s', minWidth: 240, border: '1px solid var(--border)', background: 'rgba(24, 24, 27, 0.4)'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(24, 24, 27, 0.4)'; }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{demo.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>PIN <strong style={{color:'var(--text)', fontFamily:'var(--font-mono)'}}>{demo.pincode}</strong> · ₹{demo.amount.toLocaleString()}</span>
                <span>{demo.customer}</span>
              </div>
            </button>
          ))}
        </div>

        {simResult && (
          <div className="animate-fade-in-up" style={{
            marginTop: 20, padding: '16px 20px', borderRadius: '12px', fontSize: 14,
            background: simResult.error ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            border: `1px solid ${simResult.error ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          }}>
            {simResult.error ? (
              <span style={{ color: 'var(--accent-red)' }}>Error: {simResult.error}</span>
            ) : (
              <div style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700 }}>✓ Order simulated successfully</span>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <span>Risk: <strong style={{color:'var(--text)', fontFamily:'var(--font-mono)'}}>{Math.round((simResult.riskAssessment?.fraudRiskScore ?? simResult.fraudRiskScore ?? 0) * 100)}%</strong></span>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <span>Decision: <strong style={{color:'var(--text)'}}>{simResult.riskAssessment?.decision || simResult.decision || '—'}</strong></span>
                {simResult.ivrTriggered && <span style={{ marginLeft: 8, color: 'var(--accent-purple)', fontWeight: 600, background: 'rgba(139,92,246,0.15)', padding: '2px 8px', borderRadius: 4 }}>📞 IVR triggered</span>}
                {simResult.whatsappSent && <span style={{ marginLeft: 8, color: 'var(--accent-blue)', fontWeight: 600, background: 'rgba(59,130,246,0.15)', padding: '2px 8px', borderRadius: 4 }}>💬 WhatsApp sent</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Orders list */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Processed Orders ({orders.length})
          </div>
          <button onClick={load} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 14px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseOut={e=>e.currentTarget.style.background='none'}>
            ↺ Refresh
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse" style={{ color: 'var(--accent-blue)', padding: 40, textAlign: 'center', fontSize: 16 }}>Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="glass-panel animate-fade-in" style={{
            padding: '60px 20px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: 15,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🛒</div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>No orders processed yet</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>Use the demo simulators above to test the full flow</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[...orders].reverse().map((order, i) => {
              const score = order.riskAssessment?.fraudRiskScore ?? order.fraudRiskScore ?? 0;
              return (
                <div
                  key={order.shopifyOrderId || order.orderId}
                  className={`glass-panel animate-fade-in-up delay-${(i%5)*100}`}
                  style={{
                    padding: '20px 24px',
                    borderLeft: `4px solid ${getRiskColor(score)}`,
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center',
                    transition: 'transform 0.2s',
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateX(4px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateX(0)'}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
                        {order.orderName || order.shopifyOrderId || order.orderId}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '8px' }}>
                      <span>PIN <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginLeft: 6 }}>{order.pincode}</span></span>
                      <span>Risk <span style={{ color: getRiskColor(score), fontWeight: 700, fontFamily: 'var(--font-mono)', marginLeft: 6 }}>{Math.round(score * 100)}%</span></span>
                      <span>RTO <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', marginLeft: 6 }}>{pct(order.riskAssessment?.rtoRateAvg ?? order.rtoRate)}</span></span>
                      {order.amount && <span>Amount <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', marginLeft: 6 }}>₹{parseFloat(order.amount).toLocaleString()}</span></span>}
                      {order.processedAt && <span><span style={{ color: 'var(--text)' }}>{timeAgo(order.processedAt)}</span></span>}
                    </div>
                    {(order.ivrTriggered || order.whatsappSent) && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                        {order.ivrTriggered && <span style={{ fontSize: 12, color: 'var(--accent-purple)', background: 'rgba(139,92,246,0.1)', padding: '4px 10px', borderRadius: '4px', fontWeight: 600 }}>📞 IVR triggered</span>}
                        {order.whatsappSent && <span style={{ fontSize: 12, color: 'var(--accent-blue)', background: 'rgba(59,130,246,0.1)', padding: '4px 10px', borderRadius: '4px', fontWeight: 600 }}>💬 WhatsApp sent</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', paddingLeft: 16, borderLeft: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 800, color: getRiskColor(score), fontFamily: 'var(--font-heading)', fontSize: 32, lineHeight: 1 }}>
                      {Math.round(score * 100)}%
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>fraud risk</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
