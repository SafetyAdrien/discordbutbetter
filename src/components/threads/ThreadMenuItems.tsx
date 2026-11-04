import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { IdCard, ExternalLink } from '@/components/icons/discord/lucide';
import { MUTE_FOREVER, isThreadMuted, useSetThreadNotificationPrefs, useThreadNotificationPrefs, useIsFollowingThread, useFollowThread, useUnfollowThread, type ThreadNotificationLevel } from '@/hooks/useThreadFollow';
import { useCloseThread, useLockThread } from '@/hooks/useThreads';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import type { Thread } from '@/types/thread';
import { cn } from '@/lib/utils';

/*
 * Entrees du menu "..." d'un fil (video de reference), partagees par le panneau lateral et la fenetre complete :
 * Rendre le fil muet >, Parametres de notification >, Modifier le fil, Rechercher / Messages epingles (pas encore
 * disponibles), Fermer / Verrouiller / Supprimer / Quitter, Copier le lien, Copier l'identifiant.
 */

const item = 'h-10 px-3 text-base font-medium rounded-[4px]';
const sub = 'w-[260px] p-2 rounded-lg bg-[#3b3b45] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)]';

const MUTE_DURATIONS: { label: string; ms: number | null }[] = [
  { label: 'Pendant 15 minutes', ms: 15 * 60_000 },
  { label: 'Pendant 1 heure', ms: 3_600_000 },
  { label: 'Pendant 3 heures', ms: 3 * 3_600_000 },
  { label: 'Pendant 8 heures', ms: 8 * 3_600_000 },
  { label: 'Pendant 24 heures', ms: 24 * 3_600_000 },
  { label: "Jusqu'à ce que je le change", ms: null },
];

const LEVELS: { id: ThreadNotificationLevel; label: string }[] = [
  { id: 'all', label: 'Tous les messages' },
  { id: 'mentions', label: '@mentions seulement' },
  { id: 'none', label: 'Aucun message' },
];

function Radio({ on }: { on: boolean }) {
  return (
    <span className={cn('ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0', on ? 'border-[#5865f2]' : 'border-[#80848e]')}>
      {on && <span className="w-2.5 h-2.5 rounded-full bg-[#5865f2]" />}
    </span>
  );
}

export function ThreadNotificationSubmenus({ threadId, withMute = true }: { threadId: string; withMute?: boolean }) {
  const { data: prefs } = useThreadNotificationPrefs(threadId);
  const set = useSetThreadNotificationPrefs();
  const muted = isThreadMuted(prefs);
  return (
    <>
      {withMute && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className={item}>{muted ? 'Réactiver le son du fil' : 'Rendre le fil muet'}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className={sub}>
            {muted ? (
              <DropdownMenuItem className={item} onSelect={() => set.mutate({ threadId, mutedUntil: null })}>Réactiver le son du fil</DropdownMenuItem>
            ) : (
              MUTE_DURATIONS.map((d) => (
                <DropdownMenuItem key={d.label} className={item} onSelect={() => set.mutate({ threadId, mutedUntil: d.ms ? new Date(Date.now() + d.ms).toISOString() : MUTE_FOREVER })}>
                  {d.label}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className={item}>Paramètres de notification</DropdownMenuSubTrigger>
        <DropdownMenuSubContent className={sub}>
          {LEVELS.map((l) => (
            <DropdownMenuItem key={l.id} className={item} onSelect={(e) => { e.preventDefault(); set.mutate({ threadId, level: l.id }); }}>
              {l.label}
              <Radio on={(prefs?.level ?? 'all') === l.id} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}

interface Props {
  thread: Thread;
  canManage: boolean;
  /** Entrees propres au panneau lateral. */
  panel?: { onOpenFullscreen: () => void };
  /** Entrees propres a la fenetre complete. */
  full?: { onScrollTop: () => void; onSplit: () => void };
  onEdit: () => void;
  onDelete: () => void;
  onLeave: () => void;
}

export function ThreadMenuItems({ thread, canManage, panel, full, onEdit, onDelete, onLeave }: Props) {
  const close = useCloseThread();
  const lock = useLockThread();
  const { data: following } = useIsFollowingThread(thread.id);
  const follow = useFollowThread();
  const soon = (label: string, ext = false) => (
    <DropdownMenuItem className={cn(item, 'opacity-60')} onSelect={(e) => e.preventDefault()} title="Bientôt disponible">
      {label}
      {ext && <ExternalLink className="ml-auto w-5 h-5" />}
    </DropdownMenuItem>
  );

  return (
    <>
      {full && <DropdownMenuItem className={item} onSelect={full.onScrollTop}>Aller en haut</DropdownMenuItem>}
      {panel && <DropdownMenuItem className={item} onSelect={panel.onOpenFullscreen}>Ouvrir en pleine fenêtre</DropdownMenuItem>}
      {panel && <DropdownMenuSeparator />}
      {panel && <ThreadNotificationSubmenus threadId={thread.id} />}
      {panel && <DropdownMenuSeparator />}
      {canManage && <DropdownMenuItem className={item} onSelect={onEdit}>Modifier le fil</DropdownMenuItem>}
      {full && <DropdownMenuItem className={item} onSelect={full.onSplit}>Ouvrir en fenêtre fractionnée</DropdownMenuItem>}
      {panel && (
        <>
          <DropdownMenuSeparator />
          {soon('Rechercher', true)}
          {soon('Messages épinglés', true)}
        </>
      )}
      {canManage && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={item} onSelect={() => close.mutate({ threadId: thread.id, closed: !thread.closed })}>
            {thread.closed ? 'Ouvrir un fil' : 'Fermer le fil'}
          </DropdownMenuItem>
          <DropdownMenuItem className={item} onSelect={() => lock.mutate({ threadId: thread.id, locked: !thread.locked })}>
            {thread.locked ? 'Déverrouiller le fil' : 'Verrouiller le fil'}
          </DropdownMenuItem>
          <DropdownMenuItem className={cn(item, 'text-[#f57976] focus:text-[#f57976]')} onSelect={onDelete}>Supprimer le fil</DropdownMenuItem>
        </>
      )}
      <DropdownMenuSeparator />
      {following ? (
        <DropdownMenuItem className={item} onSelect={onLeave}>Quitter le fil</DropdownMenuItem>
      ) : (
        <DropdownMenuItem className={item} onSelect={() => follow.mutate(thread.id)}>Rejoindre le fil</DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem className={item} onSelect={() => void copyToClipboard(`${window.location.origin}/thread/${thread.id}`, 'Lien du fil copié')}>Copier le lien</DropdownMenuItem>
      <DropdownMenuItem className={item} onSelect={() => void copyToClipboard(uuidToSnowflake(thread.id), 'Identifiant du fil copié')}>
        <IdCard className="w-5 h-5 mr-2" />
        Copier l'identifiant du fil
      </DropdownMenuItem>
    </>
  );
}

