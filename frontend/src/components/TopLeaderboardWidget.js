import React, { useState } from 'react';
import Link from 'next/link';
import RatingBadge from './RatingBadge';
import Avatar from './Avatar';
import { 
  Trophy, Crown, Medal, Flame, Swords, Users, ChevronRight
} from 'lucide-react';

function RankBadge({ rank }) {
  if (rank === 1) {
    return (
      <div style={{
        position: 'relative',
        width: '32px',
        height: '38px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {/* Crown on top */}
        <svg
          width="18"
          height="11"
          viewBox="0 0 24 14"
          fill="#d97706"
          style={{
            marginBottom: '-2px',
            zIndex: 2,
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.12))'
          }}
        >
          <path d="M2 13h20l-3.5-10-4.5 6-2-8-2 8-4.5-6z" />
          <circle cx="2" cy="3" r="1.5" fill="#fef08a" />
          <circle cx="12" cy="1" r="1.5" fill="#fef08a" />
          <circle cx="22" cy="3" r="1.5" fill="#fef08a" />
        </svg>

        {/* Shield with 1 */}
        <div style={{
          width: '26px',
          height: '26px',
          background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '5px 5px 12px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 900,
          fontSize: '0.88rem',
          boxShadow: '0 2px 5px rgba(217, 119, 6, 0.35)',
          border: '1px solid #fde68a'
        }}>
          1
        </div>
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '8px',
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
        color: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: '0.88rem',
        flexShrink: 0
      }}>
        2
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '8px',
        background: '#fff7ed',
        border: '1px solid #fed7aa',
        color: '#9a3412',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: '0.88rem',
        flexShrink: 0
      }}>
        3
      </div>
    );
  }

  return (
    <div style={{
      width: '28px',
      height: '28px',
      borderRadius: '8px',
      background: '#f8fafc',
      border: '1px solid #f1f5f9',
      color: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 900,
      fontSize: '0.88rem',
      flexShrink: 0
    }}>
      {rank}
    </div>
  );
}

function TierPill({ rating }) {
  let tier = 'GOLD';
  let bg = '#fef3c7';
  let color = '#b45309';
  let border = '#fde68a';

  if (rating >= 1800) {
    tier = 'GRANDMASTER';
    bg = '#ffe4e6';
    color = '#e11d48';
    border = '#fecdd3';
  } else if (rating >= 1650) {
    tier = 'MASTER';
    bg = '#f3e8ff';
    color = '#7e22ce';
    border = '#e9d5ff';
  } else if (rating >= 1550) {
    tier = 'DIAMOND';
    bg = '#e0f2fe';
    color = '#0284c7';
    border = '#bae6fd';
  } else if (rating >= 1450) {
    tier = 'GOLD';
    bg = '#fef3c7';
    color = '#b45309';
    border = '#fde68a';
  } else if (rating >= 1350) {
    tier = 'SILVER';
    bg = '#f1f5f9';
    color = '#475569';
    border = '#cbd5e1';
  } else {
    tier = 'BRONZE';
    bg = '#ffedd5';
    color = '#c2410c';
    border = '#fed7aa';
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      padding: '5px 14px',
      borderRadius: '9999px',
      backgroundColor: bg,
      border: `1px solid ${border}`,
      color: color,
      fontWeight: 800,
      fontSize: '0.74rem',
      letterSpacing: '0.03em',
      minWidth: '92px',
      textAlign: 'center',
      flexShrink: 0,
      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
    }}>
      <Crown size={13} fill="currentColor" strokeWidth={1.5} style={{ flexShrink: 0 }} />
      <span>{tier}</span>
    </div>
  );
}

export default function TopLeaderboardWidget({ leaderboard1v1 = [], leaderboard2v2 = [], currentUserId }) {
  const [activeTab, setActiveTab] = useState('1V1');

  const currentLeaderboard = activeTab === '1V1' ? leaderboard1v1 : leaderboard2v2;
  const top5 = currentLeaderboard.slice(0, 5);

  return (
    <div className="glass-card podium-widget-container">
      <style jsx>{`
        .podium-widget-container {
          padding: 24px 28px;
          margin-bottom: 24px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 640px) {
          .podium-widget-container {
            padding: 14px 12px;
            margin-bottom: 14px;
            border-radius: 16px;
          }
          .podium-header-bar {
            margin-bottom: 14px !important;
            padding-bottom: 12px !important;
            gap: 10px !important;
          }
          .podium-header-sub {
            display: none !important;
          }
          .podium-brand-icon {
            width: 36px !important;
            height: 36px !important;
            border-radius: 10px !important;
          }
          .podium-title {
            font-size: 1.05rem !important;
          }
        }
      `}</style>

      {/* Header bar: Title & Mode Selector */}
      <div className="podium-header-bar" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="podium-brand-icon" style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb',
            border: '1px solid #dbeafe',
            flexShrink: 0
          }}>
            <Trophy size={22} />
          </div>
          <div>
            <h2 className="podium-title" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              PSO Gaming Leaderboard
            </h2>
            <p className="podium-header-sub" style={{ color: '#64748b', fontSize: '0.84rem', marginTop: '2px', fontWeight: 500 }}>
              Official office competitive rankings — Top 5 arena champions
            </p>
          </div>
        </div>

        {/* Mode Toggle & View All Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            background: '#f8fafc',
            padding: '3px',
            borderRadius: '9999px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setActiveTab('1V1')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '9999px',
                border: 'none',
                background: activeTab === '1V1' ? '#eff6ff' : 'transparent',
                color: activeTab === '1V1' ? '#2563eb' : '#64748b',
                fontWeight: activeTab === '1V1' ? 700 : 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === '1V1' ? '0 1px 3px rgba(37, 99, 235, 0.15)' : 'none'
              }}
            >
              <Swords size={14} color={activeTab === '1V1' ? '#2563eb' : '#94a3b8'} />
              <span>1v1 Duels</span>
            </button>
            <button
              onClick={() => setActiveTab('2V2')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '9999px',
                border: 'none',
                background: activeTab === '2V2' ? '#eff6ff' : 'transparent',
                color: activeTab === '2V2' ? '#2563eb' : '#64748b',
                fontWeight: activeTab === '2V2' ? 700 : 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === '2V2' ? '0 1px 3px rgba(37, 99, 235, 0.15)' : 'none'
              }}
            >
              <Users size={14} color={activeTab === '2V2' ? '#2563eb' : '#94a3b8'} />
              <span>2v2 Co-op</span>
            </button>
          </div>

          <Link href="/leaderboards" className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.84rem' }}>
            <span>Full Standings</span>
            <ChevronRight size={15} />
          </Link>
        </div>
      </div>

      {/* Top 5 Content Display */}
      {top5.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          <Trophy size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>No ranked players yet in this category.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '4px', color: '#64748b' }}>Play verified matches to climb to the top of the PSO leaderboard!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {top5.map((p, idx) => {
            const rank = idx + 1;
            const isRank1 = rank === 1;

            return (
              <div
                key={p.player_id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderRadius: '16px',
                  backgroundColor: isRank1 ? '#fffdf5' : '#ffffff',
                  border: isRank1 ? '1.5px solid #fef08a' : '1px solid #f1f5f9',
                  boxShadow: isRank1 ? '0 2px 8px rgba(251, 191, 36, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
                  gap: '12px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Left Side: Rank Badge + Avatar + Player Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <RankBadge rank={rank} />

                  <Avatar
                    src={p.profile_photo}
                    name={p.name}
                    size="md"
                    showBorder={true}
                    borderColor={isRank1 ? '#fde68a' : '#e2e8f0'}
                  />

                  <span style={{
                    fontSize: '0.94rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {p.name}
                  </span>
                </div>

                {/* Right Side: Score + Tier Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <span style={{
                    fontSize: '1rem',
                    fontWeight: 900,
                    color: '#0f172a',
                    minWidth: '42px',
                    textAlign: 'right'
                  }}>
                    {Math.round(p.rating)}
                  </span>

                  <TierPill rating={p.rating} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
