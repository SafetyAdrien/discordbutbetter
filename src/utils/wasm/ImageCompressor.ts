/**
 * Client-side image compression using Canvas API + OffscreenCanvas (when available).
 * 
 * Provides near-WASM performance for image operations using the browser's native
 * image decoding and Canvas 2D API — which internally uses optimized native code.
 * 
 * For actual WASM-based compression (e.g., WebP encoding via libwebp.wasm),
 * a WASM module can be loaded here in the future.
 */

export interface CompressOptions {
  /** Maximum width in pixels. Height auto-scales. Default: 1920 */
  maxWidth?: number;
  /** Maximum height in pixels. Width auto-scales. Default: 1920 */
  maxHeight?: number;
  /** JPEG/WebP quality 0-1. Default: 0.85 */
  quality?: number;
  /** Output format. Default: 'image/webp' with 'image/jpeg' fallback */
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
  /** Maximum file size in bytes. Will re-compress with lower quality if exceeded. */
  maxBytes?: number;
}

export interface CompressResult {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
}

/**
 * Load an image from a File or Blob into an ImageBitmap or HTMLImageElement.
 */
async function loadImage(source: File | Blob): Promise<ImageBitmap | HTMLImageElement> {
  // Prefer ImageBitmap for better performance (off-main-thread decoding)
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(source);
  }

  // Fallback to HTMLImageElement
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(source);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Calculate target dimensions maintaining aspect ratio.
 */
function calculateDimensions(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  let width = srcWidth;
  let height = srcHeight;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }
  if (height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }

  return { width, height };
}

/**
 * Check if the browser supports WebP encoding via Canvas.
 */
let webpSupported: boolean | null = null;
function supportsWebP(): boolean {
  if (webpSupported !== null) return webpSupported;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    webpSupported = false;
  }
  return webpSupported;
}

/**
 * Render image to canvas and export as blob.
 */
async function renderToBlob(
  image: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  format: string,
  quality: number,
): Promise<Blob> {
  // Try OffscreenCanvas for better performance (no DOM needed)
  if (typeof OffscreenCanvas !== 'undefined') {
    const offscreen = new OffscreenCanvas(width, height);
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      ctx.drawImage(image, 0, 0, width, height);
      return offscreen.convertToBlob({ type: format, quality });
    }
  }

  // Fallback to regular canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      format,
      quality,
    );
  });
}

/**
 * Compress an image file with automatic resizing and format selection.
 * 
 * @example
 * ```ts
 * const result = await compressImage(file, { maxWidth: 512, quality: 0.8 });
 * // Upload result.blob instead of original file
 * ```
 */
export async function compressImage(
  file: File | Blob,
  options: CompressOptions = {},
): Promise<CompressResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    format: requestedFormat,
    maxBytes,
  } = options;

  const originalSize = file.size;

  // Determine output format
  let format = requestedFormat || (supportsWebP() ? 'image/webp' : 'image/jpeg');

  // PNG files should stay PNG if no format specified (transparency)
  if (!requestedFormat && file instanceof File && file.type === 'image/png') {
    format = 'image/png';
  }

  const image = await loadImage(file);
  const srcWidth = 'width' in image ? image.width : (image as HTMLImageElement).naturalWidth;
  const srcHeight = 'height' in image ? image.height : (image as HTMLImageElement).naturalHeight;

  const { width, height } = calculateDimensions(srcWidth, srcHeight, maxWidth, maxHeight);

  // First pass
  let blob = await renderToBlob(image, width, height, format, quality);

  // If maxBytes specified and exceeded, iteratively reduce quality
  if (maxBytes && blob.size > maxBytes && format !== 'image/png') {
    let currentQuality = quality * 0.7;
    for (let attempt = 0; attempt < 5 && blob.size > maxBytes; attempt++) {
      blob = await renderToBlob(image, width, height, format, currentQuality);
      currentQuality *= 0.7;
    }
  }

  // Clean up ImageBitmap
  if ('close' in image) {
    (image as ImageBitmap).close();
  }

  return {
    blob,
    width,
    height,
    originalSize,
    compressedSize: blob.size,
    compressionRatio: originalSize > 0 ? blob.size / originalSize : 1,
    format,
  };
}

/**
 * Compress an image specifically for avatar upload.
 * Max 512x512, high quality WebP/JPEG.
 */
export async function compressAvatar(file: File | Blob): Promise<CompressResult> {
  return compressImage(file, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.9,
    maxBytes: 256 * 1024, // 256KB max
  });
}

/**
 * Compress an image specifically for banner upload.
 * Max 1920x540, medium quality.
 */
export async function compressBanner(file: File | Blob): Promise<CompressResult> {
  return compressImage(file, {
    maxWidth: 1920,
    maxHeight: 540,
    quality: 0.85,
    maxBytes: 1024 * 1024, // 1MB max
  });
}

/**
 * Compress an image specifically for server icon.
 * Max 256x256, high quality.
 */
export async function compressServerIcon(file: File | Blob): Promise<CompressResult> {
  return compressImage(file, {
    maxWidth: 256,
    maxHeight: 256,
    quality: 0.9,
    maxBytes: 128 * 1024, // 128KB max
  });
}

/**
 * Check if a file would benefit from compression.
 * Returns false for small files or already-compressed formats.
 */
export function shouldCompress(file: File): boolean {
  // Skip files under 100KB
  if (file.size < 100 * 1024) return false;
  // Skip non-image files
  if (!file.type.startsWith('image/')) return false;
  // Skip GIFs (would lose animation)
  if (file.type === 'image/gif') return false;
  // Skip SVGs
  if (file.type === 'image/svg+xml') return false;
  return true;
}
