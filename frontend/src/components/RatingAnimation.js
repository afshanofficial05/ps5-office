import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowUpRight, ArrowDownRight, Minus, Trophy, Sparkles } from 'lucide-react';

export default function RatingAnimation({ 
  isWinner = true, 
  ratingBefore = 1500, 
  ratingAfter = 1512, 
  ratingChange = 12,
  opponentName = "Opponent",
  opponentBefore = 1500,
  opponentAfter = 1488,
  opponentChange = -12
}) {
  const [displayedRating, setDisplayedRating] = useState(ratingBefore);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (isWinner) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    const timer = setTimeout(() => {
      setDisplayedRating(ratingAfter);
      setAnimated(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [isWinner, ratingAfter]);

  const isPositive = ratingChange > 0;
  const isDraw = ratingChange === 0;

  return (
    <div className="glass-card animate-pop" style={{
      padding: '32px',
      textAlign: 'center',
      maxWidth: '480px',
      margin: '0 auto',
      position: 'relative',
      overflow: 'hidden',
      background: '#ffffff',
      borderRadius: '20px',
      border: isWinner ? '1.5px solid #a7f3d0' : isDraw ? '1.5px solid #fde68a' : '1.5px solid #fecdd3',
      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)'
    }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: isWinner ? '#ecfdf5' : isDraw ? '#fffdf5' : '#fff1f2',
          border: isWinner ? '2px solid #10b981' : isDraw ? '2px solid #f59e0b' : '2px solid #e11d48',
          margin: '0 auto 16px',
        }}>
          {isWinner ? (
            <Trophy size={32} color="#059669" />
          ) : isDraw ? (
            <Minus size={32} color="#d97706" />
          ) : (
            <Sparkles size={32} color="#e11d48" />
          )}
        </div>

        <h3 style={{
          fontSize: '1.8rem',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          color: isWinner ? '#059669' : isDraw ? '#d97706' : '#e11d48',
          marginBottom: '8px'
        }}>
          {isWinner ? 'VICTORY!' : isDraw ? 'MATCH DRAW' : 'DEFEAT'}
        </h3>

        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
          Official Elo rating has been calculated and updated.
        </p>

        {/* User Rating Change Box */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
            Your New Rating
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.4rem', color: '#94a3b8', textDecoration: 'line-through' }}>
              {Math.round(ratingBefore)}
            </span>
            <span style={{ fontSize: '1.2rem', color: '#64748b' }}>→</span>
            <span style={{
              fontSize: '2.2rem',
              fontWeight: 900,
              color: '#0f172a',
              fontFamily: 'monospace',
              transition: 'all 0.5s ease',
              transform: animated ? 'scale(1.08)' : 'scale(1)'
            }}>
              {Math.round(displayedRating)}
            </span>
          </div>

          <div style={{ marginTop: '10px' }}>
            <span className={isPositive ? 'badge badge-emerald' : isDraw ? 'badge badge-gold' : 'badge badge-rose'} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
              {isPositive ? <ArrowUpRight size={16} /> : isDraw ? null : <ArrowDownRight size={16} />}
              {isPositive ? `+${ratingChange}` : `${ratingChange}`} Rating Points
            </span>
          </div>
        </div>

        {/* Opponent Rating Summary */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>{opponentName}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{Math.round(opponentBefore)} → {Math.round(opponentAfter)}</span>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: opponentChange >= 0 ? '#059669' : '#e11d48'
            }}>
              ({opponentChange >= 0 ? `+${opponentChange}` : opponentChange})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
