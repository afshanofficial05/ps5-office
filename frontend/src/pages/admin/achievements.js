import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Avatar from '../../components/Avatar';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Award, Trophy, Plus, Users, Trash2, CheckCircle2,
  AlertCircle, ChevronRight, Search, ShieldCheck,
  Sparkles, ExternalLink, X, UserCheck, Flame
} from 'lucide-react';
import {
  PRESET_ACHIEVEMENT_ICONS,
  REQUIREMENT_TYPES,
  renderAchievementIcon
} from '../../utils/achievementUtils';

export default function AdminAchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // Create Achievement Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    icon: '🏆',
    requirement_type: 'MANUAL',
    requirement_value: 1
  });

  // Award Achievement State
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedAchievementId, setSelectedAchievementId] = useState('');

  // Selected Achievement Detail (for viewing awarded players)
  const [viewingAchievement, setViewingAchievement] = useState(null);
  const [achievementPlayers, setAchievementPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      const [achs, userList] = await Promise.all([
        api.getAchievements(),
        api.getUsers('USER').catch(() => [])
      ]);
      setAchievements(achs || []);
      setPlayers(userList || []);
    } catch (err) {
      console.error('Failed to load achievements data', err);
      setFeedback({ type: 'error', message: 'Failed to load achievements. Please check backend.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAchievement = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setFeedback({ type: 'error', message: 'Achievement name is required.' });
      return;
    }
    if (!createForm.description.trim()) {
      setFeedback({ type: 'error', message: 'Achievement description is required.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await api.createAchievement({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        icon: createForm.icon.trim() || '🏆',
        requirement_type: createForm.requirement_type,
        requirement_value: parseInt(createForm.requirement_value, 10) || 1
      });

      setFeedback({ type: 'success', message: `Achievement "${createForm.name}" created successfully!` });
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        description: '',
        icon: '🏆',
        requirement_type: 'MANUAL',
        requirement_value: 1
      });
      await loadData();
    } catch (err) {
      console.error('Failed to create achievement', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to create achievement.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAwardAchievement = async (e) => {
    e?.preventDefault();
    if (!selectedPlayerId || !selectedAchievementId) {
      setFeedback({ type: 'error', message: 'Please select both a player and an achievement.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.assignAchievement(
        parseInt(selectedPlayerId, 10),
        parseInt(selectedAchievementId, 10)
      );

      setFeedback({
        type: res.already_assigned ? 'info' : 'success',
        message: res.message
      });
      setShowAwardModal(false);
      setSelectedPlayerId('');
      setSelectedAchievementId('');
      await loadData();
      if (viewingAchievement) {
        await handleViewPlayers(viewingAchievement);
      }
    } catch (err) {
      console.error('Failed to assign achievement', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to assign achievement.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeAchievement = async (playerId, achievementId, playerName) => {
    if (!confirm(`Are you sure you want to revoke this achievement from ${playerName}?`)) {
      return;
    }

    try {
      await api.revokeAchievement(playerId, achievementId);
      setFeedback({ type: 'success', message: `Achievement revoked from ${playerName}.` });
      await loadData();
      if (viewingAchievement) {
        await handleViewPlayers(viewingAchievement);
      }
    } catch (err) {
      console.error('Failed to revoke achievement', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to revoke achievement.' });
    }
  };

  const handleDeleteAchievement = async (ach) => {
    if (!confirm(`Are you sure you want to permanently delete "${ach.name}"? This will also remove it from all players who earned it.`)) {
      return;
    }

    try {
      await api.deleteAchievement(ach.id);
      setFeedback({ type: 'success', message: `Achievement "${ach.name}" deleted successfully.` });
      if (viewingAchievement?.id === ach.id) {
        setViewingAchievement(null);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to delete achievement', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to delete achievement.' });
    }
  };

  const handleViewPlayers = async (ach) => {
    setViewingAchievement(ach);
    setLoadingPlayers(true);
    try {
      const res = await api.getAchievementPlayers(ach.id);
      setAchievementPlayers(res.players || []);
    } catch (err) {
      console.error('Failed to load players for achievement', err);
      setAchievementPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const filteredAchievements = achievements.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
  });

  const totalBadgesAwarded = achievements.reduce((acc, a) => acc + (a.unlocked_count || 0), 0);

  return (
    <Layout title="Achievements Console" requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div style={{ maxWidth: '1140px', margin: '0 auto', width: '100%' }}>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div style={{
            padding: '12px 18px',
            marginBottom: '20px',
            borderRadius: '12px',
            backgroundColor: feedback.type === 'error' ? '#fef2f2' : feedback.type === 'info' ? '#eff6ff' : '#ecfdf5',
            border: `1px solid ${feedback.type === 'error' ? '#fca5a5' : feedback.type === 'info' ? '#bfdbfe' : '#a7f3d0'}`,
            color: feedback.type === 'error' ? '#991b1b' : feedback.type === 'info' ? '#1e40af' : '#065f46',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '0.88rem',
            fontWeight: 600
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {feedback.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Header Console Banner */}
        <div className="glass-card" style={{
          padding: '24px 28px',
          marginBottom: '24px',
          background: '#ffffff',
          borderRadius: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}>
                <Trophy size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                  Achievements & Badges Console
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Create custom achievements and award badges directly to completed players
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setSelectedPlayerId('');
                setSelectedAchievementId('');
                setShowAwardModal(true);
              }}
              className="btn btn-secondary"
              style={{ padding: '9px 16px', fontSize: '0.85rem' }}
            >
              <UserCheck size={16} color="#2563eb" />
              <span>Award to Player</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
              style={{ padding: '9px 18px', fontSize: '0.85rem' }}
            >
              <Plus size={16} />
              <span>Add Achievement</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div className="glass-card" style={{ padding: '18px 22px', borderLeft: '4px solid #f59e0b', background: '#ffffff', borderRadius: '16px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Achievements
            </span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#b45309', margin: '4px 0' }}>
              {achievements.length}
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>System & Custom Badges</span>
          </div>

          <div className="glass-card" style={{ padding: '18px 22px', borderLeft: '4px solid #10b981', background: '#ffffff', borderRadius: '16px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Badges Unlocked
            </span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#059669', margin: '4px 0' }}>
              {totalBadgesAwarded}
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Earned across all players</span>
          </div>

          <div className="glass-card" style={{ padding: '18px 22px', borderLeft: '4px solid #2563eb', background: '#ffffff', borderRadius: '16px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Registered Players
            </span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1d4ed8', margin: '4px 0' }}>
              {players.length}
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Eligible for badge awards</span>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '400px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search achievements by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff',
                outline: 'none'
              }}
            />
          </div>

          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Showing <strong>{filteredAchievements.length}</strong> of <strong>{achievements.length}</strong> achievements
          </span>
        </div>

        {/* Achievements Directory Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {filteredAchievements.map((ach) => (
            <div
              key={ach.id}
              className="glass-card"
              style={{
                padding: '20px',
                background: '#ffffff',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: viewingAchievement?.id === ach.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                transition: 'all 0.2s ease',
                boxShadow: viewingAchievement?.id === ach.id ? '0 4px 15px rgba(37, 99, 235, 0.15)' : 'none'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      fontSize: '1.75rem',
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: '#fffbeb',
                      border: '1px solid #fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {renderAchievementIcon(ach.icon)}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                        {ach.name}
                      </h4>
                      <span className="badge badge-gold" style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                        {ach.requirement_type} {ach.requirement_value > 1 ? `(${ach.requirement_value})` : ''}
                      </span>
                    </div>
                  </div>

                  <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                    {ach.unlocked_count || 0} Unlocked
                  </span>
                </div>

                <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45, marginBottom: '16px' }}>
                  {ach.description}
                </p>
              </div>

              {/* Card Footer Actions */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid #f1f5f9',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <button
                  type="button"
                  onClick={() => handleViewPlayers(ach)}
                  className="btn btn-secondary"
                  style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                  title="View players who hold this badge"
                >
                  <Users size={13} />
                  <span>Players ({ach.unlocked_count || 0})</span>
                </button>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAchievementId(String(ach.id));
                      setSelectedPlayerId('');
                      setShowAwardModal(true);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '5px 12px', fontSize: '0.76rem' }}
                    title="Award this achievement to a player"
                  >
                    <Plus size={13} />
                    <span>Award</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteAchievement(ach)}
                    className="btn btn-secondary"
                    style={{ padding: '5px 8px', fontSize: '0.76rem', color: '#ef4444' }}
                    title="Delete achievement"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredAchievements.length === 0 && !loading && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: '#64748b' }} className="glass-card">
              <Trophy size={40} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>No achievements found</h4>
              <p style={{ fontSize: '0.82rem' }}>Try adjusting your search query or click "Add Achievement" above.</p>
            </div>
          )}
        </div>

        {/* View Awarded Players Drawer / Section */}
        {viewingAchievement && (
          <div className="glass-card" style={{
            padding: '24px',
            background: '#ffffff',
            borderRadius: '18px',
            marginBottom: '32px',
            border: '1.5px solid #cbd5e1'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.8rem' }}>{renderAchievementIcon(viewingAchievement.icon)}</span>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Players with "{viewingAchievement.name}"
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {viewingAchievement.description} • <strong>{achievementPlayers.length}</strong> player(s) awarded
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAchievementId(String(viewingAchievement.id));
                    setShowAwardModal(true);
                  }}
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  <Plus size={14} />
                  <span>Award to Another Player</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingAchievement(null)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem', padding: '4px 8px' }}
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {loadingPlayers ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading player awards...</div>
            ) : achievementPlayers.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>No players have earned this achievement yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAchievementId(String(viewingAchievement.id));
                    setShowAwardModal(true);
                  }}
                  className="btn btn-secondary"
                  style={{ marginTop: '12px', fontSize: '0.8rem' }}
                >
                  Award this badge to a player
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Player Code</th>
                      <th>Email</th>
                      <th>Awarded Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {achievementPlayers.map((p) => (
                      <tr key={p.player_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Avatar src={p.profile_photo} name={p.name} size="sm" />
                            <strong style={{ color: '#0f172a' }}>{p.name}</strong>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                          {p.player_code}
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                          {p.email}
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                          {p.awarded_at ? new Date(p.awarded_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleRevokeAchievement(p.player_id, viewingAchievement.id, p.name)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#ef4444' }}
                            title="Revoke badge from this player"
                          >
                            <Trash2 size={12} />
                            <span>Revoke</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* --- MODAL 1: CREATE NEW ACHIEVEMENT --- */}
      {showCreateModal && (
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
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Trophy size={20} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Create New Achievement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAchievement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Achievement Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tournament Champion, Golden Boot, Clean Sheet King"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Description *
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe what the player did or why they earned this badge..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Icon / Emoji Preset Picker */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Badge Icon / Emoji
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    flexShrink: 0
                  }}>
                    {renderAchievementIcon(createForm.icon)}
                  </div>
                  <input
                    type="text"
                    placeholder="Enter emoji or icon name (e.g. 🏆, ⚽, crown, fire)"
                    value={createForm.icon}
                    onChange={(e) => setCreateForm({ ...createForm, icon: e.target.value })}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {PRESET_ACHIEVEMENT_ICONS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, icon: p.value })}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: createForm.icon === p.value ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: createForm.icon === p.value ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        fontSize: '1rem'
                      }}
                      title={p.label}
                    >
                      {p.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requirement Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Requirement Type
                </label>
                <select
                  value={createForm.requirement_type}
                  onChange={(e) => setCreateForm({ ...createForm, requirement_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                >
                  {REQUIREMENT_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {createForm.requirement_type !== 'MANUAL' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Requirement Threshold Value
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.requirement_value}
                    onChange={(e) => setCreateForm({ ...createForm, requirement_value: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    e.g. 5 wins, 3 win streak, or 10 matches played.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '9px 18px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: '9px 22px', fontSize: '0.85rem' }}
                >
                  {submitting ? 'Creating...' : 'Create Achievement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: AWARD ACHIEVEMENT TO PLAYER --- */}
      {showAwardModal && (
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
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Award size={20} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Award Badge to Player
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAwardModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAwardAchievement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Select Completed Player *
                </label>
                <select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Choose a player --</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.player_id}) - {p.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Select Achievement to Award *
                </label>
                <select
                  value={selectedAchievementId}
                  onChange={(e) => setSelectedAchievementId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Choose an achievement --</option>
                  {achievements.map((a) => (
                    <option key={a.id} value={a.id}>
                      {renderAchievementIcon(a.icon)} {a.name} — {a.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview Selected */}
              {selectedAchievementId && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  {(() => {
                    const ach = achievements.find(a => String(a.id) === String(selectedAchievementId));
                    if (!ach) return null;
                    return (
                      <>
                        <span style={{ fontSize: '1.6rem' }}>{renderAchievementIcon(ach.icon)}</span>
                        <div>
                          <h5 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{ach.name}</h5>
                          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{ach.description}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAwardModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '9px 18px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedPlayerId || !selectedAchievementId}
                  className="btn btn-primary"
                  style={{ padding: '9px 22px', fontSize: '0.85rem' }}
                >
                  {submitting ? 'Awarding...' : 'Award Achievement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
}
