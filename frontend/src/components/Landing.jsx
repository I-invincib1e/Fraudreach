import React from 'react';

export default function Landing({ onLaunch }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorative Blobs */}
      <div style={{
        position: 'absolute',
        top: '20%', left: '10%',
        width: '300px', height: '300px',
        background: 'var(--accent-indigo)',
        borderRadius: '50%',
        filter: 'blur(100px)',
        opacity: 0.15,
        zIndex: 0
      }} className="animate-float" />
      
      <div style={{
        position: 'absolute',
        bottom: '20%', right: '10%',
        width: '400px', height: '400px',
        background: 'var(--accent-purple)',
        borderRadius: '50%',
        filter: 'blur(120px)',
        opacity: 0.15,
        zIndex: 0,
        animationDelay: '2s'
      }} className="animate-float" />

      {/* Main Content */}
      <div className="glass-panel animate-fade-in-up" style={{
        maxWidth: '800px',
        width: '100%',
        padding: '60px 40px',
        textAlign: 'center',
        zIndex: 1,
        position: 'relative'
      }}>
        <div className="animate-fade-in-up delay-100" style={{
          display: 'inline-block',
          padding: '6px 16px',
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '20px',
          color: 'var(--accent-blue)',
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '24px'
        }}>
          FAR AWAY 2026 Hackathon
        </div>

        <h1 className="animate-fade-in-up delay-200" style={{
          fontSize: '3.5rem',
          lineHeight: 1.1,
          marginBottom: '24px'
        }}>
          Intelligent Delivery <br/>
          <span className="gradient-text">Fraud Prevention</span>
        </h1>

        <p className="animate-fade-in-up delay-300" style={{
          fontSize: '1.2rem',
          color: 'var(--text-muted)',
          maxWidth: '600px',
          margin: '0 auto 40px',
          lineHeight: 1.6
        }}>
          Multi-source PIN code risk scoring for Indian logistics.
          Identify high-risk areas, automate IVR verifications, and reduce RTO effortlessly.
        </p>

        <div className="animate-fade-in-up delay-400">
          <button className="btn-primary" onClick={onLaunch} style={{ fontSize: '1.1rem', padding: '16px 32px' }}>
            Launch Dashboard 🚀
          </button>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="animate-fade-in-up delay-400" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px',
        maxWidth: '1000px',
        width: '100%',
        marginTop: '60px',
        zIndex: 1
      }}>
        {[
          { icon: '⚖️', title: 'Consensus Engine', desc: 'Aggregates metrics from Delhivery, Ekart, and Shiprocket for hyper-accurate risk scoring.' },
          { icon: '📞', title: 'Twilio IVR', desc: 'Automatically calls high-risk customers to verify delivery intent before shipping.' },
          { icon: '💬', title: 'WhatsApp Alerts', desc: 'Sends instant WhatsApp verification messages for medium-risk PIN codes.' }
        ].map((feature, i) => (
          <div key={i} className="glass-panel" style={{
            padding: '24px',
            textAlign: 'left',
            background: 'rgba(24, 24, 27, 0.4)',
            transition: 'transform 0.2s',
            cursor: 'default'
          }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
             onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>{feature.icon}</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text)' }}>{feature.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
