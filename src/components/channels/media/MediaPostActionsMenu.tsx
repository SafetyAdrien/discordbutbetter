import { useState } from 'react';
import { ClipboardCopy, BarChart3 } from 'lucide-react';
import { MoreHorizontal, CheckCheck, Pencil, Link as LinkIcon, Reply, Trash2 } from '@/components/icons/discord/lucide';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MobileMoreActionsSheet, type MobileMoreAction } from '@/components/mobile/MobileMoreActionsSheet';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { MediaPost } from '@/hooks/useMediaPosts';

import { ChannelSheetIcon } from '@/components/icons/ChannelSheetIcon';
import { userKey } from '@/lib/userScope';
const READ_KEY = 'media-read-posts';
function readSet(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(userKey(READ_KEY)) || '[]')); } catch { return new Set(); }
}
export function markPostRead(postId: string) {
  const s = readSet();
  s.add(postId);
  localStorage.setItem(userKey(READ_KEY), JSON.stringify([...s]));
  window.dispatchEvent(new CustomEvent('media-post-read', { detail: postId }));
}
export function isPostRead(postId: string): boolean {
  return readSet().has(postId);
}

interface Props {
  post: MediaPost;
  channelId: string;
  serverId?: string | null;
  isAuthor: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onReply: () => void;
  onShowStats?: () => void;
  onDeleted?: (postId: string) => void;
}

export function MediaPostActionsMenu({
  post,
  channelId,
  serverId,
  isAuthor,
  canDelete,
  onEdit,
  onReply,
  onShowStats,
  onDeleted,
}: Props) {
  const { isMobile } = useBreakpoint();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleMarkRead = () => {
    markPostRead(post.id);
  };

  const handleCopyId = () => {
    copyToClipboard(uuidToSnowflake(post.id), 'Identifiant copié');
  };

  const handleCopyLink = () => {
    const origin = window.location.origin;
    const link = serverId
      ? `${origin}/channels/${serverId}/${channelId}?post=${post.id}`
      : `${origin}/channels/me?post=${post.id}`;
    copyToClipboard(link, 'Lien copié');
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce post ?')) return;
    const { error } = await (supabase.from('media_posts') as any).delete().eq('id', post.id);
    if (error) { toast.error('Erreur lors de la suppression'); return; }
    onDeleted?.(post.id);
  };

  if (isMobile) {
    const actions: MobileMoreAction[] = [
      { id: 'read', label: 'Marquer comme lu', icon: CheckCheck, onSelect: handleMarkRead },
      ...(isAuthor ? [{ id: 'edit', label: 'Modifier', icon: Pencil, onSelect: onEdit }] : []),
      { id: 'copy-id', label: "Copier l'identifiant", icon: ClipboardCopy, onSelect: handleCopyId },
      { id: 'copy-link', label: 'Copier le lien', icon: LinkIcon, onSelect: handleCopyLink },
      { id: 'reply', label: 'Répondre', icon: Reply, onSelect: onReply },
      ...(onShowStats ? [{ id: 'stats', label: 'Voir les stats', icon: BarChart3, onSelect: onShowStats } as const] : []),
      ...(canDelete ? [{ id: 'delete', label: 'Supprimer le post', icon: Trash2, onSelect: handleDelete, destructive: true }] : []),
    ];
    return (
      <>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSheetOpen(true)} aria-label="Actions">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
        <MobileMoreActionsSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Actions du post" actions={actions} />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleMarkRead}>
          <CheckCheck className="w-4 h-4 mr-2" /> Marquer comme lu
        </DropdownMenuItem>
        {isAuthor && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" /> Modifier
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleCopyId}>
          <ChannelSheetIcon name="id" className="w-4 h-4 mr-2" /> Copier l'identifiant
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          <LinkIcon className="w-4 h-4 mr-2" /> Copier le lien
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onReply}>
          <Reply className="w-4 h-4 mr-2" /> Répondre
        </DropdownMenuItem>
        {onShowStats && (
          <DropdownMenuItem onClick={onShowStats}>
            <BarChart3 className="w-4 h-4 mr-2" /> Voir les stats
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer le post
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
