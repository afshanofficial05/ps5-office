import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import ArenaDataLoader from '../../components/MorphingInfinity';
import { api } from '../../services/api';
import { Megaphone, Plus, Edit2, Trash2, Check, X, RefreshCw } from 'lucide-react';

export default function SuperAdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('INFO');
  const [showPopup, setShowPopup] = useState(false);
  const [requiresAck, setRequiresAck] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await api.getSuperAdminAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error('Failed to load announcements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openCreate = () => {
    setEditingAnnouncement(null);
    setTitle('');
    setMessage('');
    setType('INFO');
    setShowPopup(false);
    setRequiresAck(false);
    setIsActive(true);
    setError('');
    setShowModal(true);
  };

  const openEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setMessage(announcement.message);
    setType(announcement.type);
    setShowPopup(announcement.show_popup);
    setRequiresAck(announcement.requires_ack);
    setIsActive(announcement.is_active);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        title,
        message,
        type,
        show_popup: showPopup,
        requires_ack: requiresAck,
        is_active: isActive
      };

      if (editingAnnouncement) {
        await api.updateAnnouncement(editingAnnouncement.id, payload);
      } else {
        await api.createAnnouncement(payload);
      }
      setShowModal(false);
      await fetchAnnouncements();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement? This cannot be undone.')) return;
    try {
      await api.deleteAnnouncement(id);
      await fetchAnnouncements();
    } catch (err) {
      alert(err.message || 'Failed to delete announcement');
    }
  };

  if (loading && announcements.length === 0) {
    return (
      <Layout title="Global Announcements" requireAuth={true} allowedRoles={['SUPER_ADMIN']}>
        <ArenaDataLoader text="Loading Announcements..." subtext="Syncing global broadcast system..." />
      </Layout>
    );
  }

  return (
    <Layout title="Global Announcements" requireAuth={true} allowedRoles={['SUPER_ADMIN']}>
      <div style={{ maxWidth: '1150px', margin: '0 auto' }}>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>Global Announcements</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Broadcast important platform updates, alerts, and notifications to all users.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={fetchAnnouncements} className="btn btn-secondary">
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
            <button onClick={openCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} />
              <span>Create Announcement</span>
            </button>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Title & Type</th>
                  <th>Message Preview</th>
                  <th>Visibility</th>
                  <th>Settings</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((ann) => (
                  <tr key={ann.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          padding: '8px',
                          borderRadius: '8px',
                          background: ann.type === 'IMPORTANT' ? '#fef2f2' : ann.type === 'WARNING' ? '#fffbeb' : ann.type === 'UPDATE' ? '#f0fdf4' : '#eff6ff',
                          color: ann.type === 'IMPORTANT' ? '#ef4444' : ann.type === 'WARNING' ? '#f59e0b' : ann.type === 'UPDATE' ? '#10b981' : '#3b82f6',
                        }}>
                          <Megaphone size={16} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, color: '#0f172a' }}>{ann.title}</p>
                          <span className={`badge ${ann.type === 'IMPORTANT' ? 'badge-rose' : ann.type === 'WARNING' ? 'badge-gold' : 'badge-primary'}`} style={{ fontSize: '0.65rem' }}>
                            {ann.type}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ann.message}
                      </p>
                    </td>
                    <td>
                      <span className={`badge ${ann.is_active ? 'badge-primary' : 'badge-gold'}`}>
                        {ann.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {ann.show_popup && <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>• First-Open Popup</span>}
                        {ann.requires_ack && <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>• Requires Ack</span>}
                        {!ann.show_popup && !ann.requires_ack && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Standard Notification</span>}
                      </div>
                    </td>
                    <td>
                      <p style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 600 }}>
                        {new Date(ann.created_at).toLocaleDateString()}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => openEdit(ann)}
                          className="btn btn-secondary"
                          style={{ padding: '6px', minWidth: 'auto', borderRadius: '8px' }}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(ann.id)}
                          className="btn btn-secondary"
                          style={{ padding: '6px', minWidth: 'auto', borderRadius: '8px', color: '#ef4444', borderColor: '#fee2e2' }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {announcements.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No announcements found. Broadcast important updates here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {showModal && (
        <div className="mobile-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="mobile-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>{editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ padding: '12px', background: '#fef2f2', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Announcement Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Season 2 Registration Open!"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Message Content</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Details about the announcement..."
                  rows={4}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>Notification Type</label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff' }}
                >
                  <option value="INFO">Information</option>
                  <option value="IMPORTANT">Important</option>
                  <option value="UPDATE">Update</option>
                  <option value="WARNING">Warning</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Delivery Options</h4>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showPopup}
                    onChange={(e) => setShowPopup(e.target.checked)}
                    style={{ marginTop: '4px' }}
                  />
                  <div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>Show First-Open Popup</span>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>Display this as a prominent banner/modal when users first open the app.</p>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={requiresAck}
                    onChange={(e) => setRequiresAck(e.target.checked)}
                    style={{ marginTop: '4px' }}
                  />
                  <div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>Require User Acknowledgement</span>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>Users must explicitly click "I Understand" to dismiss the popup.</p>
                  </div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ marginTop: '4px' }}
                  />
                  <div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>Is Active</span>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>If unchecked, the announcement will be archived and removed from users' notifications.</p>
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {submitting ? 'Publishing...' : <><Check size={16} /> <span>{editingAnnouncement ? 'Save Changes' : 'Publish Announcement'}</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
