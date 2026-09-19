import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  BarChart3, Download, FileSpreadsheet, FileText, CheckCircle2, 
  Users, Swords, Shield, Trophy, Activity, ShieldAlert, Loader2
} from 'lucide-react';

export default function AdminReportsPage() {
  const { user, hasPermission } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const canView = hasPermission('VIEW_REPORTS');
  const canGenerate = hasPermission('GENERATE_REPORTS');

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    api.getReportsSummary()
      .then(data => setSummary(data))
      .catch(err => console.error('Failed to load reports summary', err))
      .finally(() => setLoading(false));
  }, [user]);

  const handleExportCsv = async () => {
    setExporting(true);
    setExportMsg('');
    try {
      const res = await api.exportReports('csv');
      // If text/csv response
      const blob = new Blob([res], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pso_matches_report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setExportMsg('CSV match report downloaded successfully!');
      setTimeout(() => setExportMsg(''), 4000);
    } catch (err) {
      console.error('Export failed', err);
      // Try direct link download fallback
      window.open('/api/admin/reports/export?format=csv', '_blank');
      setExportMsg('Export requested!');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJson = async () => {
    setExporting(true);
    try {
      const res = await api.exportReports('json');
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pso_analytics_export_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setExportMsg('JSON analytics export downloaded successfully!');
      setTimeout(() => setExportMsg(''), 4000);
    } catch (err) {
      console.error('Export failed', err);
      alert('Failed to export JSON report');
    } finally {
      setExporting(false);
    }
  };

  if (!canView) {
    return (
      <Layout title="Platform Reports" requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
        <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '40px' }} className="glass-card">
          <ShieldAlert size={48} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Permission Denied</h2>
          <p style={{ color: '#64748b', marginTop: '8px' }}>
            You do not possess the <strong>VIEW_REPORTS</strong> permission required to access platform reports.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Platform Reports" requireAuth={true} allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
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
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>System Analytics & Reports</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Inspect competitive match volume, player distributions, and generate data exports.
            </p>
          </div>

          {canGenerate && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={exporting}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
              >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={15} color="#059669" />}
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                disabled={exporting}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
              >
                <Download size={14} color="#2563eb" />
                <span>Export JSON</span>
              </button>
            </div>
          )}
        </div>

        {exportMsg && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            marginBottom: '16px',
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={18} />
            <span>{exportMsg}</span>
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading analytics report...</p>
        ) : summary ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Metric KPI Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px'
            }}>
              <div className="glass-card" style={{ padding: '20px', background: '#fff', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>TOTAL MATCHES</span>
                  <Swords size={20} color="#2563eb" />
                </div>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginTop: '10px' }}>
                  {summary.total_matches}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
                  {summary.approved_matches} approved • {summary.pending_matches} pending
                </p>
              </div>

              <div className="glass-card" style={{ padding: '20px', background: '#fff', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>ACTIVE PLAYERS</span>
                  <Users size={20} color="#10b981" />
                </div>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginTop: '10px' }}>
                  {summary.active_players}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  out of {summary.total_players} registered accounts
                </p>
              </div>

              <div className="glass-card" style={{ padding: '20px', background: '#fff', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>ACTIVE SEASON</span>
                  <Trophy size={20} color="#f59e0b" />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: '12px' }}>
                  {summary.active_season || 'None Active'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  {summary.total_seasons} seasons on record
                </p>
              </div>

              <div className="glass-card" style={{ padding: '20px', background: '#fff', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>AVERAGE RATING</span>
                  <Activity size={20} color="#8b5cf6" />
                </div>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginTop: '10px' }}>
                  {summary.average_rating}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  Standard Elo Baseline: 1500
                </p>
              </div>
            </div>

            {/* Match Breakdown by Mode */}
            <div className="glass-card" style={{ padding: '24px', background: '#fff', borderRadius: '20px' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
                Game Mode Activity Distribution
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>1V1 SINGLES MATCHES</p>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#2563eb', marginTop: '6px' }}>
                    {summary.matches_1v1}
                  </h2>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>2V2 DOUBLES MATCHES</p>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981', marginTop: '6px' }}>
                    {summary.matches_2v2}
                  </h2>
                </div>
                <div style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>REGISTERED FC TEAMS</p>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#8b5cf6', marginTop: '6px' }}>
                    {summary.total_teams}
                  </h2>
                </div>
              </div>
            </div>
          </div>
        ) : null}

      </div>
    </Layout>
  );
}
