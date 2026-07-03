/**
 * Tokens CSS variables directly usable inside the miniature preview scenes.
 * Each scene is wrapped in a `.dark` or root-scope div so these tokens
 * resolve to the correct palette per moment (dark / light) regardless of
 * the app's current theme.
 */

export const scenePalettes = {
  dark: {
    // Wrapper class applied on the scene root
    className: 'dark',
    style: {
      // ensure the wrapper carries a real background even if a global rule
      // overrides body
      backgroundColor: 'hsl(225 18% 11%)',
    } as React.CSSProperties,
  },
  light: {
    className: 'light',
    style: {
      backgroundColor: 'hsl(220 20% 98%)',
    } as React.CSSProperties,
  },
} as const;

export type SceneTheme = keyof typeof scenePalettes;
