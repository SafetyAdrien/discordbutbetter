import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsConfig {
  onEscape?: () => void;
  onSearch?: () => void;
  onShortcutsHelp?: () => void;
  onToggleMute?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onEscape,
  onSearch,
  onShortcutsHelp,
  onToggleMute,
  enabled = true,
}: KeyboardShortcutsConfig) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isInputActive =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Escape always works
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      // Other shortcuts only when not in input
      if (isInputActive) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + K: Search
      if (modifier && e.key === 'k' && onSearch) {
        e.preventDefault();
        onSearch();
        return;
      }

      // Ctrl/Cmd + /: Shortcuts help
      if (modifier && e.key === '/' && onShortcutsHelp) {
        e.preventDefault();
        onShortcutsHelp();
        return;
      }

      // Ctrl/Cmd + Shift + M: Toggle mute
      if (modifier && e.shiftKey && e.key === 'M' && onToggleMute) {
        e.preventDefault();
        onToggleMute();
        return;
      }
    },
    [enabled, onEscape, onSearch, onShortcutsHelp, onToggleMute]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Shortcut definitions for help modal
export const KEYBOARD_SHORTCUTS = [
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Recherche rapide' },
      { keys: ['Escape'], description: 'Fermer la fenêtre active' },
    ],
  },
  {
    category: 'Appels',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'M'], description: 'Activer/Désactiver le micro' },
    ],
  },
  {
    category: 'Aide',
    shortcuts: [
      { keys: ['Ctrl', '/'], description: 'Afficher les raccourcis clavier' },
    ],
  },
];
