import React, { useState, useEffect } from 'react';
import Landing from './components/Landing.jsx';
import PinSearch from './components/PinSearch.jsx';
import HighRiskMap from './components/HighRiskMap.jsx';
import ManualReview from './components/ManualReview.jsx';
import ShopifyOrders from './components/ShopifyOrders.jsx';
import DashboardHeader from './components/DashboardHeader.jsx';
import { api } from './utils/api.js';

const TABS = [
  { id: 'search', label: 'PIN Search', icon: '🔍' },
  { id: 'risk-map', label: 'Risk Map', icon: '🗺️' },
  { id: 'review', label: 'Manual Review', icon: '📋' },
  { id: 'shopify', label: 'Shopify Orders', icon: '🛒' },
];

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [tab, setTab] = useState('search');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.dashboard.summary().then(setSummary).catch(console.error);
    const interval = setInterval(() => {
      api.dashboard.summary().then(setSummary).catch(console.error);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (showLanding) {
    return <Landing onLaunch={() => setShowLanding(false)} />;
  }

  return (
    <div className="animate-fade-in" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <DashboardHeader summary={summary} />

      {/* Modern Tab bar */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(24, 24, 27, 0.8)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', gap: '8px', padding: '12px 0' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                border: '1px solid',
                borderColor: tab === t.id ? 'var(--border-glow)' : 'transparent',
                color: tab === t.id ? 'var(--accent-blue)' : 'var(--text-muted)',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: tab === t.id ? 600 : 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseOver={e => {
                if (tab !== t.id) {
                  e.currentTarget.style.color = 'var(--text)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseOut={e => {
                if (tab !== t.id) {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto', width: '100%', flex: 1 }}>
        <div className="animate-fade-in-up">
          {tab === 'search' && <PinSearch />}
          {tab === 'risk-map' && <HighRiskMap />}
          {tab === 'review' && <ManualReview />}
          {tab === 'shopify' && <ShopifyOrders />}
        </div>
      </div>
    </div>
  );
}
