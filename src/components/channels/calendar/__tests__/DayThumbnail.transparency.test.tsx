import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { DayThumbnail } from '@/components/channels/CalendarChannel';

// --- Image mock: fire onload synchronously when src is set ---
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin = '';
  naturalWidth = 32;
  naturalHeight = 32;
  private _src = '';
  get src() { return this._src; }
  set src(v: string) {
    this._src = v;
    queueMicrotask(() => this.onload?.());
  }
}

// --- Canvas mock: return image data with a transparent top-left corner ---
function makeAlphaData(w: number, h: number) {
  const data = new Uint8ClampedArray(w * h * 4);
  // Fill opaque red
  for (let i = 0; i < w * h; i++) {
    data[i * 4 + 0] = 255;
    data[i * 4 + 1] = 0;
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = 255;
  }
  // Make top-left fully transparent
  data[3] = 0;
  return data;
}

beforeEach(() => {
  (globalThis as any).Image = FakeImage;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage: vi.fn(),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: makeAlphaData(w, h),
      width: w,
      height: h,
    }),
  })) as any;
});

describe('DayThumbnail — transparence', () => {
  it('garde la carte transparente (pas d’overlay sombre) pour un PNG avec alpha partielle', async () => {
    const { container } = render(<DayThumbnail url="https://example.com/transparent.png" />);

    const img = container.querySelector('img');
    expect(img).not.toBeNull();

    // Attendre la détection d'alpha
    await waitFor(() => {
      expect(img!.className).toContain('object-contain');
    });

    // Aucun overlay sombre (gradient noir) ne doit être rendu
    const overlay = container.querySelector('.bg-gradient-to-t');
    expect(overlay).toBeNull();

    // Et aucun remplissage noir sous l'image
    const blackFills = Array.from(container.querySelectorAll('*')).filter((el) => {
      const cls = (el as HTMLElement).className?.toString() ?? '';
      return /from-black|bg-black/.test(cls);
    });
    expect(blackFills.length).toBe(0);
  });

  it('applique le gradient sombre pour une image opaque', async () => {
    // Override: tous les coins opaques
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
      getImageData: (_x: number, _y: number, w: number, h: number) => {
        const data = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < w * h; i++) data[i * 4 + 3] = 255;
        return { data, width: w, height: h };
      },
    })) as any;

    const { container } = render(<DayThumbnail url="https://example.com/opaque.jpg" />);

    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img!.className).toContain('object-cover');
    });

    const overlay = container.querySelector('.bg-gradient-to-t');
    expect(overlay).not.toBeNull();
  });
});
