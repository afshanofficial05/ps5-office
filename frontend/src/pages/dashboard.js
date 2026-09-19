import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import RatingBadge from '../components/RatingBadge';
import TopLeaderboardWidget from '../components/TopLeaderboardWidget';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Trophy, Swords, Flame, Award, Plus, LogIn, TrendingUp, CheckCircle, Clock, ChevronRight, Gamepad2, ArrowRight, CheckSquare
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [leaderboard1v1, setLeaderboard1v1] = useState([]);
  const [leaderboard2v2, setLeaderboard2v2] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      router.replace('/super-admin');
      return;
    }
    if (user?.role === 'ADMIN') {
      router.replace('/admin');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      if (!user) return;
      try {
        const [profileData, matchesData, l1v1, l2v2] = await Promise.all([
          api.getUserProfile(user.id),
          api.getMatches({ player_id: user.id, limit: 5 }),
          api.get1v1Leaderboard().catch(() => []),
          api.get2v2Leaderboard().catch(() => [])
        ]);

        if (isMounted) {
          setProfile(profileData);
          setRecentMatches(matchesData);
          setLeaderboard1v1(l1v1 || []);
          setLeaderboard2v2(l2v2 || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDashboardData();
    return () => { isMounted = false; };
  }, [user]);

  const rating1v1 = profile?.rating_1v1?.rating ?? 1500;
  const rating2v2 = profile?.rating_2v2?.rating ?? 1500;
  const totalMatches = profile?.total_matches ?? 0;
  const totalWins = profile?.total_wins ?? 0;
  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
  const winStreak = Math.max(profile?.rating_1v1?.win_streak ?? 0, profile?.rating_2v2?.win_streak ?? 0);

  return (
    <Layout requireAuth={true}>
      {/* 1. PRIMARY FOCUS: Top 5 Leaderboard First */}
      <TopLeaderboardWidget
        leaderboard1v1={leaderboard1v1}
        leaderboard2v2={leaderboard2v2}
        currentUserId={user?.id}
      />

      {/* 2. Hero Action & Key Metrics Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)',
        border: '1px solid #bfdbfe',
        borderRadius: '18px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 2px 12px rgba(37, 99, 235, 0.06)'
      }}>
        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 280px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: '#eff6ff',
            border: '1.5px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb',
            flexShrink: 0
          }}>
            <Gamepad2 size={22} />
          </div>

          <div style={{ flex: '1 1 100%' }}>
            <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>
              FC Match Arena
            </h3>
            <div className="dashboard-actions-row" style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              <Link href="/matches/create" className="btn btn-primary action-pill-btn" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                <Plus size={15} />
                <span>Create Match</span>
              </Link>
              <Link href="/matches/join" className="btn btn-secondary action-pill-btn" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                <LogIn size={15} />
                <span>Join with Code</span>
              </Link>
              <Link href="/matches/submit" className="btn btn-secondary action-pill-btn dashboard-submit-hero-btn" style={{ padding: '8px 14px', fontSize: '0.82rem', background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe' }}>
                <CheckSquare size={15} />
                <span>Submit Result</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Clean Metric Chips (Responsive 4-column Grid on Mobile) */}
        <div className="mobile-metrics-grid" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="mobile-metric-cell" style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '8px 12px',
            minWidth: '80px',
            textAlign: 'center'
          }}>
            <div className="mobile-metric-value" style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
              {totalMatches}
            </div>
            <div className="mobile-metric-label" style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>
              Matches
            </div>
          </div>

          <div className="mobile-metric-cell" style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '8px 12px',
            minWidth: '80px',
            textAlign: 'center'
          }}>
            <div className="mobile-metric-value" style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669', fontFamily: 'monospace' }}>
              {totalWins}
            </div>
            <div className="mobile-metric-label" style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>
              Wins
            </div>
          </div>

          <div className="mobile-metric-cell" style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '8px 12px',
            minWidth: '80px',
            textAlign: 'center'
          }}>
            <div className="mobile-metric-value" style={{ fontSize: '1.2rem', fontWeight: 900, color: '#2563eb', fontFamily: 'monospace' }}>
              {winRate}%
            </div>
            <div className="mobile-metric-label" style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>
              Win Rate
            </div>
          </div>

          <div className="mobile-metric-cell" style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '8px 12px',
            minWidth: '80px',
            textAlign: 'center'
          }}>
            <div className="mobile-metric-value" style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ea580c', fontFamily: 'monospace' }}>
              {winStreak} 🔥
            </div>
            <div className="mobile-metric-label" style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>
              Streak
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recent Matches Feed */}
      <div className="glass-card" style={{ padding: '20px 24px', background: '#ffffff', borderRadius: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Recent Fixtures</h3>
          <Link href="/matches/history" className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
            <span>All Matches</span>
            <ChevronRight size={13} />
          </Link>
        </div>

        {recentMatches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
            <Swords size={32} style={{ margin: '0 auto 8px', opacity: 0.3, color: '#2563eb' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>No matches recorded yet</p>
          </div>
        ) : (
          <div>
            {/* Mobile-Only Compact Fixtures List (Zero Horizontal Scroll) */}
            <div className="mobile-only-view">
              <div className="mobile-history-list">
                {recentMatches.map((m) => {
                  const sideA = m.players?.filter(p => p.side === 'SIDE_A') || [];
                  const sideB = m.players?.filter(p => p.side === 'SIDE_B') || [];
                  const isSideA = sideA.some(p => p.player_id === user?.id);
                  const myTeam = isSideA ? sideA[0]?.team_name : sideB[0]?.team_name;
                  const opponentNames = (isSideA ? sideB : sideA).map(p => p.player_name || p.player_code).join(', ') || 'Waiting...';

                  let statusBadge = <span className="badge badge-primary">{m.status}</span>;
                  if (m.status === 'VERIFIED' || m.status === 'APPROVED') {
                    const won = (isSideA && m.result?.winner_side === 'SIDE_A') || (!isSideA && m.result?.winner_side === 'SIDE_B');
                    const draw = m.result?.winner_side === 'DRAW';
                    if (won) statusBadge = <span className="badge badge-emerald">VICTORY</span>;
                    else if (draw) statusBadge = <span className="badge badge-gold">DRAW</span>;
                    else statusBadge = <span className="badge badge-rose">DEFEAT</span>;
                  }

                  return (
                    <div key={m.id} className="mobile-history-item">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb', fontSize: '0.82rem' }}>
                            {m.match_code}
                          </span>
                          <span className="badge badge-primary" style={{ padding: '1px 5px', fontSize: '0.62rem' }}>
                            {m.game_mode}
                          </span>
                          {statusBadge}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            vs {opponentNames}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {myTeam || 'No Team Selected'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: '1.05rem', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>
                            {m.result ? `${m.result.score_a} - ${m.result.score_b}` : '-'}
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
                      <th>Code</th>
                      <th>Mode</th>
                      <th>Opponent</th>
                      <th>Team</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMatches.map((m) => {
                      const sideA = m.players?.filter(p => p.side === 'SIDE_A') || [];
                      const sideB = m.players?.filter(p => p.side === 'SIDE_B') || [];
                      const isSideA = sideA.some(p => p.player_id === user?.id);
                      const myTeam = isSideA ? sideA[0]?.team_name : sideB[0]?.team_name;
                      const opponentNames = (isSideA ? sideB : sideA).map(p => p.player_name || p.player_code).join(', ') || 'Waiting...';

                      let statusBadge = <span className="badge badge-primary">{m.status}</span>;
                      if (m.status === 'VERIFIED' || m.status === 'APPROVED') {
                        const won = (isSideA && m.result?.winner_side === 'SIDE_A') || (!isSideA && m.result?.winner_side === 'SIDE_B');
                        const draw = m.result?.winner_side === 'DRAW';
                        if (won) statusBadge = <span className="badge badge-emerald">VICTORY</span>;
                        else if (draw) statusBadge = <span className="badge badge-gold">DRAW</span>;
                        else statusBadge = <span className="badge badge-rose">DEFEAT</span>;
                      }

                      return (
                        <tr key={m.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                            {m.match_code}
                          </td>
                          <td>
                            <span className="badge badge-primary">{m.game_mode}</span>
                          </td>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>
                            {opponentNames}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#475569' }}>
                            {myTeam || '-'}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                            {m.result ? `${m.result.score_a} - ${m.result.score_b}` : '-'}
                          </td>
                          <td>{statusBadge}</td>
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

      <style jsx>{`
        .action-pill-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-weight: 700;
          border-radius: 10px;
        }

        @media (max-width: 640px) {
          .dashboard-actions-row {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
            width: 100% !important;
            margin-top: 10px !important;
          }
          .action-pill-btn {
            min-height: 42px !important;
            width: 100% !important;
            font-size: 0.8rem !important;
          }
          .dashboard-submit-hero-btn {
            grid-column: span 2 !important;
            min-height: 44px !important;
            font-weight: 800 !important;
          }
        }
      `}</style>
    </Layout>
  );
}
