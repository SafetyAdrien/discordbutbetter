import { ChevronDown, Hash, Volume2, User, Palette, Users, Shield, ListTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategoryCasePreferences } from '@/hooks/useCategoryCasePreferences';
import { caseClass } from '@/lib/ui/categoryCase';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </div>
      <div className="rounded-[10px] border border-border/50 bg-surface-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export function CategoryCaseLivePreview() {
  const { prefs } = useCategoryCasePreferences();

  const channelCaseCls = caseClass('channelCategories', prefs);
  const userCaseCls = caseClass('userSettings', prefs);
  const serverCaseCls = caseClass('serverSettings', prefs);
  const modalCaseCls = caseClass('categoryModal', prefs);

  return (
    <aside className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Aperçu en direct</h3>
        <p className="text-xs text-muted-foreground">Reflet immédiat de tes réglages.</p>
      </div>

      {/* ChannelList */}
      <Block title="Liste des salons">
        <div className="py-2 px-1 space-y-1 text-sm">
          {[
            { name: 'Général', channels: [['general', Hash], ['annonces', Hash]] as const },
            { name: 'Vocal', channels: [['salon-vocal', Volume2]] as const },
          ].map((cat) => (
            <div key={cat.name} className="space-y-0.5">
              <div className="flex items-center gap-1 px-1 text-muted-foreground">
                <ChevronDown className="h-3 w-3 shrink-0" />
                <span className={cn('text-xs font-semibold tracking-wide', channelCaseCls)}>
                  {cat.name}
                </span>
              </div>
              {cat.channels.map(([n, Icon]) => (
                <div key={n} className="flex items-center gap-1.5 px-2 py-1 rounded-md text-muted-foreground/90">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="truncate text-[13px]">{n}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Block>

      {/* User settings */}
      <Block title="Paramètres utilisateur">
        <div className="p-2 space-y-1">
          <div className={cn('text-[11px] font-semibold text-muted-foreground px-2', userCaseCls)}>
            Mes paramètres
          </div>
          {[['Mon compte', User], ['Profil', Palette]].map(([label, Icon]) => {
            const I = Icon as typeof User;
            return (
              <div key={label as string} className="flex items-center gap-2 px-2 py-1 rounded-[10px] text-sm text-foreground/90">
                <I className="h-3.5 w-3.5" />
                {label as string}
              </div>
            );
          })}
        </div>
      </Block>

      {/* Server settings */}
      <Block title="Paramètres serveur">
        <div className="p-2 space-y-1">
          <div className={cn('text-[11px] font-semibold text-muted-foreground px-2', serverCaseCls)}>
            Gestion
          </div>
          {[['Personnes', Users], ['Rôles', Shield], ['Salons', ListTree]].map(([label, Icon]) => {
            const I = Icon as typeof Users;
            return (
              <div key={label as string} className="flex items-center gap-2 px-2 py-1 rounded-[10px] text-sm text-foreground/90">
                <I className="h-3.5 w-3.5" />
                {label as string}
              </div>
            );
          })}
        </div>
      </Block>

      {/* Category modal tabs */}
      <Block title="Modal de catégorie">
        <div className="p-2">
          <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-muted/40 p-1">
            <div className={cn('text-center text-xs py-1.5 rounded-[8px] bg-background text-foreground font-medium', modalCaseCls)}>
              Aperçu
            </div>
            <div className={cn('text-center text-xs py-1.5 rounded-[8px] text-muted-foreground', modalCaseCls)}>
              Permissions
            </div>
          </div>
        </div>
      </Block>
    </aside>
  );
}
