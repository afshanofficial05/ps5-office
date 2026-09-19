import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import RatingBadge from '../components/RatingBadge';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  User, Trophy, Award, Flame, Swords, Shield, Medal, CheckCircle2,
  Lock, Edit3, Save, Zap, Star, Camera, Trash2, Loader2, AlertCircle, Link2, Check, ExternalLink
} from 'lucide-react';
import { resolveImageUrl } from '../utils/imageUtils';
import { renderAchievementIcon } from '../utils/achievementUtils';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [allAchievements, setAllAchievements] = useState([]);
  const [nameInput, setNameInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [savingDriveLink, setSavingDriveLink] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      if (!user) return;
      try {
        const [profileData, achData] = await Promise.all([
          api.getUserProfile(user.id),
          api.getAchievements().catch(() => [])
        ]);
        if (isMounted) {
          setProfile(profileData);
          setNameInput(profileData.name);
          if (Array.isArray(achData)) {
            setAllAchievements(achData);
          }
        }
      } catch (err) {
        console.error('Failed to load profile data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadProfile();
    return () => { isMounted = false; };
  }, [user]);

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return;

    setUploadingPhoto(true);
    setPhotoError('');

    try {
      await api.updateUser(user.id, { profile_photo: '' });
      setProfile((prev) => ({ ...prev, profile_photo: null }));
      await refreshUser();
    } catch (err) {
      console.error('Failed to remove photo', err);
      setPhotoError(err.message || 'Failed to remove photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveDriveLink = async (e) => {
    e?.preventDefault();
    if (!driveLinkInput.trim()) {
      setPhotoError('Please provide a valid Google Drive or Image link');
      return;
    }
    setSavingDriveLink(true);
    setPhotoError('');
    try {
      const updatedUser = await api.updateUser(user.id, {
        profile_photo: driveLinkInput.trim()
      });
      setProfile((prev) => ({ ...prev, profile_photo: updatedUser.profile_photo }));
      await refreshUser();
      setShowDriveModal(false);
      setDriveLinkInput('');
    } catch (err) {
      console.error('Failed to save photo link', err);
      setPhotoError(err.message || 'Failed to save photo link.');
    } finally {
      setSavingDriveLink(false);
    }
  };


  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateUser(user.id, {
        name: nameInput
      });
      await refreshUser();
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setSaving(false);
    }
  };

  const unlockedAchievementIds = new Set(
    profile?.achievements?.map(a => a.achievement?.id) || []
  );
  const unlockedAchievementNames = new Set(
    profile?.achievements?.map(a => a.achievement?.name?.toLowerCase().trim()) || []
  );

  return (
    <Layout title="Player Profile" requireAuth={true}>
      <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%' }}>

        {/* Profile Card Header */}
        <div className="glass-card" style={{
          padding: '24px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 4px 15px -3px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {/* Avatar with Camera Trigger */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Avatar
                src={profile?.profile_photo}
                name={profile?.name || ''}
                size="2xl"
                status="online"
                showBorder={true}
                borderColor="#2563eb"
              />

              {/* Photo URL Overlay Button */}
              <button
                type="button"
                onClick={() => {
                  setDriveLinkInput(profile?.profile_photo || '');
                  setShowDriveModal(true);
                  setPhotoError('');
                }}
                disabled={uploadingPhoto}
                title="Update Profile Photo URL"
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: '2px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  transition: 'transform 0.15s, background-color 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
              >
                <Link2 size={15} />
              </button>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                  {profile?.name}
                </h2>
                <span className="badge badge-primary">{profile?.player_id}</span>
                <span className="badge badge-emerald" style={{ textTransform: 'capitalize' }}>
                  {profile?.role ? profile.role.toLowerCase().replace('_', ' ') : 'Player'}
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
                {profile?.email}
              </p>

              {/* Photo Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setDriveLinkInput(profile?.profile_photo || '');
                    setShowDriveModal(true);
                    setPhotoError('');
                  }}
                  disabled={uploadingPhoto}
                  className="btn btn-secondary"
                  style={{ padding: '5px 12px', fontSize: '0.78rem', minHeight: '32px' }}
                  title="Paste an image URL or Google Drive link for your profile image"
                >
                  <Link2 size={13} />
                  <span>Paste Image URL</span>
                </button>

                {profile?.profile_photo && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    className="btn btn-secondary"
                    style={{ padding: '5px 10px', fontSize: '0.78rem', minHeight: '32px', color: '#ef4444' }}
                    title="Remove Photo (switches to name initial placeholder)"
                  >
                    <Trash2 size={13} />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>

              {/* Photo Link Modal / Popover */}
              {showDriveModal && (
                <div style={{
                  marginTop: '14px',
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '14px',
                  maxWidth: '480px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Link2 size={16} color="#2563eb" />
                      <span>Paste Photo URL</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowDriveModal(false)}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}
                    >
                      ✕
                    </button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>
                    Paste a direct image URL or a public Google Drive sharing link (make sure permission is set to <strong>"Anyone with the link can view"</strong>).
                  </p>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                    <Avatar
                      src={driveLinkInput}
                      name={profile?.name || ''}
                      size="sm"
                    />
                    <input
                      type="url"
                      value={driveLinkInput}
                      onChange={(e) => setDriveLinkInput(e.target.value)}
                      placeholder="https://... image link or Google Drive URL"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowDriveModal(false)}
                      className="btn btn-secondary"
                      style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDriveLink}
                      disabled={savingDriveLink || !driveLinkInput.trim()}
                      className="btn btn-primary"
                      style={{ padding: '5px 14px', fontSize: '0.78rem' }}
                    >
                      {savingDriveLink ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      <span>Save URL</span>
                    </button>
                  </div>
                </div>
              )}

              {photoError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '0.78rem', marginTop: '8px' }}>
                  <AlertCircle size={13} />
                  <span>{photoError}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', minHeight: '40px' }}
            >
              <Edit3 size={15} />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Name'}</span>
            </button>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '20px', background: '#ffffff', borderRadius: '16px' }}>
            <form onSubmit={handleSave} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}
              >
                <Save size={15} />
                <span>{saving ? 'Saving...' : 'Save Name'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Career Stats Grid */}
        <div className="profile-stats-grid">
          <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #2563eb', background: '#ffffff', borderRadius: '14px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>1v1 Elo</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '4px 0', fontFamily: 'monospace' }}>
              {Math.round(profile?.rating_1v1?.rating ?? 1500)}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rank #{profile?.rank_1v1 ?? '-'}</span>
          </div>

          <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #7c3aed', background: '#ffffff', borderRadius: '14px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>2v2 Elo</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '4px 0', fontFamily: 'monospace' }}>
              {Math.round(profile?.rating_2v2?.rating ?? 1500)}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Rank #{profile?.rank_2v2 ?? '-'}</span>
          </div>

          <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #059669', background: '#ffffff', borderRadius: '14px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Matches</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '4px 0', fontFamily: 'monospace' }}>
              {profile?.total_matches ?? 0}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
              {profile?.total_wins ?? 0} Wins ({profile?.total_matches > 0 ? Math.round((profile.total_wins / profile.total_matches) * 100) : 0}%)
            </span>
          </div>

          <div className="glass-card" style={{ padding: '18px 20px', borderLeft: '4px solid #d97706', background: '#ffffff', borderRadius: '14px' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Streak</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '4px 0', fontFamily: 'monospace' }}>
              {Math.max(profile?.rating_1v1?.win_streak ?? 0, profile?.rating_2v2?.win_streak ?? 0)} 🔥
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Consecutive Wins</span>
          </div>
        </div>

        {/* Achievements Showcase */}
        <div className="glass-card" style={{ padding: '24px', background: '#ffffff', borderRadius: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Achievements</h3>
            <span className="badge badge-gold">
              {profile?.achievements?.length || 0} / {allAchievements.length} Unlocked
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '12px'
          }}>
            {allAchievements.map((ach) => {
              const isUnlocked = unlockedAchievementIds.has(ach.id) || 
                unlockedAchievementNames.has(ach.name?.toLowerCase().trim());
              return (
                <div
                  key={ach.id || ach.name}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: isUnlocked ? '1.5px solid #fde68a' : '1px solid #e2e8f0',
                    backgroundColor: isUnlocked ? '#fffdf5' : '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    opacity: isUnlocked ? 1 : 0.6
                  }}
                >
                  <div style={{
                    fontSize: '1.5rem',
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: isUnlocked ? '#fef3c7' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {renderAchievementIcon(ach.icon)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h5 style={{ fontSize: '0.9rem', fontWeight: 800, color: isUnlocked ? '#b45309' : '#64748b' }}>
                        {ach.name}
                      </h5>
                      {isUnlocked && <CheckCircle2 size={14} color="#d97706" />}
                    </div>
                    <p style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>{ach.description}</p>
                  </div>
                </div>
              );
            })}

            {allAchievements.length === 0 && (
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No achievements created yet.</p>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}
