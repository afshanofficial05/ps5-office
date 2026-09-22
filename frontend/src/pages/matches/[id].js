import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import RatingBadge from '../../components/RatingBadge';
import RatingAnimation from '../../components/RatingAnimation';
import WhatsAppShareModal from '../../components/WhatsAppShareModal';
import ScreenshotUploader from '../../components/ScreenshotUploader';
import ArenaDataLoader from '../../components/MorphingInfinity';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  Swords, Shield, Users, Trophy, Play, CheckCircle2, AlertCircle, 
  Upload, Share2, Clock, Check, X, RefreshCw, Copy, ChevronDown, ChevronUp, Globe
} from 'lucide-react';

export default function MatchRoomPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [match, setMatch] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedSide, setSelectedSide] = useState('SIDE_B');
  
  const [scoreA, setScoreA] = useState('0');
  const [scoreB, setScoreB] = useState('0');
  const [winnerSide, setWinnerSide] = useState('SIDE_A');
  const [isPenaltyShootout, setIsPenaltyShootout] = useState(false);
  const [penaltyScoreA, setPenaltyScoreA] = useState('');
  const [penaltyScoreB, setPenaltyScoreB] = useState('');
  const [notes, setNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidencePreview, setEvidencePreview] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);

  // Helper: Strip leading zeros (e.g., '04' -> '4', '005' -> '5', '00' -> '0')
  const cleanScoreInput = (value) => {
    if (value === null || value === undefined) return '';
    let str = String(value).replace(/[^0-9]/g, '');
    if (str.length > 1 && str.startsWith('0')) {
      str = str.replace(/^0+(?=\d)/, '');
    }
    return str;
  };

  const fetchMatchData = async () => {
    if (!id) return;
    try {
      const matchData = await api.getMatch(id);
      setMatch(matchData);
      
      if (matchData.result) {
        setScoreA(matchData.result.score_a !== null && matchData.result.score_a !== undefined ? String(matchData.result.score_a) : '0');
        setScoreB(matchData.result.score_b !== null && matchData.result.score_b !== undefined ? String(matchData.result.score_b) : '0');
        setWinnerSide(matchData.result.winner_side);
        setIsPenaltyShootout(!!matchData.result.is_penalty_shootout);
        setPenaltyScoreA(matchData.result.penalty_score_a !== null && matchData.result.penalty_score_a !== undefined ? String(matchData.result.penalty_score_a) : '');
        setPenaltyScoreB(matchData.result.penalty_score_b !== null && matchData.result.penalty_score_b !== undefined ? String(matchData.result.penalty_score_b) : '');
      }
    } catch (err) {
      console.error('Failed to load match', err);
      setError('Failed to load match lobby');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function init() {
      if (!id) return;
      try {
        const [matchData, teamsData] = await Promise.all([
          api.getMatch(id),
          api.getTeams({ status: 'ACTIVE' })
        ]);
        if (isMounted) {
          setMatch(matchData);
          setTeams(teamsData);
          if (teamsData.length > 0) setSelectedTeamId(teamsData[0].id);
          if (matchData.result) {
            setScoreA(matchData.result.score_a !== null && matchData.result.score_a !== undefined ? String(matchData.result.score_a) : '0');
            setScoreB(matchData.result.score_b !== null && matchData.result.score_b !== undefined ? String(matchData.result.score_b) : '0');
            setWinnerSide(matchData.result.winner_side);
            setIsPenaltyShootout(!!matchData.result.is_penalty_shootout);
            setPenaltyScoreA(matchData.result.penalty_score_a !== null && matchData.result.penalty_score_a !== undefined ? String(matchData.result.penalty_score_a) : '');
            setPenaltyScoreB(matchData.result.penalty_score_b !== null && matchData.result.penalty_score_b !== undefined ? String(matchData.result.penalty_score_b) : '');
          }
        }
      } catch (e) {
        console.error('Failed to init match', e);
        if (isMounted) setError('Failed to load lobby');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    init();
    return () => { isMounted = false; };
  }, [id]);

  const handleCopyCode = () => {
    if (!match?.match_code) return;
    navigator.clipboard.writeText(match.match_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleJoin = async () => {
    if (!selectedTeamId || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const updated = await api.joinMatch(match.id, selectedTeamId, selectedSide);
      setMatch(updated);
    } catch (err) {
      setError(err.message || 'Failed to join match');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmStart = async () => {
    setSubmitting(true);
    setError('');
    try {
      const updated = await api.confirmMatch(match.id);
      setMatch(updated);
    } catch (err) {
      setError(err.message || 'Failed to start match');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvidenceChange = (file) => {
    setEvidenceFile(file);
  };

  const handleScoreChange = (side, rawVal) => {
    const clean = cleanScoreInput(rawVal);
    const newScoreA = side === 'A' ? clean : scoreA;
    const newScoreB = side === 'B' ? clean : scoreB;

    if (side === 'A') setScoreA(clean);
    else setScoreB(clean);

    const valA = newScoreA === '' ? 0 : parseInt(newScoreA, 10);
    const valB = newScoreB === '' ? 0 : parseInt(newScoreB, 10);

    if (newScoreA !== '' && newScoreB !== '' && valA === valB) {
      // Tie score: automatically require and activate penalty shootout
      setIsPenaltyShootout(true);
      const penA = penaltyScoreA !== '' ? parseInt(penaltyScoreA, 10) : NaN;
      const penB = penaltyScoreB !== '' ? parseInt(penaltyScoreB, 10) : NaN;
      if (!isNaN(penA) && !isNaN(penB) && penA !== penB) {
        setWinnerSide(penA > penB ? 'SIDE_A' : 'SIDE_B');
      } else {
        setWinnerSide('DRAW');
      }
    } else {
      if (valA > valB) setWinnerSide('SIDE_A');
      else if (valB > valA) setWinnerSide('SIDE_B');
      else setWinnerSide('DRAW');
    }
  };

  const handlePenaltyChange = (side, rawVal) => {
    const clean = cleanScoreInput(rawVal);
    const newPenA = side === 'A' ? clean : penaltyScoreA;
    const newPenB = side === 'B' ? clean : penaltyScoreB;

    if (side === 'A') setPenaltyScoreA(clean);
    else setPenaltyScoreB(clean);

    const penA = newPenA !== '' ? parseInt(newPenA, 10) : NaN;
    const penB = newPenB !== '' ? parseInt(newPenB, 10) : NaN;

    if (!isNaN(penA) && !isNaN(penB) && penA !== penB) {
      setWinnerSide(penA > penB ? 'SIDE_A' : 'SIDE_B');
    }
  };

  const handleTogglePenaltyShootout = (checked) => {
    const valA = scoreA === '' ? 0 : parseInt(scoreA, 10);
    const valB = scoreB === '' ? 0 : parseInt(scoreB, 10);
    const isTied = scoreA !== '' && scoreB !== '' && valA === valB;

    if (!checked && isTied) {
      setError('Penalty shootout is required when the match score is tied.');
      return;
    }
    setIsPenaltyShootout(checked);
  };

  // Tie evaluation
  const numScoreA = scoreA === '' ? 0 : parseInt(scoreA, 10);
  const numScoreB = scoreB === '' ? 0 : parseInt(scoreB, 10);
  const isMatchTied = scoreA !== '' && scoreB !== '' && numScoreA === numScoreB;

  const numPenA = penaltyScoreA !== '' ? parseInt(penaltyScoreA, 10) : NaN;
  const numPenB = penaltyScoreB !== '' ? parseInt(penaltyScoreB, 10) : NaN;
  const hasValidPenalties = !isNaN(numPenA) && !isNaN(numPenB) && numPenA !== numPenB;
  const isTieBlocked = isMatchTied && (!isPenaltyShootout || !hasValidPenalties);

  const handleSubmitResult = async (e) => {
    e.preventDefault();
    setError('');

    const valA = scoreA === '' ? 0 : parseInt(scoreA, 10);
    const valB = scoreB === '' ? 0 : parseInt(scoreB, 10);

    // Enforce penalty scores on tie
    if (valA === valB) {
      if (!isPenaltyShootout || penaltyScoreA === '' || penaltyScoreB === '') {
        setError(`Match score is tied (${valA} - ${valB}). You must enter the penalty shootout score before submitting.`);
        return;
      }
      const penA = parseInt(penaltyScoreA, 10);
      const penB = parseInt(penaltyScoreB, 10);
      if (isNaN(penA) || isNaN(penB) || penA === penB) {
        setError('Penalty shootout cannot end in a draw. One side must win the shootout.');
        return;
      }
    }

    const hasPriorScreenshot = match.evidence && match.evidence.some(ev => ev.file_url && ev.file_url !== '[Deleted after approval]');
    if (!evidenceFile && !hasPriorScreenshot) {
      setError('A match screenshot is required for result verification');
      return;
    }

    let finalWinner = winnerSide;
    if (valA === valB && isPenaltyShootout) {
      finalWinner = parseInt(penaltyScoreA, 10) > parseInt(penaltyScoreB, 10) ? 'SIDE_A' : 'SIDE_B';
    } else if (valA > valB) {
      finalWinner = 'SIDE_A';
    } else if (valB > valA) {
      finalWinner = 'SIDE_B';
    }

    setSubmitting(true);

    try {
      let uploadedUrl = null;
      if (evidenceFile) {
        const evRes = await api.uploadEvidence(match.id, evidenceFile);
        uploadedUrl = evRes.file_url;
      }

      const updated = await api.submitResult(match.id, {
        score_a: valA,
        score_b: valB,
        winner_side: finalWinner,
        is_penalty_shootout: isPenaltyShootout,
        penalty_score_a: isPenaltyShootout ? parseInt(penaltyScoreA, 10) : null,
        penalty_score_b: isPenaltyShootout ? parseInt(penaltyScoreB, 10) : null,
        notes: notes.trim() || null,
        evidence_url: uploadedUrl
      });
      setMatch(updated);
      setEvidenceFile(null);
    } catch (err) {
      setError(err.message || 'Failed to submit result');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Match Arena" requireAuth={true}>
        <ArenaDataLoader text="Loading Match Arena..." subtext="Syncing lobby and live game session data..." />
      </Layout>
    );
  }

  if (!match) {
    return (
      <Layout title="Match Arena" requireAuth={true}>
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', background: '#ffffff', borderRadius: '16px' }}>
          <AlertCircle size={36} color="#e11d48" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>Match Not Found</h3>
        </div>
      </Layout>
    );
  }

  const sideAPlayers = match.players?.filter(p => p.side === 'SIDE_A') || [];
  const sideBPlayers = match.players?.filter(p => p.side === 'SIDE_B') || [];

  const isUserInSideA = sideAPlayers.some(p => p.player_id === user?.id);
  const isUserInSideB = sideBPlayers.some(p => p.player_id === user?.id);
  const isParticipant = isUserInSideA || isUserInSideB;
  const isCreator = match.created_by === user?.id;

  const sideATeam = sideAPlayers[0]?.team;
  const sideBTeam = sideBPlayers[0]?.team;

  const userPlayerRecord = match.players?.find(p => p.player_id === user?.id);
  const opponentRecord = match.players?.find(p => p.player_id !== user?.id);

  return (
    <Layout title={`Match Lobby - ${match.match_code}`} requireAuth={true}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Top Header Card */}
        <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '20px', background: '#ffffff', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Match {match.match_code}
                </span>
                <button
                  onClick={handleCopyCode}
                  title="Copy Match Code"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                >
                  {copiedCode ? <Check size={16} color="#16a34a" /> : <Copy size={16} color="#64748b" />}
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                Host: <strong>{match.creator?.name || match.creator_name || 'Unknown'}</strong> • {match.game_mode}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`badge ${
                match.status === 'VERIFIED' || match.status === 'APPROVED' ? 'badge-success' :
                match.status === 'PENDING_VERIFICATION' ? 'badge-warning' :
                match.status === 'REJECTED' ? 'badge-danger' :
                match.status === 'PLAYING' ? 'badge-info' : 'badge-neutral'
              }`} style={{ fontSize: '0.78rem', padding: '5px 12px' }}>
                {match.status}
              </span>
              <button
                onClick={fetchMatchData}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={13} />
                <span>Refresh</span>
              </button>
              {match.status === 'VERIFIED' && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}
                >
                  <Share2 size={13} />
                  <span>WhatsApp</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global Error message */}
        {error && (
          <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '12px', color: '#b91c1c', fontSize: '0.88rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Teams Matchup Header Banner */}
        <div className="glass-card matchup-card-container" style={{ marginBottom: '20px', background: '#ffffff', borderRadius: '20px', position: 'relative' }}>
          <div className="matchup-arena-grid">
            
            {/* Side A */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#2563eb', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>
                Side A (Home)
              </span>
              <div style={{ marginTop: '8px' }}>
                {sideAPlayers.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '4px 0' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>{p.player_name || p.player?.name || p.player_code}</span>
                    <RatingBadge rating={p.player?.rating || 1500} size="sm" />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#3b82f6', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', display: 'inline-block' }}>
                {sideAPlayers[0]?.team_name || sideATeam?.name || 'No Team Selected'}
                {sideAPlayers[0]?.team_ovr && <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '4px' }}>({sideAPlayers[0].team_ovr} OVR)</span>}
              </div>
            </div>

            {/* VS Pill */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem', margin: '0 auto', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
                VS
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginTop: '6px', display: 'block' }}>
                {match.status}
              </span>
            </div>

            {/* Side B */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#7c3aed', background: '#f5f3ff', padding: '3px 8px', borderRadius: '6px' }}>
                Side B (Away)
              </span>
              <div style={{ marginTop: '8px' }}>
                {sideBPlayers.length > 0 ? (
                  sideBPlayers.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '4px 0' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>{p.player_name || p.player?.name || p.player_code}</span>
                      <RatingBadge rating={p.player?.rating || 1500} size="sm" />
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', margin: '12px 0' }}>
                    Awaiting opponent...
                  </div>
                )}
              </div>
              {sideBPlayers.length > 0 && (
                <div style={{ marginTop: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#8b5cf6', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', display: 'inline-block' }}>
                  {sideBPlayers[0]?.team_name || sideBTeam?.name || 'No Team Selected'}
                  {sideBPlayers[0]?.team_ovr && <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '4px' }}>({sideBPlayers[0].team_ovr} OVR)</span>}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Join Match Card (if not participant and waiting) */}
        {!isParticipant && match.status === 'WAITING' && (
          <div className="glass-card" style={{ padding: '24px', marginBottom: '20px', background: '#ffffff', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
              Join This Match
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Select Your FC Club
              </label>
              <select
                className="form-input"
                value={selectedTeamId || ''}
                onChange={(e) => setSelectedTeamId(parseInt(e.target.value, 10))}
              >
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.ovr} OVR) - {t.league || 'Club'}
                  </option>
                ))}
              </select>
            </div>

            {match.game_mode === '2V2' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Select Side
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    className={`btn ${selectedSide === 'SIDE_A' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedSide('SIDE_A')}
                    disabled={sideAPlayers.length >= 2}
                  >
                    Side A ({sideAPlayers.length}/2)
                  </button>
                  <button
                    type="button"
                    className={`btn ${selectedSide === 'SIDE_B' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedSide('SIDE_B')}
                    disabled={sideBPlayers.length >= 2}
                  >
                    Side B ({sideBPlayers.length}/2)
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={submitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
            >
              <span>{submitting ? 'Joining...' : 'Join Match Arena'}</span>
            </button>
          </div>
        )}

        {/* Start Match Confirmation Button */}
        {isParticipant && match.status === 'READY' && (
          <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', textAlign: 'center' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#166534', marginBottom: '6px' }}>
              Both sides ready!
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#15803d', marginBottom: '16px' }}>
              Kick off on the PlayStation and lock this match in progress.
            </p>
            <button
              onClick={handleConfirmStart}
              disabled={submitting}
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: '0.9rem', background: '#16a34a', borderColor: '#16a34a' }}
            >
              <span>{submitting ? 'Starting...' : 'Kick Off (Start Match)'}</span>
            </button>
          </div>
        )}

        {/* Rejection Alert Banner (If match was rejected by Admin) */}
        {match.status === 'REJECTED' && (
          <div style={{
            padding: '18px 20px',
            marginBottom: '20px',
            background: '#fef2f2',
            border: '1.5px solid #fca5a5',
            borderRadius: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <AlertCircle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#991b1b' }}>
                  Match Result Rejected
                </h4>
                <p style={{ fontSize: '0.88rem', color: '#b91c1c', marginTop: '4px' }}>
                  <strong>Admin Reason:</strong> {match.result?.rejection_reason || 'Score mismatch or unclear screenshot.'}
                </p>
                <p style={{ fontSize: '0.82rem', color: '#7f1d1d', marginTop: '6px' }}>
                  Please correct the score, attach a clear screenshot proof below, and resubmit.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Verification Banner */}
        {match.status === 'PENDING_VERIFICATION' && (
          <div className="glass-card" style={{
            padding: '24px',
            marginBottom: '20px',
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <Clock size={24} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#92400e' }}>
                  Result Waiting for Admin Verification
                </h4>
                <p style={{ fontSize: '0.88rem', color: '#b45309', marginTop: '4px' }}>
                  Score reported: <strong>{match.result?.score_a} - {match.result?.score_b}</strong>.
                  The verification queue has been notified. Once approved, player ratings will update, and the temporary screenshot proof will be automatically deleted from storage.
                </p>
                {match.result?.notes && (
                  <p style={{ fontSize: '0.82rem', color: '#78350f', marginTop: '8px', fontStyle: 'italic' }}>
                    Notes: "{match.result.notes}"
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Score Submission for In-Progress, Ready, Playing, or Rejected (Resubmission) */}
        {isParticipant && (match.status === 'IN_PROGRESS' || match.status === 'READY' || match.status === 'PLAYING' || match.status === 'REJECTED') && (
          <div className="glass-card" style={{ padding: '24px', marginBottom: '20px', background: '#ffffff', borderRadius: '18px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
              {match.status === 'REJECTED' ? 'Correct & Resubmit Match Result' : 'Report Match Result'}
            </h3>

            <form onSubmit={handleSubmitResult}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', marginBottom: '4px' }}>
                    Side A Score
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    required
                    placeholder="0"
                    className="form-input"
                    style={{ fontSize: '1.4rem', textAlign: 'center', fontWeight: 800 }}
                    value={scoreA}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleScoreChange('A', e.target.value)}
                    onBlur={() => {
                      if (scoreA === '') setScoreA('0');
                    }}
                  />
                </div>

                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#94a3b8', paddingTop: '16px' }}>:</div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#7c3aed', marginBottom: '4px' }}>
                    Side B Score
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    required
                    placeholder="0"
                    className="form-input"
                    style={{ fontSize: '1.4rem', textAlign: 'center', fontWeight: 800 }}
                    value={scoreB}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleScoreChange('B', e.target.value)}
                    onBlur={() => {
                      if (scoreB === '') setScoreB('0');
                    }}
                  />
                </div>
              </div>

              {/* Tie Warning Banner */}
              {isMatchTied && (
                <div style={{
                  padding: '12px 16px',
                  background: '#eff6ff',
                  border: '1.5px solid #93c5fd',
                  borderRadius: '12px',
                  color: '#1e40af',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>⚖️</span>
                  <div>
                    <strong>Match is tied ({scoreA} - {scoreB})!</strong>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#2563eb' }}>
                      {!isPenaltyShootout 
                        ? 'Penalty shootout is required to determine the winner.' 
                        : !hasValidPenalties 
                          ? (penaltyScoreA === '' || penaltyScoreB === '') 
                            ? 'Please enter the penalty shootout score for both sides below.' 
                            : 'Penalty shootout cannot end in a tie. One side must win the shootout.'
                          : `Penalty winner: ${numPenA > numPenB ? 'Side A' : 'Side B'}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Penalty shootout toggle */}
              <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="pensCheck"
                  checked={isPenaltyShootout}
                  onChange={(e) => handleTogglePenaltyShootout(e.target.checked)}
                  disabled={isMatchTied}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: isMatchTied ? 'not-allowed' : 'pointer' }}
                />
                <label htmlFor="pensCheck" style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600, cursor: isMatchTied ? 'not-allowed' : 'pointer' }}>
                  Decided by Penalty Shootout {isMatchTied && <span style={{ color: '#2563eb', fontWeight: 700 }}>(Required for Tie)</span>}
                </label>
              </div>

              {isPenaltyShootout && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center', marginBottom: '18px', padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, marginBottom: '4px' }}>Side A Penalties</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={2}
                      placeholder="0"
                      className="form-input"
                      style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }}
                      value={penaltyScoreA}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handlePenaltyChange('A', e.target.value)}
                    />
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#94a3b8', paddingTop: '16px' }}>:</div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#7c3aed', fontWeight: 700, marginBottom: '4px' }}>Side B Penalties</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={2}
                      placeholder="0"
                      className="form-input"
                      style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }}
                      value={penaltyScoreB}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handlePenaltyChange('B', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Optional Match Notes */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
                  Match Notes (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Friendly derby, extra time, penalty details"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              {/* Secure Screenshot Upload (<= 300 KB required) */}
              <ScreenshotUploader
                required={true}
                label="Match Result Screenshot Proof"
                onFileReady={handleEvidenceChange}
                onFileCleared={() => setEvidenceFile(null)}
              />

              <button
                type="submit"
                disabled={submitting || isTieBlocked}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '0.95rem',
                  opacity: (submitting || isTieBlocked) ? 0.65 : 1,
                  cursor: (submitting || isTieBlocked) ? 'not-allowed' : 'pointer'
                }}
              >
                <span>
                  {submitting 
                    ? 'Submitting Result...' 
                    : isTieBlocked 
                      ? 'Enter Penalties to Submit' 
                      : match.status === 'REJECTED' 
                        ? 'Resubmit Result for Verification' 
                        : 'Submit Match Result'}
                </span>
              </button>
            </form>
          </div>
        )}

        {/* Rating Animation Celebration if Completed */}
        {match.status === 'VERIFIED' && userPlayerRecord && (
          <div style={{ marginBottom: '20px' }}>
            <RatingAnimation
              isWinner={userPlayerRecord.rating_change > 0}
              ratingBefore={userPlayerRecord.player_rating_before || 1500}
              ratingAfter={userPlayerRecord.player_rating_after || 1500}
              ratingChange={userPlayerRecord.rating_change || 0}
              opponentName={opponentRecord?.player_name || 'Opponent'}
              opponentBefore={opponentRecord?.player_rating_before || 1500}
              opponentAfter={opponentRecord?.player_rating_after || 1500}
              opponentChange={opponentRecord?.rating_change || 0}
            />
          </div>
        )}

        {/* Progressive Disclosure: Collapsible Match Guidelines */}
        <div className="glass-card" style={{ padding: '14px 20px', background: '#ffffff', borderRadius: '14px' }}>
          <div
            onClick={() => setShowGuidelines(!showGuidelines)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
              📋 Competition Guidelines
            </span>
            {showGuidelines ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
          </div>

          {showGuidelines && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6 }}>
              <p>• Half Length: 6 mins, Difficulty: World Class, Tactical Defending enabled.</p>
              <p>• Elo adjustments are weighted by team OVR handicap metrics upon admin sign-off.</p>
            </div>
          )}
        </div>

        {/* WhatsApp Share Modal */}
        {showShareModal && (
          <WhatsAppShareModal match={match} onClose={() => setShowShareModal(false)} />
        )}

        <style jsx>{`
          .matchup-card-container {
            padding: 24px;
          }
          .matchup-arena-grid {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            gap: 16px;
          }
          @media (max-width: 640px) {
            .matchup-card-container {
              padding: 14px 10px !important;
            }
            .matchup-arena-grid {
              gap: 8px !important;
            }
          }
        `}</style>
      </div>
    </Layout>
  );
}
