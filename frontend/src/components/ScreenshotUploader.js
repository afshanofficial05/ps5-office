import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, CheckCircle2, AlertTriangle, X, Image as ImageIcon, Loader2, Maximize2 
} from 'lucide-react';
import { compressScreenshot, formatFileSize } from '../utils/imageCompressor';
import { api } from '../services/api';

export default function ScreenshotUploader({
  onFileReady,
  onFileCleared,
  required = true,
  maxSizeKb,
  label = "Upload Match Result Screenshot (Required for Verification)"
}) {
  const [dragActive, setDragActive] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [modalPreview, setModalPreview] = useState(false);
  const [limitKb, setLimitKb] = useState(maxSizeKb || 100);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (maxSizeKb) {
      setLimitKb(maxSizeKb);
      return;
    }
    let isMounted = true;
    async function loadConfig() {
      try {
        const config = await api.getMatchConfig();
        if (isMounted && config && config.max_screenshot_size_kb) {
          setLimitKb(config.max_screenshot_size_kb);
        }
      } catch (err) {
        // Fallback to 100 KB
      }
    }
    loadConfig();
    return () => { isMounted = false; };
  }, [maxSizeKb]);

  const handleProcessFile = async (file) => {
    if (!file) return;
    setError('');
    setCompressing(true);
    setResult(null);

    try {
      const compressionRes = await compressScreenshot(file, {
        maxAllowedSizeKb: limitKb
      });

      if (!compressionRes.success) {
        setError(compressionRes.error || 'Compression failed');
        if (onFileCleared) onFileCleared();
      } else {
        setResult(compressionRes);
        if (onFileReady) {
          onFileReady(compressionRes.file, compressionRes);
        }
      }
    } catch (err) {
      setError(err.message || 'Error processing image');
      if (onFileCleared) onFileCleared();
    } finally {
      setCompressing(false);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = (e) => {
    if (e) e.stopPropagation();
    setResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onFileCleared) onFileCleared();
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ 
        display: 'block', 
        fontSize: '0.88rem', 
        fontWeight: 700, 
        color: '#0f172a', 
        marginBottom: '6px' 
      }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>

      {/* Upload Zone */}
      {!result ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{
            border: `2px dashed ${dragActive ? '#2563eb' : error ? '#ef4444' : '#cbd5e1'}`,
            borderRadius: '16px',
            padding: '24px 20px',
            textAlign: 'center',
            backgroundColor: dragActive ? '#eff6ff' : error ? '#fff1f2' : '#f8fafc',
            cursor: compressing ? 'wait' : 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleChange}
            style={{ display: 'none' }}
          />

          {compressing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={32} className="animate-spin" color="#2563eb" />
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e40af' }}>
                Resizing & Compressing Screenshot...
              </p>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Optimizing below {limitKb} KB limit for fast storage and instant review
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UploadCloud size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                  Click to select or drag & drop match screenshot
                </p>
                <p style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                  JPG, PNG, or WEBP. Automatically resized & compressed to max {limitKb} KB.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Compressed Ready View */
        <div style={{
          border: '1.5px solid #86efac',
          background: '#f0fdf4',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          {/* Left: Thumbnail & Sizes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{ position: 'relative', cursor: 'pointer' }}
              onClick={() => setModalPreview(true)}
              title="Click to zoom preview"
            >
              <img
                src={result.previewUrl}
                alt="Compressed Match Screenshot"
                style={{
                  width: '74px',
                  height: '56px',
                  objectFit: 'cover',
                  borderRadius: '10px',
                  border: '1px solid #bbf7d0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                }}
              />
              <div style={{
                position: 'absolute',
                right: '4px',
                bottom: '4px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '4px',
                padding: '2px',
                color: '#fff',
                display: 'flex'
              }}>
                <Maximize2 size={12} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#14532d' }}>
                  Screenshot Ready
                </span>
                <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                  ✓ Under {limitKb} KB Limit
                </span>
              </div>

              {/* Compression Metrics */}
              <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '4px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span>Original: <strong>{result.originalSizeFormatted}</strong></span>
                <span>→</span>
                <span>Compressed: <strong>{result.compressedSizeFormatted}</strong></span>
                {result.savingsPercent > 0 && (
                  <span style={{ color: '#15803d', fontWeight: 700 }}>
                    (-{result.savingsPercent}% saved)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setModalPreview(true)}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="btn"
              style={{
                padding: '6px 10px',
                background: '#fee2e2',
                color: '#b91c1c',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
              title="Remove and select another"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '8px',
          padding: '10px 14px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '10px',
          color: '#991b1b',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Full Size Modal Preview */}
      {modalPreview && result && (
        <div
          onClick={() => setModalPreview(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              background: '#0f172a',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              padding: '12px 18px',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#ffffff'
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                Screenshot Preview ({result.compressedSizeFormatted} • Max 300 KB)
              </span>
              <button
                onClick={() => setModalPreview(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
              <img
                src={result.previewUrl}
                alt="Match Screenshot Expanded"
                style={{
                  maxWidth: '100%',
                  maxHeight: '78vh',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
