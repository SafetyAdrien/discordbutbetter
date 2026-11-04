import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown } from '@/components/icons/discord/lucide';
import { Loader2 } from 'lucide-react';
import { useMyServerTags, useUserServerTag } from '@/hooks/useServerTags';
import { useAuth } from '@/contexts/AuthContext';
import { ServerTagPill } from './ServerTagBadge';
import { cn } from '@/lib/utils';

/*
 * Menu "Tag du serveur" de l'editeur de profil (video de reference) : bouton a droite des pronoms (invite en
 * italique, ou pastille du tag choisi + chevron). Ouvre une liste : champ "Rechercher", "Aucun tag de serveur",
 * puis un serveur par ligne (icone, nom, pastille du tag a droite). Le choix n'est qu'un brouillon : il est applique
 * avec "Enregistrer" dans la barre de l'editeur.
 *   value : undefined = inchange, null = aucun tag, sinon id du serveur.
 */

interface Props {
  value: string | null | undefined;
  onChange: (serverId: string | null) => void;
}

export function ServerTagMenu({ value, onChange }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { data: current } = useUserServerTag(user?.id);
  const { data: tags = [], isLoading } = useMyServerTags();

  const effectiveId = value === undefined ? current?.serverId ?? null : value;
  const chosen = tags.find((t) => t.server_id === effectiveId);
  const shown = tags.filter((t) => !query.trim() || t.server_name.toLowerCase().includes(query.trim().toLowerCase()) || t.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Tag du serveur"
          aria-haspopup="listbox"
          aria-expanded={open}
          className="inline-flex items-center gap-1 h-[26px] pl-[6px] pr-1 rounded-md bg-white/[0.10] hover:bg-white/[0.14] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.28)] text-sm transition-colors shrink-0"
        >
          {chosen ? (
            <ServerTagPill tag={{ serverId: chosen.server_id, name: chosen.name, badgeId: chosen.badge_id, color: chosen.color }} variant="profile" className="!bg-transparent !shadow-none !px-0 !h-6" />
          ) : (
            <span className="italic text-[#9b9ba8]">Tag du serveur</span>
          )}
          <ChevronDown className={cn('w-4 h-4 text-[#b5bac1] transition-transform duration-150', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="z-[140] w-[330px] p-2 rounded-lg bg-[#3c3c46] border border-white/[0.06] shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher"
          aria-label="Rechercher un tag de serveur"
          style={{ boxShadow: 'inset 0 0 0 2px #5b63e4' }}
          className="w-full h-10 px-3 rounded-lg bg-[#33333b] border-0 text-base text-white placeholder:text-[#9b9ba8] outline-none"
        />
        <div role="listbox" aria-label="Tags de serveur" className="mt-2 max-h-[300px] overflow-y-auto scrollbar-thin">
          <button
            type="button"
            role="option"
            aria-selected={effectiveId === null}
            onClick={() => { onChange(null); setOpen(false); }}
            className={cn('w-full h-10 px-3 rounded-[4px] text-left text-base italic text-[#9b9ba8] hover:bg-white/[0.06]', effectiveId === null && 'bg-white/[0.08]')}
          >
            Aucun tag de serveur
          </button>
          {isLoading && <div role="status" className="px-3 py-3 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>}
          {shown.map((t) => (
            <button
              key={t.server_id}
              type="button"
              role="option"
              aria-selected={effectiveId === t.server_id}
              onClick={() => { onChange(t.server_id); setOpen(false); }}
              className={cn('w-full h-10 px-2 rounded-[4px] flex items-center gap-2.5 text-left hover:bg-white/[0.06]', effectiveId === t.server_id && 'bg-white/[0.08]')}
            >
              {t.server_icon ? (
                <img src={t.server_icon} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
              ) : (
                <span className="w-6 h-6 rounded-full bg-primary/30 text-[10px] flex items-center justify-center text-white shrink-0">{t.server_name.slice(0, 2).toUpperCase()}</span>
              )}
              <span translate="no" className="flex-1 min-w-0 truncate text-base font-medium text-white">{t.server_name}</span>
              <ServerTagPill tag={{ serverId: t.server_id, name: t.name, badgeId: t.badge_id, color: t.color }} variant="compact" />
            </button>
          ))}
          {!isLoading && shown.length === 0 && tags.length > 0 && <p className="px-3 py-3 text-sm text-muted-foreground">Aucun résultat.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
