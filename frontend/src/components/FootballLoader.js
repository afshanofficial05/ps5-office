import React, { useState, useEffect } from 'react';

const FOOTBALL_TIPS = [
  "👟 Lacing up the boots & inspecting the pitch...",
  "⚡ Cloud server waking up from the bench (~20-30s on free tier)...",
  "🧤 Goalkeepers doing pre-match warm-ups...",
  "🏟️ Crowd chanting as players enter the PSO Arena...",
  "🎮 Tuning DualSense controller sticks and trigger tension...",
  "🏆 High Elo ratings qualify for the monthly Championship League!",
  "⏱️ Referees reviewing the VAR monitor... Almost ready to play!"
];

export default function FootballLoader({
  title = "Connecting to Arena...",
  subtitle = "Preparing your player profile",
  isColdStart = false,
  fullScreen = false
}) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % FOOTBALL_TIPS.length);
    }, 3600);
    return () => clearInterval(interval);
  }, []);

  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '24px 20px',
      position: 'relative',
      zIndex: 20
    }}>
      {/* Stadium Pitch Ambient Glow */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '180px',
        height: '180px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(37, 99, 235, 0.15) 50%, transparent 75%)',
        borderRadius: '50%',
        filter: 'blur(20px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Bouncing Football Animation Arena */}
      <div style={{
        position: 'relative',
        width: '100px',
        height: '110px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: '18px',
        zIndex: 1
      }}>
        {/* The Football */}
        <div className="football-bounce-ball" style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
          background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #e2e8f0 70%, #94a3b8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Detailed SVG Football Leather Pattern */}
          <svg
            className="football-spin"
            viewBox="0 0 100 100"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Center Pentagon */}
            <polygon points="50,32 67,44 60,65 40,65 33,44" fill="#0f172a" />
            
            {/* Seams connecting center to outer */}
            <line x1="50" y1="32" x2="50" y2="12" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="67" y1="44" x2="86" y2="38" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="60" y1="65" x2="75" y2="82" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="40" y1="65" x2="25" y2="82" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="33" y1="44" x2="14" y2="38" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />

            {/* Top Pentagon Slice */}
            <polygon points="40,2 60,2 64,12 36,12" fill="#1e293b" />
            {/* Top Right Pentagon Slice */}
            <polygon points="86,38 98,28 100,48 88,58" fill="#1e293b" />
            {/* Bottom Right Pentagon Slice */}
            <polygon points="75,82 92,84 85,98 67,98" fill="#1e293b" />
            {/* Bottom Left Pentagon Slice */}
            <polygon points="25,82 8,84 15,98 33,98" fill="#1e293b" />
            {/* Top Left Pentagon Slice */}
            <polygon points="14,38 2,28 0,48 12,58" fill="#1e293b" />

            {/* Outer Ring Border */}
            <circle cx="50" cy="50" r="48" fill="none" stroke="#64748b" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Dynamic Ball Drop Shadow */}
        <div className="football-shadow-pulse" style={{
          width: '54px',
          height: '10px',
          background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0) 70%)',
          borderRadius: '50%',
          marginTop: '6px'
        }} />
      </div>

      {/* Title & Status */}
      <div style={{ zIndex: 1, maxWidth: '340px' }}>
        <h4 style={{
          fontSize: '1.12rem',
          fontWeight: 800,
          color: '#0f172a',
          marginBottom: '6px',
          letterSpacing: '-0.02em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '1.2rem' }}>⚽</span>
          {isColdStart ? "Warming Up The Cloud Pitch..." : title}
        </h4>

        <p style={{
          fontSize: '0.86rem',
          color: '#475569',
          lineHeight: 1.4,
          marginBottom: '14px'
        }}>
          {isColdStart 
            ? "Render free-tier spins down when idle. The server is booting up now!"
            : subtitle}
        </p>

        {/* Progress Bar / Stadium Light Pulse */}
        <div style={{
          width: '100%',
          maxWidth: '280px',
          height: '6px',
          background: '#e2e8f0',
          borderRadius: '999px',
          overflow: 'hidden',
          margin: '0 auto 16px',
          position: 'relative'
        }}>
          <div className="football-progress-stripe" style={{
            height: '100%',
            width: '45%',
            background: 'linear-gradient(90deg, #10b981 0%, #2563eb 50%, #38bdf8 100%)',
            borderRadius: '999px',
            position: 'absolute'
          }} />
        </div>

        {/* Rotating Football Tip / Commentary */}
        <div style={{
          background: 'rgba(241, 245, 249, 0.85)',
          border: '1px solid rgba(203, 213, 225, 0.8)',
          borderRadius: '12px',
          padding: '10px 14px',
          fontSize: '0.78rem',
          color: '#334155',
          fontStyle: 'italic',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
          transition: 'all 0.3s ease',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {FOOTBALL_TIPS[tipIndex]}
        </div>
      </div>

      <style jsx global>{`
        @keyframes footballBounceAnim {
          0%, 100% {
            transform: translateY(0) scale(1.08, 0.92);
          }
          50% {
            transform: translateY(-46px) scale(0.95, 1.05);
          }
        }

        @keyframes footballSpinAnim {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes footballShadowPulseAnim {
          0%, 100% {
            transform: scale(1.15);
            opacity: 0.55;
          }
          50% {
            transform: scale(0.35);
            opacity: 0.12;
          }
        }

        @keyframes footballProgressMove {
          0% {
            left: -45%;
          }
          100% {
            left: 100%;
          }
        }

        .football-bounce-ball {
          animation: footballBounceAnim 0.75s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
        }

        .football-spin {
          animation: footballSpinAnim 2.2s linear infinite;
        }

        .football-shadow-pulse {
          animation: footballShadowPulseAnim 0.75s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
        }

        .football-progress-stripe {
          animation: footballProgressMove 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          maxWidth: '420px',
          width: '100%',
          overflow: 'hidden',
          border: '1px solid rgba(226, 232, 240, 0.9)'
        }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
