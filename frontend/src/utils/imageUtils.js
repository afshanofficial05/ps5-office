/**
 * Utility functions for handling image URLs, specifically Google Drive links
 * and ensuring direct web-embeddable rendering.
 */

export function extractGoogleDriveId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Pattern 1: /file/d/{ID}/
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // Pattern 2: id={ID} query param (e.g. open?id=... or uc?id=... or uc?export=download&id=...)
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  // Pattern 3: direct thumbnail/d/{ID}
  const thumbnailMatch = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (thumbnailMatch && thumbnailMatch[1]) return thumbnailMatch[1];

  return null;
}

export function isGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('googleusercontent.com/d/');
}

export function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Check if it is a Google Drive URL
  const driveId = extractGoogleDriveId(trimmed);
  if (driveId) {
    // High-resolution reliable web-embeddable endpoint for Google Drive images
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
  }

  // Handle local uploaded files if relative path
  if (trimmed.startsWith('/uploads') || trimmed.startsWith('uploads/')) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const baseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL)
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
      : '';
    return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
  }

  return trimmed;
}

export function getInitial(name) {
  if (!name || typeof name !== 'string') return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed[0].toUpperCase();
}
