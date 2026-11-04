import { Hash, Volume2, ChevronDown, Search } from '@/components/icons/discord/lucide';

/**
 * Miniature representation of the global app layout:
 * server rail — channel list — chat — member list.
 * Uses semantic tokens so it inherits the wrapping theme scope.
 */
export function SceneGlobal() {
  return (
    <div className="h-full w-full bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex text-[8px] overflow-hidden">
      {/* server rail */}
      <div className="w-8 shrink-0 bg-[hsl(var(--surface-server-list))] flex flex-col items-center gap-1.5 pt-1.5">
        <div className="w-6 h-6 rounded-[35%] bg-[hsl(var(--primary))]" />
        <div className="w-6 h-6 rounded-full bg-[hsl(var(--surface-2))]" />
        <div className="w-6 h-6 rounded-full bg-[hsl(var(--surface-2))]" />
        <div className="w-6 h-6 rounded-full bg-[hsl(var(--accent))]" />
        <div className="w-6 h-6 rounded-full bg-[hsl(var(--surface-2))]" />
      </div>
      {/* channel list */}
      <div className="w-24 shrink-0 bg-[hsl(var(--sidebar-background))] py-1.5 px-1 flex flex-col gap-1">
        <div className="text-[9px] font-bold px-1 truncate">Aide Réseaux</div>
        <div className="h-[1px] bg-[hsl(var(--border))]" />
        {['général', 'annonces', 'faq'].map((n) => (
          <div key={n} className="flex items-center gap-1 px-1 py-0.5 rounded text-[hsl(var(--muted-foreground))]">
            <Hash className="w-2 h-2" /> <span className="truncate">{n}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 px-1 py-0.5 rounded bg-[hsl(var(--surface-hover))/0.4] text-[hsl(var(--foreground))]">
          <Hash className="w-2 h-2" /> <span className="truncate font-medium">tchat</span>
        </div>
        <div className="flex items-center gap-1 px-1 mt-1 text-[hsl(var(--muted-foreground))]">
          <ChevronDown className="w-2 h-2" /> <span className="text-[7px] font-semibold uppercase tracking-wider">Vocal</span>
        </div>
        <div className="flex items-center gap-1 px-1 py-0.5 text-[hsl(var(--muted-foreground))]">
          <Volume2 className="w-2 h-2" /> <span className="truncate">salon</span>
        </div>
      </div>
      {/* chat */}
      <div className="flex-1 min-w-0 bg-[hsl(var(--background))] flex flex-col">
        <div className="h-4 border-b border-[hsl(var(--border))] flex items-center px-1.5 gap-1">
          <Hash className="w-2 h-2 text-[hsl(var(--muted-foreground))]" />
          <span className="font-semibold">tchat</span>
          <div className="ml-auto flex items-center gap-1 px-1 rounded bg-[hsl(var(--muted))/0.5]">
            <Search className="w-2 h-2 text-[hsl(var(--muted-foreground))]" />
          </div>
        </div>
        <div className="flex-1 p-1.5 space-y-1.5">
          {[
            { name: 'Adrien', color: 'hsl(var(--primary))', text: 'Salut la team 👋' },
            { name: 'Léa', color: 'hsl(280 60% 60%)', text: 'Coucou !' },
            { name: 'Nathan', color: 'hsl(186 70% 42%)', text: 'On lance la session ?' },
          ].map((m) => (
            <div key={m.name} className="flex gap-1">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: m.color }} />
              <div className="min-w-0">
                <div translate="no" className="font-semibold leading-tight" style={{ color: m.color }}>{m.name}</div>
                <div className="text-[hsl(var(--foreground))/0.85] truncate">{m.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* members */}
      <div className="w-14 shrink-0 bg-[hsl(var(--sidebar-background))] p-1 space-y-1">
        <div className="text-[7px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">En ligne — 3</div>
        {['A', 'L', 'N'].map((c, i) => (
          <div key={c} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--primary))]" />
            <span className="truncate">User{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
