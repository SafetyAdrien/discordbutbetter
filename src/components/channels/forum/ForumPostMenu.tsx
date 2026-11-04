import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, IdCard, Star } from '@/components/icons/discord/lucide';
import { MUTE_FOREVER, isThreadMuted, useSetThreadNotificationPrefs, useThreadNotificationPrefs, type ThreadNotificationLevel } from '@/hooks/useThreadFollow';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import { cn } from '@/lib/utils';
import { ForumEmoji } from './ForumEmoji';
import type { ForumTag } from '@/hooks/useForumTags';
import type { ForumThread, ForumThreadPatch } from '@/hooks/useForumThreads';


export interface ForumPostMenuProps {
  kind: 'context' | 'dropdown';
  post: ForumThread;
  tags: ForumTag[];
  isAuthor: boolean;
  canModerate: boolean;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onUpdate: (patch: ForumThreadPatch) => void;
  onEdit: () => void;
  onDelete: () => void;
  onMarkRead?: () => void;
  /** Le post a des messages non lus (sinon "Marquer comme lu" est grise). */
  unread?: boolean;
  onOpenFullscreen?: () => void;
  /** Fait remonter le fil tout en haut (menu du panneau). */
  onScrollTop?: () => void;
}

const MUTES: { label: string; ms: number | null }[] = [
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

const danger = 'text-[#f57976] focus:text-[#f57976] data-[highlighted]:text-[#f57976]';

/*
 * Menu d'un post (clic droit sur une carte, "..." du panneau ; video de reference), meme structure que le menu des
 * fils : Marquer comme lu | Ajouter aux favoris | Fermer, Verrouiller, Modifier, Modifier les tags, Copier le lien |
 * Rendre le post muet, Parametres de notification | Epingler, Supprimer | Ne plus suivre | Copier l'identifiant.
 */
export function ForumPostMenu({ kind, post, tags, isAuthor, canModerate, isFollowing, onToggleFollow, onUpdate, onEdit, onDelete, onMarkRead, unread = false, onOpenFullscreen, onScrollTop }: ForumPostMenuProps) {
  const C = kind === 'context'
    ? { Item: ContextMenuItem, Sep: ContextMenuSeparator, Sub: ContextMenuSub, SubTrigger: ContextMenuSubTrigger, SubContent: ContextMenuSubContent }
    : { Item: DropdownMenuItem, Sep: DropdownMenuSeparator, Sub: DropdownMenuSub, SubTrigger: DropdownMenuSubTrigger, SubContent: DropdownMenuSubContent };
  const canEdit = isAuthor || canModerate;
  const editableTags = tags.filter((t) => canModerate || !t.moderated);
  const { data: prefs } = useThreadNotificationPrefs(post.id);
  const setPrefs = useSetThreadNotificationPrefs();
  const muted = isThreadMuted(prefs);

  const toggleTag = (id: string) => {
    const has = post.applied_tags.includes(id);
    if (!has && post.applied_tags.length >= 5) return;
    onUpdate({ applied_tags: has ? post.applied_tags.filter((t) => t !== id) : [...post.applied_tags, id] });
  };

  return (
    <>
      {(onScrollTop || onOpenFullscreen) && (
        <>
          {onScrollTop && <C.Item onSelect={onScrollTop}>Aller en haut</C.Item>}
          {onOpenFullscreen && <C.Item onSelect={onOpenFullscreen}>Ouvrir en pleine fenêtre</C.Item>}
          <C.Sep />
        </>
      )}
      {onMarkRead && (
        <>
          <C.Item disabled={!unread} onSelect={onMarkRead}>Marquer comme lu</C.Item>
          <C.Sep />
        </>
      )}
      <C.Item disabled title="Bientôt disponible"><Star className="w-5 h-5" /> Ajouter aux favoris</C.Item>
      <C.Sep />
      {canEdit && (
        <>
          <C.Item onSelect={() => onUpdate({ archived: !post.archived })}>{post.archived ? 'Ouvrir le post' : 'Fermer le post'}</C.Item>
          {canModerate && <C.Item onSelect={() => onUpdate({ locked: !post.locked })}>{post.locked ? 'Déverrouiller le post' : 'Verrouiller le post'}</C.Item>}
          <C.Item onSelect={onEdit}>Modifier le post</C.Item>
          {editableTags.length > 0 && (
            <C.Sub>
              <C.SubTrigger>Modifier les tags</C.SubTrigger>
              <C.SubContent className="w-[260px]">
                {editableTags.map((t) => {
                  const on = post.applied_tags.includes(t.id);
                  return (
                    <C.Item key={t.id} onSelect={(e: Event) => { e.preventDefault(); toggleTag(t.id); }}>
                      {t.emoji_name && <ForumEmoji emoji={t.emoji_name} className="mr-0.5" />}
                      <span translate="no" className="truncate">{t.name}</span>
                      <span className={cn('ml-auto w-5 h-5 rounded-[4px] border-2 shrink-0 flex items-center justify-center', on ? 'bg-[#5865f2] border-[#5865f2]' : 'border-[#80848e]')} aria-hidden>
                        {on && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />}
                      </span>
                    </C.Item>
                  );
                })}
              </C.SubContent>
            </C.Sub>
          )}
        </>
      )}
      <C.Item onSelect={() => void copyToClipboard(`${window.location.origin}/channels/${post.channel_id}/${post.id}`, 'Lien copié')}>Copier le lien</C.Item>
      <C.Sep />
      <C.Sub>
        <C.SubTrigger>{muted ? 'Réactiver le son du post' : 'Rendre le post muet'}</C.SubTrigger>
        <C.SubContent className="w-[260px]">
          {muted ? (
            <C.Item onSelect={() => setPrefs.mutate({ threadId: post.id, mutedUntil: null })}>Réactiver le son du post</C.Item>
          ) : (
            MUTES.map((d) => (
              <C.Item key={d.label} onSelect={() => setPrefs.mutate({ threadId: post.id, mutedUntil: d.ms ? new Date(Date.now() + d.ms).toISOString() : MUTE_FOREVER })}>{d.label}</C.Item>
            ))
          )}
        </C.SubContent>
      </C.Sub>
      <C.Sub>
        <C.SubTrigger>Paramètres de notification</C.SubTrigger>
        <C.SubContent className="w-[260px]">
          {LEVELS.map((l) => {
            const on = (prefs?.level ?? 'all') === l.id;
            return (
              <C.Item key={l.id} onSelect={(e: Event) => { e.preventDefault(); setPrefs.mutate({ threadId: post.id, level: l.id }); }}>
                {l.label}
                <span className={cn('ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0', on ? 'border-[#5865f2]' : 'border-[#80848e]')}>
                  {on && <span className="w-2.5 h-2.5 rounded-full bg-[#5865f2]" />}
                </span>
              </C.Item>
            );
          })}
        </C.SubContent>
      </C.Sub>
      {canEdit && (
        <>
          <C.Sep />
          {canModerate && <C.Item onSelect={() => onUpdate({ pinned: !post.pinned })}>{post.pinned ? 'Désépingler le post' : 'Épingler le post'}</C.Item>}
          <C.Item className={danger} onSelect={onDelete}>Supprimer le post</C.Item>
        </>
      )}
      <C.Sep />
      <C.Item onSelect={onToggleFollow}>{isFollowing ? 'Ne plus suivre le post' : 'Suivre le post'}</C.Item>
      <C.Sep />
      <C.Item onSelect={() => void copyToClipboard(uuidToSnowflake(post.id), 'Identifiant du fil copié')}><IdCard className="w-5 h-5" /> Copier l'identifiant du fil</C.Item>
    </>
  );
}

/** Confirmation "Supprimer le post" (video de reference). */
export function DeleteForumPostDialog({ post, open, onOpenChange, onConfirm }: { post: ForumThread | null; open: boolean; onOpenChange: (o: boolean) => void; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[440px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer le post</AlertDialogTitle>
          <AlertDialogDescription>
            Veux-tu vraiment supprimer « <span translate="no" className="font-semibold text-foreground">{post?.name}</span> » ? Toutes les réponses aux messages seront également supprimées. Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Supprimer le post
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
