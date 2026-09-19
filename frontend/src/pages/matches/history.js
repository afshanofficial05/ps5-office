import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { History, Filter, Swords, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function MatchHistoryPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [filterMode, setFilterMode] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadMatches() {
      try {
        const params = {};
        if (filterMode) params.game_mode = filterMode;
        if (filterStatus) params.status = filterStatus;
        if (user?.role === 'USER') params.player_id = user.id;

        const data = await api.getMatches(params);
        if (isMounted) setMatches(data);
      } catch (err) {
        console.error('Failed to load match history', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadMatches();
    return () => { isMounted = false; };
  }, [filterMode, filterStatus, user]);

  return (
    <Layout title="Match History" requireAuth={true}>
      <div style={{ maxWidth: '1050px', margin: '0 auto' }}>

        {/* Filter Controls Bar */}
        <div className="glass-card" style={{
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          background: '#ffffff',
          borderRadius: '14px'
        }}>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>Filter History</span>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
            <select
              className="form-select"
              style={{ minWidth: '110px', flex: '1 1 110px', maxWidth: '160px', padding: '6px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1' }}
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
            >
              <option value="">All Modes</option>
              <option value="1V1">1v1 Solo</option>
              <option value="2V2">2v2 Tag Team</option>
            </select>

            <select
              className="form-select"
              style={{ minWidth: '120px', flex: '1 1 120px', maxWidth: '160px', padding: '6px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
            </select>
          </div>
        </div>

        {/* Matches Feed */}
        <div className="glass-card" style={{ padding: '20px', background: '#ffffff', borderRadius: '18px' }}>
          {matches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
              <History size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}>No match records found</p>
            </div>
          ) : (
            <div>
              {/* Mobile-Only Compact History View (Zero Horizontal Scroll) */}
              <div className="mobile-only-view">
                <div className="mobile-history-list">
                  {matches.map((m) => {
                    const sideA = m.players?.filter(p => p.side === 'SIDE_A') || [];
                    const sideB = m.players?.filter(p => p.side === 'SIDE_B') || [];
                    
                    const isSideA = sideA.some(p => p.player_id === user?.id);
                    const userRecord = m.players?.find(p => p.player_id === user?.id);
                    
                    const teamA = sideA[0]?.team_name || 'Team A';
                    const teamB = sideB[0]?.team_name || 'Team B';
                    const nameA = sideA.map(p => p.player_name || p.player_code).join(' & ');
                    const nameB = sideB.map(p => p.player_name || p.player_code).join(' & ');

                    let outcomeBadge = <span className="badge badge-primary">{m.status}</span>;
                    if ((m.status === 'VERIFIED' || m.status === 'APPROVED') && m.result) {
                      if (m.result.winner_side === 'DRAW') {
                        outcomeBadge = <span className="badge badge-gold">Draw</span>;
                      } else {
                        const userWon = (isSideA && m.result.winner_side === 'SIDE_A') || (!isSideA && m.result.winner_side === 'SIDE_B');
                        outcomeBadge = userWon 
                          ? <span className="badge badge-emerald">Victory</span> 
                          : <span className="badge badge-rose">Defeat</span>;
                      }
                    }

                    const ratingChange = userRecord?.rating_change;

                    return (
                      <div key={m.id} className="mobile-history-item">
                        {/* Header Row: Code, Mode, Outcome, Date */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb', fontSize: '0.82rem' }}>
                              {m.match_code}
                            </span>
                            <span className="badge badge-primary" style={{ padding: '1px 5px', fontSize: '0.62rem' }}>
                              {m.game_mode}
                            </span>
                            {outcomeBadge}
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#64748b', flexShrink: 0 }}>
                            {new Date(m.created_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                          </span>
                        </div>

                        {/* Main Row: Fixture & Score */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {nameA} <span style={{ color: '#94a3b8', fontWeight: 400 }}>vs</span> {nameB}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {teamA} vs {teamB}
                            </div>
                          </div>

                          {/* Score & Elo change */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, textAlign: 'right' }}>
                            <div>
                              <div style={{ fontSize: '1.05rem', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a', lineHeight: 1 }}>
                                {m.result ? `${m.result.score_a} - ${m.result.score_b}` : '-'}
                              </div>
                              {ratingChange !== undefined && ratingChange !== null && (
                                <div style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  color: ratingChange > 0 ? '#059669' : ratingChange < 0 ? '#e11d48' : '#64748b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: '1px',
                                  marginTop: '2px'
                                }}>
                                  {ratingChange > 0 ? `+${ratingChange}` : ratingChange}
                                </div>
                              )}
                            </div>

                            <Link href={`/matches/${m.id}`} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.72rem', minHeight: '28px' }}>
                              View
                            </Link>
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
                        <th>Match Code</th>
                        <th>Mode</th>
                        <th>Fixture & Clubs</th>
                        <th>Score</th>
                        <th>Outcome</th>
                        <th>Elo Change</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map((m) => {
                        const sideA = m.players?.filter(p => p.side === 'SIDE_A') || [];
                        const sideB = m.players?.filter(p => p.side === 'SIDE_B') || [];
                        
                        const isSideA = sideA.some(p => p.player_id === user?.id);
                        const userRecord = m.players?.find(p => p.player_id === user?.id);
                        
                        const teamA = sideA[0]?.team_name || 'Team A';
                        const teamB = sideB[0]?.team_name || 'Team B';
                        const nameA = sideA.map(p => p.player_name || p.player_code).join(' & ');
                        const nameB = sideB.map(p => p.player_name || p.player_code).join(' & ');

                        let outcomeBadge = <span className="badge badge-primary">{m.status}</span>;
                        if ((m.status === 'VERIFIED' || m.status === 'APPROVED') && m.result) {
                          if (m.result.winner_side === 'DRAW') {
                            outcomeBadge = <span className="badge badge-gold">Draw</span>;
                          } else {
                            const userWon = (isSideA && m.result.winner_side === 'SIDE_A') || (!isSideA && m.result.winner_side === 'SIDE_B');
                            outcomeBadge = userWon 
                              ? <span className="badge badge-emerald">Victory</span> 
                              : <span className="badge badge-rose">Defeat</span>;
                          }
                        }

                        const ratingChange = userRecord?.rating_change;

                        return (
                          <tr key={m.id}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                              {m.match_code}
                            </td>
                            <td>
                              <span className="badge badge-primary">{m.game_mode}</span>
                            </td>
                            <td>
                              <div>
                                <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                                  {nameA} <span style={{ color: '#94a3b8' }}>vs</span> {nameB}
                                </p>
                                <p style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                  {teamA} vs {teamB}
                                </p>
                              </div>
                            </td>
                            <td style={{ fontSize: '1.05rem', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>
                              {m.result ? (
                                <div>
                                  <span>{m.result.score_a} - {m.result.score_b}</span>
                                  {m.result.is_penalty_shootout && (
                                    <span style={{ fontSize: '0.7rem', color: '#7c3aed', display: 'block', fontWeight: 700 }}>
                                      ({m.result.penalty_score_a}-{m.result.penalty_score_b} pens)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>-</span>
                              )}
                            </td>
                            <td>{outcomeBadge}</td>
                            <td>
                              {ratingChange !== undefined && ratingChange !== null ? (
                                <span style={{
                                  fontWeight: 800,
                                  fontSize: '0.88rem',
                                  color: ratingChange > 0 ? '#059669' : ratingChange < 0 ? '#e11d48' : '#64748b',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}>
                                  {ratingChange > 0 ? <ArrowUpRight size={14} /> : ratingChange < 0 ? <ArrowDownRight size={14} /> : null}
                                  {ratingChange > 0 ? `+${ratingChange}` : ratingChange}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>-</span>
                              )}
                            </td>
                            <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              {new Date(m.created_at).toLocaleDateString()}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <Link href={`/matches/${m.id}`} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                                View
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
