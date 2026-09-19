import React, { useState } from 'react';
import { User } from 'lucide-react';
import { resolveImageUrl, getInitial } from '../utils/imageUtils';

const SIZES = {
  xs: { box: 24, font: '0.65rem', icon: 13, border: 1.5 },
  sm: { box: 32, font: '0.78rem', icon: 16, border: 2 },
  md: { box: 40, font: '0.92rem', icon: 20, border: 2 },
  lg: { box: 54, font: '1.25rem', icon: 26, border: 2.5 },
  xl: { box: 72, font: '1.65rem', icon: 34, border: 3 },
  '2xl': { box: 96, font: '2.1rem', icon: 44, border: 3.5 },
};

export default function Avatar({
  src,
  name = '',
  size = 'md',
  className = '',
  style = {},
  alt = 'Avatar',
  showBorder = true,
  borderColor = '#e2e8f0',
  status = null, // 'online' | 'offline' | 'busy' | null
}) {
  const [imgError, setImgError] = useState(false);
  const sizeConfig = SIZES[size] || SIZES.md;

  const initial = getInitial(name);
  const resolvedSrc = resolveImageUrl(src);

  // Generate deterministic subtle gradient based on name
  const getGradient = (str) => {
    const gradients = [
      'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', // Royal Blue
      'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', // Indigo
      'linear-gradient(135deg, #0d9488 0%, #115e59 100%)', // Teal
      'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', // Violet
      'linear-gradient(135deg, #e11d48 0%, #9f1239 100%)', // Rose
      'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', // Sky
      'linear-gradient(135deg, #d97706 0%, #b45309 100%)', // Amber
    ];
    let hash = 0;
    for (let i = 0; i < (str || '').length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const hasValidPhoto = resolvedSrc && typeof resolvedSrc === 'string' && resolvedSrc.trim().length > 0 && !imgError;

  return (
    <div
      className={`avatar-wrapper ${className}`}
      style={{
        position: 'relative',
        width: `${sizeConfig.box}px`,
        height: `${sizeConfig.box}px`,
        minWidth: `${sizeConfig.box}px`,
        minHeight: `${sizeConfig.box}px`,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden',
        border: showBorder ? `${sizeConfig.border}px solid ${borderColor}` : 'none',
        boxShadow: showBorder ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
        backgroundColor: hasValidPhoto ? '#f8fafc' : '#eff6ff',
        flexShrink: 0,
        userSelect: 'none',
        ...style,
      }}
    >
      {hasValidPhoto ? (
        <img
          src={resolvedSrc}
          alt={name || alt}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            aspectRatio: '1 / 1',
            display: 'block',
            borderRadius: '50%',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: getGradient(name || 'User'),
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: sizeConfig.font,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '0.02em',
            borderRadius: '50%',
            textTransform: 'uppercase',
          }}
        >
          {initial}
        </div>
      )}


      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            width: `${Math.max(8, Math.round(sizeConfig.box * 0.22))}px`,
            height: `${Math.max(8, Math.round(sizeConfig.box * 0.22))}px`,
            borderRadius: '50%',
            backgroundColor: status === 'online' ? '#10b981' : status === 'busy' ? '#f43f5e' : '#94a3b8',
            border: '2px solid #ffffff',
            boxShadow: '0 0 4px rgba(0,0,0,0.15)',
          }}
        />
      )}
    </div>
  );
}
