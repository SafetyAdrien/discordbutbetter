import { KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

export function KeybindsSettings() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-1">Raccourcis clavier</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Liste des raccourcis actuellement disponibles dans NexusChat. La
          personnalisation des raccourcis n'est pas encore disponible.
        </p>
        <div className="space-y-6 max-w-md">
          {KEYBOARD_SHORTCUTS.map((group) => (
            <div key={group.category}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {group.category}
              </h3>
              <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={shortcut.description}
                    className={
                      index > 0 ? 'flex items-center justify-between px-4 py-3 border-t border-border/40' : 'flex items-center justify-between px-4 py-3'
                    }
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono border border-border/50">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
