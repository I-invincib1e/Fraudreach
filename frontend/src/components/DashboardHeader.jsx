import React from 'react';
import { getRiskColor } from '../utils/risk.js';

function StatBox({ label, value, color, sub, delayClass }) {
  return (
    <div className={`glass-panel animate-fade-in-up ${delayClass}`} style={{
      padding: '16px 24px',
      minWidth: '160px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle glow behind the value */}
      <div style={{
        position: 'absolute',
        top: '-10px', right: '-10px',
        width: '50px', height: '50px',
        background: color || 'var(--accent-blue)',
        filter: 'blur(30px)',
        opacity: 0.15,
        borderRadius: '50%'
      }} />

      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: color || 'var(--text)', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px', fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

export default function DashboardHeader({ summary }) {
  // Parse the new summary structure from backend API
  const s = summary || {};
  
  const totalPins = s.pincodes?.total ?? '—';
  const highRisk = (s.pincodes?.critical || 0) + (s.pincodes?.high || 0);
  const pendingReview = s.manualReview?.pending ?? '—';
  const ivrTotal = s.ivr?.total ?? '—';
  
  // Example dummy value for avg risk since it's not in the new API
  const avgRiskDisplay = 'Medium'; 

  return (
    <header style={{
      padding: '24px 32px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
        
        {/* Brand */}
        <div className="animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
            }}>
              🚀
            </div>
            <div>
              <h1 style={{ fontWeight: 700, fontSize: '24px', margin: 0, letterSpacing: '-0.02em' }}>
                Delivery Fraud <span className="gradient-text">Agent</span>
              </h1>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Consensus Risk Engine
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <StatBox
            label="Total PINs"
            value={totalPins}
            sub="Active monitored zones"
            delayClass="delay-100"
          />
          <StatBox
            label="High Risk"
            value={highRisk}
            color="var(--accent-red)"
            sub="Critical + High tiers"
            delayClass="delay-200"
          />
          <StatBox
            label="IVR Calls"
            value={ivrTotal}
            color="var(--accent-purple)"
            sub="Verification calls"
            delayClass="delay-300"
          />
          <StatBox
            label="Pending Review"
            value={pendingReview}
            color="var(--accent-yellow)"
            sub="Manual queue"
            delayClass="delay-400"
          />
        </div>

        {/* Live indicator */}
        <div className="animate-fade-in" style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', 
          fontSize: '13px', color: 'var(--accent-green)', fontWeight: 600,
          background: 'rgba(16, 185, 129, 0.1)',
          padding: '8px 16px', borderRadius: '20px',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: 'var(--accent-green)',
            display: 'inline-block',
            boxShadow: '0 0 10px var(--accent-green)',
            animation: 'pulse 2s infinite',
          }} />
          Live Engine
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
      `}</style>
    </header>
  );
}
