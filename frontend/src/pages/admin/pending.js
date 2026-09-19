import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  CheckSquare, Check, X, Eye, AlertCircle, RefreshCw, Shield, Swords, Calendar, ShieldAlert
} from 'lucide-react';

export default function PendingVerificationPage() {
  const { user, hasPermission } = useAuth();
  const canVerify = hasPermission('VERIFY_RESULTS');
  const [pendingMatches, setPendingMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModalMatch, setRejectModalMatch] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [screenshotLimitKb, setScreenshotLimitKb] = useState(100);
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitSavedMsg, setLimitSavedMsg] = useState('');

  const fetchPending = async () => {
    try {
      setLoading(true);
      const data = await api.getPendingResults();
      setPendingMatches(data);
    } catch (err) {
      console.error('Failed to load pending matches', err);
      setError('Failed to load pending queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    async function loadLimit() {
      try {
        const res = await api.getScreenshotLimit();
        if (res && res.max_screenshot_size_kb) {
          setScreenshotLimitKb(res.max_screenshot_size_kb);
        }
      } catch (e) {
        // Default to 100 KB
      }
    }
    loadLimit();
  }, []);

  const handleUpdateLimit = async (newLimit) => {
    const val = parseInt(newLimit, 10);
    if (isNaN(val) || val < 30 || val > 5000) return;
    setSavingLimit(true);
    try {
      await api.updateScreenshotLimit(val);
      setScreenshotLimitKb(val);
      setLimitSavedMsg(`Upload limit saved to ${val} KB!`);
      setTimeout(() => setLimitSavedMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update screenshot limit');
    } finally {
      setSavingLimit(false);
    }
  };

  const handleApprove = async (matchId) => {
    setActionLoading(matchId);
    setError('');
    setSuccessMsg('');
    try {
      await api.approveMatch(matchId);
      setSuccessMsg(`Match approved successfully! Ratings & leaderboard updated, and screenshot proof automatically deleted.`);
      setTimeout(() => setSuccessMsg(''), 6000);
      await fetchPending();
    } catch (err) {
      setError(err.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModalMatch || !rejectReason.trim()) {
      setError('Please provide a reason for rejecting this match result.');
      return;
    }
    setActionLoading(rejectModalMatch.id);
    setError('');
    setSuccessMsg('');
    try {
      await api.rejectMatch(rejectModalMatch.id, rejectReason.trim());
      setSuccessMsg(`Match ${rejectModalMatch.match_code} rejected. Submitter has been notified to correct and resubmit.`);
      setTimeout(() => setSuccessMsg(''), 6000);
      setRejectModalMatch(null);
      setRejectReason('');
      await fetchPending();
    } catch (err) {
      setError(err.message || 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (!canVerify) {
    return (
      <Layout title="Result Verification Queue" requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
        <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '40px' }} className="glass-card">
          <ShieldAlert size={48} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Permission Denied</h2>
          <p style={{ color: '#64748b', marginTop: '8px' }}>
            You do not possess the <strong>VERIFY_RESULTS</strong> permission required to review pending results.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Result Verification Queue" requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>


        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Pending Match Results</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Review score reports and evidence before committing Elo adjustments to the leaderboard.
            </p>
          </div>
          <button onClick={fetchPending} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {error && (
          <div style={{
            padding: '14px 18px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '12px',
            color: '#b91c1c',
            fontSize: '0.9rem',
            marginBottom: '20px',
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '14px 18px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '12px',
            color: '#166534',
            fontSize: '0.9rem',
            marginBottom: '20px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Check size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Admin Screenshot Upload Limit Tool */}
        <div className="glass-card" style={{
          padding: '16px 20px',
          marginBottom: '20px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                ⚙️ Screenshot Proof Limit:
              </span>
              <span style={{
                background: '#eff6ff',
                color: '#2563eb',
                padding: '3px 10px',
                borderRadius: '8px',
                fontWeight: 900,
                fontSize: '0.88rem'
              }}>
                {screenshotLimitKb} KB
              </span>
              {limitSavedMsg && (
                <span style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={14} /> {limitSavedMsg}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
              Adjustable limit for client-side compression and server-side verification.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>Presets:</span>
            {[100, 150, 200, 300].map((kb) => (
              <button
                key={kb}
                type="button"
                disabled={savingLimit}
                onClick={() => handleUpdateLimit(kb)}
                className={`btn ${screenshotLimitKb === kb ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 10px', fontSize: '0.76rem', borderRadius: '8px' }}
              >
                {kb} KB
              </button>
            ))}
          </div>
        </div>

        {pendingMatches.length === 0 ? (
          <div className="glass-card" style={{ padding: '48px', textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: '20px' }}>
            <CheckSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#2563eb' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>All Caught Up!</h3>
            <p style={{ fontSize: '0.88rem', marginTop: '6px' }}>There are no pending match results awaiting verification right now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {pendingMatches.map((m) => {
              const sideA = m.players?.filter(p => p.side === 'SIDE_A') || [];
              const sideB = m.players?.filter(p => p.side === 'SIDE_B') || [];
              const teamA = sideA[0]?.team_name || 'Team A';
              const teamB = sideB[0]?.team_name || 'Team B';
              const nameA = sideA.map(p => p.player_name || p.player_code).join(' & ');
              const nameB = sideB.map(p => p.player_name || p.player_code).join(' & ');
              const isActionRunning = actionLoading === m.id;

              return (
                <div key={m.id} className="glass-card" style={{ padding: '24px', border: '1.5px solid #fde68a', background: '#ffffff', borderRadius: '20px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '16px',
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#2563eb', fontFamily: 'monospace' }}>
                        {m.match_code}
                      </span>
                      <span className={m.game_mode === '1V1' ? 'badge badge-primary' : 'badge badge-purple'}>
                        {m.game_mode}
                      </span>
                      <span className="badge badge-gold">Pending Approval</span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Submitted {m.result?.submitted_at ? new Date(m.result.submitted_at).toLocaleString() : 'Recently'}
                    </div>
                  </div>

                  {/* Match Details Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr',
                    gap: '20px',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Fixture & Teams
                      </p>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '4px', lineHeight: 1.4 }}>
                        {nameA} <span style={{ color: '#2563eb' }}>({teamA})</span>
                        <br />
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>vs</span>
                        <br />
                        {nameB} <span style={{ color: '#7c3aed' }}>({teamB})</span>
                      </h4>

                      {m.result?.notes && (
                        <div style={{ marginTop: '8px', padding: '6px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>Notes: </span>
                          <span style={{ fontSize: '0.8rem', color: '#334155' }}>{m.result.notes}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px' }}>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Reported Score
                      </p>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', margin: '4px 0' }}>
                        {m.result?.score_a} - {m.result?.score_b}
                      </div>
                      {m.result?.is_penalty_shootout && (
                        <div style={{ marginBottom: '6px' }}>
                          <span className="badge badge-purple" style={{ fontSize: '0.78rem' }}>
                            ⚽ Penalties: {m.result.penalty_score_a} - {m.result.penalty_score_b}
                          </span>
                        </div>
                      )}
                      <span className="badge badge-primary">
                        Winner: {m.result?.winner_side === 'SIDE_A' ? 'Side A' : m.result?.winner_side === 'SIDE_B' ? 'Side B' : 'Draw'}
                        {m.result?.is_penalty_shootout ? ' (Pens)' : ''}
                      </span>
                    </div>

                    <div>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Screenshot Evidence
                      </p>
                      {m.evidence && m.evidence.length > 0 && m.evidence[0].file_url !== '[Deleted after approval]' ? (
                        <div style={{ marginTop: '6px' }}>
                          <div
                            onClick={() => setPreviewImage(m.evidence[0].file_url)}
                            style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
                            title="Click to zoom screenshot"
                          >
                            <img
                              src={m.evidence[0].file_url}
                              alt="Match Evidence"
                              style={{ width: '96px', height: '68px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                            <span style={{
                              position: 'absolute',
                              bottom: '4px',
                              right: '4px',
                              background: 'rgba(0,0,0,0.65)',
                              color: '#fff',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              display: 'flex'
                            }}>
                              <Eye size={12} />
                            </span>
                          </div>
                          <div style={{ marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={() => setPreviewImage(m.evidence[0].file_url)}
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Eye size={12} />
                              <span>Inspect Proof</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '6px', fontStyle: 'italic' }}>
                          {m.evidence && m.evidence[0]?.file_url === '[Deleted after approval]' ? 'Screenshot deleted after approval' : 'No screenshot attached'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '12px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Shield size={14} color="#16a34a" />
                      Screenshot will be automatically deleted from storage upon approval.
                    </span>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => { setRejectModalMatch(m); setRejectReason(''); }}
                        disabled={isActionRunning}
                        className="btn btn-danger"
                        style={{ padding: '10px 20px' }}
                      >
                        <X size={16} />
                        <span>Reject Result</span>
                      </button>

                      <button
                        onClick={() => handleApprove(m.id)}
                        disabled={isActionRunning}
                        className="btn btn-success"
                        style={{ padding: '10px 24px' }}
                      >
                        <Check size={16} />
                        <span>{isActionRunning ? 'Approving & Deleting Screenshot...' : 'Approve & Finalize Result'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rejection Modal */}
        {rejectModalMatch && (
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#e11d48', marginBottom: '8px' }}>
                Reject Match Result ({rejectModalMatch.match_code})
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                Ratings will not change. Provide a clear reason for the players.
              </p>

              <textarea
                required
                rows={4}
                className="form-input"
                placeholder="e.g., Score reported doesn't match photo evidence. Please re-enter correct score."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ resize: 'none', marginBottom: '20px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => setRejectModalMatch(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                  className="btn btn-danger"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Evidence Image Zoom / Inspector Modal */}
        {previewImage && (
          <div
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 150,
              padding: '24px'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#0f172a',
                borderRadius: '16px',
                overflow: 'hidden',
                maxWidth: '94vw',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                border: '1px solid #334155'
              }}
            >
              <div style={{
                padding: '12px 18px',
                borderBottom: '1px solid #334155',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#ffffff'
              }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={16} color="#38bdf8" />
                  Match Screenshot Proof Inspector
                </span>
                <button
                  onClick={() => setPreviewImage(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                  title="Close inspector"
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '16px', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={previewImage}
                  alt="Expanded Screenshot Proof"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '80vh',
                    objectFit: 'contain',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
