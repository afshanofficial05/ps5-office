import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Swords, Users, Shield, ArrowRight, Check, ShieldAlert } from 'lucide-react';

export default function ManualMatchEntryPage() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const canManualCreate = hasPermission('MANUAL_MATCH_CREATE');
  const [gameMode, setGameMode] = useState('1V1');

  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);

  const [playerA1, setPlayerA1] = useState('');
  const [playerA2, setPlayerA2] = useState('');
  const [playerB1, setPlayerB1] = useState('');
  const [playerB2, setPlayerB2] = useState('');

  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');

  const [scoreA, setScoreA] = useState('0');
  const [scoreB, setScoreB] = useState('0');
  const [winnerSide, setWinnerSide] = useState('SIDE_A');
  const [isPenaltyShootout, setIsPenaltyShootout] = useState(false);
  const [penaltyScoreA, setPenaltyScoreA] = useState('');
  const [penaltyScoreB, setPenaltyScoreB] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMatch, setSuccessMatch] = useState(null);

  // Helper: Strip leading zeros (e.g. '04' -> '4')
  const cleanScoreInput = (value) => {
    if (value === null || value === undefined) return '';
    let str = String(value).replace(/[^0-9]/g, '');
    if (str.length > 1 && str.startsWith('0')) {
      str = str.replace(/^0+(?=\d)/, '');
    }
    return str;
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

  const numScoreA = scoreA === '' ? 0 : parseInt(scoreA, 10);
  const numScoreB = scoreB === '' ? 0 : parseInt(scoreB, 10);
  const isMatchTied = scoreA !== '' && scoreB !== '' && numScoreA === numScoreB;

  const numPenA = penaltyScoreA !== '' ? parseInt(penaltyScoreA, 10) : NaN;
  const numPenB = penaltyScoreB !== '' ? parseInt(penaltyScoreB, 10) : NaN;
  const hasValidPenalties = !isNaN(numPenA) && !isNaN(numPenB) && numPenA !== numPenB;
  const isTieBlocked = isMatchTied && (!isPenaltyShootout || !hasValidPenalties);

  useEffect(() => {
    async function loadData() {
      try {
        const [usersData, teamsData] = await Promise.all([
          api.getUsers('', 'USER'),
          api.getTeams({ status: 'ACTIVE' })
        ]);
        setPlayers(usersData);
        setTeams(teamsData);
        if (usersData.length >= 2) {
          setPlayerA1(usersData[0].id);
          setPlayerB1(usersData[1].id);
        }
        if (usersData.length >= 4) {
          setPlayerA2(usersData[2].id);
          setPlayerB2(usersData[3].id);
        }
        if (teamsData.length >= 2) {
          setTeamAId(teamsData[0].id);
          setTeamBId(teamsData[1].id);
        }
      } catch (err) {
        console.error('Failed to load entry dependencies', err);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const valA = scoreA === '' ? 0 : parseInt(scoreA, 10);
    const valB = scoreB === '' ? 0 : parseInt(scoreB, 10);

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

    setSubmitting(true);

    const sideA = [parseInt(playerA1, 10)];
    const sideB = [parseInt(playerB1, 10)];

    if (gameMode === '2V2') {
      if (!playerA2 || !playerB2) {
        setError('Please select 2 players for each team in 2v2 mode');
        setSubmitting(false);
        return;
      }
      sideA.push(parseInt(playerA2, 10));
      sideB.push(parseInt(playerB2, 10));
    }

    let finalWinner = winnerSide;
    if (valA === valB && isPenaltyShootout) {
      finalWinner = parseInt(penaltyScoreA, 10) > parseInt(penaltyScoreB, 10) ? 'SIDE_A' : 'SIDE_B';
    } else if (valA > valB) {
      finalWinner = 'SIDE_A';
    } else if (valB > valA) {
      finalWinner = 'SIDE_B';
    }

    try {
      const match = await api.createManualMatch({
        game_mode: gameMode,
        side_a_players: sideA,
        side_b_players: sideB,
        side_a_team_id: parseInt(teamAId, 10),
        side_b_team_id: parseInt(teamBId, 10),
        score_a: valA,
        score_b: valB,
        winner_side: finalWinner,
        is_penalty_shootout: isPenaltyShootout,
        penalty_score_a: isPenaltyShootout ? parseInt(penaltyScoreA, 10) : null,
        penalty_score_b: isPenaltyShootout ? parseInt(penaltyScoreB, 10) : null,
        auto_approve: autoApprove
      });
      setSuccessMatch(match);
    } catch (err) {
      setError(err.message || 'Failed to submit manual match');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canManualCreate) {
    return (
      <Layout title="Manual Match Recording" requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
        <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '40px' }} className="glass-card">
          <ShieldAlert size={48} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Permission Denied</h2>
          <p style={{ color: '#64748b', marginTop: '8px' }}>
            You do not possess the <strong>MANUAL_MATCH_CREATE</strong> permission required to record matches manually.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Manual Match Recording" requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

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

        {successMatch ? (
          <div className="glass-card" style={{ padding: '36px', textAlign: 'center', background: '#ffffff', borderRadius: '20px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#ecfdf5',
              border: '2px solid #10b981',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <Check size={32} color="#059669" />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginBottom: '8px' }}>
              Match {successMatch.match_code} Created Successfully!
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
              Ratings, team points, and leaderboards have been computed and synchronized.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => { setSuccessMatch(null); }} className="btn btn-secondary">
                Record Another Match
              </button>
              <button onClick={() => router.push(`/matches/${successMatch.id}`)} className="btn btn-primary">
                View Match Summary
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '32px', background: '#ffffff', borderRadius: '20px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Official Match Submission</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Backend will automatically compute probability, team handicap and Elo delta.
              </p>
            </div>

            {/* Mode Select */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
                Game Mode
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setGameMode('1V1')}
                  className={gameMode === '1V1' ? 'btn btn-primary' : 'btn btn-secondary'}
                >
                  <Swords size={16} />
                  <span>1v1 Solo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGameMode('2V2')}
                  className={gameMode === '2V2' ? 'btn btn-primary' : 'btn btn-secondary'}
                >
                  <Users size={16} />
                  <span>2v2 Tag Team</span>
                </button>
              </div>
            </div>

            {/* Teams & Players Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px'
            }}>
              {/* SIDE A */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#2563eb', marginBottom: '12px' }}>
                  Side A (Home)
                </h4>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
                    Player 1
                  </label>
                  <select
                    required
                    className="form-select"
                    value={playerA1}
                    onChange={(e) => setPlayerA1(e.target.value)}
                  >
                    {players.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.player_id})</option>
                    ))}
                  </select>
                </div>

                {gameMode === '2V2' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
                      Player 2 (Teammate)
                    </label>
                    <select
                      required
                      className="form-select"
                      value={playerA2}
                      onChange={(e) => setPlayerA2(e.target.value)}
                    >
                      {players.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.player_id})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
                    FC Team Choice
                  </label>
                  <select
                    required
                    className="form-select"
                    value={teamAId}
                    onChange={(e) => setTeamAId(e.target.value)}
                  >
                    <optgroup label="🌍 National Teams">
                      {teams.filter(t => t.category === 'National').map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.ovr} OVR)</option>
                      ))}
                    </optgroup>
                    <optgroup label="🛡️ Football Clubs">
                      {teams.filter(t => t.category === 'Club').map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.ovr} OVR - {t.league})</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* SIDE B */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#7c3aed', marginBottom: '12px' }}>
                  Side B (Away)
                </h4>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
                    Player 1
                  </label>
                  <select
                    required
                    className="form-select"
                    value={playerB1}
                    onChange={(e) => setPlayerB1(e.target.value)}
                  >
                    {players.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.player_id})</option>
                    ))}
                  </select>
                </div>

                {gameMode === '2V2' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
                      Player 2 (Teammate)
                    </label>
                    <select
                      required
                      className="form-select"
                      value={playerB2}
                      onChange={(e) => setPlayerB2(e.target.value)}
                    >
                      {players.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.player_id})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
                    FC Team Choice
                  </label>
                  <select
                    required
                    className="form-select"
                    value={teamBId}
                    onChange={(e) => setTeamBId(e.target.value)}
                  >
                    <optgroup label="🌍 National Teams">
                      {teams.filter(t => t.category === 'National').map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.ovr} OVR)</option>
                      ))}
                    </optgroup>
                    <optgroup label="🛡️ Football Clubs">
                      {teams.filter(t => t.category === 'Club').map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.ovr} OVR - {t.league})</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>

            {/* Score inputs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '20px',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', marginBottom: '6px' }}>
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

              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#64748b', paddingTop: '20px' }}>:</div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#7c3aed', marginBottom: '6px' }}>
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
                marginBottom: '20px',
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

            {/* Penalty Shootout Option */}
            <div style={{
              marginBottom: '24px',
              padding: '16px 20px',
              borderRadius: '12px',
              background: isPenaltyShootout ? '#faf5ff' : '#f8fafc',
              border: isPenaltyShootout ? '1.5px solid #d8b4fe' : '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚽</span> Decided by Penalty Shootout? {isMatchTied && <span style={{ color: '#2563eb', fontSize: '0.8rem' }}>(Required for Tie)</span>}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
                    Enable this if the match ended in a draw and was decided by penalties.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isMatchTied}
                  onClick={() => handleTogglePenaltyShootout(!isPenaltyShootout)}
                  className={isPenaltyShootout ? 'btn btn-purple' : 'btn btn-secondary'}
                  style={{ padding: '8px 18px', fontSize: '0.85rem', cursor: isMatchTied ? 'not-allowed' : 'pointer' }}
                >
                  {isPenaltyShootout ? '✓ Penalty Shootout Active' : '+ Mark as Penalty Shootout'}
                </button>
              </div>

              {isPenaltyShootout && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e9d5ff' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#7c3aed', marginBottom: '8px' }}>
                    Penalty Shootout Score
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#2563eb', marginBottom: '4px', fontWeight: 600 }}>
                        Side A Penalties
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        placeholder="0"
                        className="form-input"
                        style={{ fontSize: '1.4rem', textAlign: 'center', fontWeight: 800, borderColor: '#7c3aed' }}
                        value={penaltyScoreA}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handlePenaltyChange('A', e.target.value)}
                      />
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#7c3aed', paddingTop: '18px' }}>:</div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#7c3aed', marginBottom: '4px', fontWeight: 600 }}>
                        Side B Penalties
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        placeholder="0"
                        className="form-input"
                        style={{ fontSize: '1.4rem', textAlign: 'center', fontWeight: 800, borderColor: '#7c3aed' }}
                        value={penaltyScoreB}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handlePenaltyChange('B', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Winner Button Group */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                Winner Outcome {isPenaltyShootout ? '(Shootout Winner)' : ''}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: isPenaltyShootout ? '1fr 1fr' : '1fr 1fr 1fr', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setWinnerSide('SIDE_A')}
                  className={winnerSide === 'SIDE_A' ? 'btn btn-primary' : 'btn btn-secondary'}
                >
                  Side A Win {isPenaltyShootout ? '(Pens)' : ''}
                </button>
                {!isPenaltyShootout && (
                  <button
                    type="button"
                    onClick={() => setWinnerSide('DRAW')}
                    className={winnerSide === 'DRAW' ? 'btn btn-primary' : 'btn btn-secondary'}
                  >
                    Draw
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setWinnerSide('SIDE_B')}
                  className={winnerSide === 'SIDE_B' ? 'btn btn-primary' : 'btn btn-secondary'}
                >
                  Side B Win {isPenaltyShootout ? '(Pens)' : ''}
                </button>
              </div>
            </div>

            {/* Auto-approve checkbox */}
            <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="autoApproveCheck"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
              <label htmlFor="autoApproveCheck" style={{ fontSize: '0.9rem', color: '#0f172a', cursor: 'pointer', fontWeight: 600 }}>
                Auto-approve and update Elo ratings immediately
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || isTieBlocked}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                opacity: (submitting || isTieBlocked) ? 0.65 : 1,
                cursor: (submitting || isTieBlocked) ? 'not-allowed' : 'pointer'
              }}
            >
              <span>{submitting ? 'Calculating & Submitting...' : isTieBlocked ? 'Enter Penalties to Submit' : 'Record & Process Match'}</span>
            </button>
          </form>
        )}

      </div>
    </Layout>
  );
}
