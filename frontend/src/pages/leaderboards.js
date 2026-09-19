import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import RatingBadge from '../components/RatingBadge';
import Avatar from '../components/Avatar';
import { api } from '../services/api';
import { Trophy, Swords, Users, Shield, Flame } from 'lucide-react';

export default function LeaderboardsPage() {
  const [tab, setTab] = useState('1V1'); // '1V1', '2V2', 'TEAMS'
  const [leaderboard1v1, setLeaderboard1v1] = useState([]);
  const [leaderboard2v2, setLeaderboard2v2] = useState([]);
  const [leaderboardTeams, setLeaderboardTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadLeaderboards() {
      try {
        const [l1, l2, lt] = await Promise.all([
          api.get1v1Leaderboard(),
          api.get2v2Leaderboard(),
          api.getTeamLeaderboard()
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

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          background: '#fef3c7',
          color: '#b45309',
          fontWeight: 900,
          fontSize: '0.85rem',
          border: '1px solid #fde68a'
        }}>
          1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          background: '#f1f5f9',
          color: '#475569',
          fontWeight: 900,
          fontSize: '0.85rem',
          border: '1px solid #cbd5e1'
        }}>
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          background: '#fff7ed',
          color: '#c2410c',
          fontWeight: 900,
          fontSize: '0.85rem',
          border: '1px solid #ffedd5'
        }}>
          3
        </span>
      );
    }
    return (
      <span style={{ fontWeight: 800, color: '#64748b', fontSize: '0.9rem', fontFamily: 'monospace' }}>
        #{rank}
      </span>
    );
  };

  return (
    <Layout title="Leaderboards" requireAuth={true}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>

        {/* Tab Selector */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '20px'
        }}>
          <button
            onClick={() => setTab('1V1')}
            className={tab === '1V1' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            <Swords size={15} />
            <span>1v1 Solo ({leaderboard1v1.length})</span>
          </button>

          <button
            onClick={() => setTab('2V2')}
            className={tab === '2V2' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            <Users size={15} />
            <span>2v2 Tag Team ({leaderboard2v2.length})</span>
          </button>

          <button
            onClick={() => setTab('TEAMS')}
            className={tab === 'TEAMS' ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            <Shield size={15} />
            <span>Clubs ({leaderboardTeams.length})</span>
          </button>
        </div>

        {/* 1v1 Leaderboard */}
        {tab === '1V1' && (
          <div className="glass-card" style={{ padding: '20px', background: '#ffffff', borderRadius: '18px' }}>
            {/* Mobile Compact List (No Horizontal Scroll) */}
            <div className="mobile-only-view">
              <div className="mobile-leaderboard-list">
                {leaderboard1v1.map((p) => {
                  const rankClass = p.rank === 1 ? 'rank-1' : p.rank === 2 ? 'rank-2' : p.rank === 3 ? 'rank-3' : '';
                  return (
                    <div key={p.player_id} className={`mobile-leaderboard-row ${rankClass}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <div style={{ flexShrink: 0 }}>{getRankBadge(p.rank)}</div>
                        <Avatar src={p.profile_photo} name={p.name} size="sm" />
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.name}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace' }}>{p.player_code}</span>
                            <span>•</span>
                            <span style={{ color: '#059669', fontWeight: 600 }}>{p.wins}W</span>
                            <span>-</span>
                            <span style={{ color: '#e11d48', fontWeight: 600 }}>{p.losses}L</span>
                            {p.win_streak > 0 && <span style={{ color: '#d97706', fontWeight: 700 }}>• 🔥{p.win_streak}</span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, textAlign: 'right' }}>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', lineHeight: 1 }}>
                            {Math.round(p.rating)}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: p.win_rate >= 50 ? '#059669' : '#64748b', fontWeight: 700, marginTop: '2px' }}>
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

            {/* Desktop Table (Preserved 100% for desktop/laptop) */}
            <div className="desktop-only-table">
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Rank</th>
                      <th>Player</th>
                      <th>Elo Rating</th>
                      <th>Tier</th>
                      <th>Matches</th>
                      <th>Record</th>
                      <th>Win Rate</th>
                      <th>Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard1v1.map((p) => (
                      <tr key={p.player_id}>
                        <td>{getRankBadge(p.rank)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Avatar src={p.profile_photo} name={p.name} size="xs" />
                            <div>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</span>
                              <span style={{ fontSize: '0.72rem', color: '#2563eb', fontFamily: 'monospace', marginLeft: '6px' }}>({p.player_code})</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                          {Math.round(p.rating)}
                        </td>
                        <td>
                          <RatingBadge rating={p.rating} size="sm" />
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.matches_played}</td>
                        <td style={{ fontSize: '0.82rem' }}>
                          <span style={{ color: '#059669', fontWeight: 700 }}>{p.wins}W</span> <span style={{ color: '#e11d48' }}>{p.losses}L</span> {p.draws > 0 && <span style={{ color: '#64748b' }}>{p.draws}D</span>}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: p.win_rate >= 50 ? '#059669' : '#475569' }}>
                            {p.win_rate}%
                          </span>
                        </td>
                        <td>
                          {p.win_streak > 0 ? (
                            <span style={{ color: '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.82rem' }}>
                              <Flame size={13} /> {p.win_streak}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2v2 Leaderboard */}
        {tab === '2V2' && (
          <div className="glass-card" style={{ padding: '20px', background: '#ffffff', borderRadius: '18px' }}>
            {/* Mobile Compact List (No Horizontal Scroll) */}
            <div className="mobile-only-view">
              <div className="mobile-leaderboard-list">
                {leaderboard2v2.map((p) => {
                  const rankClass = p.rank === 1 ? 'rank-1' : p.rank === 2 ? 'rank-2' : p.rank === 3 ? 'rank-3' : '';
                  return (
                    <div key={p.player_id} className={`mobile-leaderboard-row ${rankClass}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <div style={{ flexShrink: 0 }}>{getRankBadge(p.rank)}</div>
                        <Avatar src={p.profile_photo} name={p.name} size="sm" />
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.name}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace' }}>{p.player_code}</span>
                            <span>•</span>
                            <span style={{ color: '#059669', fontWeight: 600 }}>{p.wins}W</span>
                            <span>-</span>
                            <span style={{ color: '#e11d48', fontWeight: 600 }}>{p.losses}L</span>
                            {p.win_streak > 0 && <span style={{ color: '#d97706', fontWeight: 700 }}>• 🔥{p.win_streak}</span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, textAlign: 'right' }}>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', lineHeight: 1 }}>
                            {Math.round(p.rating)}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: p.win_rate >= 50 ? '#059669' : '#64748b', fontWeight: 700, marginTop: '2px' }}>
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

            {/* Desktop Table (Preserved 100% for desktop/laptop) */}
            <div className="desktop-only-table">
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Rank</th>
                      <th>Player</th>
                      <th>2v2 Elo</th>
                      <th>Tier</th>
                      <th>Matches</th>
                      <th>Record</th>
                      <th>Win Rate</th>
                      <th>Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard2v2.map((p) => (
                      <tr key={p.player_id}>
                        <td>{getRankBadge(p.rank)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Avatar src={p.profile_photo} name={p.name} size="xs" />
                            <div>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</span>
                              <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontFamily: 'monospace', marginLeft: '6px' }}>({p.player_code})</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                          {Math.round(p.rating)}
                        </td>
                        <td>
                          <RatingBadge rating={p.rating} size="sm" />
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.matches_played}</td>
                        <td style={{ fontSize: '0.82rem' }}>
                          <span style={{ color: '#059669', fontWeight: 700 }}>{p.wins}W</span> <span style={{ color: '#e11d48' }}>{p.losses}L</span> {p.draws > 0 && <span style={{ color: '#64748b' }}>{p.draws}D</span>}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: p.win_rate >= 50 ? '#059669' : '#475569' }}>
                            {p.win_rate}%
                          </span>
                        </td>
                        <td>
                          {p.win_streak > 0 ? (
                            <span style={{ color: '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.82rem' }}>
                              <Flame size={13} /> {p.win_streak}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Club Leaderboard */}
        {tab === 'TEAMS' && (
          <div className="glass-card" style={{ padding: '20px', background: '#ffffff', borderRadius: '18px' }}>
            {/* Mobile Compact List (No Horizontal Scroll) */}
            <div className="mobile-only-view">
              <div className="mobile-leaderboard-list">
                {leaderboardTeams.map((t) => {
                  const rankClass = t.rank === 1 ? 'rank-1' : t.rank === 2 ? 'rank-2' : t.rank === 3 ? 'rank-3' : '';
                  return (
                    <div key={t.team_id} className={`mobile-leaderboard-row ${rankClass}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <div style={{ flexShrink: 0 }}>{getRankBadge(t.rank)}</div>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.name}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span>{t.league}</span>
                            <span>•</span>
                            <span className="badge badge-primary" style={{ padding: '1px 5px', fontSize: '0.62rem' }}>{t.ovr} OVR</span>
                            <span>•</span>
                            <span style={{ color: '#059669', fontWeight: 600 }}>{t.wins}W</span>
                            <span>-</span>
                            <span style={{ color: '#e11d48', fontWeight: 600 }}>{t.losses}L</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, textAlign: 'right' }}>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#2563eb', fontFamily: 'monospace', lineHeight: 1 }}>
                            {t.points} pts
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                            {t.matches} matches ({t.win_rate}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop Table (Preserved 100% for desktop/laptop) */}
            <div className="desktop-only-table">
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Rank</th>
                      <th>Club Team</th>
                      <th>League</th>
                      <th>OVR</th>
                      <th>Matches</th>
                      <th>Record</th>
                      <th>Points</th>
                      <th>Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardTeams.map((t) => (
                      <tr key={t.team_id}>
                        <td>{getRankBadge(t.rank)}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{t.name}</span>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{t.league}</td>
                        <td>
                          <span style={{ fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>{t.ovr}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{t.matches}</td>
                        <td style={{ fontSize: '0.82rem' }}>
                          <span style={{ color: '#059669', fontWeight: 700 }}>{t.wins}W</span> <span style={{ color: '#e11d48' }}>{t.losses}L</span> {t.draws > 0 && <span style={{ color: '#64748b' }}>{t.draws}D</span>}
                        </td>
                        <td style={{ fontSize: '1.15rem', fontWeight: 900, color: '#2563eb', fontFamily: 'monospace' }}>
                          {t.points}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: t.win_rate >= 50 ? '#059669' : '#64748b' }}>
                            {t.win_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
