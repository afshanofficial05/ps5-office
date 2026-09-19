import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { FileText, Shield, RefreshCw } from 'lucide-react';

export default function SuperAdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <Layout title="System Audit Trail" requireAuth={true} allowedRoles={['SUPER_ADMIN']}>
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
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>Immutable Audit Trail</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Tracks administrative actions, match approvals, permission updates, and manual rating adjustments.
            </p>
          </div>

          <button onClick={fetchLogs} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>Refresh Logs</span>
          </button>
        </div>

        <div className="glass-card" style={{ padding: '24px', background: '#ffffff', borderRadius: '20px' }}>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
              <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3, color: '#2563eb' }} />
              <p style={{ fontSize: '1rem', fontWeight: 600 }}>No audit records generated yet.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target Entity</th>
                    <th>Old Value</th>
                    <th>New Value / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{log.actor_name || 'System'}</span>
                      </td>
                      <td>
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#2563eb', fontFamily: 'monospace', fontWeight: 600 }}>
                          {log.entity_type} #{log.entity_id}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '200px', wordBreak: 'break-word' }}>
                        {log.old_value || '-'}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#0f172a', maxWidth: '300px', wordBreak: 'break-word' }}>
                        {log.new_value || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
