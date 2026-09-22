import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import ArenaDataLoader from '../../components/MorphingInfinity';
import { api } from '../../services/api';
import { 
  ShieldCheck, Users, Swords, Activity, Settings, FileText, 
  TrendingUp, Award, Clock, ArrowRight, Shield, Zap
} from 'lucide-react';

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.getSuperAdminDashboard();
        setStats(data);
      } catch (err) {
        console.error('Failed to load super admin stats', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <Layout title="Super Admin Control Center" requireAuth={true} allowedRoles={['SUPER_ADMIN']}>
        <ArenaDataLoader text="Loading Executive Console..." subtext="Syncing system stats, audit records, and server metrics..." />
      </Layout>
    );
  }

  return (
    <Layout title="Super Admin Control Center" requireAuth={true} allowedRoles={['SUPER_ADMIN']}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Top Control Banner */}
        <div className="glass-card" style={{
          padding: '28px 32px',
          marginBottom: '28px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
          border: '1.5px solid #bfdbfe',
          borderRadius: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)'
            }}>
              <ShieldCheck size={36} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
                  Super Admin Console
                </h2>
                <span className="badge badge-rose">Root Access</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '4px' }}>
                Active Season: <strong style={{ color: '#b45309' }}>{stats?.active_season || 'Season 1'}</strong> • Total Admins: <strong style={{ color: '#2563eb' }}>{stats?.total_admins || 0}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/super-admin/admins" className="btn btn-primary">
              <Users size={16} />
              <span>Manage Admins</span>
            </Link>
            <Link href="/super-admin/settings" className="btn btn-secondary">
              <Settings size={16} />
              <span>Elo Config</span>
            </Link>
          </div>
        </div>

        {/* Global Key Performance Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '28px'
        }}>
          <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #2563eb', background: '#ffffff', borderRadius: '16px' }}>
            <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Players</p>
            <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#2563eb', margin: '8px 0' }}>
              {stats?.total_players ?? 0}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{stats?.active_players ?? 0} Active Competitors</p>
          </div>

          <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #7c3aed', background: '#ffffff', borderRadius: '16px' }}>
            <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Matches</p>
            <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#7c3aed', margin: '8px 0' }}>
              {stats?.total_matches ?? 0}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{stats?.completed_matches ?? 0} Verified / {stats?.pending_matches ?? 0} Pending</p>
          </div>

          <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #d97706', background: '#ffffff', borderRadius: '16px' }}>
            <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Top Player</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#b45309', margin: '8px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stats?.top_player || 'N/A'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Rating: {Math.round(stats?.highest_rating || 1500)} Elo</p>
          </div>

          <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #059669', background: '#ffffff', borderRadius: '16px' }}>
            <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>1v1 / 2v2 Ratio</p>
            <h3 style={{ fontSize: '2rem', fontWeight: 900, color: '#059669', margin: '8px 0' }}>
              {stats?.total_1v1_matches ?? 0} : {stats?.total_2v2_matches ?? 0}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Solo vs Co-op fixtures</p>
          </div>
        </div>

        {/* Activity Breakdown Charts & Shortcuts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
          
          {/* Matches Over Past 7 Days */}
          <div className="glass-card" style={{ padding: '28px', background: '#ffffff', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
              Matches Activity (Past 7 Days)
            </h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '180px', paddingTop: '20px' }}>
              {stats?.matches_over_time?.map((item, idx) => {
                const maxVal = Math.max(...(stats?.matches_over_time?.map(m => m.matches) || [1]), 5);
                const heightPct = Math.max(15, (item.matches / maxVal) * 100);
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2563eb' }}>{item.matches}</span>
                    <div style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      background: 'linear-gradient(180deg, #2563eb 0%, #60a5fa 100%)',
                      borderRadius: '6px 6px 0 0',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)'
                    }} />
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.date}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Management Quick Links */}
          <div className="glass-card" style={{ padding: '28px', background: '#ffffff', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
              System Command Hub
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link
                href="/super-admin/admins"
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#0f172a',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb' }}>
                    <Users size={18} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '0.92rem', fontWeight: 800 }}>Admin Permissions</h5>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Delegate granular management access</p>
                  </div>
                </div>
                <ArrowRight size={16} color="#94a3b8" />
              </Link>

              <Link
                href="/super-admin/audit-logs"
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#0f172a',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb' }}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '0.92rem', fontWeight: 800 }}>Audit Trail</h5>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Review security logs & actions</p>
                  </div>
                </div>
                <ArrowRight size={16} color="#94a3b8" />
              </Link>

              <Link
                href="/super-admin/players"
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#0f172a',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', background: '#faf5ff', color: '#7c3aed' }}>
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '0.92rem', fontWeight: 800 }}>Rating Overrides</h5>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Manual Elo adjustments with audit logging</p>
                  </div>
                </div>
                <ArrowRight size={16} color="#94a3b8" />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </Layout>
  );
}
