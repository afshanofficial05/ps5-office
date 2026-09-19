import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Swords, Users, ArrowRight, Hash } from 'lucide-react';

export default function JoinMatchPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      router.replace('/admin');
    }
  }, [user, router]);

  const [matchCodeInput, setMatchCodeInput] = useState('');
  const [openMatches, setOpenMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadOpenMatches() {
      try {
        const matches = await api.getMatches({ status: 'WAITING', limit: 20 });
        if (isMounted) setOpenMatches(matches);
      } catch (err) {
        console.error('Error fetching open matches', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadOpenMatches();
    return () => { isMounted = false; };
  }, []);

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!matchCodeInput.trim()) return;
    setCodeError('');

    try {
      const match = await api.getMatch(matchCodeInput.trim().toUpperCase());
      router.push(`/matches/${match.id}`);
    } catch (err) {
      setCodeError('Match code not found or invalid');
    }
  };

  return (
    <Layout title="Join Match" requireAuth={true}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Enter Code Box */}
        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', background: '#ffffff', borderRadius: '18px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
            Enter Lobby Code
          </h3>

          {codeError && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '10px',
              color: '#b91c1c',
              fontSize: '0.85rem',
              marginBottom: '14px',
              fontWeight: 600
            }}>
              {codeError}
            </div>
          )}

          <form onSubmit={handleJoinByCode} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', position: 'relative' }}>
              <Hash size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="PSO-1024"
                className="form-input"
                style={{
                  paddingLeft: '42px',
                  fontSize: '1rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  border: '1px solid #cbd5e1',
                  minHeight: '44px'
                }}
                value={matchCodeInput}
                onChange={(e) => setMatchCodeInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary touch-target" style={{ padding: '0 24px', minHeight: '44px' }}>
              <span>Join Lobby</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Open Waiting Lobbies */}
        <div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
            Open Lobbies ({openMatches.length})
          </h4>

          {openMatches.length === 0 ? (
            <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: '16px' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No open lobbies currently waiting</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {openMatches.map((m) => {
                const creator = m.players?.[0];
                return (
                  <div
                    key={m.id}
                    className="glass-card glass-card-hover"
                    style={{
                      padding: '14px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      background: '#ffffff',
                      borderRadius: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2563eb'
                      }}>
                        {m.game_mode === '1V1' ? <Swords size={18} /> : <Users size={18} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                            {m.match_code}
                          </span>
                          <span className={m.game_mode === '1V1' ? 'badge badge-primary' : 'badge badge-purple'}>
                            {m.game_mode}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Host: <strong style={{ color: '#0f172a' }}>{m.creator_name || creator?.player_name}</strong> • {creator?.team_name || 'FC Team'} ({creator?.team_ovr || '-'} OVR)
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push(`/matches/${m.id}`)}
                      className="btn btn-primary"
                      style={{ padding: '6px 16px', fontSize: '0.82rem' }}
                    >
                      <LogIn size={14} />
                      <span>Join</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
