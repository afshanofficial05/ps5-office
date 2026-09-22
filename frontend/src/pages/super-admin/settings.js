import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import ArenaDataLoader from '../../components/MorphingInfinity';
import { api } from '../../services/api';
import { Settings, Calendar, Save, Plus, Check } from 'lucide-react';

export default function SuperAdminSettingsPage() {
  const [kFactor, setKFactor] = useState(24);
  const [handicapMultiplier, setHandicapMultiplier] = useState(5);
  const [maxHandicap, setMaxHandicap] = useState(150);
  const [maxScreenshotSizeKb, setMaxScreenshotSizeKb] = useState(100);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const [seasons, setSeasons] = useState([]);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [creatingSeason, setCreatingSeason] = useState(false);
  const [seasonSuccess, setSeasonSuccess] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const [settingsData, seasonsData] = await Promise.all([
          api.getSystemSettings(),
          api.getSeasons()
        ]);
        if (settingsData.k_factor) setKFactor(parseInt(settingsData.k_factor, 10));
        if (settingsData.handicap_multiplier) setHandicapMultiplier(parseInt(settingsData.handicap_multiplier, 10));
        if (settingsData.max_handicap) setMaxHandicap(parseInt(settingsData.max_handicap, 10));
        if (settingsData.max_screenshot_size_kb) setMaxScreenshotSizeKb(parseInt(settingsData.max_screenshot_size_kb, 10));
        setSeasons(seasonsData);
      } catch (err) {
        console.error('Failed to load system config', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updateSystemSettings({
        k_factor: parseInt(kFactor, 10),
        handicap_multiplier: parseInt(handicapMultiplier, 10),
        max_handicap: parseInt(maxHandicap, 10),
        max_screenshot_size_kb: parseInt(maxScreenshotSizeKb, 10)
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateSeason = async (e) => {
    e.preventDefault();
    if (!newSeasonName.trim()) return;
    setCreatingSeason(true);
    try {
      await api.createSeason({ name: newSeasonName.trim() });
      setNewSeasonName('');
      setSeasonSuccess(true);
      setTimeout(() => setSeasonSuccess(false), 3000);
      const updatedSeasons = await api.getSeasons();
      setSeasons(updatedSeasons);
    } catch (err) {
      console.error('Failed to create season', err);
    } finally {
      setCreatingSeason(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Elo Engine & System Settings" requireAuth={true} allowedRoles={['SUPER_ADMIN']}>
        <ArenaDataLoader text="Loading Elo & System Settings..." subtext="Fetching global configuration and tournament parameters..." />
      </Layout>
    );
  }

  return (
    <Layout title="Elo Engine & System Settings" requireAuth={true} allowedRoles={['SUPER_ADMIN']}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* Elo Rating Engine Tuning */}
        <div className="glass-card" style={{ padding: '32px', marginBottom: '28px', background: '#ffffff', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Settings size={22} color="#2563eb" />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>Elo Formula & Handicap Tuning</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '24px' }}>
            Configure global rating sensitivity and club OVR difference impact.
          </p>

          {settingsSuccess && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '10px',
              color: '#059669',
              fontSize: '0.88rem',
              marginBottom: '20px',
              fontWeight: 600
            }}>
              System settings updated and audited successfully!
            </div>
          )}

          <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Elo K-Factor
              </label>
              <input
                type="number"
                min="10"
                max="64"
                required
                className="form-input"
                value={kFactor}
                onChange={(e) => setKFactor(e.target.value)}
              />
              <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                Standard: 24 (Higher = larger points swing)
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Handicap Multiplier
              </label>
              <input
                type="number"
                min="1"
                max="15"
                required
                className="form-input"
                value={handicapMultiplier}
                onChange={(e) => setHandicapMultiplier(e.target.value)}
              />
              <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                Standard: 5 (Points per OVR difference)
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Max Handicap Cap
              </label>
              <input
                type="number"
                min="50"
                max="300"
                required
                className="form-input"
                value={maxHandicap}
                onChange={(e) => setMaxHandicap(e.target.value)}
              />
              <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                Standard: 150 (Upper limit +/-)
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Screenshot Upload Limit (KB)
              </label>
              <input
                type="number"
                min="30"
                max="5000"
                required
                className="form-input"
                value={maxScreenshotSizeKb}
                onChange={(e) => setMaxScreenshotSizeKb(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {[100, 150, 200, 300].map(kb => (
                  <button
                    key={kb}
                    type="button"
                    onClick={() => setMaxScreenshotSizeKb(kb)}
                    style={{
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: maxScreenshotSizeKb === kb ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      background: maxScreenshotSizeKb === kb ? '#eff6ff' : '#ffffff',
                      color: maxScreenshotSizeKb === kb ? '#2563eb' : '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    {kb} KB
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                Active size limit for players reporting matches.
              </p>
            </div>

            <div style={{ gridColumn: '1 / -1', textAlign: 'right', marginTop: '8px' }}>
              <button
                type="submit"
                disabled={savingSettings}
                className="btn btn-primary"
              >
                <Save size={16} />
                <span>{savingSettings ? 'Updating Config...' : 'Apply Configurations'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Season Management */}
        <div className="glass-card" style={{ padding: '32px', background: '#ffffff', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Calendar size={22} color="#7c3aed" />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>Seasons & Tournaments</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '24px' }}>
            Create and activate new competition seasons. Activating a new season automatically completes previous seasons.
          </p>

          {seasonSuccess && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '10px',
              color: '#059669',
              fontSize: '0.88rem',
              marginBottom: '20px',
              fontWeight: 600
            }}>
              New season created and activated!
            </div>
          )}

          <form onSubmit={handleCreateSeason} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <input
              type="text"
              required
              placeholder="e.g. PSO Summer League 2026"
              className="form-input"
              value={newSeasonName}
              onChange={(e) => setNewSeasonName(e.target.value)}
            />
            <button
              type="submit"
              disabled={creatingSeason}
              className="btn btn-primary"
              style={{ whiteSpace: 'nowrap' }}
            >
              <Plus size={16} />
              <span>Launch New Season</span>
            </button>
          </form>

          {/* Existing Seasons List */}
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Season ID</th>
                  <th>Season Title</th>
                  <th>Start Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>#{s.id}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{s.name}</td>
                    <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{new Date(s.start_date).toLocaleDateString()}</td>
                    <td>
                      <span className={s.status === 'ACTIVE' ? 'badge badge-emerald' : 'badge badge-primary'}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  );
}
