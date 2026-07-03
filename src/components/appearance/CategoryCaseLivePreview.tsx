import { useId } from 'react';
import { ChevronDown, Hash, Volume2, User, Palette, Users, Shield, ListTree, IdCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategoryCasePreferences } from '@/hooks/useCategoryCasePreferences';
import { caseClass } from '@/lib/ui/categoryCase';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  const headingId = useId();
  return (
    <div
      role="group"
      tabIndex={0}
      aria-labelledby={headingId}
      className={cn(
        'space-y-1.5 rounded-[10px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <div
        id={headingId}
        className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70"
      >
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
  // Preserve the current uppercase default when the profile zone is disabled.
  const profileCaseCls = prefs.profileEdit.enabled
    ? caseClass('profileEdit', prefs)
    : 'uppercase';

  return (
    <aside
      role="region"
      aria-label="Aperçu en direct de la typographie des catégories"
      className="space-y-3"
    >
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

      {/* Profile edit */}
      <Block title="Édition du profil">
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <IdCard className="h-3.5 w-3.5" />
            <span className="text-[10px]">Formulaire de profil</span>
          </div>
          <div className="space-y-1">
            <div className={cn('text-xs font-semibold tracking-wide text-muted-foreground', profileCaseCls)}>
              Nom d'affichage
            </div>
            <div className="h-6 rounded-md bg-muted/40" />
          </div>
          <div className="space-y-1">
            <div className={cn('text-xs font-semibold tracking-wide text-muted-foreground', profileCaseCls)}>
              Pronoms
            </div>
            <div className="h-6 rounded-md bg-muted/40" />
          </div>
        </div>
      </Block>
    </aside>
  );
}
