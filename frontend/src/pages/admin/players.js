import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import RatingBadge from '../../components/RatingBadge';
import Avatar from '../../components/Avatar';
import ArenaDataLoader from '../../components/MorphingInfinity';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Users, Shield, Ban, CheckCircle, Trash2, ShieldAlert, Trophy, Award, Plus, X } from 'lucide-react';
import { renderAchievementIcon } from '../../utils/achievementUtils';

export default function AdminPlayersPage() {
  const { user, hasPermission } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Player Achievement Modal state
  const [selectedPlayerForAch, setSelectedPlayerForAch] = useState(null);
  const [allAchievements, setAllAchievements] = useState([]);
  const [playerAchievements, setPlayerAchievements] = useState([]);
  const [loadingAch, setLoadingAch] = useState(false);
  const [assignAchId, setAssignAchId] = useState('');
  const [achFeedback, setAchFeedback] = useState(null);

  const canView = hasPermission('VIEW_PLAYERS');
  const canEdit = hasPermission('EDIT_PLAYER');
  const canDelete = hasPermission('DELETE_PLAYER');

  const fetchPlayers = async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getUsers('USER');
      setPlayers(data);
    } catch (err) {
      console.error('Failed to load players', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [user]);

  const handleOpenAchievementsModal = async (player) => {
    setSelectedPlayerForAch(player);
    setLoadingAch(true);
    setAchFeedback(null);
    setAssignAchId('');
    try {
      const [profileData, achList] = await Promise.all([
        api.getUserProfile(player.id),
        allAchievements.length === 0 ? api.getAchievements() : Promise.resolve(allAchievements)
      ]);
      setPlayerAchievements(profileData?.achievements || []);
      if (allAchievements.length === 0 && achList) {
        setAllAchievements(achList);
      }
    } catch (err) {
      console.error('Failed to load player achievements', err);
      setAchFeedback({ type: 'error', message: 'Failed to load player achievements' });
    } finally {
      setLoadingAch(false);
    }
  };

  const handleAwardAchievement = async () => {
    if (!assignAchId || !selectedPlayerForAch) return;
    try {
      const res = await api.assignAchievement(selectedPlayerForAch.id, parseInt(assignAchId, 10));
      setAchFeedback({ type: 'success', message: res.message });
      setAssignAchId('');
      // Refresh player achievements
      const updated = await api.getUserProfile(selectedPlayerForAch.id);
      setPlayerAchievements(updated?.achievements || []);
    } catch (err) {
      console.error('Failed to award achievement', err);
      setAchFeedback({ type: 'error', message: err.message || 'Failed to award achievement' });
    }
  };

  const handleRevokeAchievement = async (achievementId) => {
    if (!confirm('Are you sure you want to revoke this achievement?')) return;
    try {
      await api.revokeAchievement(selectedPlayerForAch.id, achievementId);
      setAchFeedback({ type: 'success', message: 'Achievement revoked.' });
      const updated = await api.getUserProfile(selectedPlayerForAch.id);
      setPlayerAchievements(updated?.achievements || []);
    } catch (err) {
      console.error('Failed to revoke achievement', err);
      setAchFeedback({ type: 'error', message: err.message || 'Failed to revoke' });
    }
  };

  const handleToggleStatus = async (targetUser) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await api.updateUser(targetUser.id, { status: nextStatus });
      await fetchPlayers();
    } catch (err) {
      console.error('Failed to update status', err);
      alert(err.message || 'Failed to update player status');
    }
  };

  const handleDeletePlayer = async (targetUser) => {
    if (!confirm(`Are you sure you want to permanently delete player "${targetUser.name}" (${targetUser.player_id})? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteUser(targetUser.id);
      await fetchPlayers();
    } catch (err) {
      console.error('Failed to delete player', err);
      alert(err.message || 'Failed to delete player');
    }
  };

  if (!canView) {
    return (
      <Layout title="Player Management" requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
        <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '40px' }} className="glass-card">
          <ShieldAlert size={48} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Permission Denied</h2>
          <p style={{ color: '#64748b', marginTop: '8px' }}>
            You do not possess the <strong>VIEW_PLAYERS</strong> permission required to access the player registry.
          </p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout title="Player Management" requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
        <ArenaDataLoader text="Loading Player Registry..." subtext="Fetching registered players and ratings..." />
      </Layout>
    );
  }

  return (
    <Layout title="Player Management" requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

        <div className="glass-card" style={{
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: '#ffffff',
          borderRadius: '16px'
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Player Registry</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Manage registered office player accounts and system access</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-primary">{players.length} Total Players</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Player Code</th>
                  <th>Name & Email</th>
                  <th>1v1 Rating</th>
                  <th>2v2 Rating</th>
                  <th>Status</th>
                  <th>Registered</th>
                  {(canEdit || canDelete) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const r1 = p.ratings?.find(r => r.game_mode === '1V1')?.rating ?? 1500;
                  const r2 = p.ratings?.find(r => r.game_mode === '2V2')?.rating ?? 1500;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                        {p.player_id}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Avatar
                            src={p.profile_photo}
                            name={p.name}
                            size="sm"
                          />
                          <div>
                            <p style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</p>
                            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <RatingBadge rating={r1} size="sm" />
                      </td>
                      <td>
                        <RatingBadge rating={r2} size="sm" />
                      </td>
                      <td>
                        <span className={p.status === 'ACTIVE' ? 'badge badge-emerald' : 'badge badge-rose'}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      {(canEdit || canDelete) && (
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {canEdit && (
                              <button
                                onClick={() => handleToggleStatus(p)}
                                className="btn btn-secondary"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.75rem',
                                  color: p.status === 'ACTIVE' ? '#ef4444' : '#10b981'
                                }}
                              >
                                {p.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenAchievementsModal(p)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#b45309' }}
                              title="Manage & Award Achievements"
                            >
                              <Trophy size={13} />
                              <span>Badges</span>
                            </button>

                            {canDelete && (
                              <button
                                onClick={() => handleDeletePlayer(p)}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444' }}
                                title="Delete Player Account"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- MODAL: PLAYER ACHIEVEMENTS MANAGEMENT --- */}
        {selectedPlayerForAch && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}>
            <div className="glass-card" style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '520px',
              padding: '26px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar src={selectedPlayerForAch.profile_photo} name={selectedPlayerForAch.name} size="md" />
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {selectedPlayerForAch.name}
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {selectedPlayerForAch.player_id} • Achievements & Badges
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPlayerForAch(null)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>

              {achFeedback && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  marginBottom: '14px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  backgroundColor: achFeedback.type === 'error' ? '#fef2f2' : '#ecfdf5',
                  color: achFeedback.type === 'error' ? '#991b1b' : '#065f46',
                  border: `1px solid ${achFeedback.type === 'error' ? '#fca5a5' : '#a7f3d0'}`
                }}>
                  {achFeedback.message}
                </div>
              )}

              {/* Award New Achievement Section */}
              <div style={{
                padding: '14px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                marginBottom: '18px'
              }}>
                <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Award New Badge to {selectedPlayerForAch.name}
                </h5>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={assignAchId}
                    onChange={(e) => setAssignAchId(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      backgroundColor: '#ffffff',
                      outline: 'none'
                    }}
                  >
                    <option value="">-- Choose achievement --</option>
                    {allAchievements.map((ach) => (
                      <option key={ach.id} value={ach.id}>
                        {renderAchievementIcon(ach.icon)} {ach.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAwardAchievement}
                    disabled={!assignAchId}
                    className="btn btn-primary"
                    style={{ padding: '8px 14px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                  >
                    Award
                  </button>
                </div>
              </div>

              {/* Current Player Badges List */}
              <h5 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                Unlocked Badges ({playerAchievements.length})
              </h5>

              {loadingAch ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading badges...</div>
              ) : playerAchievements.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic', padding: '12px 0' }}>
                  No badges currently unlocked for this player.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                  {playerAchievements.map((pa) => (
                    <div
                      key={pa.id || pa.achievement?.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.4rem' }}>
                          {renderAchievementIcon(pa.achievement?.icon)}
                        </span>
                        <div>
                          <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{pa.achievement?.name}</strong>
                          <p style={{ fontSize: '0.72rem', color: '#64748b' }}>{pa.achievement?.description}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevokeAchievement(pa.achievement?.id)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#ef4444' }}
                        title="Revoke badge"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedPlayerForAch(null)}
                  className="btn btn-secondary"
                  style={{ padding: '7px 16px', fontSize: '0.82rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
