import React, { useState } from 'react';
import { api } from '../services/api';
import { AlertCircle, X, Flag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReportScoreModal({ match, onClose }) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [reportedPlayerId, setReportedPlayerId] = useState('');
  const [reason, setReason] = useState('INCORRECT_SCORE');
  const [description, setDescription] = useState('');

  // Find all players in this match except current user
  const opponents = match.players?.filter(p => p.player_id !== user?.id) || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportedPlayerId) {
      setError('Please select a player to report.');
      return;
    }

    setSubmitting(true);
    setError('');
    
    try {
      await api.submitReport({
        match_id: match.id,
        reported_player_id: parseInt(reportedPlayerId, 10),
        reason,
        description
      });
      setSuccess('Your report has been submitted to the admins.');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to submit report');
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '480px',
        padding: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: '#fee2e2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Flag size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Report Score Issue
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Appeal a match result or report an opponent.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#dc2626', fontSize: '0.85rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: '48px', height: '48px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Flag size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Report Submitted</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Select Opponent
              </label>
              <select
                required
                className="form-input"
                value={reportedPlayerId}
                onChange={(e) => setReportedPlayerId(e.target.value)}
              >
                <option value="">-- Choose player to report --</option>
                {opponents.map(op => (
                  <option key={op.player_id} value={op.player_id}>
                    {op.player_name || op.player?.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Reason
              </label>
              <select
                className="form-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="INCORRECT_SCORE">Incorrect Score Submitted</option>
                <option value="FAKE_SCREENSHOT">Fake or Unclear Screenshot</option>
                <option value="UNSPORTSMANLIKE">Unsportsmanlike Conduct</option>
                <option value="OTHER">Other Issue</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Description / Notes (Optional)
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Explain the issue for the admins..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '0.95rem',
                background: '#dc2626',
                borderColor: '#dc2626',
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Submitting Report...' : 'Submit to Admins'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
