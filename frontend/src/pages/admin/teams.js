import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import ArenaDataLoader from '../../components/MorphingInfinity';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  Shield, Plus, Edit2, Trash2, Save, X, Check, Globe, Search,
  Building2, ChevronLeft, ChevronRight, Clock, CheckCircle2, 
  AlertCircle, AlertTriangle, Layers, Inbox
} from 'lucide-react';

const PAGE_SIZE = 36;

export default function AdminTeamsPage() {
  const { user, hasPermission } = useAuth();
  const canCreateTeam = hasPermission ? hasPermission('CREATE_TEAM') : false;
  const canEditTeam = hasPermission ? hasPermission('EDIT_TEAM') : false;
  const canDeleteTeam = hasPermission ? hasPermission('DELETE_TEAM') : false;
  const canApproveRequests = hasPermission ? hasPermission('APPROVE_TEAM_REQUESTS') : false;

  const [activeTab, setActiveTab] = useState('TEAMS'); // 'TEAMS' | 'REQUESTS'
  const [teams, setTeams] = useState([]);
  const [teamRequests, setTeamRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [leagueFilter, setLeagueFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('PENDING'); // 'PENDING' | 'ALL' | 'APPROVED' | 'REJECTED'
  const [currentPage, setCurrentPage] = useState(1);

  // Create / Edit Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [name, setName] = useState('');
  const [league, setLeague] = useState('Premier League');
  const [ovr, setOvr] = useState(82);
  const [atk, setAtk] = useState(82);
  const [mid, setMid] = useState(82);
  const [defRating, setDefRating] = useState(82);
  const [category, setCategory] = useState('Club');
  const [shortCode, setShortCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [error, setError] = useState('');

  // Delete Team State
  const [deletingTeam, setDeletingTeam] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [reviewTeamName, setReviewTeamName] = useState('');
  const [reviewLeague, setReviewLeague] = useState('');
  const [reviewOvr, setReviewOvr] = useState(80);
  const [reviewAtk, setReviewAtk] = useState(80);
  const [reviewMid, setReviewMid] = useState(80);
  const [reviewDef, setReviewDef] = useState(80);
  const [reviewCategory, setReviewCategory] = useState('Club');
  const [reviewShortCode, setReviewShortCode] = useState('');
  const [reviewAdminNotes, setReviewAdminNotes] = useState('');
  const [reviewAction, setReviewAction] = useState(null); // 'APPROVE' | 'REJECT'
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const fetchTeamsAndRequests = async () => {
    setLoading(true);
    try {
      const [tData, rData] = await Promise.all([
        api.getTeams(),
        api.getTeamRequests()
      ]);
      setTeams(tData);
      setTeamRequests(rData);
    } catch (err) {
      console.error('Failed to load teams data', err);
    } finally {
      setLoading(false);
    }
  };
  const loadData = fetchTeamsAndRequests;

  useEffect(() => {
    fetchTeamsAndRequests();
  }, []);

  // Reset pagination when category, league, or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, leagueFilter, searchQuery]);

  // Extract unique leagues
  const leagues = useMemo(() => {
    const list = teams.map(t => t.league).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [teams]);

  // Filtered teams with search
  const filteredTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teams.filter(t => {
      if (categoryFilter === 'NATIONAL' && t.category !== 'National') return false;
      if (categoryFilter === 'CLUB' && t.category !== 'Club') return false;
      if (leagueFilter !== 'ALL' && t.league !== leagueFilter) return false;
      if (q) {
        const nameMatch = t.name?.toLowerCase().includes(q);
        const leagueMatch = t.league?.toLowerCase().includes(q);
        const shortMatch = t.short_code?.toLowerCase().includes(q);
        if (!nameMatch && !leagueMatch && !shortMatch) return false;
      }
      return true;
    });
  }, [teams, categoryFilter, leagueFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / PAGE_SIZE));
  const displayedTeams = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTeams.slice(start, start + PAGE_SIZE);
  }, [filteredTeams, currentPage]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    if (requestStatusFilter === 'ALL') return teamRequests;
    return teamRequests.filter(r => r.status === requestStatusFilter);
  }, [teamRequests, requestStatusFilter]);

  const pendingCount = useMemo(() => {
    return teamRequests.filter(r => r.status === 'PENDING').length;
  }, [teamRequests]);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Team name cannot be empty');
      return;
    }

    // Client-side duplicate check
    const isDuplicate = teams.some(
      t => t.name.toLowerCase() === trimmedName.toLowerCase() && (!editingTeam || t.id !== editingTeam.id)
    );
    if (isDuplicate) {
      setError(`A team with name "${trimmedName}" already exists in the database.`);
      return;
    }

    setSubmitting(true);
    try {
      if (editingTeam) {
        await api.updateTeam(editingTeam.id, {
          name: trimmedName,
          league: league.trim(),
          ovr: parseInt(ovr, 10),
          atk: parseInt(atk, 10),
          mid: parseInt(mid, 10),
          def: parseInt(defRating, 10),
          category
        });
      } else {
        await api.createTeam({
          name: trimmedName,
          league: league.trim(),
          ovr: parseInt(ovr, 10),
          atk: parseInt(atk, 10),
          mid: parseInt(mid, 10),
          def: parseInt(defRating, 10),
          category
        });
      }
      setShowCreateModal(false);
      setEditingTeam(null);
      await fetchTeamsAndRequests();
    } catch (err) {
      setError(err.message || 'Failed to save team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deletingTeam) return;
    setDeleteSubmitting(true);
    setDeleteError('');

    try {
      await api.deleteTeam(deletingTeam.id);
      setDeletingTeam(null);
      await fetchTeamsAndRequests();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete team');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const openNew = () => {
    setEditingTeam(null);
    setName('');
    setLeague(leagues[0] || 'Premier League');
    setOvr(80);
    setAtk(80);
    setMid(80);
    setDefRating(80);
    setCategory('Club');
    setError('');
    setShowCreateModal(true);
  };

  const openEdit = (t) => {
    setEditingTeam(t);
    setName(t.name);
    setLeague(t.league);
    setOvr(t.ovr);
    setAtk(t.atk);
    setMid(t.mid);
    setDefRating(t.def || t.def_rating);
    setCategory(t.category || 'Club');
    setError('');
    setShowCreateModal(true);
  };

  const openReviewModal = (req, action) => {
    setReviewingRequest(req);
    setReviewAction(action);
    setReviewError('');
    if (action === 'APPROVE') {
      setReviewLeague(req.league || 'Rest of World');
      setReviewOvr(80);
      setReviewAtk(80);
      setReviewMid(80);
      setReviewDef(80);
      setReviewCategory('Club');
    } else {
      setRejectionReason('');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewingRequest || !reviewAction) return;

    setReviewSubmitting(true);
    setReviewError('');

    try {
      const payload = {
        action: reviewAction,
        rejection_reason: reviewAction === 'REJECT' ? rejectionReason : undefined,
        league: reviewAction === 'APPROVE' ? reviewLeague : undefined,
        ovr: reviewAction === 'APPROVE' ? parseInt(reviewOvr, 10) : undefined,
        atk: reviewAction === 'APPROVE' ? parseInt(reviewAtk, 10) : undefined,
        mid: reviewAction === 'APPROVE' ? parseInt(reviewMid, 10) : undefined,
        def: reviewAction === 'APPROVE' ? parseInt(reviewDef, 10) : undefined,
        category: reviewAction === 'APPROVE' ? reviewCategory : undefined
      };

      await api.reviewTeamRequest(reviewingRequest.id, payload);
      setReviewingRequest(null);
      setReviewAction(null);
      await fetchTeamsAndRequests();
    } catch (err) {
      setReviewError(err.message || 'Failed to review team request');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Teams & Requests" requireAuth={true}>
        <ArenaDataLoader text="Loading FC Teams & Requests..." subtext="Syncing official club ratings and squad database..." />
      </Layout>
    );
  }

  const clubCount = teams.filter(t => t.category === 'Club').length;
  const nationalCount = teams.filter(t => t.category === 'National').length;

  return (
    <Layout title="Team Management" requireAuth={true}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Top Header & Tab Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Team & Squad Management</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              Manage official FC rosters, configure ratings, and review player requests
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* View Mode Tabs */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('TEAMS')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: activeTab === 'TEAMS' ? '#ffffff' : 'transparent',
                  color: activeTab === 'TEAMS' ? '#0f172a' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'TEAMS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Shield size={16} />
                <span>Teams ({teams.length})</span>
              </button>

              {canApproveRequests && (
                <button
                  type="button"
                  onClick={() => setActiveTab('REQUESTS')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: activeTab === 'REQUESTS' ? '#ffffff' : 'transparent',
                    color: activeTab === 'REQUESTS' ? '#0f172a' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: activeTab === 'REQUESTS' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Inbox size={16} />
                  <span>Team Requests</span>
                  {pendingCount > 0 && (
                    <span style={{
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '10px'
                    }}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {activeTab === 'TEAMS' && canCreateTeam && (
              <button onClick={openNew} className="btn btn-primary touch-target" style={{ padding: '8px 16px', fontSize: '0.86rem' }}>
                <Plus size={16} />
                <span>Add Team</span>
              </button>
            )}

          </div>
        </div>

        {/* TAB 1: TEAMS DATABASE */}
        {activeTab === 'TEAMS' && (
          <div>
            {/* Category & League Filter Bar (No search bar) */}
            <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px', background: '#ffffff', borderRadius: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                
                {/* Category Filter Pills */}
                <div className="touch-tab-bar" style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('ALL')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: categoryFilter === 'ALL' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: categoryFilter === 'ALL' ? '#eff6ff' : '#ffffff',
                      color: categoryFilter === 'ALL' ? '#2563eb' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      minHeight: '40px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    All ({teams.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('CLUB')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: categoryFilter === 'CLUB' ? '1px solid #7c3aed' : '1px solid #e2e8f0',
                      backgroundColor: categoryFilter === 'CLUB' ? '#f5f3ff' : '#ffffff',
                      color: categoryFilter === 'CLUB' ? '#7c3aed' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      minHeight: '40px',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Building2 size={14} /> Clubs ({clubCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('NATIONAL')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: categoryFilter === 'NATIONAL' ? '1px solid #0284c7' : '1px solid #e2e8f0',
                      backgroundColor: categoryFilter === 'NATIONAL' ? '#e0f2fe' : '#ffffff',
                      color: categoryFilter === 'NATIONAL' ? '#0284c7' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      minHeight: '40px',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Globe size={14} /> National ({nationalCount})
                  </button>
                </div>

                {/* Search Bar & League Dropdown Filter */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1 1 320px', justifyContent: 'flex-end' }}>
                  {/* Search Input */}
                  <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px', maxWidth: '300px' }}>
                    <Search
                      size={15}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: searchQuery ? '#2563eb' : '#94a3b8',
                        pointerEvents: 'none'
                      }}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search teams or leagues..."
                      style={{
                        width: '100%',
                        padding: '8px 30px 8px 34px',
                        fontSize: '0.85rem',
                        borderRadius: '10px',
                        border: searchQuery ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        outline: 'none',
                        minHeight: '40px',
                        boxSizing: 'border-box'
                      }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
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
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* League Dropdown Filter */}
                  <div style={{ minWidth: '170px', flex: '0 1 200px' }}>
                    <select
                      value={leagueFilter}
                      onChange={(e) => setLeagueFilter(e.target.value)}
                      className="form-select"
                      style={{
                        fontSize: '0.85rem',
                        padding: '8px 14px',
                        backgroundColor: '#ffffff',
                        borderColor: leagueFilter !== 'ALL' ? '#2563eb' : '#cbd5e1',
                        color: '#0f172a',
                        borderRadius: '10px',
                        minHeight: '40px',
                        width: '100%'
                      }}
                    >
                      <option value="ALL">All Leagues ({leagues.length})</option>
                      {leagues.map(l => (
                        <option key={l} value={l}>
                          {l} ({teams.filter(t => t.league === l).length})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Status and count */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  Showing <strong style={{ color: '#0f172a' }}>{filteredTeams.length === 0 ? 0 : ((currentPage - 1) * PAGE_SIZE) + 1}</strong> to <strong style={{ color: '#0f172a' }}>{Math.min(currentPage * PAGE_SIZE, filteredTeams.length)}</strong> of <strong style={{ color: '#2563eb' }}>{filteredTeams.length}</strong> teams
                  {(categoryFilter !== 'ALL' || leagueFilter !== 'ALL' || searchQuery !== '') && (
                    <button
                      type="button"
                      onClick={() => { setCategoryFilter('ALL'); setLeagueFilter('ALL'); setSearchQuery(''); }}
                      style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#e11d48', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline', fontWeight: 600 }}
                    >
                      Reset filters
                    </button>
                  )}
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Page {currentPage} of {totalPages}</span>
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', opacity: currentPage === 1 ? 0.4 : 1 }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', opacity: currentPage === totalPages ? 0.4 : 1 }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Empty State */}
            {filteredTeams.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', background: '#ffffff', borderRadius: '20px' }}>
                <Shield size={48} color="#94a3b8" style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                <h4 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>No teams found</h4>
                <p style={{ marginTop: '8px', fontSize: '0.88rem' }}>
                  No teams matched the selected category or league.
                </p>
                <button
                  onClick={() => { setCategoryFilter('ALL'); setLeagueFilter('ALL'); }}
                  className="btn btn-primary"
                  style={{ marginTop: '16px' }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              /* Teams Grid */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: '14px'
              }}>
                {displayedTeams.map((t) => (
                  <div key={t.id} className="glass-card glass-card-hover" style={{ padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff', borderRadius: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: t.category === 'National' ? '#e0f2fe' : '#eff6ff',
                            border: t.category === 'National' ? '1px solid #bae6fd' : '1px solid #bfdbfe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: t.category === 'National' ? '#0284c7' : '#2563eb',
                            flexShrink: 0
                          }}>
                            {t.category === 'National' ? <Globe size={20} /> : <Shield size={20} />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <h4 style={{
                              fontSize: '1rem',
                              fontWeight: 800,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {t.name}
                            </h4>
                            <p style={{
                              fontSize: '0.74rem',
                              color: '#64748b',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {t.league}
                            </p>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                          <span style={{
                            fontSize: '1.4rem',
                            fontWeight: 900,
                            color: t.ovr >= 85 ? '#2563eb' : '#0f172a',
                            fontFamily: 'monospace'
                          }}>
                            {t.ovr}
                          </span>
                          <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800 }}>OVR</p>
                        </div>
                      </div>

                      {/* Stats Bar */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '6px',
                        padding: '8px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        marginBottom: '14px'
                      }}>
                        <div>
                          <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>ATK</p>
                          <p style={{ fontSize: '1rem', fontWeight: 800, color: '#e11d48' }}>{t.atk}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>MID</p>
                          <p style={{ fontSize: '1rem', fontWeight: 800, color: '#2563eb' }}>{t.mid}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>DEF</p>
                          <p style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>{t.def || t.def_rating}</p>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: t.category === 'National' ? '#0284c7' : '#64748b',
                        textTransform: 'uppercase'
                      }}>
                        {t.category}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {canEditTeam && (
                          <button
                            onClick={() => openEdit(t)}
                            className="btn btn-secondary touch-target"
                            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                        )}
                        {canDeleteTeam && (
                          <button
                            onClick={() => { setDeletingTeam(t); setDeleteError(''); }}
                            className="btn btn-secondary touch-target"
                            style={{ padding: '5px 10px', fontSize: '0.78rem', color: '#ef4444' }}
                            title="Delete Team"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginTop: '28px',
                marginBottom: '40px',
                flexWrap: 'wrap'
              }}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="btn btn-secondary touch-target"
                  style={{ padding: '8px 14px', fontSize: '0.82rem', opacity: currentPage === 1 ? 0.4 : 1 }}
                >
                  First
                </button>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="btn btn-secondary touch-target"
                  style={{ padding: '8px 14px', fontSize: '0.82rem', opacity: currentPage === 1 ? 0.4 : 1 }}
                >
                  <ChevronLeft size={16} />
                  <span>Prev</span>
                </button>

                <span style={{ padding: '0 12px', fontSize: '0.88rem', fontWeight: 700, color: '#2563eb' }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="btn btn-secondary touch-target"
                  style={{ padding: '8px 14px', fontSize: '0.82rem', opacity: currentPage === totalPages ? 0.4 : 1 }}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="btn btn-secondary touch-target"
                  style={{ padding: '8px 14px', fontSize: '0.82rem', opacity: currentPage === totalPages ? 0.4 : 1 }}
                >
                  Last
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEAM REQUESTS REVIEW */}
        {activeTab === 'REQUESTS' && (
          <div>
            {/* Status Filter Pills */}
            <div className="glass-card" style={{ padding: '14px 20px', marginBottom: '20px', background: '#ffffff', borderRadius: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>Filter:</span>
                {[
                  { id: 'PENDING', label: `Pending (${teamRequests.filter(r => r.status === 'PENDING').length})` },
                  { id: 'APPROVED', label: `Approved (${teamRequests.filter(r => r.status === 'APPROVED').length})` },
                  { id: 'REJECTED', label: `Rejected (${teamRequests.filter(r => r.status === 'REJECTED').length})` },
                  { id: 'ALL', label: `All Requests (${teamRequests.length})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRequestStatusFilter(tab.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: requestStatusFilter === tab.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: requestStatusFilter === tab.id ? '#eff6ff' : '#ffffff',
                      color: requestStatusFilter === tab.id ? '#2563eb' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Requests List */}
            {filteredRequests.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '20px', color: '#64748b' }}>
                <Inbox size={48} color="#94a3b8" style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                <h4 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>No requests in this view</h4>
                <p style={{ marginTop: '8px', fontSize: '0.88rem' }}>
                  There are currently no {requestStatusFilter.toLowerCase()} team requests.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredRequests.map(req => (
                  <div
                    key={req.id}
                    className="glass-card"
                    style={{
                      padding: '18px 20px',
                      background: '#ffffff',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '14px'
                    }}
                  >
                    <div style={{ minWidth: '240px', flex: '1 1 300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                          {req.team_name}
                        </h4>
                        {req.league && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                            {req.league}
                          </span>
                        )}
                        <span className={
                          req.status === 'APPROVED' ? 'badge badge-emerald' :
                          req.status === 'REJECTED' ? 'badge badge-rose' : 'badge badge-gold'
                        }>
                          {req.status === 'APPROVED' && <CheckCircle2 size={12} />}
                          {req.status === 'REJECTED' && <AlertCircle size={12} />}
                          {req.status === 'PENDING' && <Clock size={12} />}
                          {req.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>Requested by: <strong style={{ color: '#0f172a' }}>{req.player_name || 'Player'}</strong> ({req.player_id})</span>
                        <span>•</span>
                        <span>Date: {new Date(req.created_at).toLocaleString()}</span>
                      </div>

                      {req.notes && (
                        <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '6px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <strong>Player Notes:</strong> {req.notes}
                        </p>
                      )}

                      {req.status === 'REJECTED' && req.rejection_reason && (
                        <p style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '6px', background: '#fee2e2', padding: '6px 10px', borderRadius: '6px' }}>
                          <strong>Rejection Reason:</strong> {req.rejection_reason}
                        </p>
                      )}
                    </div>

                    {/* Admin Actions for Pending Requests */}
                    {req.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => openReviewModal(req, 'APPROVE')}
                          className="btn btn-emerald touch-target"
                          style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                        >
                          <Check size={15} />
                          <span>Approve & Add</span>
                        </button>
                        <button
                          onClick={() => openReviewModal(req, 'REJECT')}
                          className="btn btn-rose touch-target"
                          style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                        >
                          <X size={15} />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL: Create / Edit Team */}
        {showCreateModal && (
          <div className="mobile-modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="mobile-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div style={{
                padding: '18px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingTeam ? `Edit ${editingTeam.name}` : 'Add New FC Team'}
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="mobile-drawer-close">
                  <X size={20} color="#64748b" />
                </button>
              </div>

              {error && (
                <div style={{ margin: '16px 20px 0 20px', padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateOrUpdate} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>Team Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" required className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>League <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="text" required className="form-input" value={league} onChange={(e) => setLeague(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>Category</label>
                    <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="Club">Club</option>
                      <option value="National">National</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>Overall (OVR)</label>
                    <input type="number" min="50" max="99" required className="form-input" value={ovr} onChange={(e) => setOvr(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>Attack (ATK)</label>
                    <input type="number" min="50" max="99" required className="form-input" value={atk} onChange={(e) => setAtk(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>Midfield (MID)</label>
                    <input type="number" min="50" max="99" required className="form-input" value={mid} onChange={(e) => setMid(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>Defense (DEF)</label>
                    <input type="number" min="50" max="99" required className="form-input" value={defRating} onChange={(e) => setDefRating(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary touch-target">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn btn-primary touch-target">
                    <Save size={16} />
                    <span>{submitting ? 'Saving...' : 'Save Team'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Confirm Delete Team */}
        {deletingTeam && (
          <div className="mobile-modal-overlay" onClick={() => setDeletingTeam(null)}>
            <div className="mobile-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto'
                }}>
                  <AlertTriangle size={24} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Delete Team
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '8px' }}>
                  Are you sure you want to delete <strong>{deletingTeam.name}</strong> from the database? This action cannot be undone.
                </p>

                {deleteError && (
                  <div style={{ marginTop: '12px', padding: '8px 12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.82rem' }}>
                    {deleteError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '22px' }}>
                  <button
                    type="button"
                    onClick={() => setDeletingTeam(null)}
                    className="btn btn-secondary touch-target"
                    style={{ padding: '10px 20px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteTeam}
                    disabled={deleteSubmitting}
                    className="btn btn-rose touch-target"
                    style={{ padding: '10px 20px' }}
                  >
                    {deleteSubmitting ? 'Deleting...' : 'Yes, Delete Team'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Review Request (Approve or Reject) */}
        {reviewingRequest && (
          <div className="mobile-modal-overlay" onClick={() => setReviewingRequest(null)}>
            <div className="mobile-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div style={{
                padding: '18px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    {reviewAction === 'APPROVE' ? `Approve "${reviewingRequest.team_name}"` : `Reject Request`}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Requested by {reviewingRequest.player_name || reviewingRequest.player_id}
                  </p>
                </div>
                <button onClick={() => setReviewingRequest(null)} className="mobile-drawer-close">
                  <X size={20} color="#64748b" />
                </button>
              </div>

              {reviewError && (
                <div style={{ margin: '16px 20px 0 20px', padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {reviewError}
                </div>
              )}

              <form onSubmit={handleReviewSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {reviewAction === 'APPROVE' ? (
                  <>
                    <p style={{ fontSize: '0.84rem', color: '#475569' }}>
                      Approving will automatically add this squad to the live database for all players. Specify the initial ratings:
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>League</label>
                        <input
                          type="text"
                          required
                          className="form-input"
                          value={reviewLeague}
                          onChange={(e) => setReviewLeague(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>Category</label>
                        <select className="form-select" value={reviewCategory} onChange={(e) => setReviewCategory(e.target.value)}>
                          <option value="Club">Club</option>
                          <option value="National">National</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>Overall (OVR)</label>
                        <input
                          type="number"
                          min="50"
                          max="99"
                          required
                          className="form-input"
                          value={reviewOvr}
                          onChange={(e) => setReviewOvr(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>Attack (ATK)</label>
                        <input
                          type="number"
                          min="50"
                          max="99"
                          required
                          className="form-input"
                          value={reviewAtk}
                          onChange={(e) => setReviewAtk(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>Midfield (MID)</label>
                        <input
                          type="number"
                          min="50"
                          max="99"
                          required
                          className="form-input"
                          value={reviewMid}
                          onChange={(e) => setReviewMid(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>Defense (DEF)</label>
                        <input
                          type="number"
                          min="50"
                          max="99"
                          required
                          className="form-input"
                          value={reviewDef}
                          onChange={(e) => setReviewDef(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: '#475569', marginBottom: '6px', fontWeight: 700 }}>
                      Rejection Reason <span style={{ color: '#94a3b8' }}>(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Not available in current FC title, duplicate request, etc."
                      className="form-input"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setReviewingRequest(null)} className="btn btn-secondary touch-target">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className={reviewAction === 'APPROVE' ? 'btn btn-emerald touch-target' : 'btn btn-rose touch-target'}
                  >
                    {reviewSubmitting ? 'Processing...' : reviewAction === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
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
