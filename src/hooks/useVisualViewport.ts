import { useEffect, useState } from 'react';

interface VisualViewportState {
  /** Difference between layout viewport and visual viewport height — typically the on-screen keyboard. */
  keyboardHeight: number;
  /** True when keyboardHeight is meaningfully > 0 (default threshold 80px). */
  isKeyboardOpen: boolean;
  /** True when an editable element currently owns focus. */
  isInputFocused: boolean;
}

const KEYBOARD_THRESHOLD = 80;

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return (el as HTMLElement).isContentEditable === true;
}

/**
 * Tracks the on-screen keyboard via VisualViewport and the focus state of editable elements.
 * Useful to offset chat input or hide the bottom nav when typing on mobile.
 *
 * Falls back to `{ keyboardHeight: 0, isKeyboardOpen: false }` on unsupported browsers.
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>({
    keyboardHeight: 0,
    isKeyboardOpen: false,
    isInputFocused: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;
    const update = () => {
      const layoutH = window.innerHeight;
      const visualH = vv?.height ?? layoutH;
      const offsetTop = vv?.offsetTop ?? 0;
      // The shrinkage = layout - (visual + offset). Clamp to 0.
      const kb = Math.max(0, Math.round(layoutH - (visualH + offsetTop)));
      const focused = isEditable(document.activeElement);
      setState((prev) => {
        const next: VisualViewportState = {
          keyboardHeight: kb,
          isKeyboardOpen: kb >= KEYBOARD_THRESHOLD,
          isInputFocused: focused,
        };
        if (
          prev.keyboardHeight === next.keyboardHeight &&
          prev.isKeyboardOpen === next.isKeyboardOpen &&
          prev.isInputFocused === next.isInputFocused
        ) {
          return prev;
        }
        return next;
      });
    };

    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('focusin', update);
    window.addEventListener('focusout', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('focusin', update);
      window.removeEventListener('focusout', update);
    };
  }, []);

  return state;
}
