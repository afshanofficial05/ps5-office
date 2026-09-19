/**
 * Image Compression Utility for PSO Gaming Platform
 * Optimized for cross-browser reliability (iOS Safari, Android Chrome, Desktop)
 * Enforces dynamic size limits (defaults to 5000 KB / 5 MB)
 */

export const DEFAULT_MAX_ALLOWED_SIZE_BYTES = 5000 * 1024; // Default 5 MB

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Validates file type. Allowed formats: JPG, PNG, WEBP, HEIC/HEIF (common on iPhone)
 */
export function validateImageFileType(file) {
  if (!file) return { valid: false, error: 'No file selected' };
  const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const fileName = file.name.toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));
  const hasValidMime = validMimeTypes.includes(file.type.toLowerCase()) || file.type.startsWith('image/');

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload a screenshot in JPG, PNG, or WEBP format.'
    };
  }

  return { valid: true };
}

/**
 * Loads a File into an HTMLImageElement
 */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to read screenshot image file'));
    };
    img.src = objectUrl;
  });
}

/**
 * Converts canvas to Blob with given MIME type and quality
 */
function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

/**
 * Compresses an image file client-side to be <= dynamic maxAllowedSizeKb (defaults to 5000 KB).
 * Guaranteed to produce well-compressed JPEG across all mobile (iOS Safari) and desktop browsers.
 * 
 * @param {File} file - Original file from input
 * @param {Object} options - Optional compression tuning (e.g. maxAllowedSizeKb)
 * @returns {Promise<Object>} Result object with status, file/blob, preview, and size details
 */
export async function compressScreenshot(file, options = {}) {
  const typeValidation = validateImageFileType(file);
  if (!typeValidation.valid) {
    return {
      success: false,
      error: typeValidation.error,
      originalSize: file.size,
      originalSizeFormatted: formatFileSize(file.size),
    };
  }

  const originalSize = file.size;
  const originalSizeFormatted = formatFileSize(originalSize);

  // Default to 5000 KB (5 MB), or user/admin configured limit
  const maxAllowedKb = options.maxAllowedSizeKb || options.maxKb || 5000;
  const targetMaxBytes = maxAllowedKb * 1024;

  // If already under target and already under 1MB, we can still lightly optimize or keep
  try {
    const img = await loadImageFromFile(file);

    let curWidth = img.width;
    let curHeight = img.height;

    // Cap initial dimension to 1920x1080 (HD screenshot resolution)
    const MAX_WIDTH = options.maxWidth || 1920;
    const MAX_HEIGHT = options.maxHeight || 1080;

    if (curWidth > MAX_WIDTH || curHeight > MAX_HEIGHT) {
      const ratio = Math.min(MAX_WIDTH / curWidth, MAX_HEIGHT / curHeight);
      curWidth = Math.round(curWidth * ratio);
      curHeight = Math.round(curHeight * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = curWidth;
    canvas.height = curHeight;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, curWidth, curHeight);

    // Standardize on image/jpeg for 100% iOS Safari and Android compatibility
    // (iOS Safari falls back to uncompressed PNG if image/webp is requested)
    const targetMime = 'image/jpeg';
    let bestBlob = null;

    // First attempt: try high to moderate quality
    const qualitySteps = [0.85, 0.75, 0.65, 0.50, 0.40];
    for (const q of qualitySteps) {
      const blob = await canvasToBlob(canvas, targetMime, q);
      if (blob) {
        bestBlob = blob;
        if (blob.size <= targetMaxBytes) {
          break;
        }
      }
    }

    // If still oversized, progressively downscale dimensions and compress
    let passes = 0;
    while (bestBlob && bestBlob.size > targetMaxBytes && passes < 4 && curWidth > 640) {
      passes++;
      curWidth = Math.round(curWidth * 0.75);
      curHeight = Math.round(curHeight * 0.75);

      canvas.width = curWidth;
      canvas.height = curHeight;
      const passCtx = canvas.getContext('2d');
      passCtx.imageSmoothingEnabled = true;
      passCtx.imageSmoothingQuality = 'high';
      passCtx.drawImage(img, 0, 0, curWidth, curHeight);

      for (const q of [0.70, 0.55, 0.40]) {
        const blob = await canvasToBlob(canvas, targetMime, q);
        if (blob) {
          bestBlob = blob;
          if (blob.size <= targetMaxBytes) {
            break;
          }
        }
      }
    }

    // Limit check fallback
    if (!bestBlob || bestBlob.size > targetMaxBytes) {
      const oversizedKb = bestBlob ? formatFileSize(bestBlob.size) : 'oversized';
      return {
        success: false,
        error: `Image must be ${maxAllowedKb} KB or smaller (Compressed: ${oversizedKb}). Please select another screenshot.`,
        originalSize,
        originalSizeFormatted,
        compressedSize: bestBlob ? bestBlob.size : null,
        compressedSizeFormatted: bestBlob ? formatFileSize(bestBlob.size) : null,
      };
    }

    // Convert Blob to File object with unique name
    const ext = '.jpg';
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const cleanFileName = `${baseName}_compressed${ext}`;
    const compressedFile = new File([bestBlob], cleanFileName, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });

    const previewUrl = URL.createObjectURL(bestBlob);

    return {
      success: true,
      file: compressedFile,
      blob: bestBlob,
      originalSize,
      originalSizeFormatted,
      compressedSize: bestBlob.size,
      compressedSizeFormatted: formatFileSize(bestBlob.size),
      previewUrl,
      savingsPercent: Math.max(0, Math.round(((originalSize - bestBlob.size) / originalSize) * 100))
    };

  } catch (err) {
    console.error('Image compression failed:', err);
    return {
      success: false,
      error: err.message || 'Failed to process and compress screenshot',
      originalSize,
      originalSizeFormatted
    };
  }
}
