import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import Avatar from '../../components/Avatar';
import ScreenshotUploader from '../../components/ScreenshotUploader';
import ArenaDataLoader from '../../components/MorphingInfinity';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  Trophy, CheckCircle, AlertCircle, ArrowRight, Calendar, FileText, Swords, Shield, Clock, ChevronRight
} from 'lucide-react';

export default function SubmitMatchResultPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedMatch, setSubmittedMatch] = useState(null);

  // Form State
  const [opponentId, setOpponentId] = useState('');
  const [userTeamId, setUserTeamId] = useState('');
  const [opponentTeamId, setOpponentTeamId] = useState('');
  const [userScore, setUserScore] = useState('0');
  const [opponentScore, setOpponentScore] = useState('0');
  const [isPenaltyShootout, setIsPenaltyShootout] = useState(false);
  const [userPenaltyScore, setUserPenaltyScore] = useState('');
  const [opponentPenaltyScore, setOpponentPenaltyScore] = useState('');
  const [matchDate, setMatchDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState('');
  const [compressedFile, setCompressedFile] = useState(null);

  // Helper: Strip leading zeros (e.g. '04' -> '4', '00' -> '0')
  const cleanScoreInput = (value) => {
    if (value === null || value === undefined) return '';
    let str = String(value).replace(/[^0-9]/g, '');
    if (str.length > 1 && str.startsWith('0')) {
      str = str.replace(/^0+(?=\d)/, '');
    }
    return str;
  };

  const handleScoreChange = (type, rawVal) => {
    const clean = cleanScoreInput(rawVal);
    const newScoreA = type === 'user' ? clean : userScore;
    const newScoreB = type === 'opponent' ? clean : opponentScore;

    if (type === 'user') setUserScore(clean);
    else setOpponentScore(clean);

    const valA = newScoreA === '' ? 0 : parseInt(newScoreA, 10);
    const valB = newScoreB === '' ? 0 : parseInt(newScoreB, 10);

    if (newScoreA !== '' && newScoreB !== '' && valA === valB) {
      setIsPenaltyShootout(true);
    }
  };

  const handlePenaltyChange = (type, rawVal) => {
    const clean = cleanScoreInput(rawVal);
    if (type === 'user') setUserPenaltyScore(clean);
    else setOpponentPenaltyScore(clean);
  };

  const handleTogglePenaltyShootout = (checked) => {
    const valA = userScore === '' ? 0 : parseInt(userScore, 10);
    const valB = opponentScore === '' ? 0 : parseInt(opponentScore, 10);
    const isTied = userScore !== '' && opponentScore !== '' && valA === valB;

    if (!checked && isTied) {
      setError('Penalty shootout is required when the match score is tied.');
      return;
    }
    setIsPenaltyShootout(checked);
  };

  // Tie evaluation
  const numUserScore = userScore === '' ? 0 : parseInt(userScore, 10);
  const numOppScore = opponentScore === '' ? 0 : parseInt(opponentScore, 10);
  const isMatchTied = userScore !== '' && opponentScore !== '' && numUserScore === numOppScore;

  const numPenA = userPenaltyScore !== '' ? parseInt(userPenaltyScore, 10) : NaN;
  const numPenB = opponentPenaltyScore !== '' ? parseInt(opponentPenaltyScore, 10) : NaN;
  const hasValidPenalties = !isNaN(numPenA) && !isNaN(numPenB) && numPenA !== numPenB;
  const isTieBlocked = isMatchTied && (!isPenaltyShootout || !hasValidPenalties);

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      router.replace('/admin/manual');
    }
  }, [user, router]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [usersData, teamsData] = await Promise.all([
          api.getUsers('USER').catch(() => []),
          api.getTeams({ status: 'ACTIVE' }).catch(() => [])
        ]);

        // Filter out current user from opponents list and ensure only active players (USER role) are shown
        const eligibleOpponents = usersData.filter(u => 
          u.id !== user?.id && 
          u.status === 'ACTIVE' && 
          u.role === 'USER'
        );
        setPlayers(eligibleOpponents);
        setTeams(teamsData);

        if (eligibleOpponents.length > 0) {
          setOpponentId(eligibleOpponents[0].id);
        }
        if (teamsData.length > 0) {
          setUserTeamId(teamsData[0].id);
          setOpponentTeamId(teamsData.length > 1 ? teamsData[1].id : teamsData[0].id);
        }
      } catch (err) {
        console.error('Failed to load form data', err);
        setError('Failed to load players and teams');
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadData();
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!opponentId) {
      setError('Please select an opponent player');
      return;
    }
    if (!compressedFile) {
      setError('A match screenshot is required for result verification');
      return;
    }

    const valUser = userScore === '' ? 0 : parseInt(userScore, 10);
    const valOpp = opponentScore === '' ? 0 : parseInt(opponentScore, 10);

    // Enforce penalty shootout when score is tied
    if (valUser === valOpp) {
      if (!isPenaltyShootout || userPenaltyScore === '' || opponentPenaltyScore === '') {
        setError(`Match score is tied (${valUser} - ${valOpp}). You must enter the penalty shootout score before submitting.`);
        return;
      }
      const penA = parseInt(userPenaltyScore, 10);
      const penB = parseInt(opponentPenaltyScore, 10);
      if (isNaN(penA) || isNaN(penB) || penA === penB) {
        setError('Penalty shootout cannot end in a draw. One side must win the shootout.');
        return;
      }
    }

    setSubmitting(true);

    try {
      // 1. Upload compressed screenshot (enforcing client-side <= 300 KB)
      const uploadRes = await api.uploadMatchScreenshot(compressedFile);
      const screenshotUrl = uploadRes.file_url;

      // 2. Direct submit match record with pending status
      const payload = {
        opponent_id: parseInt(opponentId, 10),
        user_team_id: userTeamId ? parseInt(userTeamId, 10) : null,
        opponent_team_id: opponentTeamId ? parseInt(opponentTeamId, 10) : null,
        user_score: valUser,
        opponent_score: valOpp,
        is_penalty_shootout: isPenaltyShootout,
        user_penalty_score: isPenaltyShootout ? parseInt(userPenaltyScore, 10) : null,
        opponent_penalty_score: isPenaltyShootout ? parseInt(opponentPenaltyScore, 10) : null,
        match_date: matchDate ? new Date(matchDate).toISOString() : null,
        notes: notes.trim() || null,
        evidence_url: screenshotUrl
      };

      const matchRes = await api.directSubmitMatch(payload);
      setSubmittedMatch(matchRes);
    } catch (err) {
      console.error('Submission failed', err);
      setError(err.message || 'Failed to submit match result');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedOpponent = players.find(p => p.id === parseInt(opponentId, 10));

  if (loading) {
    return (
      <Layout title="Submit Match Result" requireAuth={true}>
        <ArenaDataLoader text="Loading Submission Arena..." subtext="Fetching recent matches and player roster..." />
      </Layout>
    );
  }

  // Success Confirmation Screen
  if (submittedMatch) {
    return (
      <Layout title="Result Submitted" requireAuth={true}>
        <div style={{ maxWidth: '560px', margin: '20px auto 40px', padding: '0 12px' }}>
          <div className="glass-card" style={{
            padding: '36px 20px',
            textAlign: 'center',
            background: '#ffffff',
            borderRadius: '24px',
            border: '1.5px solid #86efac',
            boxShadow: '0 10px 30px -5px rgba(22, 163, 74, 0.12)'
          }}>
            {/* Animated Check Icon */}
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)'
            }}>
              <CheckCircle size={38} strokeWidth={2.5} />
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Result submitted successfully!
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '22px', lineHeight: 1.5, maxWidth: '440px', margin: '0 auto 22px' }}>
              Waiting for admin verification. Your match has been registered as{' '}
              <span style={{
                display: 'inline-block',
                fontWeight: 800,
                color: '#2563eb',
                background: '#eff6ff',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #bfdbfe'
              }}>
                {submittedMatch.match_code}
              </span>.
              Ratings will automatically update once verified.
            </p>

            {/* Scoreboard Card: Perfect 3-column Grid */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '20px 14px',
              marginBottom: '26px',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                gap: '8px',
                alignItems: 'center'
              }}>
                {/* Player A (You) */}
                <div style={{ textAlign: 'center', minWidth: 0, padding: '0 4px' }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#2563eb',
                    background: '#eff6ff',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    marginBottom: '6px'
                  }}>
                    You
                  </span>
                  <p style={{
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: 1.25,
                    minHeight: '2.4em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 0 6px 0'
                  }}>
                    {user?.name}
                  </p>
                  <div style={{
                    fontSize: '2.2rem',
                    fontWeight: 900,
                    color: '#2563eb',
                    fontFamily: 'monospace',
                    lineHeight: 1
                  }}>
                    {submittedMatch.result?.score_a ?? 0}
                  </div>
                </div>

                {/* VS Divider Badge */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 6px'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    color: '#64748b',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}>
                    VS
                  </div>
                </div>

                {/* Player B (Opponent) */}
                <div style={{ textAlign: 'center', minWidth: 0, padding: '0 4px' }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#7c3aed',
                    background: '#f5f3ff',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    marginBottom: '6px'
                  }}>
                    Opponent
                  </span>
                  <p style={{
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: 1.25,
                    minHeight: '2.4em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 0 6px 0'
                  }}>
                    {selectedOpponent?.name || 'Opponent'}
                  </p>
                  <div style={{
                    fontSize: '2.2rem',
                    fontWeight: 900,
                    color: '#7c3aed',
                    fontFamily: 'monospace',
                    lineHeight: 1
                  }}>
                    {submittedMatch.result?.score_b ?? 0}
                  </div>
                </div>
              </div>

              {/* Penalty shootout info if applicable */}
              {submittedMatch.result?.is_penalty_shootout && (
                <div style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px dashed #cbd5e1',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#7c3aed'
                }}>
                  Penalties: {submittedMatch.result?.penalty_score_a} - {submittedMatch.result?.penalty_score_b}
                </div>
              )}
            </div>

            {/* Action Buttons: Stacked on Mobile, Full-width & Tap-Friendly */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxWidth: '360px',
              margin: '0 auto'
            }}>
              <Link
                href={`/matches/${submittedMatch.id}`}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px 18px',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  borderRadius: '14px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
                }}
              >
                <span>View Match Lobby</span>
                <ChevronRight size={18} />
              </Link>
              <Link
                href="/matches/history"
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px 18px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  borderRadius: '14px'
                }}
              >
                <span>My Matches History</span>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Submit Match Result" requireAuth={true}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Submit Match Result ⚽
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '4px' }}>
            Finished a PS5 fixture? Enter your score and upload the required screenshot proof for admin verification.
          </p>
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
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="glass-card submit-card-container">
          {/* Section 1: Players & Clubs Selection */}
          <div className="submit-teams-grid">
            {/* Player A (You) */}
            <div className="submit-player-card card-you">
              <div className="submit-player-header">
                <Avatar user={user} size={34} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span className="submit-card-badge badge-you">
                    You (Player A)
                  </span>
                  <p className="submit-card-name">
                    {user?.name}
                  </p>
                </div>
              </div>

              <label className="submit-field-label">
                Your FC Club
              </label>
              <select
                className="form-input"
                value={userTeamId}
                onChange={(e) => setUserTeamId(e.target.value)}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.ovr} OVR)</option>
                ))}
              </select>
            </div>

            {/* VS Badge */}
            <div className="submit-vs-badge">
              <span>VS</span>
            </div>

            {/* Player B (Opponent) */}
            <div className="submit-player-card card-opp">
              <div className="submit-player-header">
                <Avatar user={selectedOpponent} name={selectedOpponent?.name || 'Opponent'} size={34} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span className="submit-card-badge badge-opp">
                    Opponent (Player B)
                  </span>
                  <p className="submit-card-name">
                    {selectedOpponent?.name || 'Choose Below'}
                  </p>
                </div>
              </div>

              <label className="submit-field-label">
                Select Opponent *
              </label>
              <select
                className="form-input"
                required
                value={opponentId}
                onChange={(e) => setOpponentId(e.target.value)}
                style={{ marginBottom: '10px' }}
              >
                {players.length === 0 ? (
                  <option value="">No other players available</option>
                ) : (
                  players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.player_id})
                    </option>
                  ))
                )}
              </select>

              <label className="submit-field-label">
                Opponent FC Club
              </label>
              <select
                className="form-input"
                value={opponentTeamId}
                onChange={(e) => setOpponentTeamId(e.target.value)}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.ovr} OVR)</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Score Counters */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
              Final Match Score *
            </label>

            <div className="submit-score-grid">
              <div className="submit-score-col">
                <div className="submit-score-header">
                  <span className="submit-score-tag tag-you">YOU</span>
                  <span className="submit-score-name" title={user?.name}>{user?.name}</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  required
                  placeholder="0"
                  className="form-input score-box-input"
                  value={userScore}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleScoreChange('user', e.target.value)}
                  onBlur={() => {
                    if (userScore === '') setUserScore('0');
                  }}
                />
              </div>

              <div className="submit-score-divider">
                <span>:</span>
              </div>

              <div className="submit-score-col">
                <div className="submit-score-header">
                  <span className="submit-score-tag tag-opp">OPPONENT</span>
                  <span className="submit-score-name" title={selectedOpponent?.name || 'Opponent'}>
                    {selectedOpponent?.name || 'Opponent'}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  required
                  placeholder="0"
                  className="form-input score-box-input"
                  value={opponentScore}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleScoreChange('opponent', e.target.value)}
                  onBlur={() => {
                    if (opponentScore === '') setOpponentScore('0');
                  }}
                />
              </div>
            </div>

            {/* Tie Warning Banner */}
            {isMatchTied && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: '#eff6ff',
                border: '1.5px solid #93c5fd',
                borderRadius: '12px',
                color: '#1e40af',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '1.2rem' }}>⚖️</span>
                <div>
                  <strong>Match is tied ({userScore} - {opponentScore})!</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#2563eb' }}>
                    {!isPenaltyShootout 
                      ? 'Penalty shootout is required to determine the winner.' 
                      : !hasValidPenalties 
                        ? (userPenaltyScore === '' || opponentPenaltyScore === '') 
                          ? 'Please enter the penalty shootout score for both sides below.' 
                          : 'Penalty shootout cannot end in a tie. One side must win the shootout.'
                        : `Penalty winner: ${numPenA > numPenB ? (user?.name || 'You') : (selectedOpponent?.name || 'Opponent')}`}
                  </p>
                </div>
              </div>
            )}

            {/* Penalty Shootout Checkbox */}
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="penaltyCheck"
                checked={isPenaltyShootout}
                onChange={(e) => handleTogglePenaltyShootout(e.target.checked)}
                disabled={isMatchTied}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: isMatchTied ? 'not-allowed' : 'pointer' }}
              />
              <label htmlFor="penaltyCheck" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: isMatchTied ? 'not-allowed' : 'pointer' }}>
                Fixture decided via Penalty Shootout {isMatchTied && <span style={{ color: '#2563eb', fontWeight: 700 }}>(Required for Tie)</span>}
              </label>
            </div>

            {isPenaltyShootout && (
              <div className="submit-penalties-box">
                <div className="submit-score-col">
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7c3aed', display: 'block', marginBottom: '4px' }}>Your Penalties</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    placeholder="0"
                    className="form-input score-box-input"
                    value={userPenaltyScore}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handlePenaltyChange('user', e.target.value)}
                  />
                </div>
                <div className="submit-score-divider">
                  <span>:</span>
                </div>
                <div className="submit-score-col">
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7c3aed', display: 'block', marginBottom: '4px' }}>Opponent Penalties</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    placeholder="0"
                    className="form-input score-box-input"
                    value={opponentPenaltyScore}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handlePenaltyChange('opponent', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Date & Optional Match Notes */}
          <div className="submit-meta-grid">
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Match Date & Time
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Match Notes (Optional)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Lunchtime match, 90 mins, extra time"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Section 4: Screenshot Upload (Mandatory with <= 300 KB constraint) */}
          <ScreenshotUploader
            required={true}
            label="Match Result Screenshot Proof"
            onFileReady={(file) => setCompressedFile(file)}
            onFileCleared={() => setCompressedFile(null)}
          />

          {/* Submit Action Button */}
          <div className="submit-button-wrap">
            <button
              type="submit"
              disabled={submitting || !compressedFile || !opponentId || isTieBlocked}
              className="btn btn-primary submit-action-btn"
              style={{
                opacity: (submitting || !compressedFile || !opponentId || isTieBlocked) ? 0.65 : 1,
                cursor: (submitting || !compressedFile || !opponentId || isTieBlocked) ? 'not-allowed' : 'pointer'
              }}
            >
              <span>
                {submitting 
                  ? 'Submitting & Uploading Proof...' 
                  : isTieBlocked 
                    ? 'Enter Penalties to Submit' 
                    : 'Submit Result for Verification'}
              </span>
              <ArrowRight size={18} />
            </button>
          </div>

          <style jsx>{`
            .submit-card-container {
              padding: 28px 24px;
              background: #ffffff;
              border-radius: 20px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.04);
            }
            .submit-teams-grid {
              display: grid;
              grid-template-columns: 1fr auto 1fr;
              gap: 16px;
              align-items: center;
              margin-bottom: 24px;
              padding-bottom: 20px;
              border-bottom: 1px solid #f1f5f9;
            }
            .submit-player-card {
              border-radius: 16px;
              padding: 16px;
              transition: all 0.2s ease;
            }
            .card-you {
              background: #eff6ff;
              border: 1.5px solid #bfdbfe;
            }
            .card-opp {
              background: #faf5ff;
              border: 1.5px solid #e9d5ff;
            }
            .submit-player-header {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 12px;
            }
            .submit-card-badge {
              display: block;
              font-size: 0.7rem;
              font-weight: 800;
              letter-spacing: 0.03em;
              text-transform: uppercase;
            }
            .badge-you {
              color: #2563eb;
            }
            .badge-opp {
              color: #7c3aed;
            }
            .submit-card-name {
              font-size: 0.92rem;
              font-weight: 800;
              color: #0f172a;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin: 0;
            }
            .submit-field-label {
              display: block;
              font-size: 0.75rem;
              font-weight: 700;
              color: #475569;
              margin-bottom: 5px;
            }
            .submit-vs-badge {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: #f1f5f9;
              border: 1px solid #e2e8f0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 0.8rem;
              color: #64748b;
              flex-shrink: 0;
              margin: 0 auto;
            }
            .submit-score-grid {
              display: grid;
              grid-template-columns: 1fr auto 1fr;
              gap: 14px;
              align-items: flex-end;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 16px 14px;
            }
            .submit-penalties-box {
              margin-top: 12px;
              display: grid;
              grid-template-columns: 1fr auto 1fr;
              gap: 14px;
              align-items: flex-end;
              padding: 14px;
              background: #faf5ff;
              border: 1px solid #e9d5ff;
              border-radius: 14px;
            }
            .submit-score-col {
              display: flex;
              flex-direction: column;
              min-width: 0;
            }
            .submit-score-header {
              min-height: 38px;
              display: flex;
              flex-direction: column;
              justify-content: flex-end;
              margin-bottom: 6px;
            }
            .submit-score-tag {
              font-size: 0.68rem;
              font-weight: 800;
              letter-spacing: 0.04em;
              text-transform: uppercase;
              display: block;
            }
            .tag-you {
              color: #2563eb;
            }
            .tag-opp {
              color: #7c3aed;
            }
            .submit-score-name {
              font-size: 0.82rem;
              font-weight: 700;
              color: #0f172a;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              display: block;
            }
            .score-box-input {
              font-size: 1.65rem !important;
              font-weight: 900 !important;
              text-align: center;
              font-family: monospace;
              height: 52px;
              border-radius: 12px;
            }
            .submit-score-divider {
              display: flex;
              align-items: center;
              justify-content: center;
              height: 52px;
              font-size: 1.8rem;
              font-weight: 900;
              color: #94a3b8;
              line-height: 1;
              padding: 0 4px;
            }
            .submit-meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 24px;
            }
            .submit-action-btn {
              width: 100%;
              padding: 14px;
              font-size: 0.95rem;
              font-weight: 800;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }

            @media (max-width: 640px) {
              .submit-card-container {
                padding: 14px 10px !important;
                border-radius: 16px !important;
              }
              .submit-teams-grid {
                grid-template-columns: 1fr !important;
                gap: 8px !important;
                margin-bottom: 16px !important;
                padding-bottom: 14px !important;
              }
              .submit-player-card {
                padding: 12px 10px !important;
                border-radius: 12px !important;
              }
              .submit-vs-badge {
                width: 30px !important;
                height: 30px !important;
                font-size: 0.72rem !important;
                margin: 2px auto !important;
              }
              .submit-score-grid {
                padding: 12px 8px !important;
                gap: 8px !important;
                border-radius: 12px !important;
              }
              .submit-penalties-box {
                padding: 10px 8px !important;
                gap: 8px !important;
                border-radius: 12px !important;
              }
              .score-box-input {
                font-size: 1.45rem !important;
                height: 48px !important;
              }
              .submit-score-divider {
                height: 48px !important;
                font-size: 1.5rem !important;
              }
              .submit-meta-grid {
                grid-template-columns: 1fr !important;
                gap: 12px !important;
              }
              .submit-button-wrap {
                margin-top: 20px !important;
                margin-bottom: 20px !important;
              }
              .submit-action-btn {
                min-height: 46px !important;
                font-size: 0.9rem !important;
                border-radius: 12px !important;
              }
            }
          `}</style>
        </form>
      </div>
    </Layout>
  );
}
