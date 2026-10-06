import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { Shield, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';

export default function AdminAppealsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('PENDING');

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN'))) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      loadAppeals();
    }
  }, [user, filter]);

  const loadAppeals = async () => {
    setLoading(true);
    try {
      const data = await api.getReports(filter === 'ALL' ? '' : filter);
      setAppeals(data);
    } catch (err) {
      setError('Failed to load appeals.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id, status) => {
    try {
      await api.resolveReport(id, { status, admin_notes: 'Resolved by Admin' });
      loadAppeals();
    } catch (err) {
      alert('Failed to resolve appeal');
    }
  };

  if (authLoading || !user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) return null;

  return (
    <Layout title="Manage Appeals" requireAuth={true} adminOnly={true}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Shield size={28} color="#ef4444" />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Score Appeals & Reports
          </h2>
        </div>

        {error && (
          <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px' }}>
            <AlertCircle size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {['PENDING', 'RESOLVED', 'DISMISSED', 'ALL'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                background: filter === status ? '#0f172a' : '#e2e8f0',
                color: filter === status ? '#ffffff' : '#475569',
              }}
            >
              {status}
            </button>
          ))}
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : appeals.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', background: '#ffffff', borderRadius: '16px', color: '#64748b' }}>
            No appeals found for this status.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {appeals.map(appeal => (
              <div key={appeal.id} style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', background: '#fee2e2', padding: '4px 8px', borderRadius: '4px' }}>
                      {appeal.reason}
                    </span>
                    <h4 style={{ margin: '8px 0 4px 0', fontSize: '1.1rem', fontWeight: 800 }}>Match #{appeal.match_id}</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                      Reported Player ID: <strong>{appeal.reported_player_id}</strong> | Reporter ID: {appeal.reporter_id}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>{new Date(appeal.created_at).toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', color: '#334155', marginBottom: '16px' }}>
                  <strong>Description:</strong> {appeal.description || 'No description provided.'}
                </div>

                {appeal.status === 'PENDING' ? (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => handleResolve(appeal.id, 'RESOLVED')}
                      className="btn btn-primary"
                      style={{ background: '#16a34a', borderColor: '#16a34a', padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      <CheckCircle size={16} style={{ marginRight: '6px' }} /> Accept / Resolve
                    </button>
                    <button
                      onClick={() => handleResolve(appeal.id, 'DISMISSED')}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      <XCircle size={16} style={{ marginRight: '6px' }} /> Dismiss
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: appeal.status === 'RESOLVED' ? '#16a34a' : '#64748b' }}>
                    Status: {appeal.status} {appeal.admin_notes && `(${appeal.admin_notes})`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
