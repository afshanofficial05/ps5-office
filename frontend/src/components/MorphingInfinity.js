import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

const circleA =
  "M 12 8 C 14.21 8 16 9.79 16 12 C 16 14.21 14.21 16 12 16 C 9.79 16 8 14.21 8 12 C 8 9.79 9.79 8 12 8 Z";

const infinity =
  "M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z";

const circleB =
  "M 12 16 C 14.21 16 16 14.21 16 12 C 16 9.79 14.21 8 12 8 C 9.79 8 8 9.79 8 12 C 8 14.21 9.79 16 12 16 Z";

export function MorphingInfinity({ 
  size = 52, 
  color = "#2563eb", 
  strokeWidth = 1.8, 
  style, 
  ...props 
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="status"
      aria-label="Loading"
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size,
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: 'drop-shadow(0 4px 12px rgba(37, 99, 235, 0.25))',
        ...style
      }}
      {...props}
    >
      <motion.path
        animate={{
          d: [circleA, infinity, circleB, infinity, circleA],
        }}
        transition={{
          d: {
            duration: 3.5,
            ease: "easeInOut",
            repeat: Infinity,
            times: [0, 0.25, 0.5, 0.75, 1.0],
          },
        }}
      />
    </svg>
  );
}

const RENDER_MESSAGES = [
  "Fetching live arena data...",
  "Waking up Render backend engine...",
  "Synchronizing player ratings and rankings...",
  "Preparing tournament stats...",
  "Almost ready, booting database..."
];

export default function ArenaDataLoader({ 
  text = "Loading Arena Data...", 
  subtext, 
  minHeight = "360px",
  compact = false 
}) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % RENDER_MESSAGES.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '24px'
      }}>
        <MorphingInfinity size={32} color="#2563eb" strokeWidth={2} />
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#64748b' }}>
          {text}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      minHeight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      padding: '40px 20px',
      textAlign: 'center'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '24px',
        padding: '36px 40px',
        boxShadow: '0 10px 30px rgba(37, 99, 235, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '440px',
        width: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top ambient glow line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #2563eb, transparent)',
          borderRadius: '3px'
        }} />

        {/* Morphing Infinity Animation */}
        <div style={{
          width: '74px',
          height: '74px',
          borderRadius: '20px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          boxShadow: '0 8px 20px rgba(37, 99, 235, 0.12)'
        }}>
          <MorphingInfinity size={48} color="#2563eb" strokeWidth={1.8} />
        </div>

        {/* Dynamic Title */}
        <h3 style={{
          fontSize: '1.1rem',
          fontWeight: 800,
          color: '#0f172a',
          margin: 0,
          letterSpacing: '-0.01em'
        }}>
          {text}
        </h3>

        {/* Cycling message to keep users entertained during Render free-tier cold starts */}
        <p style={{
          fontSize: '0.84rem',
          color: '#64748b',
          marginTop: '8px',
          marginBottom: '16px',
          minHeight: '20px',
          transition: 'opacity 0.3s ease'
        }}>
          {subtext || RENDER_MESSAGES[msgIndex]}
        </p>

        {/* Subtle pulsing badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '9999px',
          fontSize: '0.72rem',
          color: '#475569',
          fontWeight: 600
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#2563eb',
            display: 'inline-block',
            boxShadow: '0 0 6px #2563eb'
          }} />
          <span>Server optimizing response</span>
        </div>
      </div>
    </div>
  );
}
