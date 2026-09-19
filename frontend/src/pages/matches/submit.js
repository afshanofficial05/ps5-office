import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import Avatar from '../../components/Avatar';
import ScreenshotUploader from '../../components/ScreenshotUploader';
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
    async function loadData() {
      try {
        setLoading(true);
        const [usersData, teamsData] = await Promise.all([
          api.getUsers().catch(() => []),
          api.getTeams({ status: 'ACTIVE' }).catch(() => [])
        ]);

        // Filter out current user from opponents list
        const eligibleOpponents = usersData.filter(u => u.id !== user?.id && u.status === 'ACTIVE');
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
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Loading match submission arena...
        </div>
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
            <div style={{
              background: '#eff6ff',
              border: '1.5px solid #bfdbfe',
              borderRadius: '16px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Avatar user={user} size={36} />
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                    You (Player A)
                  </span>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    {user?.name}
                  </p>
                </div>
              </div>

              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Your FC Club
              </label>
              <select
                className="form-input"
                value={userTeamId}
                onChange={(e) => setUserTeamId(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.ovr} OVR)</option>
                ))}
              </select>
            </div>

            {/* VS Badge */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '0.85rem',
              color: '#64748b'
            }}>
              VS
            </div>

            {/* Player B (Opponent) */}
            <div style={{
              background: '#faf5ff',
              border: '1.5px solid #e9d5ff',
              borderRadius: '16px',
              padding: '16px'
            }}>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '6px' }}>
                Select Opponent *
              </label>
              <select
                className="form-input"
                required
                value={opponentId}
                onChange={(e) => setOpponentId(e.target.value)}
                style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '12px' }}
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

              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Opponent FC Club
              </label>
              <select
                className="form-input"
                value={opponentTeamId}
                onChange={(e) => setOpponentTeamId(e.target.value)}
                style={{ fontSize: '0.85rem' }}
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
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', marginBottom: '6px' }}>
                  {user?.name} (Your Score)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  required
                  placeholder="0"
                  className="form-input"
                  style={{ fontSize: '1.6rem', fontWeight: 900, textAlign: 'center', fontFamily: 'monospace' }}
                  value={userScore}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleScoreChange('user', e.target.value)}
                  onBlur={() => {
                    if (userScore === '') setUserScore('0');
                  }}
                />
              </div>

              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#94a3b8' }}>:</div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#7c3aed', marginBottom: '6px' }}>
                  {selectedOpponent?.name || 'Opponent'} Score
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  required
                  placeholder="0"
                  className="form-input"
                  style={{ fontSize: '1.6rem', fontWeight: 900, textAlign: 'center', fontFamily: 'monospace' }}
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
              <div style={{
                marginTop: '12px',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: '16px',
                alignItems: 'center',
                padding: '14px 18px',
                background: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: '14px'
              }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7c3aed', display: 'block', marginBottom: '4px' }}>Your Penalties</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    placeholder="0"
                    className="form-input"
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.2rem' }}
                    value={userPenaltyScore}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handlePenaltyChange('user', e.target.value)}
                  />
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#94a3b8', paddingTop: '16px' }}>:</div>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7c3aed', display: 'block', marginBottom: '4px' }}>Opponent Penalties</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    placeholder="0"
                    className="form-input"
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.2rem' }}
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
                style={{ fontSize: '0.85rem' }}
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
                style={{ fontSize: '0.85rem' }}
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
              padding: 32px 28px;
              background: #ffffff;
              border-radius: 24px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.04);
            }
            .submit-teams-grid {
              display: grid;
              grid-template-columns: 1fr auto 1fr;
              gap: 18px;
              align-items: center;
              margin-bottom: 28px;
              padding-bottom: 24px;
              border-bottom: 1px solid #f1f5f9;
            }
            .submit-score-grid {
              display: grid;
              grid-template-columns: 1fr auto 1fr;
              gap: 20px;
              align-items: center;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 18px;
              padding: 20px;
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
              font-size: 1rem;
              font-weight: 800;
              border-radius: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }

            @media (max-width: 640px) {
              .submit-card-container {
                padding: 16px 12px !important;
                border-radius: 16px !important;
              }
              .submit-teams-grid {
                grid-template-columns: 1fr !important;
                gap: 12px !important;
                margin-bottom: 20px !important;
                padding-bottom: 16px !important;
              }
              .submit-score-grid {
                padding: 14px 10px !important;
                gap: 10px !important;
              }
              .submit-meta-grid {
                grid-template-columns: 1fr !important;
                gap: 12px !important;
              }
              .submit-button-wrap {
                position: sticky;
                bottom: calc(64px + env(safe-area-inset-bottom, 0px));
                z-index: 40;
                margin-top: 14px;
                padding-top: 8px;
              }
              .submit-action-btn {
                min-height: 48px !important;
                font-size: 0.92rem !important;
                border-radius: 12px !important;
                box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35) !important;
              }
            }
          `}</style>
        </form>
      </div>
    </Layout>
  );
}
