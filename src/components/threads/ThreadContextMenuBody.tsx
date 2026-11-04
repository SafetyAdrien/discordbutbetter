import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { Star } from '@/components/icons/discord/lucide';
import { supabase } from '@/integrations/supabase/client';
import { useFavorites } from '@/hooks/useFavorites';
import { IdCard } from '@/components/icons/discord/lucide';
import { MUTE_FOREVER, isThreadMuted, useSetThreadNotificationPrefs, useThreadNotificationPrefs, useUnfollowThread, type ThreadNotificationLevel } from '@/hooks/useThreadFollow';
import { useCloseThread, useLockThread } from '@/hooks/useThreads';
import { useMarkThreadAsRead } from '@/hooks/useThreadUnreadCounts';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import type { Thread } from '@/types/thread';
import { cn } from '@/lib/utils';

/*
 * Menu contextuel d'un fil (liste des fils et liste des salons, video de reference) : "Marquer comme lu", "Ajouter
 * aux favoris" (pas encore disponible), Fermer / Verrouiller / Modifier / Copier le lien, "Rendre le fil muet" et
 * "Parametres de notification" (sous-menus), Supprimer, Quitter, Copier l'identifiant du fil.
 */

/* Mesures de la video de reference : menu de 214px, lignes de 33px, texte de 14px, 8px de marge de chaque cote. */
const ITEM = 'min-h-[33px] px-2 py-1.5 text-sm whitespace-nowrap';
const SUB = cn(ITEM, '[&>svg:last-child]:!h-[11px] [&>svg:last-child]:!w-[11px]');

export const MUTES: { label: string; ms: number | null }[] = [
  { label: 'Pendant 15 minutes', ms: 15 * 60_000 },
  { label: 'Pendant 1 heure', ms: 3_600_000 },
  { label: 'Pendant 3 heures', ms: 3 * 3_600_000 },
  { label: 'Pendant 8 heures', ms: 8 * 3_600_000 },
  { label: 'Pendant 24 heures', ms: 24 * 3_600_000 },
  { label: "Jusqu'à ce que je le change", ms: null },
];
export const LEVELS: { id: ThreadNotificationLevel; label: string }[] = [
  { id: 'all', label: 'Tous les messages' },
  { id: 'mentions', label: '@mentions seulement' },
  { id: 'none', label: 'Aucun message' },
];

interface Props {
  thread: Thread;
  channelId: string;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export function ThreadContextMenuBody({ thread, channelId, canManage, onEdit, onDelete, className }: Props) {
  const markRead = useMarkThreadAsRead();
  const close = useCloseThread();
  const lock = useLockThread();
  const unfollow = useUnfollowThread();
  const { data: prefs } = useThreadNotificationPrefs(thread.id);
  const set = useSetThreadNotificationPrefs();
  const muted = isThreadMuted(prefs);
  const unread = (thread as { unread_count?: number }).unread_count ?? 0;
  const fav = useFavorites();
  const favorite = fav.find('thread', thread.id);
  const addToFavorites = async (categoryId: string | null) => {
    const { data } = await supabase.from('channels').select('server_id, servers(name, icon_url)').eq('id', channelId).maybeSingle();
    const server = (data as { server_id: string; servers: { name: string; icon_url: string | null } | null } | null);
    fav.add([{ kind: 'thread', ref_id: thread.id, server_id: server?.server_id ?? null, channel_id: channelId, name: thread.name, sub: server?.servers?.name ?? null, icon_url: server?.servers?.icon_url ?? null, ch_type: null, category_id: categoryId }]);
  };

  return (
    <ContextMenuContent className={cn('w-[214px]', className)}>
      <ContextMenuItem className={ITEM} disabled={unread === 0} onSelect={() => markRead.mutate({ threadId: thread.id, channelId })}>Marquer comme lu</ContextMenuItem>
      <ContextMenuSeparator />
      {favorite ? (
        <ContextMenuItem className={ITEM} onSelect={() => fav.remove(favorite.id)}><Star className="w-[18px] h-[18px] fill-current" /> Retirer des favoris</ContextMenuItem>
      ) : (
        <ContextMenuSub>
          <ContextMenuSubTrigger className={SUB}><Star className="w-[18px] h-[18px]" /> Ajouter aux favoris</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-[180px]">
            <ContextMenuItem className={ITEM} onSelect={() => void addToFavorites(null)}>Favoris</ContextMenuItem>
            {fav.categories.map((c) => (
              <ContextMenuItem key={c.id} className={ITEM} onSelect={() => void addToFavorites(c.id)}>{c.name}</ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}
      <ContextMenuSeparator />
      {canManage && (
        <>
          <ContextMenuItem className={ITEM} onSelect={() => close.mutate({ threadId: thread.id, closed: !thread.closed })}>{thread.closed ? 'Ouvrir un fil' : 'Fermer le fil'}</ContextMenuItem>
          <ContextMenuItem className={ITEM} onSelect={() => lock.mutate({ threadId: thread.id, locked: !thread.locked })}>{thread.locked ? 'Déverrouiller le fil' : 'Verrouiller le fil'}</ContextMenuItem>
          <ContextMenuItem className={ITEM} onSelect={onEdit}>Modifier le fil</ContextMenuItem>
        </>
      )}
      <ContextMenuItem className={ITEM} onSelect={() => void copyToClipboard(`${window.location.origin}/thread/${thread.id}`, 'Lien du fil copié')}>Copier le lien</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger className={SUB}>{muted ? 'Réactiver le son du fil' : 'Rendre le fil muet'}</ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-[260px]">
          {muted ? (
            <ContextMenuItem className={ITEM} onSelect={() => set.mutate({ threadId: thread.id, mutedUntil: null })}>Réactiver le son du fil</ContextMenuItem>
          ) : (
            MUTES.map((d) => (
              <ContextMenuItem className={ITEM} key={d.label} onSelect={() => set.mutate({ threadId: thread.id, mutedUntil: d.ms ? new Date(Date.now() + d.ms).toISOString() : MUTE_FOREVER })}>{d.label}</ContextMenuItem>
            ))
          )}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSub>
        <ContextMenuSubTrigger className={SUB}>Paramètres de notification</ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-[260px]">
          {LEVELS.map((l) => {
            const on = (prefs?.level ?? 'all') === l.id;
            return (
              <ContextMenuItem className={ITEM} key={l.id} onSelect={(e) => { e.preventDefault(); set.mutate({ threadId: thread.id, level: l.id }); }}>
                {l.label}
                <span className={cn('ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0', on ? 'border-[#5865f2]' : 'border-[#80848e]')}>
                  {on && <span className="w-2.5 h-2.5 rounded-full bg-[#5865f2]" />}
                </span>
              </ContextMenuItem>
            );
          })}
        </ContextMenuSubContent>
      </ContextMenuSub>
      {canManage && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem className={cn(ITEM, "text-[#f57976] focus:text-[#f57976] data-[highlighted]:text-[#f57976]")} onSelect={onDelete}>Supprimer le fil</ContextMenuItem>
        </>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem className={ITEM} onSelect={() => unfollow.mutate(thread.id)}>Quitter le fil</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem className={ITEM} onSelect={() => void copyToClipboard(uuidToSnowflake(thread.id), 'Identifiant du fil copié')}><IdCard className="w-[18px] h-[18px]" /> Copier l'identifiant du fil</ContextMenuItem>
    </ContextMenuContent>
  );
}
