import React, { useState } from 'react';
import Link from 'next/link';
import RatingBadge from './RatingBadge';
import Avatar from './Avatar';
import { 
  Trophy, Crown, Medal, Flame, Swords, Users, ChevronRight
} from 'lucide-react';

export default function TopLeaderboardWidget({ leaderboard1v1 = [], leaderboard2v2 = [], currentUserId }) {
  const [activeTab, setActiveTab] = useState('1V1');

  const currentLeaderboard = activeTab === '1V1' ? leaderboard1v1 : leaderboard2v2;
  const top5 = currentLeaderboard.slice(0, 5);

  const top1 = top5[0];
  const top2 = top5[1];
  const top3 = top5[2];
  const runnerUps = top5.slice(3, 5); // 4th and 5th

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
            padding: 12px 10px;
            margin-bottom: 12px;
            border-radius: 14px;
          }
          .podium-header-bar {
            margin-bottom: 12px !important;
            padding-bottom: 10px !important;
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

        /* Animations */
        @keyframes podiumSlideUp {
          0% {
            opacity: 0;
            transform: translateY(28px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes championSlideUp {
          0% {
            opacity: 0;
            transform: translateY(36px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes trophyFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes lightSweep {
          0% {
            transform: translateX(-120%) rotate(25deg);
            opacity: 0;
          }
          15% {
            opacity: 0.5;
          }
          30% {
            transform: translateX(250%) rotate(25deg);
            opacity: 0;
          }
          100% {
            transform: translateX(250%) rotate(25deg);
            opacity: 0;
          }
        }

        .anim-trophy-float {
          animation: trophyFloat 3.5s ease-in-out infinite;
        }

        .anim-card-second {
          animation: podiumSlideUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
        }

        .anim-card-third {
          animation: podiumSlideUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both;
        }

        .anim-card-first {
          animation: championSlideUp 0.8s cubic-bezier(0.34, 1.25, 0.64, 1) 0.28s both;
        }

        .light-sweep-beam {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 60px;
          height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transform: rotate(25deg);
          pointer-events: none;
          animation: lightSweep 6s infinite ease-in-out;
        }

        .winner-card-hover {
          transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.25s ease;
        }

        .winner-card-hover:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.12);
        }
      `}</style>

      {/* Header bar: Title & Mode Selector */}
      <div className="podium-header-bar" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="podium-brand-icon" style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 className="podium-title" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                PSO Gaming Leaderboard
              </h2>
            </div>
            <p className="podium-header-sub" style={{ color: '#64748b', fontSize: '0.86rem', marginTop: '2px', fontWeight: 500 }}>
              Official office competitive rankings — Who is currently ruling the arena?
            </p>
          </div>
        </div>

        {/* Mode Toggle & View All Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            background: '#f8fafc',
            padding: '4px',
            borderRadius: '9999px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setActiveTab('1V1')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 18px',
                borderRadius: '9999px',
                border: 'none',
                background: activeTab === '1V1' ? '#eff6ff' : 'transparent',
                color: activeTab === '1V1' ? '#2563eb' : '#64748b',
                fontWeight: activeTab === '1V1' ? 700 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === '1V1' ? '0 1px 3px rgba(37, 99, 235, 0.15)' : 'none'
              }}
            >
              <Swords size={15} color={activeTab === '1V1' ? '#2563eb' : '#94a3b8'} />
              <span>1v1 Duels</span>
            </button>
            <button
              onClick={() => setActiveTab('2V2')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 18px',
                borderRadius: '9999px',
                border: 'none',
                background: activeTab === '2V2' ? '#eff6ff' : 'transparent',
                color: activeTab === '2V2' ? '#2563eb' : '#64748b',
                fontWeight: activeTab === '2V2' ? 700 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === '2V2' ? '0 1px 3px rgba(37, 99, 235, 0.15)' : 'none'
              }}
            >
              <Users size={15} color={activeTab === '2V2' ? '#2563eb' : '#94a3b8'} />
              <span>2v2 Co-op</span>
            </button>
          </div>

          <Link href="/leaderboards" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.84rem' }}>
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
        <div>
          {/* Mobile-Only Compact Leaderboard (Zero Horizontal Scroll) */}
          <div className="mobile-only-view">
            <div className="mobile-leaderboard-list">
              {top5.map((p, idx) => {
                const rank = idx + 1;
                const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
                return (
                  <div key={p.player_id} className={`mobile-leaderboard-row ${rankClass}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      {/* Rank Badge */}
                      <span style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: rank === 1 ? '#fef3c7' : rank === 2 ? '#f1f5f9' : rank === 3 ? '#ffedd5' : '#f8fafc',
                        color: rank === 1 ? '#92400e' : rank === 2 ? '#334155' : rank === 3 ? '#9a3412' : '#64748b',
                        border: `1px solid ${rank === 1 ? '#fde68a' : rank === 2 ? '#cbd5e1' : rank === 3 ? '#fed7aa' : '#e2e8f0'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '0.72rem',
                        flexShrink: 0
                      }}>
                        {rank}
                      </span>

                      <Avatar src={p.profile_photo} name={p.name} size="sm" />

                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {p.name}
                          </span>
                          {p.player_id === currentUserId && (
                            <span style={{
                              background: '#2563eb',
                              color: '#ffffff',
                              padding: '1px 4px',
                              borderRadius: '4px',
                              fontSize: '0.55rem',
                              fontWeight: 800,
                              flexShrink: 0
                            }}>
                              YOU
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {p.player_code} • {p.wins}W {p.losses}L {p.win_streak > 0 ? `• 🔥${p.win_streak}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Rating and Tier */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, textAlign: 'right' }}>
                      <div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', lineHeight: 1 }}>
                          {Math.round(p.rating)}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                          {p.win_rate}% win
                        </div>
                      </div>
                      <RatingBadge rating={p.rating} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop-Only Full Podium View (Unchanged for Desktop) */}
          <div className="desktop-only-view">
            {/* Top 3 Podium Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '18px',
              marginBottom: '18px'
            }}>
            
            {/* 1st Place - Champion */}
            {top1 && (
              <div className="anim-card-first winner-card-hover" style={{
                position: 'relative',
                background: 'linear-gradient(180deg, #fffdf5 0%, #fef9e7 100%)',
                border: '1.5px solid #fde68a',
                borderRadius: '18px',
                padding: '20px',
                boxShadow: '0 2px 10px rgba(251, 191, 36, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflow: 'hidden'
              }}>
                {/* Light sweep animation */}
                <div className="light-sweep-beam" />

                {/* Watermark Trophy Illustration */}
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  opacity: 0.15,
                  pointerEvents: 'none',
                  color: '#d97706'
                }}>
                  <Trophy size={68} />
                </div>

                <div>
                  {/* Badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px'
                  }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      background: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                      fontWeight: 700,
                      fontSize: '0.74rem'
                    }}>
                      <Crown size={13} color="#d97706" />
                      <span>1st Place • Champion</span>
                    </div>

                    <div className="anim-trophy-float" style={{ color: '#d97706', display: 'flex', alignItems: 'center' }}>
                      <Trophy size={18} />
                    </div>
                  </div>

                  {/* Player info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ position: 'relative' }}>
                      <Avatar
                        src={top1.profile_photo}
                        name={top1.name}
                        size="lg"
                        showBorder={true}
                        borderColor="#fbbf24"
                        style={{ boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)' }}
                      />
                      <Crown size={14} color="#d97706" style={{ position: 'absolute', top: '-6px', right: '-4px', transform: 'rotate(15deg)', zIndex: 2 }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 style={{
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          margin: 0
                        }}>
                          {top1.name}
                        </h3>
                        {top1.player_id === currentUserId && (
                          <span style={{
                            background: '#2563eb',
                            color: '#ffffff',
                            padding: '1px 6px',
                            borderRadius: '9999px',
                            fontSize: '0.62rem',
                            fontWeight: 800
                          }}>
                            YOU
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#64748b', fontSize: '0.76rem', fontFamily: 'monospace', fontWeight: 600, marginTop: '2px' }}>
                        {top1.player_code}
                      </p>
                    </div>
                  </div>

                  {/* Elo Box */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #fef08a',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                        ELO RATING
                      </span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', lineHeight: 1.1 }}>
                        {Math.round(top1.rating)}
                      </div>
                    </div>
                    <RatingBadge rating={top1.rating} size="sm" />
                  </div>
                </div>

                {/* Stat row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '6px',
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(251, 191, 36, 0.2)'
                }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>W / L / D</span>
                    <span style={{ fontWeight: 800, color: '#059669' }}>{top1.wins}W</span> <span style={{ color: '#64748b' }}>/ {top1.losses}L</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>Win Rate</span>
                    <span style={{ fontWeight: 800, color: '#059669' }}>{top1.win_rate}%</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>Streak</span>
                    <span style={{ fontWeight: 700, color: top1.win_streak > 0 ? '#d97706' : '#64748b' }}>
                      {top1.win_streak > 0 ? `🔥 ${top1.win_streak}` : '-'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2nd Place - Runner Up */}
            {top2 && (
              <div className="anim-card-second winner-card-hover" style={{
                position: 'relative',
                background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '20px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflow: 'hidden'
              }}>
                {/* Watermark Medal Illustration */}
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  opacity: 0.15,
                  pointerEvents: 'none',
                  color: '#64748b'
                }}>
                  <Medal size={68} />
                </div>

                <div>
                  {/* Badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: '#e2e8f0',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    marginBottom: '14px'
                  }}>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#334155',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 900
                    }}>2</span>
                    <span>2nd Place</span>
                  </div>

                  {/* Player info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <Avatar
                      src={top2.profile_photo}
                      name={top2.name}
                      size="lg"
                      showBorder={true}
                      borderColor="#cbd5e1"
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 style={{
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          margin: 0
                        }}>
                          {top2.name}
                        </h3>
                        {top2.player_id === currentUserId && (
                          <span style={{
                            background: '#2563eb',
                            color: '#ffffff',
                            padding: '1px 6px',
                            borderRadius: '9999px',
                            fontSize: '0.62rem',
                            fontWeight: 800
                          }}>
                            YOU
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#64748b', fontSize: '0.76rem', fontFamily: 'monospace', fontWeight: 600, marginTop: '2px' }}>
                        {top2.player_code}
                      </p>
                    </div>
                  </div>

                  {/* Elo Box */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                        ELO RATING
                      </span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', lineHeight: 1.1 }}>
                        {Math.round(top2.rating)}
                      </div>
                    </div>
                    <RatingBadge rating={top2.rating} size="sm" />
                  </div>
                </div>

                {/* Stat row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '6px',
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  paddingTop: '6px',
                  borderTop: '1px solid #e2e8f0'
                }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>W / L / D</span>
                    <span style={{ fontWeight: 800, color: '#059669' }}>{top2.wins}W</span> <span style={{ color: '#64748b' }}>/ {top2.losses}L</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>Win Rate</span>
                    <span style={{ fontWeight: 800, color: '#2563eb' }}>{top2.win_rate}%</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>Streak</span>
                    <span style={{ fontWeight: 700, color: top2.win_streak > 0 ? '#d97706' : '#64748b' }}>
                      {top2.win_streak > 0 ? `🔥 ${top2.win_streak}` : '-'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3 && (
              <div className="anim-card-third winner-card-hover" style={{
                position: 'relative',
                background: 'linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)',
                border: '1.5px solid #fed7aa',
                borderRadius: '18px',
                padding: '20px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflow: 'hidden'
              }}>
                {/* Watermark Medal Illustration */}
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  opacity: 0.15,
                  pointerEvents: 'none',
                  color: '#c2410c'
                }}>
                  <Medal size={68} />
                </div>

                <div>
                  {/* Badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: '#ffedd5',
                    color: '#9a3412',
                    border: '1px solid #fed7aa',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    marginBottom: '14px'
                  }}>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#c2410c',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 900
                    }}>3</span>
                    <span>3rd Place</span>
                  </div>

                  {/* Player info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <Avatar
                      src={top3.profile_photo}
                      name={top3.name}
                      size="lg"
                      showBorder={true}
                      borderColor="#fed7aa"
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 style={{
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          margin: 0
                        }}>
                          {top3.name}
                        </h3>
                        {top3.player_id === currentUserId && (
                          <span style={{
                            background: '#2563eb',
                            color: '#ffffff',
                            padding: '1px 6px',
                            borderRadius: '9999px',
                            fontSize: '0.62rem',
                            fontWeight: 800
                          }}>
                            YOU
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#64748b', fontSize: '0.76rem', fontFamily: 'monospace', fontWeight: 600, marginTop: '2px' }}>
                        {top3.player_code}
                      </p>
                    </div>
                  </div>

                  {/* Elo Box */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #fed7aa',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                        ELO RATING
                      </span>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', lineHeight: 1.1 }}>
                        {Math.round(top3.rating)}
                      </div>
                    </div>
                    <RatingBadge rating={top3.rating} size="sm" />
                  </div>
                </div>

                {/* Stat row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '6px',
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  paddingTop: '6px',
                  borderTop: '1px solid #fed7aa'
                }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>W / L / D</span>
                    <span style={{ fontWeight: 800, color: '#059669' }}>{top3.wins}W</span> <span style={{ color: '#64748b' }}>/ {top3.losses}L</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>Win Rate</span>
                    <span style={{ fontWeight: 800, color: '#2563eb' }}>{top3.win_rate}%</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem', fontWeight: 600 }}>Streak</span>
                    <span style={{ fontWeight: 700, color: top3.win_streak > 0 ? '#d97706' : '#64748b' }}>
                      {top3.win_streak > 0 ? `🔥 ${top3.win_streak}` : '-'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4th and 5th Place Positions */}
          {runnerUps.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px',
              marginTop: '14px'
            }}>
              {runnerUps.map((p, idx) => {
                const rankNum = idx + 4;
                return (
                  <div
                    key={p.player_id}
                    className="winner-card-hover"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      gap: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Rank Indicator */}
                      <span style={{
                        color: '#64748b',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        fontFamily: 'monospace'
                      }}>
                        #{rankNum}
                      </span>

                      {/* Avatar */}
                      <Avatar
                        src={p.profile_photo}
                        name={p.name}
                        size="md"
                        showBorder={true}
                        borderColor="#cbd5e1"
                      />

                      {/* Name & ID */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                            {p.name}
                          </span>
                          {p.player_id === currentUserId && (
                            <span style={{
                              background: '#2563eb',
                              color: '#ffffff',
                              padding: '1px 5px',
                              borderRadius: '9999px',
                              fontSize: '0.58rem',
                              fontWeight: 800
                            }}>
                              YOU
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {p.player_code}
                        </span>
                      </div>
                    </div>

                    {/* Rating & Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                        {Math.round(p.rating)}
                      </span>
                      <RatingBadge rating={p.rating} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
