import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/*
 * Habille les infobulles natives. Tout element portant `title` (ou un bouton
 * icone sans texte portant `aria-label`) affiche la meme bulle que
 * <TooltipContent> : au-dessus de l'element (en dessous s'il manque de place),
 * 8px d'ecart, pointe centree, fondu de 70 ms, aucun delai. Les declencheurs
 * Radix (data-state) gardent leur propre infobulle.
 */

interface Shown {
  text: string;
  x: number;
  y: number;
  below: boolean;
  shift: number;
}

const TEXT_ELEMENTS = 'input, textarea, select, [contenteditable="true"]';

function sourceOf(el: Element | null): { el: HTMLElement; text: string } | null {
  for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
    const h = n as HTMLElement;
    if (h.matches(TEXT_ELEMENTS)) return null;
    if (h.hasAttribute('data-state') && h.getAttribute('aria-describedby') !== null) return null;
    const t = h.getAttribute('title') ?? h.dataset.titleTip;
    if (t?.trim()) return { el: h, text: t.trim() };
    if (h.tagName === 'BUTTON' && !h.hasAttribute('data-state') && !h.textContent?.trim()) {
      const a = h.getAttribute('aria-label');
      if (a?.trim()) return { el: h, text: a.trim() };
    }
  }
  return null;
}

export function TitleTooltips() {
  const [shown, setShown] = useState<Shown | null>(null);
  const current = useRef<HTMLElement | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const restore = () => {
      const el = current.current;
      if (el?.dataset.titleTip !== undefined) {
        el.setAttribute('title', el.dataset.titleTip);
        delete el.dataset.titleTip;
      }
      current.current = null;
      setShown(null);
    };
    const over = (e: MouseEvent) => {
      const src = sourceOf(e.target as Element);
      if (!src) return restore();
      if (src.el === current.current) return;
      restore();
      current.current = src.el;
      if (src.el.hasAttribute('title')) {
        if (!src.el.hasAttribute('aria-label') && !src.el.textContent?.trim()) src.el.setAttribute('aria-label', src.text);
        src.el.dataset.titleTip = src.text;
        src.el.removeAttribute('title');
      }
      const r = src.el.getBoundingClientRect();
      setShown({ text: src.text, x: r.left + r.width / 2, y: r.top, below: r.top < 56, shift: r.bottom });
    };
    const out = (e: MouseEvent) => {
      if (current.current && !current.current.contains(e.relatedTarget as Node | null)) restore();
    };
    document.addEventListener('mouseover', over, true);
    document.addEventListener('mouseout', out, true);
    document.addEventListener('mousedown', restore, true);
    window.addEventListener('scroll', restore, true);
    window.addEventListener('wheel', restore, { capture: true, passive: true });
    window.addEventListener('blur', restore);
    return () => {
      document.removeEventListener('mouseover', over, true);
      document.removeEventListener('mouseout', out, true);
      document.removeEventListener('mousedown', restore, true);
      window.removeEventListener('scroll', restore, true);
      window.removeEventListener('wheel', restore, true);
      window.removeEventListener('blur', restore);
      restore();
    };
  }, []);

  // Garde la bulle dans la fenetre (8px de marge) en deplacant la bulle, pas la pointe.
  const [dx, setDx] = useState(0);
  useEffect(() => {
    if (!shown || !box.current) return setDx(0);
    const w = box.current.offsetWidth;
    const left = shown.x - w / 2;
    setDx(Math.max(8 - left, Math.min(0, window.innerWidth - 8 - (left + w))));
  }, [shown]);

  if (!shown) return null;
  return createPortal(
    <div
      ref={box}
      role="tooltip"
      className="pointer-events-none fixed z-[9999] animate-in fade-in-0 duration-75"
      style={{ left: shown.x, top: shown.below ? shown.shift + 8 : shown.y - 8, transform: `translate(calc(-50% + ${dx}px), ${shown.below ? '0' : '-100%'})` }}
    >
      <div className="relative rounded-lg border border-[color:var(--tooltip-border)] bg-[hsl(var(--tooltip-bg))] px-3 py-[5px] text-sm font-medium leading-[18px] text-[hsl(var(--tooltip-fg))] shadow-[0_8px_16px_rgba(0,0,0,0.24)] whitespace-nowrap max-w-[320px]">
        {shown.text}
        <span
          className="absolute left-1/2 w-2 h-2 rotate-45 bg-[hsl(var(--tooltip-bg))]"
          style={{ marginLeft: -4 - dx, ...(shown.below ? { top: -4, borderTop: '1px solid var(--tooltip-border)', borderLeft: '1px solid var(--tooltip-border)' } : { bottom: -4, borderBottom: '1px solid var(--tooltip-border)', borderRight: '1px solid var(--tooltip-border)' }) }}
        />
      </div>
    </div>,
    document.body,
  );
}
