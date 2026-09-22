import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import RatingBadge from '../../components/RatingBadge';
import Avatar from '../../components/Avatar';
import ArenaDataLoader from '../../components/MorphingInfinity';
import { api } from '../../services/api';
import { Users, Edit3, Save, X, AlertTriangle, Check } from 'lucide-react';

export default function SuperAdminPlayersPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [adjustModalPlayer, setAdjustModalPlayer] = useState(null);
  const [adjustMode, setAdjustMode] = useState('1V1');
  const [newRating, setNewRating] = useState(1500);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchPlayers = async () => {
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
  }, []);

  const openAdjust = (player) => {
    setAdjustModalPlayer(player);
    const r1 = player.ratings?.find(r => r.game_mode === '1V1')?.rating ?? 1500;
    setNewRating(Math.round(r1));
    setAdjustMode('1V1');
    setReason('');
    setError('');
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Audit reason is required for any manual rating override.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.adjustRating({
        player_id: adjustModalPlayer.id,
        game_mode: adjustMode,
        new_rating: parseFloat(newRating),
        reason: reason.trim()
      });
      setSuccessMsg(`Rating for ${adjustModalPlayer.name} updated to ${newRating} and audit logged.`);
      setAdjustModalPlayer(null);
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchPlayers();
    } catch (err) {
      setError(err.message || 'Rating adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Player Rating Overrides & Audits" requireAuth={true} allowedRoles={['SUPER_ADMIN']}>
        <ArenaDataLoader text="Loading Player Roster..." subtext="Syncing player accounts and Elo ratings..." />
      </Layout>
    );
  }

  return (
    <Layout title="Player Rating Overrides & Audits" requireAuth={true} allowedRoles={['SUPER_ADMIN']}>
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Player Rating Control</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Override corrupted ratings or reset stats with compulsory audit explanations.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-primary">{players.length} Total Players</span>
          </div>
        </div>

        {successMsg && (
          <div style={{
            padding: '14px 18px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            color: '#059669',
            fontSize: '0.9rem',
            marginBottom: '20px',
            fontWeight: 600
          }}>
            {successMsg}
          </div>
        )}

        <div className="glass-card" style={{ padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Player Code</th>
                  <th>Player Name</th>
                  <th>1v1 Rating</th>
                  <th>2v2 Rating</th>
                  <th>Total Matches</th>
                  <th>Win Rate</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const r1 = p.ratings?.find(r => r.game_mode === '1V1')?.rating ?? 1500;
                  const r2 = p.ratings?.find(r => r.game_mode === '2V2')?.rating ?? 1500;
                  const totalMatches = (p.ratings?.find(r => r.game_mode === '1V1')?.matches_played ?? 0) + (p.ratings?.find(r => r.game_mode === '2V2')?.matches_played ?? 0);
                  const totalWins = (p.ratings?.find(r => r.game_mode === '1V1')?.wins ?? 0) + (p.ratings?.find(r => r.game_mode === '2V2')?.wins ?? 0);
                  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                        {p.player_id}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Avatar src={p.profile_photo} name={p.name} size="sm" />
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</span>
                        </div>
                      </td>
                      <td>
                        <RatingBadge rating={r1} size="sm" />
                      </td>
                      <td>
                        <RatingBadge rating={r2} size="sm" />
                      </td>
                      <td style={{ fontWeight: 600, color: '#334155' }}>{totalMatches}</td>
                      <td style={{ fontWeight: 700, color: '#059669' }}>{winRate}%</td>
                      <td>
                        <button
                          onClick={() => openAdjust(p)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          <Edit3 size={14} />
                          <span>Adjust Rating</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rating Adjustment Modal */}
        {adjustModalPlayer && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}>
            <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '28px', background: '#ffffff', borderRadius: '20px', boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#e11d48' }}>
                  Adjust Rating: {adjustModalPlayer.name}
                </h3>
                <button onClick={() => setAdjustModalPlayer(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px', fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
                    Select Competition Mode
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setAdjustMode('1V1')}
                      className={adjustMode === '1V1' ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{ padding: '8px' }}
                    >
                      1v1 Elo
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustMode('2V2')}
                      className={adjustMode === '2V2' ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{ padding: '8px' }}
                    >
                      2v2 Elo
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
                    New Rating Value (Starting base: 1500)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="100"
                    max="5000"
                    required
                    className="form-input"
                    value={newRating}
                    onChange={(e) => setNewRating(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#e11d48', fontWeight: 700, marginBottom: '4px' }}>
                    Mandatory Audit Justification
                  </label>
                  <textarea
                    required
                    rows={3}
                    className="form-input"
                    placeholder="e.g. Correcting rating discrepancy resulting from console hardware disconnect on match PSO-1024."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{ resize: 'none', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setAdjustModalPlayer(null)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-danger">
                    <Save size={16} />
                    <span>{submitting ? 'Committing...' : 'Apply & Audit Log'}</span>
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
