import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { 
  CheckSquare, Swords, Users, Shield, Clock, TrendingUp, ChevronRight, CheckCircle2, Trophy 
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const stats = await api.getAdminDashboard();
        setData(stats);
      } catch (err) {
        console.error('Failed to load admin stats', err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  return (
    <Layout title="Gaming Admin Console" requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Quick Pending Alert if any matches are waiting */}
        {data?.pending_verification > 0 && (
          <div className="glass-card" style={{
            padding: '20px 28px',
            marginBottom: '28px',
            border: '1.5px solid #fde68a',
            background: '#fffdf5',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#b45309'
              }}>
                <CheckSquare size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#b45309' }}>
                  {data.pending_verification} Match Result(s) Pending Verification
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Review scores & screenshot proof to finalize official Elo rating adjustments.
                </p>
              </div>
            </div>

            <Link href="/admin/pending" className="btn btn-primary">
              <span>Review Pending Matches</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        )}

        {/* Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '28px'
        }}>
          <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #f59e0b', background: '#ffffff' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Pending Verification
            </p>
            <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#b45309', margin: '8px 0' }}>
              {data?.pending_verification ?? 0}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Awaiting admin sign-off</p>
          </div>

          <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #10b981', background: '#ffffff' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Completed Matches
            </p>
            <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#059669', margin: '8px 0' }}>
              {data?.completed_matches ?? 0}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Total verified and rated</p>
          </div>

          <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #2563eb', background: '#ffffff' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Active Players
            </p>
            <h3 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#2563eb', margin: '8px 0' }}>
              {data?.active_players ?? 0}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Internal competitors</p>
          </div>

          <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #7c3aed', background: '#ffffff' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              1v1 / 2v2 Split
            </p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '8px 0' }}>
              {data?.total_1v1_matches ?? 0} / {data?.total_2v2_matches ?? 0}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Solo vs Tag matches</p>
          </div>
        </div>

        {/* Quick Operations & Recent Registrations */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          
          {/* Recent Match Feed */}
          <div className="glass-card" style={{ padding: '28px', background: '#ffffff', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Latest Match Submissions</h3>
              <Link href="/admin/pending" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                View Queue
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data?.recent_results?.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                      {m.match_code}
                    </span>
                    <span className="badge badge-primary">{m.game_mode}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={m.status === 'VERIFIED' ? 'badge badge-emerald' : 'badge badge-gold'}>
                      {m.status}
                    </span>
                    <Link href={`/matches/${m.id}`} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                      Details
                    </Link>
                  </div>
                </div>
              ))}

              {(!data?.recent_results || data?.recent_results?.length === 0) && (
                <div style={{ textAlign: 'center', padding: '28px', color: '#64748b', fontSize: '0.9rem' }}>
                  No match activity recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Quick Admin Actions */}
          <div className="glass-card" style={{ padding: '28px', background: '#ffffff', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
              Admin Operations
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link
                href="/admin/manual"
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#0f172a',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ padding: '8px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb' }}>
                  <Swords size={20} />
                </div>
                <div>
                  <h5 style={{ fontSize: '0.92rem', fontWeight: 800 }}>Manual Match Entry</h5>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Log offline PS5 matches</p>
                </div>
              </Link>

              <Link
                href="/admin/players"
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#0f172a',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ padding: '8px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb' }}>
                  <Users size={20} />
                </div>
                <div>
                  <h5 style={{ fontSize: '0.92rem', fontWeight: 800 }}>Player Management</h5>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Edit profiles & ratings</p>
                </div>
              </Link>

              <Link
                href="/admin/achievements"
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#0f172a',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ padding: '8px', borderRadius: '8px', background: '#fef3c7', color: '#b45309' }}>
                  <Trophy size={20} />
                </div>
                <div>
                  <h5 style={{ fontSize: '0.92rem', fontWeight: 800 }}>Achievements Console</h5>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Create badges & award players</p>
                </div>
              </Link>

              <Link
                href="/admin/teams"
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#0f172a',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ padding: '8px', borderRadius: '8px', background: '#f5f3ff', color: '#7c3aed' }}>
                  <Shield size={20} />
                </div>
                <div>
                  <h5 style={{ fontSize: '0.92rem', fontWeight: 800 }}>FC Teams Roster</h5>
                  <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Manage clubs & OVR ratings</p>
                </div>
              </Link>
            </div>
          </div>

        </div>

      </div>
    </Layout>
  );
}
