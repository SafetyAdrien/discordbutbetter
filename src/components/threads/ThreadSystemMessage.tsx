import { useState } from 'react';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { ServerTagBadge } from '@/components/server-tags/ServerTagBadge';
import { Thread } from '@/types/thread';
import { ChevronRight } from '@/components/icons/discord/lucide';
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/context-menu';
import { ThreadContextMenuBody } from './ThreadContextMenuBody';
import { ThreadSettingsPage } from './ThreadSettingsPage';
import { DeleteThreadDialog } from './DeleteThreadDialog';
import { shortAgo } from '@/lib/shortAgo';
import { useMembers } from '@/hooks/useMembers';

interface ThreadSystemMessageProps {
  thread: Thread;
  onClick: () => void;
  onDelete?: () => void;
  canManage?: boolean;
  channelName?: string;
  /** Pour afficher le pseudo et l'avatar du serveur (comme les messages du salon). */
  serverId?: string | null;
}

/*
 * Apercu d'un fil sous "X a commence un fil" (video de reference). Le clic droit ouvre le menu du fil (le meme que dans
 * la liste des salons et la liste des fils) : lu, favoris, fermer, verrouiller, modifier, lien, muet, notifications,
 * supprimer, quitter, identifiant.
 */
export function ThreadSystemMessage({ thread, onClick, onDelete, canManage = false, channelName = '', serverId }: ThreadSystemMessageProps) {
  const { data: members = [] } = useMembers(serverId || '');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const messageCount = thread.message_count || 0;
  const lastMessage = thread.last_message;
  const lastMember = lastMessage?.author?.id ? members.find((m) => m.user?.id === lastMessage.author?.id) : undefined;
  const lastName = lastMember?.serverProfile?.display_name || lastMember?.nickname || lastMessage?.author?.display_name;
  const lastAvatar = lastMember?.serverProfile?.avatar_url || lastMessage?.author?.avatar_url || null;
  const lastActivity = thread.last_message_at ?? thread.created_at;
  const relativeTime = lastActivity ? shortAgo(new Date(lastActivity)) : null;

  const embedContent = (
    <button type="button"
      onClick={onClick}
      className="group/thread flex flex-col items-start w-fit max-w-full text-left py-[7px] px-2 rounded-md transition-colors bg-[#383840] hover:bg-[#3e3e46] border border-[#43434b]"
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <span translate="no" className="text-sm leading-5 font-semibold text-white truncate">{thread.name}</span>
        <span className="text-sm leading-5 flex items-center gap-0.5 text-[#6e9dff] shrink-0">
          {messageCount} {messageCount === 1 ? 'message' : 'messages'}
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-sm leading-5 text-[#dbdee1] min-w-0">
        {lastMessage ? (
          <>
            <UserAvatarImage src={lastAvatar} alt="" className="w-4 h-4 shrink-0" fallbackClassName="text-[8px]" fallback={(lastName ?? '?').charAt(0).toUpperCase()} ownerId={lastMessage.author?.id} />
            <span translate="no" className="font-medium text-white shrink-0">{lastName}</span>
            <ServerTagBadge userId={lastMessage.author?.id} variant="compact" interactive={false} />
            <span translate="no" className="truncate max-w-[260px]">{lastMessage.content}</span>
          </>
        ) : (
          <span className="italic">Il n'y a pas encore de messages récents dans ce fil.</span>
        )}
        {relativeTime && <span className="shrink-0 text-[#b5bac1]">{relativeTime}</span>}
      </div>
    </button>
  );

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div onContextMenu={(e) => e.stopPropagation()} className="w-fit max-w-full">{embedContent}</div>
        </ContextMenuTrigger>
        <ThreadContextMenuBody thread={thread} channelId={thread.channel_id} canManage={canManage} onEdit={() => setEditOpen(true)} onDelete={() => setDeleteOpen(true)} />
      </ContextMenu>

      <DeleteThreadDialog open={deleteOpen} onOpenChange={setDeleteOpen} name={thread.name} onConfirm={() => onDelete?.()} />
      {editOpen && (
        <ThreadSettingsPage thread={thread} channelName={channelName} onClose={() => setEditOpen(false)} onDelete={() => onDelete?.()} />
      )}
    </>
  );
}

export default ThreadSystemMessage;
