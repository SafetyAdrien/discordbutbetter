export interface OpaqueBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const TRANSPARENCY_CAPABLE_SOURCE = /(?:image\/(?:png|webp|avif|svg\+xml))|(?:\.(?:png|webp|avif|svg)(?:[?#]|$))/i;

export function sourceMayHaveTransparency(source: string | Blob | File | null | undefined) {
  if (!source) return false;
  if (typeof source === 'string') return TRANSPARENCY_CAPABLE_SOURCE.test(source);

  const type = source.type;
  const name = source instanceof File ? source.name : '';
  return TRANSPARENCY_CAPABLE_SOURCE.test(type) || TRANSPARENCY_CAPABLE_SOURCE.test(name);
}

export function findOpaqueBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold = 1
): OpaqueBounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function canvasHasTransparentPixels(data: Uint8ClampedArray) {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) return true;
  }
  return false;
}

export function cropCanvasToOpaqueBounds(canvas: HTMLCanvasElement, alphaThreshold = 1) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bounds = findOpaqueBounds(imageData.data, canvas.width, canvas.height, alphaThreshold);
  if (!bounds) return canvas;

  const alreadyTight = bounds.x === 0
    && bounds.y === 0
    && bounds.width === canvas.width
    && bounds.height === canvas.height;
  if (alreadyTight) return canvas;

  const cropped = document.createElement('canvas');
  cropped.width = bounds.width;
  cropped.height = bounds.height;
  const out = cropped.getContext('2d');
  if (!out) return canvas;
  out.imageSmoothingEnabled = true;
  out.imageSmoothingQuality = 'high';
  out.drawImage(
    canvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height
  );
  return cropped;
}

/**
 * Computes opaque bounds in the source image coordinates using the same
 * sampled approach as DayThumbnail, so the canvas editor and the day card
 * derive an identical visible-rectangle from the same image.
 */
export function computeDisplayedOpaqueBounds(img: HTMLImageElement): OpaqueBounds {
  const fallback: OpaqueBounds = { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
  try {
    const sampleSize = 64;
    const scale = Math.min(1, sampleSize / Math.max(img.naturalWidth, img.naturalHeight));
    const sw = Math.max(1, Math.round(img.naturalWidth * scale));
    const sh = Math.max(1, Math.round(img.naturalHeight * scale));
    const sample = document.createElement('canvas');
    sample.width = sw;
    sample.height = sh;
    const sctx = sample.getContext('2d');
    if (!sctx) return fallback;
    sctx.drawImage(img, 0, 0, sw, sh);
    const data = sctx.getImageData(0, 0, sw, sh).data;
    if (!canvasHasTransparentPixels(data)) return fallback;
    const bounds = findOpaqueBounds(data, sw, sh);
    if (!bounds) return fallback;
    const ox = Math.max(0, Math.floor(bounds.x / scale));
    const oy = Math.max(0, Math.floor(bounds.y / scale));
    const ow = Math.min(img.naturalWidth - ox, Math.ceil(bounds.width / scale));
    const oh = Math.min(img.naturalHeight - oy, Math.ceil(bounds.height / scale));
    if (ow <= 0 || oh <= 0) return fallback;
    return { x: ox, y: oy, width: ow, height: oh };
  } catch {
    return fallback;
  }
}