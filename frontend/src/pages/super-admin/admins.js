import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Avatar from '../../components/Avatar';
import { api } from '../../services/api';
import { 
  ShieldCheck, Plus, Edit2, Check, X, Shield, Lock, Calendar, 
  Users, BarChart3, Swords, CheckSquare, Layers, AlertCircle
} from 'lucide-react';

export const PERMISSION_CATEGORIES = [
  {
    category: 'Season Management',
    icon: Calendar,
    description: 'Control competition seasons, stat recalculation, results & leaderboard',
    options: [
      { id: 'VIEW_SEASON', label: 'View Season', desc: 'Browse and inspect seasons' },
      { id: 'CREATE_SEASON', label: 'Create Season', desc: 'Launch new competition seasons' },
      { id: 'EDIT_SEASON', label: 'Edit Season', desc: 'Modify season metadata and active status' },
      { id: 'DELETE_SEASON', label: 'Delete Season', desc: 'Delete or archive season entries' },
      { id: 'UPDATE_SEASON_STATS', label: 'Calculate / Update Stats', desc: 'Recalculate season match metrics' },
      { id: 'MANAGE_SEASON_RESULTS', label: 'Manage Season Results', desc: 'Link and assign match outcomes' },
      { id: 'VIEW_SEASON_LEADERBOARD', label: 'View Season Leaderboard', desc: 'Access season-specific standings' },
    ]
  },
  {
    category: 'Player Management',
    icon: Users,
    description: 'Control player registry and account access',
    options: [
      { id: 'VIEW_PLAYERS', label: 'View Players', desc: 'Inspect registered player directory' },
      { id: 'CREATE_PLAYER', label: 'Create Player', desc: 'Register player accounts directly' },
      { id: 'EDIT_PLAYER', label: 'Edit Player', desc: 'Activate or disable player accounts' },
      { id: 'DELETE_PLAYER', label: 'Delete Player', desc: 'Remove player profiles' },
    ]
  },
  {
    category: 'Team Management',
    icon: Shield,
    description: 'Manage FC teams database and team requests',
    options: [
      { id: 'VIEW_TEAMS', label: 'View Teams', desc: 'Access FC teams directory' },
      { id: 'CREATE_TEAM', label: 'Create Team', desc: 'Add new FC clubs and nations' },
      { id: 'EDIT_TEAM', label: 'Edit Team', desc: 'Modify team ratings (OVR/ATK/MID/DEF)' },
      { id: 'DELETE_TEAM', label: 'Delete Team', desc: 'Remove teams from database' },
      { id: 'APPROVE_TEAM_REQUESTS', label: 'Approve Team Requests', desc: 'Review and approve/reject team requests' },
    ]
  },
  {
    category: 'Match & Results',
    icon: Swords,
    description: 'Verify match scores and record manual matches',
    options: [
      { id: 'VIEW_MATCHES', label: 'View Matches', desc: 'Browse match history & logs' },
      { id: 'MANUAL_MATCH_CREATE', label: 'Manual Match Entry', desc: 'Record offline matches for players' },
      { id: 'VERIFY_RESULTS', label: 'Verify Results', desc: 'Approve or reject match score evidence' },
      { id: 'EDIT_MATCH', label: 'Edit Match', desc: 'Modify match scores and evidence' },
      { id: 'DELETE_MATCH', label: 'Delete Match', desc: 'Void matches & adjust ratings' },
    ]
  },
  {
    category: 'Reports & Analytics',
    icon: BarChart3,
    description: 'Platform metrics, participation statistics, and data exports',
    options: [
      { id: 'VIEW_REPORTS', label: 'View Reports', desc: 'Access platform summary and metrics' },
      { id: 'GENERATE_REPORTS', label: 'Generate & Export Reports', desc: 'Export match datasets to CSV/JSON' },
    ]
  }
];

const DEFAULT_ADMIN_PERMS = [
  'VIEW_SEASON', 'VIEW_PLAYERS', 'VIEW_TEAMS', 'VIEW_MATCHES', 'VERIFY_RESULTS', 'MANUAL_MATCH_CREATE'
];

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPerms, setSelectedPerms] = useState(DEFAULT_ADMIN_PERMS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchAdmins = async () => {
    try {
      const data = await api.getAdmins();
      setAdmins(data);
    } catch (err) {
      console.error('Failed to load admins', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const openCreate = () => {
    setEditingAdmin(null);
    setName('');
    setEmail('');
    setPassword('');
    setSelectedPerms(DEFAULT_ADMIN_PERMS);
    setError('');
    setShowModal(true);
  };

  const openEdit = (admin) => {
    setEditingAdmin(admin);
    setName(admin.name);
    setEmail(admin.email);
    setPassword('');
    const currentPerms = admin.permissions?.filter(p => p.enabled).map(p => p.permission) || [];
    setSelectedPerms(currentPerms);
    setError('');
    setShowModal(true);
  };

  const handleTogglePerm = (permId) => {
    if (selectedPerms.includes(permId)) {
      setSelectedPerms(selectedPerms.filter(p => p !== permId));
    } else {
      setSelectedPerms([...selectedPerms, permId]);
    }
  };

  const handleToggleCategory = (cat) => {
    const catPermIds = cat.options.map(o => o.id);
    const allSelected = catPermIds.every(id => selectedPerms.includes(id));

    if (allSelected) {
      // Deselect all in this category
      setSelectedPerms(selectedPerms.filter(id => !catPermIds.includes(id)));
    } else {
      // Select all in this category
      const merged = new Set([...selectedPerms, ...catPermIds]);
      setSelectedPerms(Array.from(merged));
    }
  };

  const handleSelectAll = () => {
    const all = [];
    PERMISSION_CATEGORIES.forEach(c => c.options.forEach(o => all.push(o.id)));
    setSelectedPerms(all);
  };

  const handleClearAll = () => {
    setSelectedPerms([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingAdmin) {
        await api.updateAdmin(editingAdmin.id, {
          name,
          permissions: selectedPerms
        });
      } else {
        await api.createAdmin({
          name,
          email,
          password,
          permissions: selectedPerms
        });
      }
      setShowModal(false);
      await fetchAdmins();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAdminStatus = async (admin) => {
    if (admin.role === 'SUPER_ADMIN') return; // Cannot disable root super admin
    const nextStatus = admin.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await api.updateAdmin(admin.id, { status: nextStatus });
      await fetchAdmins();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  return (
    <Layout title="Admin Management" requireAuth={true} allowedRoles={['SUPER_ADMIN']}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>Platform Staff & Admins</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Assign fine-grained feature permissions to staff members. Super Admins hold full system authority.
            </p>
          </div>
          <button onClick={openCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} />
            <span>Add New Admin</span>
          </button>
        </div>

        {/* Admins Table Card */}
        <div className="glass-card" style={{ padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Player Code</th>
                  <th>Admin Name & Email</th>
                  <th>Role</th>
                  <th>Granted Permissions</th>
                  <th>Account Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((adm) => {
                  const isSuper = adm.role === 'SUPER_ADMIN';
                  const enabledPerms = adm.permissions?.filter(p => p.enabled) || [];

                  return (
                    <tr key={adm.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                        {adm.player_id}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Avatar src={adm.profile_photo} name={adm.name} size="sm" />
                          <div>
                            <p style={{ fontWeight: 700, color: '#0f172a' }}>{adm.name}</p>
                            <p style={{ fontSize: '0.78rem', color: '#64748b' }}>{adm.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={isSuper ? 'badge badge-rose' : 'badge badge-gold'}>
                          {adm.role}
                        </span>
                      </td>
                      <td style={{ maxWidth: '380px' }}>
                        {isSuper ? (
                          <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700 }}>
                            ⭐ Full System Authority (All Features)
                          </span>
                        ) : enabledPerms.length === 0 ? (
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            No permissions granted
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <span className="badge badge-primary" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                              {enabledPerms.length} Active Permissions
                            </span>
                            {enabledPerms.slice(0, 3).map(p => (
                              <span key={p.permission} style={{
                                fontSize: '0.7rem',
                                padding: '2px 6px',
                                background: '#f1f5f9',
                                color: '#475569',
                                borderRadius: '6px',
                                fontWeight: 600
                              }}>
                                {p.permission.replace(/_/g, ' ')}
                              </span>
                            ))}
                            {enabledPerms.length > 3 && (
                              <span style={{ fontSize: '0.7rem', color: '#64748b', alignSelf: 'center' }}>
                                +{enabledPerms.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={adm.status === 'ACTIVE' ? 'badge badge-emerald' : 'badge badge-rose'}>
                          {adm.status}
                        </span>
                      </td>
                      <td>
                        {!isSuper && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => openEdit(adm)}
                              className="btn btn-secondary"
                              style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                            >
                              <Edit2 size={13} />
                              <span>Configure Permissions</span>
                            </button>
                            <button
                              onClick={() => handleToggleAdminStatus(adm)}
                              className="btn btn-secondary"
                              style={{
                                padding: '5px 10px',
                                fontSize: '0.78rem',
                                color: adm.status === 'ACTIVE' ? '#ef4444' : '#10b981'
                              }}
                            >
                              {adm.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create / Edit Admin Modal */}
        {showModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}>
            <div className="glass-card" style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '26px',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    {editingAdmin ? `Configure Permissions: ${editingAdmin.name}` : 'Create Admin Account'}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Select specific feature permissions to grant this administrator.
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px', fontWeight: 600, flexShrink: 0 }}>
                  {error}
                </div>
              )}

              {/* Scrollable Form Body */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: editingAdmin ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>
                      Admin Full Name
                    </label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                    />
                  </div>

                  {!editingAdmin && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        className="form-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@pso.com"
                      />
                    </div>
                  )}

                  {!editingAdmin && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', marginBottom: '4px', fontWeight: 700 }}>
                        Initial Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        className="form-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Permissions Toolbar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #e2e8f0',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="#2563eb" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                      Feature Access Permissions ({selectedPerms.length} enabled)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Categorized Permissions Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {PERMISSION_CATEGORIES.map((cat) => {
                    const CatIcon = cat.icon;
                    const catIds = cat.options.map(o => o.id);
                    const selectedInCat = catIds.filter(id => selectedPerms.includes(id));
                    const isAllInCat = catIds.length > 0 && selectedInCat.length === catIds.length;

                    return (
                      <div key={cat.category} style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CatIcon size={16} color="#2563eb" />
                            <div>
                              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                                {cat.category}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '8px' }}>
                                ({selectedInCat.length}/{cat.options.length})
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(cat)}
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: isAllInCat ? '#dbeafe' : '#ffffff',
                              color: isAllInCat ? '#1d4ed8' : '#475569',
                              border: '1px solid #cbd5e1',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {isAllInCat ? 'Deselect Category' : 'Select Category'}
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                          {cat.options.map((opt) => {
                            const checked = selectedPerms.includes(opt.id);
                            return (
                              <div
                                key={opt.id}
                                onClick={() => handleTogglePerm(opt.id)}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  backgroundColor: checked ? '#eff6ff' : '#ffffff',
                                  border: checked ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <div style={{ paddingRight: '6px' }}>
                                  <p style={{ fontSize: '0.78rem', color: checked ? '#1d4ed8' : '#1e293b', fontWeight: 700, margin: 0 }}>
                                    {opt.label}
                                  </p>
                                  <p style={{ fontSize: '0.68rem', color: '#64748b', margin: '2px 0 0 0' }}>
                                    {opt.desc}
                                  </p>
                                </div>
                                <div style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '5px',
                                  border: checked ? 'none' : '1.5px solid #94a3b8',
                                  background: checked ? '#2563eb' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  {checked && <Check size={12} color="#fff" strokeWidth={3} />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Buttons */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '18px',
                  paddingTop: '12px',
                  borderTop: '1px solid #e2e8f0',
                  flexShrink: 0
                }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} />
                    <span>{submitting ? 'Saving...' : 'Save Permissions'}</span>
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
