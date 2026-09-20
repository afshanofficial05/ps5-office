import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  Bug, PlusCircle, CheckCircle2, Clock, AlertTriangle, 
  Upload, X, Image as ImageIcon, Laptop, Smartphone, HelpCircle, 
  ChevronDown, ChevronUp, Check, ExternalLink, RefreshCw, MessageSquare, Loader2
} from 'lucide-react';
import { compressScreenshot, formatFileSize } from '../../utils/imageCompressor';

const CATEGORIES = [
  { id: 'MATCHES', label: 'Match Lobby & Joining' },
  { id: 'SUBMISSIONS', label: 'Result Submission & Evidence' },
  { id: 'LEADERBOARD', label: 'Leaderboard, Ratings & Streaks' },
  { id: 'TEAMS', label: 'Teams Database & Squad Selection' },
  { id: 'PROFILE', label: 'Profile, Photo & Account' },
  { id: 'UI_ALIGNMENT', label: 'Visual Glitch / Mobile Layout' },
  { id: 'OTHER', label: 'Other General Bug' },
];

const SEVERITIES = [
  { id: 'LOW', label: 'Low — Minor visual or typo issue', color: '#64748b', bg: '#f1f5f9' },
  { id: 'MEDIUM', label: 'Medium — Noticeable but workaround exists', color: '#d97706', bg: '#fef3c7' },
  { id: 'HIGH', label: 'High — Core feature malfunctioning', color: '#ea580c', bg: '#ffedd5' },
  { id: 'CRITICAL', label: 'Critical — Blocks gameplay or crashes', color: '#dc2626', bg: '#fee2e2' },
];

export default function BugReportPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('REPORT'); // 'REPORT' | 'MY_BUGS'
  const [myBugs, setMyBugs] = useState([]);
  const [loadingBugs, setLoadingBugs] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('MATCHES');
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Diagnostic Environment Detection
  const [envInfo, setEnvInfo] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('Detecting...');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || width < 768;
      
      let os = 'Unknown OS';
      if (/Windows/i.test(ua)) os = 'Windows';
      else if (/Macintosh|Mac OS/i.test(ua)) os = 'macOS';
      else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
      else if (/Android/i.test(ua)) os = 'Android';
      else if (/Linux/i.test(ua)) os = 'Linux';

      let browser = 'Browser';
      if (/Edg/i.test(ua)) browser = 'Edge';
      else if (/Chrome/i.test(ua)) browser = 'Chrome';
      else if (/Safari/i.test(ua)) browser = 'Safari';
      else if (/Firefox/i.test(ua)) browser = 'Firefox';

      const detected = `${browser} on ${os} (${isMobile ? 'Mobile' : 'Desktop'}, ${width}x${height}px @${dpr}x)`;
      setDeviceLabel(detected);
      setEnvInfo(JSON.stringify({
        browser,
        os,
        viewport: `${width}x${height}`,
        screen: `${window.screen.width}x${window.screen.height}`,
        devicePixelRatio: dpr,
        url: window.location.href,
        userAgent: ua
      }, null, 2));
    }
  }, []);

  const loadMyBugs = async () => {
    setLoadingBugs(true);
    try {
      const data = await api.getMyBugReports();
      setMyBugs(data || []);
    } catch (err) {
      console.error('Failed to load my bugs', err);
    } finally {
      setLoadingBugs(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadMyBugs();
    }
  }, [user]);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject files above 8MB initially
    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be under 8MB in size.');
      return;
    }

    setError('');
    setCompressing(true);

    try {
      // Compress client-side to <= 200 KB
      const res = await compressScreenshot(file, { maxAllowedSizeKb: 200 });
      if (!res.success) {
        setError(res.error || 'Failed to compress image.');
        setCompressing(false);
        return;
      }

      setScreenshotFile(res.file);
      setScreenshotPreview(res.previewUrl || URL.createObjectURL(res.file));
      setCompressionInfo({
        originalSizeFormatted: res.originalSizeFormatted,
        compressedSizeFormatted: res.compressedSizeFormatted,
        originalBytes: res.originalSize,
        compressedBytes: res.compressedSize
      });
    } catch (err) {
      console.error('Image compression failed:', err);
      setError('Failed to process and compress screenshot.');
    } finally {
      setCompressing(false);
    }
  };

  const handleRemoveImage = () => {
    setScreenshotFile(null);
    setCompressionInfo(null);
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
      setScreenshotPreview('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide both a title and a detailed description of the bug.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      let uploadedUrl = null;
      if (screenshotFile) {
        setUploadingImage(true);
        const uploadRes = await api.uploadBugScreenshot(screenshotFile);
        uploadedUrl = uploadRes.file_url;
      }

      await api.createBugReport({
        title: title.trim(),
        category,
        severity,
        description: description.trim(),
        steps_to_reproduce: stepsToReproduce.trim() || null,
        device_info: envInfo,
        screenshot_url: uploadedUrl
      });

      // Clear Form
      setTitle('');
      setDescription('');
      setStepsToReproduce('');
      handleRemoveImage();
      setSuccess('Bug report submitted successfully! Developers have been notified.');

      // Refresh bug list
      loadMyBugs();

      // Switch to My Bugs after a short delay
      setTimeout(() => {
        setActiveTab('MY_BUGS');
        setSuccess('');
      }, 1500);

    } catch (err) {
      console.error('Failed to submit bug', err);
      setError(err.message || 'Failed to submit bug report. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            fontSize: '0.74rem',
            fontWeight: 800,
            border: '1px solid #fde68a'
          }}>
            <Clock size={12} /> OPEN
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            fontSize: '0.74rem',
            fontWeight: 800,
            border: '1px solid #bfdbfe'
          }}>
            <RefreshCw size={12} className="spin-slow" /> IN PROGRESS
          </span>
        );
      case 'RESOLVED':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: '#ecfdf5',
            color: '#059669',
            fontSize: '0.74rem',
            fontWeight: 800,
            border: '1px solid #a7f3d0'
          }}>
            <CheckCircle2 size={12} /> RESOLVED
          </span>
        );
      case 'CLOSED':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            fontSize: '0.74rem',
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
    const item = SEVERITIES.find(s => s.id === sev) || SEVERITIES[1];
    return (
      <span style={{
        fontSize: '0.72rem',
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: '6px',
        backgroundColor: item.bg,
        color: item.color,
      }}>
        {sev}
      </span>
    );
  };

  return (
    <Layout title="Bug & Issue Reporting" requireAuth={true}>
      <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        
        {/* Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
          border: '1.5px solid #bfdbfe',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 16px rgba(37, 99, 235, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              flexShrink: 0
            }}>
              <Bug size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Platform Bug Reporting
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.86rem', marginTop: '3px' }}>
                Encountered an issue or glitch? Submit a report so our engineering team can investigate and fix it.
              </p>
            </div>
          </div>

          {/* Tab Controls */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '9999px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('REPORT')}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                border: 'none',
                background: activeTab === 'REPORT' ? '#2563eb' : 'transparent',
                color: activeTab === 'REPORT' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Report Bug
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('MY_BUGS'); loadMyBugs(); }}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                border: 'none',
                background: activeTab === 'MY_BUGS' ? '#2563eb' : 'transparent',
                color: activeTab === 'MY_BUGS' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              My Reports ({myBugs.length})
            </button>
          </div>
        </div>

        {/* TAB 1: REPORT BUG FORM */}
        {activeTab === 'REPORT' && (
          <div className="glass-card" style={{ padding: '28px', background: '#ffffff', borderRadius: '18px' }}>
            
            {error && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '12px',
                color: '#b91c1c',
                fontSize: '0.88rem',
                marginBottom: '18px',
                fontWeight: 600
              }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '12px',
                color: '#047857',
                fontSize: '0.88rem',
                marginBottom: '18px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Bug Title */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Bug Title / Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Leaderboard win streak didn't increase after verified match"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.92rem', padding: '10px 14px' }}
                />
              </div>

              {/* Category & Severity Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                marginBottom: '18px'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Feature Area / Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-select"
                    style={{ width: '100%', fontSize: '0.88rem', padding: '10px 14px', borderRadius: '10px' }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Severity / Impact *
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="form-select"
                    style={{ width: '100%', fontSize: '0.88rem', padding: '10px 14px', borderRadius: '10px' }}
                  >
                    {SEVERITIES.map(sev => (
                      <option key={sev.id} value={sev.id}>{sev.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain what happened, what went wrong, and what you expected to see instead..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.9rem', padding: '10px 14px', lineHeight: 1.5 }}
                />
              </div>

              {/* Steps to Reproduce */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Steps to Reproduce <span style={{ color: '#64748b', fontWeight: 500 }}>(Optional but extremely helpful)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder={"1. Click on Matches -> Create\n2. Select team Real Madrid and click submit\n3. The page shows error code 500"}
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.88rem', padding: '10px 14px', lineHeight: 1.4 }}
                />
              </div>

              {/* Screenshot Upload */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Screenshot / Photo Evidence <span style={{ color: '#64748b', fontWeight: 500 }}>(Optional)</span>
                </label>

                {compressing ? (
                  <div style={{
                    border: '2px dashed #93c5fd',
                    borderRadius: '12px',
                    padding: '28px 20px',
                    textAlign: 'center',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}>
                    <Loader2 size={30} color="#2563eb" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e40af', margin: 0 }}>
                      Compressing image to ≤ 200 KB...
                    </p>
                    <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
                      Optimizing resolution for fast upload
                    </p>
                  </div>
                ) : screenshotPreview ? (
                  <div>
                    <div style={{
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1.5px solid #2563eb',
                      maxWidth: '400px',
                      maxHeight: '260px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#0f172a'
                    }}>
                      <img
                        src={screenshotPreview}
                        alt="Bug Preview"
                        style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'contain' }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                        }}
                        title="Remove image"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Compression Pill / Metrics */}
                    {compressionInfo && (
                      <div style={{
                        marginTop: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        backgroundColor: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        color: '#065f46',
                        fontWeight: 600
                      }}>
                        <Check size={13} color="#059669" />
                        <span>Compressed: <strong>{compressionInfo.compressedSizeFormatted}</strong></span>
                        <span style={{ color: '#9ca3af' }}>•</span>
                        <span style={{ color: '#6b7280' }}>Original: {compressionInfo.originalSizeFormatted}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleImageChange}
                      id="bug-screenshot-upload"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="bug-screenshot-upload" style={{ cursor: 'pointer', display: 'block' }}>
                      <ImageIcon size={32} color="#64748b" style={{ margin: '0 auto 8px auto' }} />
                      <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        Click to upload a screenshot
                      </p>
                      <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
                        Supports PNG, JPG, WEBP up to 8MB • Auto-compressed to ≤ 200 KB
                      </p>
                    </label>
                  </div>
                )}
              </div>

              {/* Auto-detected Environment Box */}
              <div style={{
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Laptop size={18} color="#2563eb" />
                  <div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                      Auto-detected Environment:
                    </span>
                    <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0, fontFamily: 'monospace' }}>
                      {deviceLabel}
                    </p>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  color: '#059669',
                  fontWeight: 700,
                  backgroundColor: '#ecfdf5',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid #a7f3d0'
                }}>
                  ✓ Diagnostic info auto-attached
                </span>
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={submitting || uploadingImage || compressing}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', fontSize: '0.92rem' }}
                >
                  {compressing ? (
                    <span>Compressing image...</span>
                  ) : submitting ? (
                    <span>Submitting Report...</span>
                  ) : (
                    <>
                      <Bug size={16} />
                      <span>Submit Bug Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: MY BUG REPORTS */}
        {activeTab === 'MY_BUGS' && (
          <div>
            {loadingBugs ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <RefreshCw size={28} className="spin" style={{ margin: '0 auto 10px auto', color: '#2563eb' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading your bug reports...</p>
              </div>
            ) : myBugs.length === 0 ? (
              <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '18px' }}>
                <CheckCircle2 size={44} color="#059669" style={{ margin: '0 auto 12px auto', opacity: 0.8 }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>No Bug Reports Submitted</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', maxWidth: '400px', margin: '4px auto 16px auto' }}>
                  You haven't reported any issues yet. If you ever run into a problem while playing, let our team know!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('REPORT')}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                >
                  <PlusCircle size={15} />
                  <span>Report an Issue</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myBugs.map(bug => (
                  <div
                    key={bug.id}
                    className="glass-card"
                    style={{
                      padding: '18px 20px',
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    {/* Top Row: Title + Status + Severity */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                          #{bug.id}
                        </span>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          {bug.title}
                        </h4>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getSeverityBadge(bug.severity)}
                        {getStatusBadge(bug.status)}
                      </div>
                    </div>

                    {/* Metadata Subtitle */}
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, color: '#334155' }}>
                        {CATEGORIES.find(c => c.id === bug.category)?.label || bug.category}
                      </span>
                      <span>•</span>
                      <span>Reported {new Date(bug.created_at).toLocaleDateString()} at {new Date(bug.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                      {bug.description}
                    </p>

                    {/* Steps to Reproduce */}
                    {bug.steps_to_reproduce && (
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #f1f5f9',
                        marginBottom: '12px'
                      }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                          Steps to Reproduce:
                        </span>
                        <p style={{ fontSize: '0.82rem', color: '#0f172a', margin: '4px 0 0 0', whiteSpace: 'pre-line' }}>
                          {bug.steps_to_reproduce}
                        </p>
                      </div>
                    )}

                    {/* Screenshot Preview */}
                    {bug.screenshot_url && (
                      <div style={{ marginBottom: '12px' }}>
                        <a
                          href={bug.screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.8rem',
                            color: '#2563eb',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          <ImageIcon size={14} />
                          <span>View Attached Screenshot</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}

                    {/* Developer / Admin Notes Banner */}
                    {bug.admin_notes && (
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        backgroundColor: bug.status === 'RESOLVED' ? '#ecfdf5' : '#eff6ff',
                        border: `1px solid ${bug.status === 'RESOLVED' ? '#a7f3d0' : '#bfdbfe'}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        marginTop: '8px'
                      }}>
                        <MessageSquare size={16} color={bug.status === 'RESOLVED' ? '#059669' : '#2563eb'} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: bug.status === 'RESOLVED' ? '#047857' : '#1d4ed8' }}>
                            Developer Feedback {bug.resolver_name ? `by ${bug.resolver_name}` : ''}:
                          </div>
                          <p style={{ fontSize: '0.84rem', color: '#0f172a', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                            {bug.admin_notes}
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}
