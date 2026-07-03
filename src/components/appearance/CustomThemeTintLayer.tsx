import { useMountCustomTheme } from '@/hooks/useCustomTheme';

/**
 * A single full-screen fixed div that renders the user's custom-theme
 * gradient behind the entire application. Kept at z-index -1 with
 * `pointer-events: none` so it never interferes with input, and it stays
 * inert (mounted once) so we get zero React work when the picker moves —
 * the CSS variables are updated directly on the <html> element.
 */
export function CustomThemeTintLayer() {
  useMountCustomTheme();
  return (
    <div
      aria-hidden
      className="custom-theme-overlay fixed inset-0 pointer-events-none"
      style={{
        // Above every app surface, below the customization side sheet (z-[80]).
        zIndex: 70,
        background: 'var(--ct-gradient, transparent)',
        opacity: 'var(--ct-intensity, 0)',
        transition: 'opacity 240ms ease',
        willChange: 'opacity',
      }}
    />
  );
}
