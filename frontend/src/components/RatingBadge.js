import React from 'react';
import { Award, Medal, Shield } from 'lucide-react';

export default function RatingBadge({ rating = 1500, size = 'md' }) {
  let tier = 'Gold';
  let badgeBg = '#fef3c7';
  let badgeColor = '#b45309';
  let badgeBorder = '#fde68a';
  let iconColor = '#d97706';

  if (rating >= 1800) {
    tier = 'Grandmaster';
    badgeBg = '#ffe4e6';
    badgeColor = '#e11d48';
    badgeBorder = '#fecdd3';
    iconColor = '#e11d48';
  } else if (rating >= 1650) {
    tier = 'Master';
    badgeBg = '#f3e8ff';
    badgeColor = '#7e22ce';
    badgeBorder = '#e9d5ff';
    iconColor = '#9333ea';
  } else if (rating >= 1550) {
    tier = 'Diamond';
    badgeBg = '#e0f2fe';
    badgeColor = '#0369a1';
    badgeBorder = '#bae6fd';
    iconColor = '#0284c7';
  } else if (rating >= 1450) {
    tier = 'Gold';
    badgeBg = '#fef3c7';
    badgeColor = '#b45309';
    badgeBorder = '#fde68a';
    iconColor = '#d97706';
  } else if (rating >= 1350) {
    tier = 'Silver';
    badgeBg = '#f1f5f9';
    badgeColor = '#475569';
    badgeBorder = '#cbd5e1';
    iconColor = '#64748b';
  } else {
    tier = 'Bronze';
    badgeBg = '#ffedd5';
    badgeColor = '#c2410c';
    badgeBorder = '#fed7aa';
    iconColor = '#ea580c';
  }

  const isLarge = size === 'lg';

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: isLarge ? '8px' : '5px',
      padding: isLarge ? '6px 14px' : '4px 10px',
      borderRadius: '9999px',
      backgroundColor: badgeBg,
      border: `1px solid ${badgeBorder}`,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
    }}>
      <Award size={isLarge ? 18 : 14} color={iconColor} />
      <span style={{
        fontWeight: 800,
        fontSize: isLarge ? '1.05rem' : '0.82rem',
        color: badgeColor,
        fontFamily: 'monospace'
      }}>
        {Math.round(rating)}
      </span>
      <span style={{
        fontSize: isLarge ? '0.78rem' : '0.68rem',
        color: badgeColor,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em'
      }}>
        {tier}
      </span>
    </div>
  );
}
