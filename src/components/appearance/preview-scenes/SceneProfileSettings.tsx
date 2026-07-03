import { User, Palette, Bell, Shield, Pencil } from 'lucide-react';

/** Mini profile card + settings modal snippet. */
export function SceneProfileSettings() {
  return (
    <div className="h-full w-full bg-[hsl(var(--background))] text-[hsl(var(--foreground))] p-2 flex gap-2 text-[8px] overflow-hidden">
      {/* Settings modal snippet */}
      <div className="flex-1 min-w-0 flex rounded-[6px] overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="w-16 shrink-0 bg-[hsl(var(--sidebar-background))] p-1 space-y-0.5">
          <div className="text-[7px] font-bold uppercase text-[hsl(var(--muted-foreground))] px-1">Compte</div>
          {[[User, 'Mon compte'], [Palette, 'Apparence', true], [Bell, 'Notifs'], [Shield, 'Sécurité']].map(([Icon, label, active], i) => {
            const I = Icon as typeof User;
            return (
              <div key={i} className={`flex items-center gap-1 px-1 py-0.5 rounded ${active ? 'bg-[hsl(var(--primary))/0.15] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                <I className="w-2 h-2" /> <span className="truncate">{label as string}</span>
              </div>
            );
          })}
        </div>
        <div className="flex-1 p-1.5 space-y-1">
          <div className="font-bold text-[10px]">Apparence</div>
          <div className="grid grid-cols-2 gap-1">
            <div className="rounded border-2 border-[hsl(var(--primary))] bg-[hsl(var(--muted))/0.4] h-6" />
            <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] h-6" />
          </div>
          <div className="text-[7px] uppercase text-[hsl(var(--muted-foreground))]">Couleur d'accent</div>
          <div className="flex gap-0.5">
            {['#5865f2', '#eb459e', '#faa61a', '#57f287', '#3ba55c'].map((c) => (
              <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>

      {/* Profile card */}
      <div className="w-28 shrink-0 rounded-[6px] overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
        <div className="h-6 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] relative">
          <div className="absolute top-0.5 right-0.5 text-[hsl(var(--primary-foreground))]">
            <Pencil className="w-1.5 h-1.5" />
          </div>
        </div>
        <div className="px-1.5 pb-1.5 -mt-3">
          <div className="w-6 h-6 rounded-full border-2 border-[hsl(var(--card))] bg-[hsl(var(--primary))]" />
          <div className="mt-0.5 font-bold text-[9px]">Adrien</div>
          <div className="text-[7px] text-[hsl(var(--muted-foreground))]">adrien_sama</div>
          <div className="mt-1 h-3 rounded bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] flex items-center justify-center text-[7px] font-semibold">
            Modifier
          </div>
        </div>
      </div>
    </div>
  );
}
