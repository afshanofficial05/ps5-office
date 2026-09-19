import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Avatar from '../../components/Avatar';
import RatingBadge from '../../components/RatingBadge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  Calendar, Plus, Edit2, Trash2, Trophy, BarChart2, Swords, 
  CheckCircle2, Clock, AlertTriangle, X, Save, RefreshCw, ShieldAlert
} from 'lucide-react';

export default function AdminSeasonsPage() {
  const { user, hasPermission } = useAuth();
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('LIST'); // 'LIST' | 'RESULTS' | 'LEADERBOARD'
  const [selectedSeason, setSelectedSeason] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSeason, setEditingSeason] = useState(null);
  const [seasonName, setSeasonName] = useState('');
  const [seasonStartDate, setSeasonStartDate] = useState('');
  const [seasonEndDate, setSeasonEndDate] = useState('');
  const [seasonStatus, setSeasonStatus] = useState('ACTIVE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Stats calculation state
  const [statsResult, setStatsResult] = useState(null);
  const [calculatingId, setCalculatingId] = useState(null);

  // Results & Leaderboard data for selected season
  const [seasonResults, setSeasonResults] = useState([]);
  const [seasonLeaderboard, setSeasonLeaderboard] = useState([]);
  const [leaderboardMode, setLeaderboardMode] = useState('1V1');
  const [loadingSubData, setLoadingSubData] = useState(false);

  const canView = hasPermission('VIEW_SEASON');
  const canCreate = hasPermission('CREATE_SEASON');
  const canEdit = hasPermission('EDIT_SEASON');
  const canDelete = hasPermission('DELETE_SEASON');
  const canCalcStats = hasPermission('UPDATE_SEASON_STATS');
  const canManageResults = hasPermission('MANAGE_SEASON_RESULTS');
  const canViewLeaderboard = hasPermission('VIEW_SEASON_LEADERBOARD');

  const fetchSeasons = async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getSeasons();
      setSeasons(data);
      if (data.length > 0 && !selectedSeason) {
        setSelectedSeason(data[0]);
      }
    } catch (err) {
      console.error('Failed to load seasons', err);
      setError('Failed to load seasons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeasons();
  }, [user]);

  // Load results or leaderboard when tab or selected season changes
  useEffect(() => {
    if (!selectedSeason) return;

    if (activeTab === 'RESULTS' && canManageResults) {
      setLoadingSubData(true);
      api.getSeasonResults(selectedSeason.id)
        .then(data => setSeasonResults(data))
        .catch(err => console.error(err))
        .finally(() => setLoadingSubData(false));
    } else if (activeTab === 'LEADERBOARD' && canViewLeaderboard) {
      setLoadingSubData(true);
      api.getSeasonLeaderboard(selectedSeason.id, leaderboardMode)
        .then(data => setSeasonLeaderboard(data.standings || []))
        .catch(err => console.error(err))
        .finally(() => setLoadingSubData(false));
    }
  }, [activeTab, selectedSeason, leaderboardMode]);

  const openCreate = () => {
    setSeasonName('');
    setSeasonStartDate(new Date().toISOString().split('T')[0]);
    setSeasonEndDate('');
    setSeasonStatus('ACTIVE');
    setError('');
    setShowCreateModal(true);
  };

  const openEdit = (season) => {
    setEditingSeason(season);
    setSeasonName(season.name);
    setSeasonStartDate(season.start_date ? season.start_date.split('T')[0] : '');
    setSeasonEndDate(season.end_date ? season.end_date.split('T')[0] : '');
    setSeasonStatus(season.status);
    setError('');
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.createSeason({
        name: seasonName,
        start_date: seasonStartDate ? new Date(seasonStartDate).toISOString() : null,
        end_date: seasonEndDate ? new Date(seasonEndDate).toISOString() : null,
        status: seasonStatus
      });
      setShowCreateModal(false);
      setSuccessMsg(`Season "${seasonName}" created successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchSeasons();
    } catch (err) {
      setError(err.message || 'Failed to create season');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.updateSeason(editingSeason.id, {
        name: seasonName,
        start_date: seasonStartDate ? new Date(seasonStartDate).toISOString() : null,
        end_date: seasonEndDate ? new Date(seasonEndDate).toISOString() : null,
        status: seasonStatus
      });
      setShowEditModal(false);
      setSuccessMsg(`Season updated successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchSeasons();
    } catch (err) {
      setError(err.message || 'Failed to update season');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSeason = async (season) => {
    if (!confirm(`Are you sure you want to delete season "${season.name}"? Matches in this season will remain unassigned.`)) {
      return;
    }
    try {
      await api.deleteSeason(season.id);
      setSuccessMsg(`Season "${season.name}" deleted.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      if (selectedSeason?.id === season.id) {
        setSelectedSeason(null);
      }
      await fetchSeasons();
    } catch (err) {
      alert(err.message || 'Failed to delete season');
    }
  };

  const handleCalculateStats = async (season) => {
    setCalculatingId(season.id);
    try {
      const res = await api.calculateSeasonStats(season.id);
      setStatsResult(res);
    } catch (err) {
      alert(err.message || 'Failed to calculate season stats');
    } finally {
      setCalculatingId(null);
    }
  };

  if (!canView) {
    return (
      <Layout title="Season Management" requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
        <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '40px' }} className="glass-card">
          <ShieldAlert size={48} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Permission Denied</h2>
          <p style={{ color: '#64748b', marginTop: '8px' }}>
            You do not have the <strong>VIEW_SEASON</strong> permission required to access Season Management.
            Please contact a Super Administrator to grant you access.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Season Management" requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

        {/* Top Header & Actions Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>Competition Seasons</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Manage office tournaments, calculate season statistics, and track standings.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {canCreate && (
              <button onClick={openCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} />
                <span>Create Season</span>
              </button>
            )}
          </div>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            marginBottom: '16px',
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Calculated Stats Banner Modal */}
        {statsResult && (
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '16px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={20} color="#2563eb" />
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e3a8a' }}>
                  Statistics for: {statsResult.season_name}
                </h4>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '0.82rem', color: '#1e40af', flexWrap: 'wrap' }}>
                <span><strong>{statsResult.total_approved_matches}</strong> Approved Matches</span>
                <span><strong>{statsResult.total_goals_scored}</strong> Total Goals</span>
                <span><strong>{statsResult.matches_1v1}</strong> 1v1 | <strong>{statsResult.matches_2v2}</strong> 2v2</span>
                <span><strong>{statsResult.unique_players}</strong> Active Participants</span>
              </div>
            </div>
            <button
              onClick={() => setStatsResult(null)}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs (if results or leaderboard permitted) */}
        {(canManageResults || canViewLeaderboard) && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <button
              onClick={() => setActiveTab('LIST')}
              className={activeTab === 'LIST' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
            >
              <Calendar size={14} />
              <span>All Seasons ({seasons.length})</span>
            </button>

            {canManageResults && selectedSeason && (
              <button
                onClick={() => setActiveTab('RESULTS')}
                className={activeTab === 'RESULTS' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              >
                <Swords size={14} />
                <span>Season Results: {selectedSeason.name}</span>
              </button>
            )}

            {canViewLeaderboard && selectedSeason && (
              <button
                onClick={() => setActiveTab('LEADERBOARD')}
                className={activeTab === 'LEADERBOARD' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              >
                <Trophy size={14} />
                <span>Season Standings: {selectedSeason.name}</span>
              </button>
            )}
          </div>
        )}

        {/* TAB 1: SEASONS LIST */}
        {activeTab === 'LIST' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {seasons.length === 0 ? (
              <div className="glass-card" style={{ padding: '36px', textAlign: 'center', background: '#fff', borderRadius: '16px' }}>
                <Calendar size={40} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
                <p style={{ fontWeight: 700, color: '#475569' }}>No seasons created yet.</p>
                {canCreate && (
                  <button onClick={openCreate} className="btn btn-primary" style={{ marginTop: '12px' }}>
                    Create First Season
                  </button>
                )}
              </div>
            ) : (
              seasons.map((season) => {
                const isActive = season.status === 'ACTIVE';
                const isSelected = selectedSeason?.id === season.id;

                return (
                  <div
                    key={season.id}
                    className="glass-card"
                    style={{
                      padding: '18px 20px',
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '14px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          {season.name}
                        </h4>
                        <span className={isActive ? 'badge badge-emerald' : 'badge badge-primary'} style={{ fontSize: '0.72rem' }}>
                          {season.status}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                          • {season.match_count || 0} Matches
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                        <span>
                          📅 Started: {season.start_date ? new Date(season.start_date).toLocaleDateString() : 'N/A'}
                        </span>
                        {season.end_date && (
                          <span>
                            🏁 Ends: {new Date(season.end_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Respecting Granular Permissions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {canCalcStats && (
                        <button
                          type="button"
                          onClick={() => handleCalculateStats(season)}
                          disabled={calculatingId === season.id}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          title="Calculate and update season statistics"
                        >
                          <RefreshCw size={13} className={calculatingId === season.id ? 'animate-spin' : ''} />
                          <span>{calculatingId === season.id ? 'Calculating...' : 'Recalculate Stats'}</span>
                        </button>
                      )}

                      {canManageResults && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSeason(season);
                            setActiveTab('RESULTS');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          title="View matches in this season"
                        >
                          <Swords size={13} />
                          <span>Results</span>
                        </button>
                      )}

                      {canViewLeaderboard && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSeason(season);
                            setActiveTab('LEADERBOARD');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          title="View season standings"
                        >
                          <Trophy size={13} />
                          <span>Standings</span>
                        </button>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(season)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                          title="Edit season details"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSeason(season)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#ef4444' }}
                          title="Delete season"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: SEASON RESULTS */}
        {activeTab === 'RESULTS' && selectedSeason && (
          <div className="glass-card" style={{ padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Matches in {selectedSeason.name}
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Review official match outcomes linked to this tournament season.
                </p>
              </div>
              <button onClick={() => setActiveTab('LIST')} className="btn btn-secondary" style={{ fontSize: '0.78rem' }}>
                Back to Seasons
              </button>
            </div>

            {loadingSubData ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Loading season matches...</p>
            ) : seasonResults.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No matches recorded in this season yet.</p>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Match Code</th>
                      <th>Mode</th>
                      <th>Matchup</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonResults.map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                          {m.match_code}
                        </td>
                        <td><span className="badge badge-primary">{m.game_mode}</span></td>
                        <td>
                          {m.players && m.players.length >= 2 ? (
                            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                              {m.players.filter(p => p.side === 'SIDE_A').map(p => p.player?.name).join(', ')} vs{' '}
                              {m.players.filter(p => p.side === 'SIDE_B').map(p => p.player?.name).join(', ')}
                            </div>
                          ) : 'Fixture'}
                        </td>
                        <td style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                          {m.result ? `${m.result.score_a} - ${m.result.score_b}` : '-'}
                        </td>
                        <td>
                          <span className={m.status === 'APPROVED' ? 'badge badge-emerald' : 'badge badge-gold'}>
                            {m.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {new Date(m.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SEASON LEADERBOARD */}
        {activeTab === 'LEADERBOARD' && selectedSeason && (
          <div className="glass-card" style={{ padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Standings: {selectedSeason.name}
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Live season points (3 pts for win, 1 pt for draw).
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setLeaderboardMode('1V1')}
                  className={leaderboardMode === '1V1' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                >
                  1v1 Standings
                </button>
                <button
                  onClick={() => setLeaderboardMode('2V2')}
                  className={leaderboardMode === '2V2' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                >
                  2v2 Standings
                </button>
                <button onClick={() => setActiveTab('LIST')} className="btn btn-secondary" style={{ fontSize: '0.78rem' }}>
                  Back
                </button>
              </div>
            </div>

            {loadingSubData ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Loading standings...</p>
            ) : seasonLeaderboard.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No matches recorded in {leaderboardMode} for this season.</p>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player</th>
                      <th>P</th>
                      <th>W</th>
                      <th>D</th>
                      <th>L</th>
                      <th>GF</th>
                      <th>GA</th>
                      <th>GD</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonLeaderboard.map((row) => (
                      <tr key={row.player_id}>
                        <td style={{ fontWeight: 800, color: row.rank === 1 ? '#d97706' : '#64748b' }}>
                          #{row.rank}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Avatar src={row.profile_photo} name={row.name} size="sm" />
                            <div>
                              <p style={{ fontWeight: 700, color: '#0f172a', margin: 0 }}>{row.name}</p>
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{row.code}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{row.played}</td>
                        <td style={{ color: '#059669', fontWeight: 700 }}>{row.wins}</td>
                        <td style={{ color: '#d97706', fontWeight: 700 }}>{row.draws}</td>
                        <td style={{ color: '#dc2626', fontWeight: 700 }}>{row.losses}</td>
                        <td>{row.gf}</td>
                        <td>{row.ga}</td>
                        <td style={{ fontWeight: 700, color: (row.gf - row.ga) >= 0 ? '#059669' : '#dc2626' }}>
                          {(row.gf - row.ga) > 0 ? `+${row.gf - row.ga}` : row.gf - row.ga}
                        </td>
                        <td style={{ fontWeight: 900, color: '#2563eb', fontSize: '1rem' }}>
                          {row.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CREATE SEASON MODAL */}
        {showCreateModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '20px'
          }}>
            <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '26px', background: '#ffffff', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Create Tournament Season</h3>
                <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px', fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>
                    Season Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PSO Spring Championship 2026"
                    className="form-input"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={seasonStartDate}
                      onChange={(e) => setSeasonStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={seasonEndDate}
                      onChange={(e) => setSeasonEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>
                    Initial Status
                  </label>
                  <select
                    className="form-input"
                    value={seasonStatus}
                    onChange={(e) => setSeasonStatus(e.target.value)}
                  >
                    <option value="ACTIVE">ACTIVE (Current Competition)</option>
                    <option value="UPCOMING">UPCOMING (Scheduled)</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-primary">
                    {submitting ? 'Creating...' : 'Create Season'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT SEASON MODAL */}
        {showEditModal && editingSeason && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '20px'
          }}>
            <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '26px', background: '#ffffff', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Edit Season: {editingSeason.name}</h3>
                <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px', fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>
                    Season Name
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={seasonName}
                    onChange={(e) => setSeasonName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={seasonStartDate}
                      onChange={(e) => setSeasonStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={seasonEndDate}
                      onChange={(e) => setSeasonEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>
                    Status
                  </label>
                  <select
                    className="form-input"
                    value={seasonStatus}
                    onChange={(e) => setSeasonStatus(e.target.value)}
                  >
                    <option value="ACTIVE">ACTIVE (Current Competition)</option>
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-primary">
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
