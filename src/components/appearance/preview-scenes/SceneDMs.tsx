import { Search, Phone, Video } from 'lucide-react';

/** Mini DM list + active conversation with speech bubbles. */
export function SceneDMs() {
  return (
    <div className="h-full w-full bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex text-[8px] overflow-hidden">
      {/* DM list */}
      <div className="w-24 shrink-0 bg-[hsl(var(--sidebar-background))] p-1 space-y-1">
        <div className="flex items-center gap-1 px-1 py-0.5 rounded bg-[hsl(var(--muted))/0.6]">
          <Search className="w-2 h-2 text-[hsl(var(--muted-foreground))]" />
          <span className="text-[hsl(var(--muted-foreground))] truncate">Rechercher</span>
        </div>
        {[
          { n: 'Léa', c: '#eb459e', active: true },
          { n: 'Nathan', c: 'hsl(186 70% 42%)' },
          { n: 'Zoltan', c: '#faa61a' },
          { n: 'Adrien 2', c: 'hsl(var(--primary))' },
        ].map((u) => (
          <div key={u.n} className={`flex items-center gap-1 px-1 py-0.5 rounded ${u.active ? 'bg-[hsl(var(--surface-hover))/0.5] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: u.c }} />
            <span className="truncate font-medium">{u.n}</span>
          </div>
        ))}
      </div>
      {/* Conversation */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-4 border-b border-[hsl(var(--border))] flex items-center px-1.5 gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: '#eb459e' }} />
          <span className="font-semibold">Léa</span>
          <div className="ml-auto flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
            <Phone className="w-2 h-2" />
            <Video className="w-2 h-2" />
          </div>
        </div>
        <div className="flex-1 p-1.5 space-y-1">
          <div className="flex justify-start">
            <div className="max-w-[70%] rounded-[6px] rounded-bl-[2px] bg-[hsl(var(--muted))/0.7] px-1.5 py-0.5">
              Hello ! Ça donne quoi le projet ?
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[70%] rounded-[6px] rounded-br-[2px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-1.5 py-0.5">
              Super, on ship demain 🚀
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[70%] rounded-[6px] rounded-bl-[2px] bg-[hsl(var(--muted))/0.7] px-1.5 py-0.5">
              Trop bien 💜
            </div>
          </div>
        </div>
        <div className="h-4 mx-1.5 mb-1 rounded bg-[hsl(var(--input))]" />
      </div>
    </div>
  );
}
