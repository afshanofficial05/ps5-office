import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  Bug, Search, Filter, RefreshCw, CheckCircle2, Clock, 
  AlertTriangle, AlertCircle, X, ExternalLink, Image as ImageIcon,
  Laptop, User, MessageSquare, Check, ShieldAlert, ChevronRight, Eye
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'MATCHES', label: 'Matches' },
  { id: 'SUBMISSIONS', label: 'Submissions' },
  { id: 'LEADERBOARD', label: 'Leaderboard' },
  { id: 'TEAMS', label: 'Teams' },
  { id: 'PROFILE', label: 'Profile' },
  { id: 'UI_ALIGNMENT', label: 'UI & Layout' },
  { id: 'OTHER', label: 'Other' },
];

const SEVERITIES = [
  { id: 'ALL', label: 'All Severities' },
  { id: 'CRITICAL', label: 'Critical', color: '#dc2626', bg: '#fee2e2' },
  { id: 'HIGH', label: 'High', color: '#ea580c', bg: '#ffedd5' },
  { id: 'MEDIUM', label: 'Medium', color: '#d97706', bg: '#fef3c7' },
  { id: 'LOW', label: 'Low', color: '#64748b', bg: '#f1f5f9' },
];

export default function AdminBugsPage() {
  const { user } = useAuth();
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter State
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Bug Modal
  const [selectedBug, setSelectedBug] = useState(null);
  const [newStatus, setNewStatus] = useState('OPEN');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  const loadBugs = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.getAllBugReports();
      setBugs(data || []);
    } catch (err) {
      console.error('Failed to load bugs', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBugs();
  }, []);

  const openModal = (bug) => {
    setSelectedBug(bug);
    setNewStatus(bug.status);
    setAdminNotes(bug.admin_notes || '');
    setUpdateError('');
    setUpdateSuccess('');
  };

  const closeModal = () => {
    setSelectedBug(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedBug) return;

    setUpdating(true);
    setUpdateError('');
    setUpdateSuccess('');

    try {
      const updated = await api.updateBugReport(selectedBug.id, {
        status: newStatus,
        admin_notes: adminNotes.trim()
      });

      // Update in local state
      setBugs(prev => prev.map(b => b.id === updated.id ? updated : b));
      setSelectedBug(updated);
      setUpdateSuccess('Bug report status and developer notes updated successfully!');
      setTimeout(() => setUpdateSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update bug', err);
      setUpdateError(err.message || 'Failed to update bug report');
    } finally {
      setUpdating(false);
    }
  };

  // Metrics
  const totalCount = bugs.length;
  const openCount = bugs.filter(b => b.status === 'OPEN').length;
  const inProgressCount = bugs.filter(b => b.status === 'IN_PROGRESS').length;
  const resolvedCount = bugs.filter(b => b.status === 'RESOLVED').length;

  // Filtered List
  const filteredBugs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bugs.filter(b => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (severityFilter !== 'ALL' && b.severity !== severityFilter) return false;
      if (categoryFilter !== 'ALL' && b.category !== categoryFilter) return false;

      if (q) {
        const titleMatch = b.title?.toLowerCase().includes(q);
        const descMatch = b.description?.toLowerCase().includes(q);
        const reporterMatch = b.reporter_name?.toLowerCase().includes(q) || b.reporter_player_id?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !reporterMatch) return false;
      }
      return true;
    });
  }, [bugs, statusFilter, severityFilter, categoryFilter, searchQuery]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 9px',
            borderRadius: '9999px',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            fontSize: '0.72rem',
            fontWeight: 800,
            border: '1px solid #fde68a'
          }}>
            <Clock size={11} /> OPEN
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 9px',
            borderRadius: '9999px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            fontSize: '0.72rem',
            fontWeight: 800,
            border: '1px solid #bfdbfe'
          }}>
            <RefreshCw size={11} /> IN PROGRESS
          </span>
        );
      case 'RESOLVED':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 9px',
            borderRadius: '9999px',
            backgroundColor: '#ecfdf5',
            color: '#059669',
            fontSize: '0.72rem',
            fontWeight: 800,
            border: '1px solid #a7f3d0'
          }}>
            <CheckCircle2 size={11} /> RESOLVED
          </span>
        );
      case 'CLOSED':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 9px',
            borderRadius: '9999px',
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            fontSize: '0.72rem',
            fontWeight: 800,
            border: '1px solid #cbd5e1'
          }}>
            CLOSED
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getSeverityBadge = (sev) => {
    const item = SEVERITIES.find(s => s.id === sev) || SEVERITIES[3];
    return (
      <span style={{
        fontSize: '0.7rem',
        fontWeight: 800,
        padding: '2px 7px',
        borderRadius: '6px',
        backgroundColor: item.bg,
        color: item.color,
      }}>
        {sev}
      </span>
    );
  };

  return (
    <Layout title="Improvement Box & Quality Tracker" requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>

        {/* Top Header & Analytics Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Platform Improvement Box & Quality Tracker
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.86rem', marginTop: '3px' }}>
              Inspect user suggestions, bug reports, triage severity, analyze device diagnostics, and uphold platform standards.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadBugs(true)}
            disabled={refreshing}
            className="btn btn-secondary touch-target"
            style={{ padding: '8px 16px', fontSize: '0.84rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Submissions'}</span>
          </button>
        </div>

        {/* Analytics Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '22px'
        }}>
          <div className="glass-card" style={{ padding: '16px 20px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Reports</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{totalCount}</div>
          </div>

          <div className="glass-card" style={{ padding: '16px 20px', background: '#fffdf5', borderRadius: '16px', border: '1px solid #fde68a' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Open Issues</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#b45309', marginTop: '4px' }}>{openCount}</div>
          </div>

          <div className="glass-card" style={{ padding: '16px 20px', background: '#eff6ff', borderRadius: '16px', border: '1px solid #bfdbfe' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>In Progress</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#2563eb', marginTop: '4px' }}>{inProgressCount}</div>
          </div>

          <div className="glass-card" style={{ padding: '16px 20px', background: '#ecfdf5', borderRadius: '16px', border: '1px solid #a7f3d0' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Resolved</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669', marginTop: '4px' }}>{resolvedCount}</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="glass-card" style={{ padding: '16px 20px', background: '#ffffff', borderRadius: '16px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            
            {/* Status Pills */}
            <div className="touch-tab-bar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', maxWidth: '100%' }}>
              {[
                { id: 'ALL', label: `All (${totalCount})` },
                { id: 'OPEN', label: `Open (${openCount})` },
                { id: 'IN_PROGRESS', label: `In Progress (${inProgressCount})` },
                { id: 'RESOLVED', label: `Resolved (${resolvedCount})` },
                { id: 'CLOSED', label: 'Closed' }
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '10px',
                    border: statusFilter === st.id ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: statusFilter === st.id ? '#eff6ff' : '#ffffff',
                    color: statusFilter === st.id ? '#2563eb' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.12s ease'
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Filters & Search Controls */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1 1 360px', justifyContent: 'flex-end' }}>
              {/* Category Dropdown */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="form-select"
                style={{ fontSize: '0.84rem', padding: '8px 12px', minHeight: '38px', borderRadius: '10px' }}
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>

              {/* Severity Dropdown */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="form-select"
                style={{ fontSize: '0.84rem', padding: '8px 12px', minHeight: '38px', borderRadius: '10px' }}
              >
                {SEVERITIES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>

              {/* Search Input */}
              <div style={{ position: 'relative', minWidth: '180px', flex: '1 1 180px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bugs..."
                  style={{
                    width: '100%',
                    padding: '8px 28px 8px 30px',
                    fontSize: '0.85rem',
                    borderRadius: '10px',
                    border: searchQuery ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    outline: 'none',
                    minHeight: '38px',
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
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            <RefreshCw size={32} className="spin" style={{ margin: '0 auto 12px auto', color: '#2563eb' }} />
            <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>Loading submissions...</p>
          </div>
        ) : filteredBugs.length === 0 ? (
          <div className="glass-card" style={{ padding: '48px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '18px' }}>
            <Bug size={44} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>No Improvement Reports Found</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
              {searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || severityFilter !== 'ALL'
                ? 'No reports match your selected filters. Try clearing search or reset filters.'
                : 'Great news! There are currently no pending improvement reports.'}
            </p>
            {(searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || severityFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => { setStatusFilter('ALL'); setCategoryFilter('ALL'); setSeverityFilter('ALL'); setSearchQuery(''); }}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', marginTop: '12px' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredBugs.map(bug => (
              <div
                key={bug.id}
                onClick={() => openModal(bug)}
                className="glass-card"
                style={{
                  padding: '16px 20px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.02)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  
                  {/* Left info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: bug.status === 'RESOLVED' ? '#ecfdf5' : '#eff6ff',
                      color: bug.status === 'RESOLVED' ? '#059669' : '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Bug size={18} />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700 }}>#{bug.id}</span>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          {bug.title}
                        </h4>
                        {getSeverityBadge(bug.severity)}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.76rem', color: '#64748b', flexWrap: 'wrap' }}>
                        <span style={{ backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          {bug.category}
                        </span>
                        <span>•</span>
                        <span>Reported by <strong>{bug.reporter_name}</strong> ({bug.reporter_player_id})</span>
                        <span>•</span>
                        <span>{new Date(bug.created_at).toLocaleDateString()}</span>
                        {bug.screenshot_url && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <ImageIcon size={12} /> Image Attached
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Status & Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    {getStatusBadge(bug.status)}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={13} />
                      <span>Inspect</span>
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL: Bug Detail & Developer Triage */}
        {selectedBug && (
          <div className="mobile-modal-overlay" onClick={closeModal}>
            <div
              className="mobile-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Bug size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      Bug #{selectedBug.id}: {selectedBug.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                      {getSeverityBadge(selectedBug.severity)}
                      {getStatusBadge(selectedBug.status)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Reporter Info Row */}
              <div style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar src={selectedBug.reporter_photo} name={selectedBug.reporter_name} size="sm" />
                  <div>
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                      {selectedBug.reporter_name}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', marginLeft: '6px', fontFamily: 'monospace' }}>
                      {selectedBug.reporter_player_id} • {selectedBug.reporter_role}
                    </span>
                  </div>
                </div>

                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Reported {new Date(selectedBug.created_at).toLocaleString()}
                </span>
              </div>

              {/* Bug Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Issue Description
                </label>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-line'
                }}>
                  {selectedBug.description}
                </div>
              </div>

              {/* Steps to Reproduce */}
              {selectedBug.steps_to_reproduce && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Steps to Reproduce
                  </label>
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    fontSize: '0.85rem',
                    color: '#0f172a',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                    fontFamily: 'monospace'
                  }}>
                    {selectedBug.steps_to_reproduce}
                  </div>
                </div>
              )}

              {/* Environment / Device Diagnostics */}
              {selectedBug.device_info && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Client Diagnostics / User Environment
                  </label>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.75rem',
                    color: '#334155',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '140px',
                    overflowY: 'auto'
                  }}>
                    {selectedBug.device_info}
                  </div>
                </div>
              )}

              {/* Screenshot Attachment */}
              {selectedBug.screenshot_url && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Attached Screenshot
                  </label>
                  <div style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid #cbd5e1',
                    maxHeight: '260px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0f172a'
                  }}>
                    <a href={selectedBug.screenshot_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={selectedBug.screenshot_url}
                        alt="Bug Evidence"
                        style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'contain' }}
                      />
                    </a>
                  </div>
                  <div style={{ marginTop: '6px', textAlign: 'right' }}>
                    <a
                      href={selectedBug.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>Open Full Size Image</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}

              {/* Triage & Resolution Section */}
              <form onSubmit={handleUpdate} style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                  Developer Resolution & Status Update
                </h4>

                {updateError && (
                  <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', color: '#b91c1c', fontSize: '0.84rem', marginBottom: '12px' }}>
                    {updateError}
                  </div>
                )}

                {updateSuccess && (
                  <div style={{ padding: '10px 14px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#047857', fontSize: '0.84rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={15} />
                    <span>{updateSuccess}</span>
                  </div>
                )}

                {/* Status Picker */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Set Bug Status *
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'OPEN', label: 'Open' },
                      { id: 'IN_PROGRESS', label: 'In Progress' },
                      { id: 'RESOLVED', label: 'Resolved' },
                      { id: 'CLOSED', label: 'Closed' }
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setNewStatus(st.id)}
                        style={{
                          padding: '7px 16px',
                          borderRadius: '10px',
                          border: newStatus === st.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          backgroundColor: newStatus === st.id ? '#eff6ff' : '#ffffff',
                          color: newStatus === st.id ? '#2563eb' : '#64748b',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Admin Notes */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Developer / Fix Notes (Visible to Reporter)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Fixed CSS overflow issue on iOS Safari in commit #abc1234. Please verify."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', fontSize: '0.86rem', padding: '10px 12px' }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="btn btn-primary"
                    style={{ padding: '8px 20px', fontSize: '0.84rem' }}
                  >
                    {updating ? 'Saving...' : 'Save Resolution'}
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
