import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Swords, Users, Shield, ArrowRight, Check, Search,
  Globe, PlusCircle, Clock, CheckCircle2, AlertCircle, X, ChevronRight, HelpCircle
} from 'lucide-react';

export default function CreateMatchPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      router.replace('/admin/manual');
    }
  }, [user, router]);
  const [gameMode, setGameMode] = useState('1V1');
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [leagueFilter, setLeagueFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(36);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Team Request State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showMyRequestsModal, setShowMyRequestsModal] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');
  const [requestForm, setRequestForm] = useState({
    team_name: '',
    league: '',
    notes: ''
  });

  const loadTeams = async () => {
    try {
      const teamsData = await api.getTeams({ status: 'ACTIVE' });
      setTeams(teamsData);
      if (teamsData.length > 0 && !selectedTeamId) {
        const topTeam = [...teamsData].sort((a, b) => (b.pick_count || 0) - (a.pick_count || 0) || b.ovr - a.ovr)[0];
        setSelectedTeamId(topTeam?.id || teamsData[0].id);
      }
    } catch (err) {
      console.error('Error loading teams', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyRequests = async () => {
    try {
      const reqs = await api.getTeamRequests();
      setMyRequests(reqs);
    } catch (err) {
      console.error('Error loading team requests', err);
    }
  };

  useEffect(() => {
    loadTeams();
    loadMyRequests();
  }, []);

  const handleCreate = async () => {
    if (!selectedTeamId || submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const match = gameMode === '1V1'
        ? await api.create1v1Match(selectedTeamId)
        : await api.create2v2Match(selectedTeamId);
      
      router.push(`/matches/${match.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create match lobby');
      setSubmitting(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestForm.team_name.trim()) {
      setRequestError('Team name is required');
      return;
    }

    setRequestLoading(true);
    setRequestError('');
    setRequestSuccess('');

    try {
      await api.createTeamRequest({
        team_name: requestForm.team_name.trim(),
        league: requestForm.league.trim() || undefined,
        notes: requestForm.notes.trim() || undefined
      });

      setRequestSuccess(`Request for "${requestForm.team_name.trim()}" submitted to admin for review!`);
      setRequestForm({ team_name: '', league: '', notes: '' });
      await loadMyRequests();
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestSuccess('');
      }, 2000);
    } catch (err) {
      setRequestError(err.message || 'Failed to submit team request');
    } finally {
      setRequestLoading(false);
    }
  };

  const selectedTeam = useMemo(() => teams.find(t => t.id === selectedTeamId), [teams, selectedTeamId]);

  const leagues = useMemo(() => {
    const list = teams.map(t => t.league).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [teams]);

  const filteredTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teams.filter((t) => {
      if (categoryFilter === 'POPULAR') {
        const isPopular = (t.pick_count || 0) > 0 || t.ovr >= 85;
        if (!isPopular) return false;
      } else if (categoryFilter === 'NATIONAL') {
        if (t.category !== 'National') return false;
      } else if (categoryFilter === 'CLUB') {
        if (t.category !== 'Club') return false;
      }

      if (leagueFilter !== 'ALL' && t.league !== leagueFilter) return false;

      if (q) {
        const nameMatch = t.name?.toLowerCase().includes(q);
        const leagueMatch = t.league?.toLowerCase().includes(q);
        const codeMatch = t.short_code?.toLowerCase().includes(q);
        const catMatch = t.category?.toLowerCase().includes(q);
        if (!nameMatch && !leagueMatch && !codeMatch && !catMatch) return false;
      }

      return true;
    });
  }, [teams, categoryFilter, leagueFilter, searchQuery]);

  return (
    <Layout title="Create Match Lobby" requireAuth={true}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '12px',
            color: '#b91c1c',
            fontSize: '0.88rem',
            marginBottom: '18px',
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        {/* Section 1: Mode Selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          marginBottom: '20px'
        }}>
          {/* 1v1 Option */}
          <div
            onClick={() => setGameMode('1V1')}
            style={{
              padding: '16px 20px',
              borderRadius: '14px',
              border: gameMode === '1V1' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              backgroundColor: gameMode === '1V1' ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
              boxShadow: gameMode === '1V1' ? '0 4px 12px rgba(37, 99, 235, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: gameMode === '1V1' ? '#2563eb' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: gameMode === '1V1' ? '#ffffff' : '#64748b'
              }}>
                <Swords size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>1v1 Solo</h4>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Individual Duel</span>
              </div>
            </div>
            {gameMode === '1V1' && <Check size={18} color="#2563eb" style={{ strokeWidth: 3 }} />}
          </div>

          {/* 2v2 Option */}
          <div
            onClick={() => setGameMode('2V2')}
            style={{
              padding: '16px 20px',
              borderRadius: '14px',
              border: gameMode === '2V2' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              backgroundColor: gameMode === '2V2' ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
              boxShadow: gameMode === '2V2' ? '0 4px 12px rgba(37, 99, 235, 0.1)' : '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: gameMode === '2V2' ? '#2563eb' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: gameMode === '2V2' ? '#ffffff' : '#64748b'
              }}>
                <Users size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>2v2 Tag Team</h4>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Co-op Tactics</span>
              </div>
            </div>
            {gameMode === '2V2' && <Check size={18} color="#2563eb" style={{ strokeWidth: 3 }} />}
          </div>
        </div>

        {/* Section 2: Selected Team Progressive Detail Bar */}
        {selectedTeam && (
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1.5px solid #2563eb',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: selectedTeam.category === 'National' ? '#e0f2fe' : '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: selectedTeam.category === 'National' ? '#0284c7' : '#2563eb'
              }}>
                {selectedTeam.category === 'National' ? <Globe size={22} /> : <Shield size={22} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedTeam.name}
                  </h4>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#2563eb',
                    background: '#eff6ff',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    {selectedTeam.ovr} OVR
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  <span>{selectedTeam.league}</span>
                  <span>•</span>
                  <span>⚔️ <strong>{selectedTeam.atk || '-'}</strong></span>
                  <span>⚡ <strong>{selectedTeam.mid || '-'}</strong></span>
                  <span>🛡️ <strong>{selectedTeam.def || selectedTeam.def_rating || '-'}</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={submitting}
              className="btn btn-primary touch-target"
              style={{ padding: '10px 24px', fontSize: '0.92rem' }}
            >
              <span>{submitting ? 'Opening Lobby...' : 'Create Match Lobby'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Section 3: Team Picker Header with Request Team Action */}
        <div className="glass-card" style={{ padding: '20px', background: '#ffffff', borderRadius: '18px' }}>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Select Your Team
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Choose an official squad from the league database
              </p>
            </div>

            {/* Request Team Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { setShowRequestModal(true); setRequestError(''); setRequestSuccess(''); }}
                className="btn btn-primary"
                style={{
                  fontSize: '0.82rem',
                  padding: '8px 14px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                }}
              >
                <PlusCircle size={15} />
                <span>Team not available? Request a new team</span>
              </button>

              {myRequests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMyRequestsModal(true)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '8px 12px' }}
                >
                  <Clock size={15} color="#64748b" />
                  <span>My Requests ({myRequests.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Category & Search Bar (Changed "All Leagues" to Search) */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '16px',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {/* Category Filter Pills */}
            <div className="touch-tab-bar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', maxWidth: '100%' }}>
              {[
                { id: 'ALL', label: `All (${teams.length})` },
                { id: 'POPULAR', label: 'Popular' },
                { id: 'NATIONAL', label: 'National' },
                { id: 'CLUB', label: 'Clubs' }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setCategoryFilter(cat.id); setDisplayLimit(36); }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: categoryFilter === cat.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: categoryFilter === cat.id ? '#eff6ff' : '#ffffff',
                    color: categoryFilter === cat.id ? '#2563eb' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    minHeight: '40px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.12s ease'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Input (Replaced All Leagues option so users can search and find teams) */}
            <div style={{
              position: 'relative',
              flex: '1 1 240px',
              minWidth: '220px',
              maxWidth: '360px'
            }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: searchQuery ? '#2563eb' : '#94a3b8',
                  pointerEvents: 'none',
                  transition: 'color 0.15s ease'
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDisplayLimit(36);
                }}
                placeholder="Search teams or leagues..."
                style={{
                  width: '100%',
                  padding: '9px 34px 9px 36px',
                  fontSize: '16px', // 16px prevents iOS Safari auto-zoom
                  borderRadius: '10px',
                  border: searchQuery ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  outline: 'none',
                  minHeight: '40px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  if (!searchQuery) {
                    e.target.style.borderColor = '#cbd5e1';
                  }
                  e.target.style.boxShadow = 'none';
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDisplayLimit(36);
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#f1f5f9',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '3px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Compact Teams Grid */}
          <div style={{ maxHeight: '460px', overflowY: 'auto', paddingRight: '4px' }}>
            {filteredTeams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  {searchQuery ? `No teams found matching "${searchQuery}"` : 'No teams found for this filter'}
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => { setCategoryFilter('ALL'); setLeagueFilter('ALL'); setSearchQuery(''); }}
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                  >
                    Reset Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (searchQuery) {
                        setRequestForm(prev => ({ ...prev, team_name: searchQuery }));
                      }
                      setShowRequestModal(true);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                  >
                    <PlusCircle size={14} />
                    <span>Request Team</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="team-select-grid">
                {filteredTeams.slice(0, displayLimit).map((t) => {
                  const isSelected = t.id === selectedTeamId;
                  const isNational = t.category === 'National';

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTeamId(t.id)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        minHeight: '48px',
                        transition: 'all 0.12s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.12)' : 'none'
                      }}
                    >
                      <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          backgroundColor: isNational ? '#e0f2fe' : '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isNational ? '#0284c7' : '#2563eb',
                          flexShrink: 0
                        }}>
                          {isNational ? <Globe size={15} /> : <Shield size={15} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h5 style={{
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {t.name}
                          </h5>
                          <p style={{
                            fontSize: '0.7rem',
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {t.league}
                          </p>
                        </div>
                      </div>

                      <div style={{
                        textAlign: 'center',
                        background: t.ovr >= 85 ? '#eff6ff' : '#f8fafc',
                        border: t.ovr >= 85 ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '2px 7px',
                        minWidth: '34px',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: t.ovr >= 85 ? '#2563eb' : '#0f172a' }}>
                          {t.ovr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredTeams.length > displayLimit && (
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setDisplayLimit(prev => prev + 36)}
                  className="btn btn-secondary touch-target"
                  style={{ padding: '8px 20px', fontSize: '0.84rem' }}
                >
                  Load More ({filteredTeams.length - displayLimit} remaining)
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL 1: Request New Team Modal */}
      {showRequestModal && (
        <div className="mobile-modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="mobile-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Request a New Team
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Submit a missing squad to admins for review and addition
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="mobile-drawer-close"
                aria-label="Close"
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleRequestSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {requestError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} />
                  <span>{requestError}</span>
                </div>
              )}

              {requestSuccess && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#059669',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} />
                  <span>{requestSuccess}</span>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Team Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bayer Leverkusen, Sporting CP, Inter Miami"
                  value={requestForm.team_name}
                  onChange={(e) => setRequestForm({ ...requestForm, team_name: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  League / Competition <span style={{ color: '#94a3b8' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bundesliga, Liga Portugal, MLS"
                  value={requestForm.league}
                  onChange={(e) => setRequestForm({ ...requestForm, league: e.target.value })}
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Additional Notes <span style={{ color: '#94a3b8' }}>(optional)</span>
                </label>
                <textarea
                  placeholder="Any details, suggested ratings, or reason for request..."
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  className="form-input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="btn btn-secondary touch-target"
                  style={{ padding: '10px 18px', fontSize: '0.88rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestLoading || !requestForm.team_name.trim()}
                  className="btn btn-primary touch-target"
                  style={{ padding: '10px 22px', fontSize: '0.88rem' }}
                >
                  {requestLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: View My Requests Status Modal */}
      {showMyRequestsModal && (
        <div className="mobile-modal-overlay" onClick={() => setShowMyRequestsModal(false)}>
          <div className="mobile-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  My Team Requests
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Live tracking of teams you have requested
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMyRequestsModal(false)}
                className="mobile-drawer-close"
                aria-label="Close"
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            {/* List */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
              {myRequests.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', padding: '24px 0' }}>
                  You haven't requested any teams yet.
                </p>
              ) : (
                myRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: req.status === 'APPROVED' ? '#f0fdf4' : req.status === 'REJECTED' ? '#fff1f2' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                          {req.team_name}
                        </h4>
                        {req.league && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#ffffff', padding: '1px 7px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                            {req.league}
                          </span>
                        )}
                      </div>

                      {req.notes && (
                        <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                          Note: {req.notes}
                        </p>
                      )}

                      {req.status === 'REJECTED' && req.rejection_reason && (
                        <div style={{
                          marginTop: '6px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          fontSize: '0.76rem',
                          fontWeight: 600
                        }}>
                          Reason: {req.rejection_reason}
                        </div>
                      )}

                      <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px' }}>
                        Submitted {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <span className={
                      req.status === 'APPROVED'
                        ? 'badge badge-emerald'
                        : req.status === 'REJECTED'
                        ? 'badge badge-rose'
                        : 'badge badge-gold'
                    }>
                      {req.status === 'APPROVED' && <CheckCircle2 size={12} />}
                      {req.status === 'REJECTED' && <AlertCircle size={12} />}
                      {req.status === 'PENDING' && <Clock size={12} />}
                      {req.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', background: '#f8fafc', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setShowMyRequestsModal(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
