/**
 * Image Compression Utility for PSO Gaming Platform
 * Strictly enforces maximum file size of 300 KB.
 * Uses client-side HTML5 Canvas for resizing and iterative compression.
 */

export const DEFAULT_MAX_ALLOWED_SIZE_BYTES = 100 * 1024; // Default 100 KB

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Validates file type. Allowed formats: JPG, PNG, WEBP.
 */
export function validateImageFileType(file) {
  if (!file) return { valid: false, error: 'No file selected' };
  const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const fileName = file.name.toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));
  const hasValidMime = validMimeTypes.includes(file.type.toLowerCase()) || file.type.startsWith('image/');

  if (!hasValidExt || !hasValidMime) {
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
 * Compresses an image file client-side to be <= dynamic maxAllowedSizeKb (defaults to 100 KB).
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

  const maxAllowedKb = options.maxAllowedSizeKb || options.maxKb || 100;
  const targetMaxBytes = maxAllowedKb * 1024;

  try {
    const img = await loadImageFromFile(file);

    // Dynamic initial dimensions: scale based on target size to balance clarity with compression speed
    const defaultMaxWidth = maxAllowedKb <= 120 ? 1440 : 1920;
    const defaultMaxHeight = maxAllowedKb <= 120 ? 900 : 1080;

    const MAX_WIDTH = options.maxWidth || defaultMaxWidth;
    const MAX_HEIGHT = options.maxHeight || defaultMaxHeight;

    let { width, height } = img;

    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    const targetMime = 'image/webp';
    const fallbackMime = 'image/jpeg';

    // Iterative quality reduction
    const qualitySteps = [0.82, 0.72, 0.60, 0.48, 0.38];
    let bestBlob = null;

    for (const q of qualitySteps) {
      let blob = await canvasToBlob(canvas, targetMime, q);
      if (!blob || blob.size === 0) {
        blob = await canvasToBlob(canvas, fallbackMime, q);
      }

      if (blob && blob.size <= targetMaxBytes) {
        bestBlob = blob;
        break;
      }
      bestBlob = blob;
    }

    // If still over target, downscale canvas resolution by 25% and retry
    if (bestBlob && bestBlob.size > targetMaxBytes) {
      const scaleDownRatio = 0.75;
      canvas.width = Math.round(width * scaleDownRatio);
      canvas.height = Math.round(height * scaleDownRatio);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      for (const q of [0.65, 0.50, 0.35]) {
        let blob = await canvasToBlob(canvas, targetMime, q);
        if (!blob || blob.size === 0) {
          blob = await canvasToBlob(canvas, fallbackMime, q);
        }
        if (blob && blob.size <= targetMaxBytes) {
          bestBlob = blob;
          break;
        }
      }
    }

    // Limit check
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
    const ext = bestBlob.type === 'image/webp' ? '.webp' : '.jpg';
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const cleanFileName = `${baseName}_compressed${ext}`;
    const compressedFile = new File([bestBlob], cleanFileName, {
      type: bestBlob.type,
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
      savingsPercent: Math.round(((originalSize - bestBlob.size) / originalSize) * 100)
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
