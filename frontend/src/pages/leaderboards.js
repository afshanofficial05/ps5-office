import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import { api } from '../services/api';
import { 
  Trophy, Swords, Users, Shield, Crown, 
  ChevronDown, Calendar, Check 
} from 'lucide-react';

export default function LeaderboardsPage() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState('LEADERBOARD'); // 'LEADERBOARD', 'TEAMS'
  const [gameMode, setGameMode] = useState('1V1'); // '1V1', '2V2'
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [leaderboard1v1, setLeaderboard1v1] = useState([]);
  const [leaderboard2v2, setLeaderboard2v2] = useState([]);
  const [leaderboardTeams, setLeaderboardTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    async function loadLeaderboards() {
      try {
        const [l1, l2, lt] = await Promise.all([
          api.get1v1Leaderboard().catch(() => []),
          api.get2v2Leaderboard().catch(() => []),
          api.getTeamLeaderboard().catch(() => [])
        ]);
        if (isMounted) {
          setLeaderboard1v1(l1 || []);
          setLeaderboard2v2(l2 || []);
          setLeaderboardTeams(lt || []);
        }
      } catch (err) {
        console.error('Failed to load leaderboards', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadLeaderboards();
    return () => { isMounted = false; };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowModeDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentPlayers = gameMode === '1V1' ? leaderboard1v1 : leaderboard2v2;

  // Streak & Team Performance Pill (Website Blue & Neutral Theme)
  const getPlayerPill = (p) => {
    if (p.win_streak >= 3) {
      return { icon: '👑', label: `${p.win_streak}W`, bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    }
    if (p.win_streak > 0) {
      return { icon: '👑', label: `${p.win_streak}W`, bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    }
    if (p.losses >= 3) {
      return { icon: '🛡️', label: `${p.losses}L`, bg: '#fff7ed', color: '#ea580c', border: '#ffedd5' };
    }
    if (p.losses > 0) {
      return { icon: '🛡️', label: `${p.losses}L`, bg: '#f5f3ff', color: '#7c3aed', border: '#ede9fe' };
    }
    return { icon: '🛡️', label: `${p.wins || 0}W`, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
  };

  // Recent 5-Match Form Indicator (Blue for wins, grey for losses)
  const getFormDots = (p) => {
    const total = p.matches_played || 0;
    if (total === 0) {
      return ['empty', 'empty', 'empty', 'empty', 'empty'];
    }
    const streak = Math.min(p.win_streak || 0, 5);
    const dots = [];
    for (let i = 0; i < streak; i++) {
      dots.push('win');
    }
    const remaining = 5 - dots.length;
    const remainingWins = Math.max(0, (p.wins || 0) - streak);
    const remainingLosses = p.losses || 0;
    for (let i = 0; i < remaining; i++) {
      if (i < total - streak) {
        if (remainingWins > 0 && i % 2 === 0) {
          dots.push('win');
        } else if (remainingLosses > 0) {
          dots.push('loss');
        } else {
          dots.push('win');
        }
      } else {
        dots.push('empty');
      }
    }
    return dots.slice(0, 5);
  };

  return (
    <Layout title="Leaderboard" requireAuth={true}>
      <div className="leaderboard-page-container">

        {/* 1. Sub Tabs Header (Leaderboard / My Team / Matches) */}
        <div className="subnav-tabs-bar">
          <button
            type="button"
            onClick={() => setMainTab('LEADERBOARD')}
            className={`subnav-tab-btn ${mainTab === 'LEADERBOARD' ? 'active' : ''}`}
          >
            Leaderboard
          </button>
          <button
            type="button"
            onClick={() => setMainTab('TEAMS')}
            className={`subnav-tab-btn ${mainTab === 'TEAMS' ? 'active' : ''}`}
          >
            My Team
          </button>
          <Link
            href="/matches/history"
            className="subnav-tab-btn"
          >
            Matches
          </Link>
        </div>

        {/* 2. League Overview & Mode Dropdown Card */}
        {mainTab === 'LEADERBOARD' ? (
          <div className="league-status-card" ref={dropdownRef}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="league-trophy-badge">
                <Trophy size={20} color="#2563eb" />
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="mode-dropdown-trigger"
                  onClick={() => setShowModeDropdown(!showModeDropdown)}
                >
                  <span>{gameMode === '1V1' ? '1v1 Solo' : '2v2 Tag Team'}</span>
                  <ChevronDown size={15} color="#64748b" />
                </button>
                <p className="league-season-sub">
                  Season 1 • Ongoing
                </p>

                {/* Dropdown Menu */}
                {showModeDropdown && (
                  <div className="mode-dropdown-popover">
                    <button
                      type="button"
                      className={`mode-option-btn ${gameMode === '1V1' ? 'selected' : ''}`}
                      onClick={() => {
                        setGameMode('1V1');
                        setShowModeDropdown(false);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Swords size={16} />
                        <span>1v1 Solo</span>
                      </div>
                      {gameMode === '1V1' && <Check size={14} color="#2563eb" />}
                    </button>

                    <button
                      type="button"
                      className={`mode-option-btn ${gameMode === '2V2' ? 'selected' : ''}`}
                      onClick={() => {
                        setGameMode('2V2');
                        setShowModeDropdown(false);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={16} />
                        <span>2v2 Tag Team</span>
                      </div>
                      {gameMode === '2V2' && <Check size={14} color="#2563eb" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Total Players Chip */}
            <div className="total-players-chip">
              <Calendar size={15} color="#64748b" />
              <div>
                <span className="total-players-label">Total Players</span>
                <span className="total-players-count">{currentPlayers.length}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="league-status-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="league-trophy-badge">
                <Shield size={20} color="#2563eb" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Club Standings
                </h3>
                <p className="league-season-sub">
                  Official PSO FC Club Leaderboard
                </p>
              </div>
            </div>

            <div className="total-players-chip">
              <Calendar size={15} color="#64748b" />
              <div>
                <span className="total-players-label">Total Clubs</span>
                <span className="total-players-count">{leaderboardTeams.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Main Leaderboard Card */}
        <div className="leaderboard-table-card">
          {mainTab === 'LEADERBOARD' ? (
            <div>
              {/* Table Column Headers */}
              <div className="table-header-row">
                <div className="col-rank">#</div>
                <div className="col-player">PLAYER</div>
                <div className="col-team">TEAM</div>
                <div className="col-points">POINTS</div>
                <div className="col-winrate">WIN %</div>
                <div className="col-form">FORM</div>
              </div>

              {/* Rows List */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading official standings...</p>
                </div>
              ) : currentPlayers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                  <Trophy size={36} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>No ranked players yet</p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Submit verified match results to climb the leaderboard!</p>
                </div>
              ) : (
                currentPlayers.map((p) => {
                  const isFirst = p.rank === 1;
                  const isSecond = p.rank === 2;
                  const isThird = p.rank === 3;
                  const pill = getPlayerPill(p);
                  const formDots = getFormDots(p);

                  return (
                    <div 
                      key={p.player_id} 
                      className={`leaderboard-data-row ${isFirst ? 'row-champion' : ''}`}
                    >
                      {/* Rank Badge */}
                      <div className="col-rank">
                        {isFirst ? (
                          <div className="rank-first-container">
                            <Crown size={11} color="#f59e0b" fill="#f59e0b" className="floating-crown" />
                            <span className="rank-circle rank-gold">1</span>
                          </div>
                        ) : isSecond ? (
                          <span className="rank-circle rank-silver">2</span>
                        ) : isThird ? (
                          <span className="rank-circle rank-bronze">3</span>
                        ) : (
                          <span className="rank-plain-number">{p.rank}</span>
                        )}
                      </div>

                      {/* Player (Avatar + Name + Code) */}
                      <div className="col-player">
                        <div className="player-avatar-wrap">
                          <Avatar src={p.profile_photo} name={p.name} size="sm" />
                          <span className="online-indicator-dot" />
                        </div>
                        <div className="player-meta-wrap">
                          <span className="player-full-name" title={p.name}>{p.name}</span>
                          <span className="player-code-sub">{p.player_code}</span>
                        </div>
                      </div>

                      {/* Team / Streak Pill */}
                      <div className="col-team">
                        <span 
                          className="status-pill"
                          style={{
                            background: pill.bg,
                            color: pill.color,
                            border: `1px solid ${pill.border}`
                          }}
                        >
                          <span style={{ fontSize: '0.66rem', marginRight: '2px' }}>{pill.icon}</span>
                          <span>{pill.label}</span>
                        </span>
                      </div>

                      {/* Points / Elo */}
                      <div className="col-points">
                        <span className="points-bold-val">{Math.round(p.rating)}</span>
                      </div>

                      {/* Win % */}
                      <div className="col-winrate">
                        <span className="winrate-val">
                          {p.win_rate != null ? `${p.win_rate}%` : '0%'}
                        </span>
                      </div>

                      {/* Form (5 Dots: Blue for wins, grey for loss/empty) */}
                      <div className="col-form">
                        <div className="form-dots-group">
                          {formDots.map((type, idx) => (
                            <span 
                              key={idx} 
                              className={`form-dot dot-${type}`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* FC Clubs Standings */
            <div>
              <div className="table-header-row">
                <div className="col-rank">#</div>
                <div style={{ flex: 1.4, textAlign: 'left' }}>CLUB TEAM</div>
                <div style={{ width: '80px', textAlign: 'center' }}>LEAGUE</div>
                <div className="col-points">POINTS</div>
                <div className="col-winrate">WIN %</div>
                <div style={{ width: '70px', textAlign: 'center' }}>RECORD</div>
              </div>

              {leaderboardTeams.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No club matches recorded yet.</p>
                </div>
              ) : (
                leaderboardTeams.map((t) => (
                  <div key={t.team_id} className={`leaderboard-data-row ${t.rank === 1 ? 'row-champion' : ''}`}>
                    <div className="col-rank">
                      {t.rank === 1 ? (
                        <div className="rank-first-container">
                          <Crown size={11} color="#f59e0b" fill="#f59e0b" className="floating-crown" />
                          <span className="rank-circle rank-gold">1</span>
                        </div>
                      ) : t.rank === 2 ? (
                        <span className="rank-circle rank-silver">2</span>
                      ) : t.rank === 3 ? (
                        <span className="rank-circle rank-bronze">3</span>
                      ) : (
                        <span className="rank-plain-number">{t.rank}</span>
                      )}
                    </div>

                    <div style={{ flex: 1.4, minWidth: 0, textAlign: 'left' }}>
                      <span className="player-full-name">{t.name}</span>
                      <span className="player-code-sub">{t.ovr} OVR • {t.matches} Matches</span>
                    </div>

                    <div style={{ width: '80px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>{t.league}</span>
                    </div>

                    <div className="col-points">
                      <span className="points-bold-val">{t.points}</span>
                    </div>

                    <div className="col-winrate">
                      <span className="winrate-val">{t.win_rate}%</span>
                    </div>

                    <div style={{ width: '70px', textAlign: 'center', fontSize: '0.74rem', fontWeight: 700, color: '#2563eb' }}>
                      {t.wins}W - {t.losses}L
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>

      <style jsx>{`
        .leaderboard-page-container {
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
          padding-bottom: 24px;
        }

        /* 1. Sub Tabs Header (Blue active indicator) */
        .subnav-tabs-bar {
          display: flex;
          align-items: center;
          gap: 28px;
          border-bottom: 1.5px solid #eef2f6;
          margin-bottom: 16px;
          padding-left: 6px;
        }
        .subnav-tab-btn {
          background: none;
          border: none;
          padding: 8px 4px 12px;
          font-size: 0.95rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          position: relative;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .subnav-tab-btn:hover {
          color: #0f172a;
        }
        .subnav-tab-btn.active {
          color: #0f172a;
          font-weight: 800;
        }
        .subnav-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1.5px;
          left: 0;
          right: 0;
          height: 2.5px;
          background: #2563eb;
          border-radius: 2px;
        }

        /* 2. League Status Card (Blue & White theme) */
        .league-status-card {
          background: #ffffff;
          border: 1px solid #eef2f6;
          border-radius: 18px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.03);
          position: relative;
        }
        .league-trophy-badge {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid #dbeafe;
        }
        .mode-dropdown-trigger {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          padding: 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
          cursor: pointer;
        }
        .league-season-sub {
          font-size: 0.76rem;
          color: #64748b;
          font-weight: 500;
          margin: 2px 0 0 0;
        }
        .mode-dropdown-popover {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: 190px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
          z-index: 50;
          padding: 6px;
        }
        .mode-option-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: none;
          border: none;
          border-radius: 8px;
          font-size: 0.88rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .mode-option-btn:hover {
          background: #f8fafc;
        }
        .mode-option-btn.selected {
          background: #eff6ff;
          color: #2563eb;
          font-weight: 700;
        }
        .total-players-chip {
          background: #f8fafc;
          border: 1px solid #eef2f6;
          border-radius: 12px;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .total-players-label {
          display: block;
          font-size: 0.62rem;
          color: #64748b;
          font-weight: 600;
          line-height: 1;
        }
        .total-players-count {
          display: block;
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
          margin-top: 2px;
        }

        /* 3. Main Leaderboard Table Card */
        .leaderboard-table-card {
          background: #ffffff;
          border: 1px solid #eef2f6;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.03);
        }
        .table-header-row {
          display: flex;
          align-items: center;
          padding: 14px 12px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.7rem;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.03em;
        }
        .leaderboard-data-row {
          display: flex;
          align-items: center;
          padding: 12px 12px;
          border-bottom: 1px solid #f8fafc;
          transition: background 0.15s ease;
        }
        .leaderboard-data-row:last-child {
          border-bottom: none;
        }
        .leaderboard-data-row:hover {
          background: #fcfdfe;
        }
        .row-champion {
          background: #eff6ff !important;
        }

        /* Columns: Optimized so player name gets maximum breathing room */
        .col-rank {
          width: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .col-player {
          flex: 1.6;
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding-right: 4px;
        }
        .col-team {
          width: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .col-points {
          width: 52px;
          text-align: center;
          flex-shrink: 0;
        }
        .col-winrate {
          width: 46px;
          text-align: center;
          flex-shrink: 0;
        }
        .col-form {
          width: 52px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-shrink: 0;
        }

        /* Rank Badges */
        .rank-first-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .floating-crown {
          margin-bottom: -3px;
        }
        .rank-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.76rem;
          font-weight: 900;
          color: #ffffff;
        }
        .rank-gold {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 2px 6px rgba(217, 119, 6, 0.35);
        }
        .rank-silver {
          background: #94a3b8;
        }
        .rank-bronze {
          background: #b45309;
        }
        .rank-plain-number {
          font-size: 0.88rem;
          font-weight: 700;
          color: #475569;
        }

        /* Player Details */
        .player-avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .online-indicator-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #2563eb;
          border: 1.5px solid #ffffff;
          position: absolute;
          bottom: 0;
          right: 0;
        }
        .player-meta-wrap {
          min-width: 0;
          overflow: hidden;
        }
        .player-full-name {
          font-size: 0.88rem;
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }
        .player-code-sub {
          font-size: 0.68rem;
          color: #94a3b8;
          font-family: monospace;
          display: block;
          margin-top: 1px;
        }

        /* Status / Streak Pill */
        .status-pill {
          padding: 2.5px 6px;
          border-radius: 9999px;
          font-size: 0.68rem;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          line-height: 1;
        }

        /* Values */
        .points-bold-val {
          font-size: 0.94rem;
          font-weight: 900;
          color: #0f172a;
          font-family: inherit;
        }
        .winrate-val {
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 600;
        }

        /* 5-Match Form Dots (Blue for wins, grey for loss/empty) */
        .form-dots-group {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .form-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }
        .dot-win {
          background: #2563eb;
        }
        .dot-loss {
          background: #cbd5e1;
        }
        .dot-empty {
          background: #e2e8f0;
        }

        @media (max-width: 480px) {
          .table-header-row,
          .leaderboard-data-row {
            padding: 10px 6px;
          }
          .col-rank {
            width: 24px;
          }
          .col-player {
            flex: 1.8;
            gap: 7px;
          }
          .col-team {
            width: 44px;
          }
          .col-points {
            width: 44px;
          }
          .col-winrate {
            width: 36px;
          }
          .col-form {
            width: 42px;
          }
          .player-full-name {
            font-size: 0.84rem;
          }
          .player-code-sub {
            font-size: 0.64rem;
          }
          .points-bold-val {
            font-size: 0.86rem;
          }
          .winrate-val {
            font-size: 0.7rem;
          }
          .status-pill {
            padding: 2px 4px;
            font-size: 0.62rem;
          }
          .form-dots-group {
            gap: 2px;
          }
          .form-dot {
            width: 4.5px;
            height: 4.5px;
          }
        }
      `}</style>
    </Layout>
  );
}
