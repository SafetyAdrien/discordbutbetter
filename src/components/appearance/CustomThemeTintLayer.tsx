import { useMountCustomTheme } from '@/hooks/useCustomTheme';

/**
 * Mount-only component: the custom theme now retints semantic CSS tokens
 * directly on <html>, so no overlay element is needed. We keep this
 * component so App.tsx's mount point stays stable.
 */
export function CustomThemeTintLayer() {
  useMountCustomTheme();
  return null;
}
