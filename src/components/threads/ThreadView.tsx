import { withReplyMention } from '@/lib/replyMention';
import React, { Fragment, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { uuidToSnowflake } from '@/lib/snowflake';
import { messageMentionsMe } from '@/lib/mention-detection';
import { ArrowDown, BarChart2, StopCircle } from 'lucide-react';
import { ArrowLeft, Link, Pencil, Trash2, Bell, BellOff, MoreVertical, Check, Maximize2, Minimize2, Reply } from '@/components/icons/discord/lucide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownTextarea } from '@/components/chat/MarkdownTextarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfilePopup } from '@/components/profile/UserProfilePopup';
import { ServerTagBadge } from '@/components/server-tags/ServerTagBadge';
import type { User } from '@/types/app';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { useThread, useDeleteThread, useUpdateThread, useLockThread } from '@/hooks/useThreads';
import { DeleteThreadDialog } from './DeleteThreadDialog';
import { SpoilerGate } from './SpoilerGate';
import { ThreadSettingsPage } from './ThreadSettingsPage';
import { ThreadMenuItems, ThreadNotificationSubmenus } from './ThreadMenuItems';
import { useThreadMessages, useSendThreadMessage, useEditThreadMessage, useDeleteThreadMessage } from '@/hooks/useThreadMessages';
import { useMarkThreadAsRead } from '@/hooks/useThreadUnreadCounts';
import { useThreadPolls, useDeletePoll, useEndPoll, Poll } from '@/hooks/usePolls';
import { useIsFollowingThread, useFollowThread, useUnfollowThread, useThreadNotificationPrefs, isThreadMuted } from '@/hooks/useThreadFollow';
import { useChannels } from '@/hooks/useChannels';
import { useServerRoles } from '@/hooks/useRoles';
import { useMembers } from '@/hooks/useMembers';
import { PollDisplay } from '@/components/chat/PollDisplay';
import { CreatePollModal } from '@/components/chat/CreatePollModal';
import { UniversalMessageActions } from '@/components/chat/UniversalMessageActions';
import { UniversalMessageContextMenu } from '@/components/chat/UniversalMessageContextMenu';
import { ReportModal } from '@/components/chat/ReportModal';
import { ThreadMessage } from '@/types/thread';
import { Message } from '@/types/app';
import { format } from '@/lib/dateUtils';
import { fr } from '@/lib/dateUtils';
import { MarkdownText, setMarkdownContext, getMarkdownContext } from '@/lib/markdown';
import { registerSnowflakeMappings } from '@/lib/snowflake';
import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { TypingIndicator } from '@/components/typing/TypingIndicator';
import { MessageInput } from '@/components/chat/MessageInput';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/lib/clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { useShiftKey } from '@/hooks/useShiftKey';
import { useHasChannelPermission, useMultipleChannelPermissions } from '@/hooks/useUserChannelPermissions';
import { MobilePollActions } from '@/components/mobile/MobilePollActions';
import { useThreadMessageReactions, useToggleThreadReaction } from '@/hooks/useThreadReactions';
import { ReactionBar } from '@/components/chat/ReactionBar';
import { SwipeToReplyRow } from '@/components/mobile/SwipeToReplyRow';
import { RepliedLine } from '@/components/chat/RepliedLine';
import { ReplyBanner } from '@/components/chat/ReplyBanner';
import { useBreakpoint } from '@/hooks/useBreakpoint';

import { ChannelSheetIcon } from '@/components/icons/ChannelSheetIcon';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { MessageAttachments } from '@/components/chat/MessageAttachments';
import { ForwardedFrame } from '@/components/chat/ForwardedFrame';
import { toast } from 'sonner';
import { EditableAttachments } from '@/components/chat/EditableAttachments';
import { AttachmentEditsPanel, useAttachmentEdits } from '@/components/chat/upload/AttachmentEditsPanel';
import { useForwardedFrom } from '@/hooks/useForwardedFrom';
import { openForwardMessage } from '@/lib/forwardMessage';
import { useThreadStarterMessage } from '@/hooks/useThreadStarterMessage';
import { jumpToChannelMessage } from '@/lib/threadEvents';
import { usePendingAttachments } from '@/hooks/usePendingAttachments';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { ForumTagChip } from '@/components/channels/forum/ForumTagChip';
import type { ForumTag } from '@/hooks/useForumTags';
import { MessageCircle, MoreHorizontal, X as CloseIcon, Smile, Pin as PinIcon, Users as UsersIcon } from '@/components/icons/discord/lucide';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ThreadsPopover from '@/components/threads/ThreadsPopover';
import { ForumEmoji } from '@/components/channels/forum/ForumEmoji';
const MOBILE_BREAKPOINT = 768;
interface ThreadViewProps {
  threadId: string;
  channelName: string;
  channelId?: string;
  serverId?: string | null;
  onBack: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  /** Vue principale : liste des fils du salon (ouvre un autre fil) et bascule de la liste des membres. */
  onSwitchThread?: (threadId: string) => void;
  onToggleMembers?: () => void;
  membersOpen?: boolean;
  /** Post de Forum / Multimedia : en-tete, introduction et barre du post. */
  forumPost?: ForumPostPanelOptions;
  /** Vue Favoris : fil d'Ariane "serveur > salon > fil" et bouton "Y aller" (video de reference). */
  favoriteTrail?: { serverName: string; serverIcon?: string | null; onGoToServer: () => void };
}

export interface ForumPostPanelOptions {
  starterMessageId: string | null;
  tags: ForumTag[];
  defaultEmoji: string | null;
  isFollowing: boolean;
  onToggleFollow: () => void;
  /** Contenu du menu "..." (DropdownMenuItem). */
  menu: React.ReactNode;
}

const ThreadView: React.FC<ThreadViewProps> = ({ threadId, channelName, channelId, serverId, onBack, isFullscreen, onToggleFullscreen, onSwitchThread, onToggleMembers, membersOpen, forumPost, favoriteTrail }) => {
  const pending = usePendingAttachments();
  const [messageContent, setMessageContent] = useState('');
  const [showNewMessagesBanner, setShowNewMessagesBanner] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hoveredPollId, setHoveredPollId] = useState<string | null>(null);
  const [openDropdownPollId, setOpenDropdownPollId] = useState<string | null>(null);
  const [mobilePollSheetId, setMobilePollSheetId] = useState<string | null>(null);
  const { isMobile, isTablet } = useBreakpoint();
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { data: notifPrefs } = useThreadNotificationPrefs(threadId);
  const notifMuted = isThreadMuted(notifPrefs) || notifPrefs?.level === 'none';
  const lockThread = useLockThread();
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [openDropdownMessageId, setOpenDropdownMessageId] = useState<string | null>(null);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<ThreadMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  
  const { user } = useAuth();
  const attachmentEdits = useAttachmentEdits();
  const isShiftPressed = useShiftKey();
  const { data: thread } = useThread(threadId);
  const { data: starter } = useThreadStarterMessage((thread as { message_id?: string | null } | undefined)?.message_id);
  const { data: messages = [] } = useThreadMessages(threadId);
  const forwardedMap = useForwardedFrom('thread', threadId, messages.map((m) => m.id));
  const { data: polls = [] } = useThreadPolls(threadId);
  const { data: isFollowing } = useIsFollowingThread(threadId);
  const followThread = useFollowThread();
  const unfollowThread = useUnfollowThread();
  const deleteThread = useDeleteThread();
  const updateThread = useUpdateThread();
  const sendMessage = useSendThreadMessage();
  const editMessage = useEditThreadMessage();
  const deleteMessage = useDeleteThreadMessage();
  const markAsRead = useMarkThreadAsRead();
  const deletePoll = useDeletePoll();
  const endPollMutation = useEndPoll();

  // Reactions
  const messageIds = useMemo(() => messages.map(m => m.id), [messages]);
  const { data: reactionsData = {} } = useThreadMessageReactions(messageIds);
  const toggleReaction = useToggleThreadReaction();
  
  // Fetch channels, roles and members for mention autocomplete
  const { data: channelsData } = useChannels(serverId || null);
  const { data: serverRoles = [] } = useServerRoles(serverId || '');
  const { data: membersData = [] } = useMembers(serverId || '');
  
  // Build channels list for mentions
  const allChannels = useMemo(() => {
    const channels: Array<{ id: string; name: string; type: string }> = [];
    channelsData?.categories.forEach(cat => {
      cat.channels.forEach(ch => {
        channels.push({ id: ch.id, name: ch.name, type: ch.type || 'text' });
      });
    });
    channelsData?.orphanChannels?.forEach(ch => {
      channels.push({ id: ch.id, name: ch.name, type: ch.type || 'text' });
    });
    return channels;
  }, [channelsData]);
  
  // Build members list for mentions
  const mentionMembers = useMemo(() => {
    return membersData.map(m => ({
      id: m.user?.id || m.id,
      displayName: m.user?.display_name || m.nickname || 'Unknown',
      username: m.user?.username || '',
      avatar: m.user?.avatar_url || undefined
    }));
  }, [membersData]);
  
  // Profil des auteurs comme dans le salon : nom d'affichage, avatar et banniere du serveur (profil de serveur, pseudo),
  // sinon ceux du compte. Sert aux messages, a l'en-tete du fil et a la fiche utilisateur.
  const memberUsers = useMemo(() => {
    const map = new Map<string, { user: User; memberId: string }>();
    for (const m of membersData) {
      if (!m.user) continue;
      map.set(m.user.id, {
        memberId: m.id,
        user: {
          id: m.user.id,
          username: m.user.username,
          displayName: m.serverProfile?.display_name || m.nickname || m.user.display_name,
          avatar: m.serverProfile?.avatar_url || m.user.avatar_url || undefined,
          banner: m.serverProfile?.banner_url || m.user.banner_url || undefined,
          status: m.user.status || 'offline',
          customStatus: m.user.custom_status || undefined,
          bio: m.serverProfile?.bio || m.user.bio || undefined,
          pronouns: m.serverProfile?.pronouns || m.user.pronouns || undefined,
        } as User,
      });
    }
    return map;
  }, [membersData]);
  const authorOf = useCallback((a?: { id?: string; display_name?: string | null; username?: string | null; avatar_url?: string | null } | null) => {
    const m = a?.id ? memberUsers.get(a.id) : undefined;
    return {
      displayName: m?.user.displayName || a?.display_name || a?.username || 'Inconnu',
      avatar: m?.user.avatar || a?.avatar_url || undefined,
    };
  }, [memberUsers]);
  const [profileUser, setProfileUser] = useState<{ user: User; memberId?: string } | null>(null);
  const openProfile = (a?: { id?: string; display_name?: string | null; username?: string | null; avatar_url?: string | null } | null) => {
    if (!a?.id) return;
    const m = memberUsers.get(a.id);
    setProfileUser({
      memberId: m?.memberId,
      user: m?.user ?? ({ id: a.id, username: a.username ?? 'unknown', displayName: a.display_name || a.username || 'Utilisateur', avatar: a.avatar_url || undefined, status: 'offline' } as User),
    });
  };

  // Build roles list for mentions
  const mentionRoles = useMemo(() => {
    return serverRoles.filter(r => !r.is_default).map(r => ({
      id: r.id,
      name: r.name,
      color: r.color || undefined
    }));
  }, [serverRoles]);

  // Build memberRoles map (userId -> roles[]) for reply role badges (Discord-like)
  const memberRoles = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string; color?: string | null; icon_url?: string | null }>>();
    for (const m of membersData) {
      const uid = m.user?.id || m.id;
      const roles = ((m as any).roles ?? []) as Array<{ id: string; name: string; color?: string | null; icon_url?: string | null; position?: number | null }>;
      // Sort by position desc so the highest role is first
      const sorted = [...roles].sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
      map.set(uid, sorted);
    }
    return map;
  }, [membersData]);

  // Build a lightweight authorLookup (displayName -> {id, avatar, displayName}) for legacy reply parsing
  const replyAuthorLookup = useMemo(() => {
    const map = new Map<string, { id: string; avatar?: string; displayName: string }>();
    for (const m of membersData) {
      const dn = m.user?.display_name || m.nickname || '';
      if (!dn) continue;
      map.set(dn, {
        id: m.user?.id || m.id,
        displayName: dn,
        avatar: m.user?.avatar_url || undefined,
      });
    }
    return map;
  }, [membersData]);
  
  // Typing indicator for threads
  const { startTyping, stopTyping } = useTypingIndicator(null, null, threadId);

  // Check multiple permissions for parent channel
  const { can: canPerm } = useMultipleChannelPermissions(channelId || thread?.channel_id || null, [
    'send_messages_in_threads',
    'send_messages',
    'attach_files',
    'add_reactions',
    'create_polls',
    'mention_everyone',
    'manage_threads',
    'manage_polls',
  ]);
  
  // Use send_messages_in_threads, fallback to send_messages
  const canSendMessages = canPerm('send_messages_in_threads') || canPerm('send_messages');
  const canAttachFiles = canPerm('attach_files');
  const canAddReactions = canPerm('add_reactions');
  const canCreatePolls = canPerm('create_polls');
  const canMentionEveryone = canPerm('mention_everyone');
  const canManageThreads = canPerm('manage_threads');
  const canManagePolls = canPerm('manage_polls');
  
  // Thread locked/closed state
  const isThreadLocked = thread?.locked && !canManageThreads;
  const isThreadClosed = thread?.closed && !canManageThreads;
  const isReadOnly = isThreadLocked || isThreadClosed;
  
  const permissionDeniedMessage = isThreadClosed
    ? "Ce fil est fermé. L'écriture n'est plus possible."
    : isThreadLocked
    ? "Ce fil est verrouillé. Seuls les modérateurs peuvent envoyer des messages."
    : !canSendMessages 
    ? "Vous n'avez pas la permission d'envoyer des messages dans ce fil." 
    : undefined;

  const handleCopyPollLink = (pollId: string) => {
    const link = `${window.location.origin}/channels/${serverId}/${channelId}/thread/${threadId}/poll/${pollId}`;
    copyToClipboard(link, 'Lien du sondage copié');
  };

  const handleCopyId = (id: string) => {
    copyToClipboard(uuidToSnowflake(id), 'ID copié');
  };

  const handleCopyMessageLink = (messageId: string) => {
    const link = `${window.location.origin}/channels/${serverId}/${channelId}/thread/${threadId}/${messageId}`;
    copyToClipboard(link, 'Lien du message copié');
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    const currentReactions = reactionsData?.[messageId] || [];
    toggleReaction.mutate({ messageId, emoji, currentReactions });
  };

  const handleStartEdit = (message: ThreadMessage) => {
    setEditingMessageId(message.id);
    setEditingContent(getGifOnlyUrl(message) ?? message.content);
    attachmentEdits.reset((message.attachments ?? []) as never);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !user) return;
    if (!editingContent.trim() && attachmentEdits.count === 0) return;
    try {
      const attachments = attachmentEdits.hasChanges ? await attachmentEdits.resolve(user.id) : undefined;
      await editMessage.mutateAsync({
        messageId: editingMessageId,
        threadId,
        content: editingContent.trim(),
        attachments,
      });
      setEditingMessageId(null);
      setEditingContent('');
      attachmentEdits.reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la modification');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
    attachmentEdits.reset();
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage.mutate({ messageId, threadId });
  };

  const getCharacterCountColor = () => {
    if (editingContent.length > 1980) return 'text-destructive';
    if (editingContent.length > 1900) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  // A GIF-only message (no text, single "gif" attachment) has nothing to
  // edit as text — "Modifier" instead surfaces the source URL to copy/reuse.
  const getGifOnlyUrl = (msg: { content: string; attachments?: any[] }): string | null => {
    const atts = msg.attachments ?? [];
    if (msg.content.trim() || atts.length !== 1) return null;
    return atts[0]?.type === 'gif' ? atts[0].url as string : null;
  };

  const handleDeletePoll = (poll: Poll) => {
    deletePoll.mutate({ pollId: poll.id, channelId: channelId || thread?.channel_id || '', threadId });
  };

  const handleEndPoll = (poll: Poll) => {
    endPollMutation.mutate({ pollId: poll.id, channelId: channelId || thread?.channel_id || '', threadId });
  };

  // Mark thread as read when opened
  useEffect(() => {
    if (threadId && channelId) {
      markAsRead.mutate({ threadId, channelId });
      setShowNewMessagesBanner(false);
      lastMessageCountRef.current = 0;
    }
  }, [threadId, channelId]);

  // Publish serverId + maps to the markdown context so RoleMention can
  // open RoleInfoPopup inside threads (instantly, even after a refresh).
  useEffect(() => {
    if (!serverId) return;
    const prev = getMarkdownContext();

    const usersMap = new Map<string, { displayName: string; avatarUrl?: string; bio?: string }>();
    const userIds: string[] = [];
    membersData.forEach((m) => {
      const displayName =
        m.serverProfile?.display_name || m.nickname || m.user.display_name || m.user.username;
      usersMap.set(m.user.id, {
        displayName,
        avatarUrl: m.serverProfile?.avatar_url || m.user.avatar_url || undefined,
        bio: m.serverProfile?.bio || m.user.bio || undefined,
      });
      userIds.push(m.user.id);
    });

    const rolesMap = new Map<string, { name: string; color: string }>();
    const roleIds: string[] = [];
    serverRoles.forEach((r) => {
      rolesMap.set(r.id, { name: r.name, color: r.color || '#99aab5' });
      roleIds.push(r.id);
    });

    const channelsMap = new Map<string, { name: string; serverId?: string }>();
    const channelIds: string[] = [];
    channelsData?.categories.forEach((cat) => {
      cat.channels.forEach((ch) => {
        channelsMap.set(ch.id, { name: ch.name, serverId });
        channelIds.push(ch.id);
      });
    });
    channelsData?.orphanChannels?.forEach((ch) => {
      channelsMap.set(ch.id, { name: ch.name, serverId });
      channelIds.push(ch.id);
    });

    registerSnowflakeMappings([...userIds, ...roleIds, ...channelIds]);

    setMarkdownContext({
      ...prev,
      currentUserId: user?.id,
      serverId,
      users: usersMap,
      roles: rolesMap,
      channels: channelsMap,
    });

    return () => {
      setMarkdownContext(prev);
    };
  }, [serverId, user?.id, membersData, serverRoles, channelsData]);


  // Check if user is at bottom of scroll
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsAtBottom(atBottom);
      
      if (atBottom && channelId) {
        setShowNewMessagesBanner(false);
        markAsRead.mutate({ threadId, channelId });
      }
    }
  }, [threadId, markAsRead]);

  // Detect new messages and show banner if not at bottom
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current && lastMessageCountRef.current > 0 && !isAtBottom) {
      setShowNewMessagesBanner(true);
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, isAtBottom]);


  const scrollToBottom = useCallback(() => {
    if (scrollRef.current && channelId) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      setShowNewMessagesBanner(false);
      markAsRead.mutate({ threadId, channelId });
    }
  }, [threadId, channelId, markAsRead]);

  const handleSend = async () => {
    if (!messageContent.trim() && pending.attachments.length === 0) return;

    try {
      await sendMessage.mutateAsync({
        threadId,
        content: replyingTo ? withReplyMention(messageContent, replyingTo.author?.id, user?.id) : messageContent,
        replyToId: replyingTo?.id ?? null,
        files: pending.attachments,
      });
      setMessageContent('');
      pending.clearAttachments();
      setReplyingTo(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSendExternalAttachment = async (attachment: { url: string; name: string; type: 'sticker' | 'gif' }) => {
    try {
      await sendMessage.mutateAsync({
        threadId,
        content: '',
        replyToId: replyingTo?.id ?? null,
        externalAttachment: attachment,
      });
      setReplyingTo(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: fr });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMMM yyyy', { locale: fr });
  };

  // Create unified timeline of messages and polls
  type TimelineItem = 
    | { type: 'message'; data: ThreadMessage; timestamp: Date }
    | { type: 'poll'; data: Poll; timestamp: Date }
    | { type: 'starter'; data: NonNullable<typeof starter>; timestamp: Date };
    
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    
    messages.forEach(msg => items.push({ 
      type: 'message', 
      data: msg, 
      timestamp: new Date(msg.created_at) 
    }));
    
    polls.forEach(poll => items.push({ 
      type: 'poll', 
      data: poll, 
      timestamp: new Date(poll.created_at) 
    }));
    
    if (starter) items.push({ type: 'starter', data: starter, timestamp: new Date(starter.created_at) });

    return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [messages, polls, starter]);
  
  // Group timeline items by date
  const groupedTimelineItems = useMemo(() => {
    return timelineItems.reduce((groups, item) => {
      const date = format(item.timestamp, 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
      return groups;
    }, {} as Record<string, TimelineItem[]>);
  }, [timelineItems]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [timelineItems.length]);

  // Handle input change with typing indicator
  const handleRename = () => {
    if (newName.trim() && newName !== thread?.name) {
      updateThread.mutate({ threadId, name: newName.trim() });
    }
    setIsRenaming(false);
  };

  const handleDeleteThread = () => {
    if (channelId) {
      deleteThread.mutate({ threadId, channelId }, {
        onSuccess: () => onBack()
      });
    }
    setShowDeleteDialog(false);
  };

  return (
    <div className="h-full flex flex-col bg-background border-l border-black/[0.2] min-w-0">
      {forumPost && !isFullscreen ? (
        /* En-tete d'un post en panneau (video de reference) : titre, "...", fermer. En pleine fenetre, l'en-tete unique ci-dessous. */
        <div className="flex items-center gap-2 pl-4 pr-2 h-12 shrink-0 border-b border-[hsl(var(--border-subtle))]">
          <span translate="no" className="flex-1 min-w-0 truncate text-base font-semibold text-white">{thread?.name}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Plus d'options" className="p-1.5 rounded text-[hsl(var(--header-icon))] hover:text-white">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">{forumPost.menu}</DropdownMenuContent>
          </DropdownMenu>
          <button type="button" aria-label="Fermer" onClick={onBack} className="p-1.5 rounded text-[hsl(var(--header-icon))] hover:text-white">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      ) : (
      /* En-tete d'un fil (video de reference). Panneau : icone + nom, cloche (notifications), "..." et fermer.
         Fenetre complete : fil d'Ariane "# salon > fil" puis icones et menu "...". */
      <div className={cn("flex items-center h-[48px] shrink-0 border-b border-black/[0.2]", isFullscreen ? "gap-3 pl-4 pr-3" : "gap-2.5 pl-[15px] pr-[9px]")}>
        {isFullscreen ? (
          <div className="flex items-center gap-2 min-w-0 flex-1 text-base">
            {favoriteTrail && (
              <>
                <span title={favoriteTrail.serverName} className="flex h-[19px] w-[19px] shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[#4a4a54] text-[8px] font-semibold text-[#dbdee1]">
                  {favoriteTrail.serverIcon ? <img src={favoriteTrail.serverIcon} alt="" className="h-full w-full object-cover" /> : favoriteTrail.serverName.slice(0, 2).toUpperCase()}
                </span>
                <span aria-hidden className="text-[#b5bac1]">›</span>
              </>
            )}
            <button type="button" onClick={onBack} aria-label={`Retour au salon ${channelName}`} className="flex items-center gap-2 min-w-0 rounded text-[#dbdee1] hover:text-white transition-colors">
              {forumPost ? <StreamlineForum className="w-6 h-6 text-[#b5bac1] shrink-0" size={24} /> : <ChannelSheetIcon name="text" className="w-6 h-6 text-[#b5bac1] shrink-0" />}
              <span translate="no" className="truncate">{channelName}</span>
            </button>
            <span aria-hidden className="text-[#b5bac1]">›</span>
            {!forumPost && <StreamlineThreads className="w-6 h-6 text-[#b5bac1] shrink-0" />}
            <span translate="no" className="font-medium text-white truncate">{thread?.name || 'Fil'}</span>
            {favoriteTrail && (
              <button type="button" onClick={favoriteTrail.onGoToServer} className="ml-1 h-6 shrink-0 rounded-[4px] bg-[#4a4a54] px-2 text-sm font-medium text-white transition-colors hover:bg-[#53535e]">Y aller</button>
            )}
          </div>
        ) : (
          <>
            <StreamlineThreads className="w-[19px] h-[19px] text-[#b5bac1] shrink-0" />
            {isRenaming ? (
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setIsRenaming(false);
                }}
                className="h-7 text-base font-medium flex-1"
                autoFocus
              />
            ) : (
              <span translate="no" className="flex-1 min-w-0 truncate text-base font-medium text-white">{thread?.name || 'Fil'}</span>
            )}
          </>
        )}

        {isFullscreen && onSwitchThread && (
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Fils" className="w-8 h-8 flex items-center justify-center rounded text-[#b5bac1] hover:text-white data-[state=open]:text-white transition-colors"><StreamlineThreads className="w-6 h-6" /></button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Fils</TooltipContent>
            </Tooltip>
            <PopoverContent side="bottom" align="end" sideOffset={8} collisionPadding={12} className="w-[min(674px,calc(100vw-1rem))] p-0 rounded-lg bg-[#383840] border border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
              <ThreadsPopover channelId={channelId ?? thread?.channel_id ?? ''} channelName={channelName} onSelectThread={(id) => onSwitchThread(id)} />
            </PopoverContent>
          </Popover>
        )}

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Paramètres de notification" className={cn('flex items-center justify-center rounded text-[#b5bac1] hover:text-white transition-colors', isFullscreen ? 'w-8 h-8' : 'w-7 h-7', notifMuted && 'text-[#80848e]')}>
                  {notifMuted || forumPost ? <BellOff className={isFullscreen ? 'w-6 h-6' : 'w-[19px] h-[19px]'} /> : <Bell className={cn('fill-current', isFullscreen ? 'w-6 h-6' : 'w-[19px] h-[19px]')} />}
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Paramètres de notification</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-[260px] p-2 rounded-lg bg-[#3b3b45] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
            <ThreadNotificationSubmenus threadId={threadId} />
            <DropdownMenuSeparator />
            <DropdownMenuItem className="h-10 px-3 text-base font-medium" onSelect={() => (isFollowing ? unfollowThread.mutate(threadId, { onSuccess: () => onBack() }) : followThread.mutate(threadId))}>
              {isFollowing ? 'Quitter le fil' : 'Rejoindre le fil'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isFullscreen && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label="Messages épinglés (bientôt disponible)" aria-disabled className="w-8 h-8 flex items-center justify-center rounded text-[#b5bac1] opacity-60 cursor-not-allowed"><PinIcon className="w-6 h-6" /></button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Messages épinglés — bientôt disponible</TooltipContent>
            </Tooltip>
            {onToggleMembers && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="Liste des membres" onClick={onToggleMembers} className={cn('w-8 h-8 flex items-center justify-center rounded text-[#b5bac1] hover:text-white transition-colors', membersOpen && 'text-white')}><UsersIcon className="w-6 h-6" /></button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{membersOpen ? 'Masquer la liste des membres' : 'Afficher la liste des membres'}</TooltipContent>
              </Tooltip>
            )}
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Plus d'options" className={cn('flex items-center justify-center rounded text-[#b5bac1] hover:text-white transition-colors data-[state=open]:text-white', isFullscreen ? 'w-8 h-8' : 'w-7 h-7')}>
              <MoreHorizontal className={isFullscreen ? 'w-6 h-6' : 'w-4 h-4'} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[260px] p-2 rounded-lg bg-[#3b3b45] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
            {forumPost ? forumPost.menu : thread && (
              <ThreadMenuItems
                thread={thread}
                canManage={!!canManageThreads || thread.created_by === user?.id}
                panel={isFullscreen ? undefined : { onOpenFullscreen: () => onToggleFullscreen?.() }}
                full={isFullscreen ? { onScrollTop: () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), onSplit: () => onToggleFullscreen?.() } : undefined}
                onEdit={() => setShowSettings(true)}
                onDelete={() => setShowDeleteDialog(true)}
                onLeave={() => unfollowThread.mutate(threadId, { onSuccess: () => onBack() })}
              />
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {!isFullscreen && (
          <button type="button" aria-label="Fermer" onClick={onBack} className="w-7 h-7 flex items-center justify-center rounded text-[#b5bac1] hover:text-white transition-colors">
            <CloseIcon className="w-[11px] h-[11px]" />
          </button>
        )}
      </div>
      )}

      <UserProfilePopup
        user={profileUser?.user ?? null}
        open={!!profileUser}
        onOpenChange={(o) => !o && setProfileUser(null)}
        roles={profileUser ? (memberRoles.get(profileUser.user.id) as never) : undefined}
        serverId={serverId ?? undefined}
        memberId={profileUser?.memberId}
      />
      <DeleteThreadDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} name={thread?.name ?? ''} onConfirm={handleDeleteThread} />
      {showSettings && thread && (
        <ThreadSettingsPage
          thread={thread}
          channelName={channelName}
          onClose={() => setShowSettings(false)}
          onDelete={handleDeleteThread}
        />
      )}

      {/* Bandeau "verrouille" (video de reference) */}
      {thread?.locked && (
        <div className="flex items-center gap-3 px-4 py-2.5 shrink-0 bg-[#2f2f37] border-b border-black/[0.2]">
          <p className="flex-1 text-sm leading-[18px] text-[#dbdee1]">Ce {forumPost ? 'post' : 'fil'} a été verrouillé. Seuls les modérateurs peuvent y envoyer des messages.</p>
          {(canManageThreads || thread.created_by === user?.id) && (
            <button type="button" onClick={() => lockThread.mutate({ threadId, locked: false })} className="h-8 px-3 rounded-md bg-white/[0.1] hover:bg-white/[0.16] text-sm font-medium text-white shrink-0 transition-colors">Déverrouiller</button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="relative flex-1 overflow-hidden mb-6">
        {/* New messages banner */}
        {showNewMessagesBanner && (
          <button type="button"
            onClick={scrollToBottom}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <ArrowDown className="w-4 h-4" />
            <span className="text-sm font-medium">Nouveaux messages</span>
          </button>
        )}
        
        <div 
          ref={scrollRef} 
          data-thread-scroller
          onScroll={handleScroll}
          className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent [--msg-zone-inset-right:4px]"
        >
          <div className="flex flex-col justify-end min-h-full px-4 pt-4 pb-0 space-y-4">
          {forumPost && thread && (
            <div className="pt-6">
              <span className="h-12 w-12 rounded-full bg-[hsl(var(--button-secondary))] flex items-center justify-center text-white">
                <MessageCircle className="w-6 h-6" />
              </span>
              <h1 translate="no" className="mt-3 text-[28px] leading-9 font-semibold text-white break-words">{thread.name}</h1>
              {forumPost.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {forumPost.tags.map((t) => <ForumTagChip key={t.id} tag={t} size="sm" />)}
                </div>
              )}
            </div>
          )}
          {!forumPost && thread && (
            <div className="pt-4 pb-1 -mb-[22px]">
              <span className="w-16 h-16 rounded-full bg-[hsl(var(--button-secondary))] flex items-center justify-center text-white">
                <StreamlineThreads className="w-7 h-7" />
              </span>
              <h1 translate="no" className="mt-2 text-[30px] leading-9 font-extrabold text-white break-words">{thread.name}</h1>
              {(thread as { creator?: { display_name?: string } | null }).creator?.display_name && (
                <p className="mt-2 text-base text-[#dbdee1]">Commencé par <span translate="no" className="font-semibold text-white">{authorOf((thread as { creator?: { id?: string; display_name?: string | null; username?: string | null; avatar_url?: string | null } }).creator).displayName}</span></p>
              )}
            </div>
          )}
          {Object.entries(groupedTimelineItems).map(([date, items]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-2 mt-4 mb-[9px]">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-xs font-semibold text-[#b5bac1] px-2">
                  {formatDate(items[0].timestamp.toISOString())}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              
              {/* Items for this date */}
              <div className="space-y-0.5">
                {items.map((item, index) => {
                  // Message d'origine du fil (message du salon) : "Y aller" le ramene dans le salon.
                  if (item.type === 'starter') {
                    const st = item.data;
                    return (
                      <div key={`starter-${st.id}`} className="group/message message-hover relative flex gap-3 -mx-4 pl-[21px] pr-8 pt-2 pb-px">
                        <button
                          type="button"
                          onClick={() => { jumpToChannelMessage(st.channel_id, st.id); onBack(); }}
                          className="absolute top-1 right-3 h-6 px-2 rounded bg-[#383840] border border-white/[0.06] text-xs font-medium text-[#dbdee1] hover:text-white hover:bg-[#464650] opacity-0 group-hover/message:opacity-100 focus-visible:opacity-100 transition-opacity"
                        >
                          Y aller
                        </button>
                        <Avatar className="w-8 h-8 mt-0.5 shrink-0">
                          <AvatarImage src={st.author?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{st.author?.display_name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span translate="no" className="text-sm font-medium text-white">{st.author?.display_name || st.author?.username || 'Utilisateur'}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(st.created_at)}</span>
                          </div>
                          {st.content && (
                            <div className="text-sm text-foreground break-words">
                              <MarkdownText variant="chat" content={st.content} />
                              {st.edited_at && <span className="ml-1 text-[.625rem] text-muted-foreground/60">(modifié)</span>}
                            </div>
                          )}
                          {st.attachments.length > 0 && (
                            <div className="mt-1"><MessageAttachments attachments={st.attachments as never} authorId={st.author?.id ?? null} /></div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Render Poll
                  if (item.type === 'poll') {
                    const poll = item.data as Poll;
                    const prevItem = index > 0 ? items[index - 1] : null;
                    const showAuthor = !prevItem || 
                      prevItem.type !== 'poll' ||
                      (prevItem.data as Poll).author?.id !== poll.author?.id ||
                      (item.timestamp.getTime() - prevItem.timestamp.getTime()) > 300000;
                    const isOwnPoll = user?.id === poll.author_id;
                    const canModeratePoll = isOwnPoll || canManagePolls;
                    const isPollExpired = poll.expires_at ? new Date(poll.expires_at) <= new Date() : false;

                    return (
                      <ContextMenu key={`poll-${poll.id}`}>
                        <ContextMenuTrigger asChild>
                          <div 
                            className={cn(
                              'group message-hover -mx-4 px-6 relative',
                              showAuthor ? 'pt-2' : 'py-0'
                            )}
                            onMouseEnter={() => !isMobile && setHoveredPollId(poll.id)}
                            onMouseLeave={() => {
                              if (openDropdownPollId !== poll.id) setHoveredPollId(null);
                            }}
                            onTouchStart={() => {
                              if (!isMobile) return;
                              const timer = setTimeout(() => setMobilePollSheetId(poll.id), 500);
                              (window as any).__pollLongPressTimer = timer;
                            }}
                            onTouchEnd={() => {
                              if ((window as any).__pollLongPressTimer) {
                                clearTimeout((window as any).__pollLongPressTimer);
                                (window as any).__pollLongPressTimer = null;
                              }
                            }}
                            onTouchMove={() => {
                              if ((window as any).__pollLongPressTimer) {
                                clearTimeout((window as any).__pollLongPressTimer);
                                (window as any).__pollLongPressTimer = null;
                              }
                            }}
                          >
                            {!isMobile && (
                              <UniversalMessageActions
                                isVisible={hoveredPollId === poll.id || openDropdownPollId === poll.id}
                                isShiftPressed={isShiftPressed}
                                isOwnMessage={isOwnPoll}
                                canManageMessages={canManagePolls}
                                canAddReactions={false}
                                onCopyLink={() => handleCopyPollLink(poll.id)}
                                onCopyId={() => handleCopyId(poll.id)}
                                onEdit={isOwnPoll ? () => setEditingPoll(poll) : undefined}
                                onDelete={canModeratePoll ? () => handleDeletePoll(poll) : undefined}
                              />
                            )}
                            <MobilePollActions
                              open={mobilePollSheetId === poll.id}
                              onOpenChange={(open) => setMobilePollSheetId(open ? poll.id : null)}
                              isOwnPoll={canModeratePoll}
                              isPollExpired={isPollExpired}
                              onCopyLink={() => handleCopyPollLink(poll.id)}
                              onCopyId={() => handleCopyId(poll.id)}
                              onEdit={() => setEditingPoll(poll)}
                              onDelete={() => handleDeletePoll(poll)}
                              onEndPoll={() => handleEndPoll(poll)}
                            />
                            {showAuthor ? (
                              <div className="flex gap-3">
                                <Avatar className="w-8 h-8 mt-0.5 shrink-0">
                                  <AvatarImage src={poll.author?.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {poll.author?.display_name?.[0] || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2 mb-0.5">
                                    <span className="font-medium text-foreground text-sm">
                                      {poll.author?.display_name || 'Inconnu'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(poll.created_at), 'HH:mm', { locale: fr })}
                                    </span>
                                    <div className="flex items-center gap-1 text-primary text-xs font-medium bg-primary/10 px-1.5 py-0.5 rounded">
                                      <BarChart2 className="w-3 h-3" />
                                      POLL
                                    </div>
                                  </div>
                                  <div className="mt-1">
                                    <PollDisplay 
                                      poll={poll} 
                                      channelId={channelId || thread?.channel_id || ''} 
                                      threadId={threadId}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-3">
                                <div className="w-8 shrink-0" />
                                <div className="flex-1">
                                  <PollDisplay 
                                    poll={poll} 
                                    channelId={channelId || thread?.channel_id || ''} 
                                    threadId={threadId}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48">
                          <ContextMenuItem onClick={() => handleCopyPollLink(poll.id)}>
                            <Link className="w-4 h-4 mr-2" />
                            Copier le lien
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleCopyId(poll.id)}>
                            <ChannelSheetIcon name="id" className="w-4 h-4 mr-2" />
                            Copier l'ID
                          </ContextMenuItem>
                          {canModeratePoll && (
                            <>
                              <ContextMenuSeparator />
                              {!isPollExpired && (
                                <ContextMenuItem onClick={() => handleEndPoll(poll)}>
                                  <StopCircle className="w-4 h-4 mr-2" />
                                  Terminer le sondage
                                </ContextMenuItem>
                              )}
                              <ContextMenuItem onClick={() => setEditingPoll(poll)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Modifier
                              </ContextMenuItem>
                              <ContextMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeletePoll(poll)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </ContextMenuItem>
                            </>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  }
                  
                  // Render Message
                  const message = item.data as ThreadMessage;
                  const prevItem = index > 0 ? items[index - 1] : null;
                  const showAuthor =
                    !prevItem ||
                    prevItem.type !== 'message' ||
                    (prevItem.data as ThreadMessage).author_id !== message.author_id ||
                    item.timestamp.getTime() - prevItem.timestamp.getTime() > 5 * 60 * 1000;

                  const isOwnMessage = user?.id === message.author_id;

                  // Barre du post sous le message d'ouverture : filet pleine largeur, puis reagir / abonnement / lien.
                  const postBar = forumPost && message.id === forumPost.starterMessageId ? (
/* Barre du post : reagir, abonnement, lien (video de reference). */
                            <div className="-mx-4 mt-3 pl-[18px] pr-4 pt-2 border-t border-[#3e3f45] flex items-center gap-2">
                              {forumPost.defaultEmoji && (
                                <button
                                  type="button"
                                  onClick={() => handleAddReaction(message.id, forumPost.defaultEmoji!)}
                                  className="h-8 px-2 rounded-lg bg-[hsl(var(--button-secondary))] text-base hover:brightness-110"
                                  aria-label={`Réagir avec ${forumPost.defaultEmoji}`}
                                >
                                  <ForumEmoji emoji={forumPost.defaultEmoji} className="text-lg" />
                                </button>
                              )}
                              <EmojiStickerPicker
                                serverId={serverId || null}
                                searchPlaceholder="Trouve la réaction parfaite"
                                onEmojiSelect={(emoji) => handleAddReaction(message.id, emoji)}
                                trigger={
                                  <button type="button" className="h-8 px-2.5 rounded-lg bg-[hsl(var(--button-secondary))] text-sm font-medium text-white flex items-center gap-1.5 hover:brightness-110">
                                    <Smile className="w-4 h-4" /> Réagir au post
                                  </button>
                                }
                              />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={forumPost.onToggleFollow}
                                    className="ml-auto h-8 px-2.5 rounded-lg bg-[hsl(var(--button-secondary))] text-sm font-medium text-white flex items-center gap-1.5 hover:brightness-110"
                                  >
                                    {forumPost.isFollowing ? <><Check className="w-4 h-4" /> Abonné(e)</> : <><Bell className="w-4 h-4" /> Suivre</>}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[200px] text-center">Ajoute ce post à ta liste des salons et reçois les notifications les concernant.</TooltipContent>
                              </Tooltip>
                              {linkCopied ? (
                                <span className="h-8 px-2.5 rounded-lg bg-[hsl(var(--button-secondary))] text-sm font-medium text-white flex items-center gap-1.5"><Check className="w-4 h-4" /> Copié</span>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label="Copier le lien"
                                      onClick={() => {
                                        void copyToClipboard(`${window.location.origin}/channels/${channelId || thread?.channel_id}/${threadId}`).then((ok) => {
                                          if (!ok) return;
                                          setLinkCopied(true);
                                          window.setTimeout(() => setLinkCopied(false), 2000);
                                        });
                                      }}
                                      className="h-8 w-8 rounded-lg bg-[hsl(var(--button-secondary))] text-white flex items-center justify-center hover:brightness-110"
                                    >
                                      <Link className="w-4 h-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copier le lien</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                  ) : null;

                  return (
                    <Fragment key={message.id}>
                    <UniversalMessageContextMenu
                      isOwnMessage={isOwnMessage}
                      messageId={message.id}
                      reminder={{
                        source: 'channel',
                        messageId: message.id,
                        channelId: channelId ?? null,
                        serverId: serverId ?? null,
                        threadId,
                        snapshot: {
                          authorId: message.author?.id,
                          authorName: message.author?.display_name || message.author?.username || 'Utilisateur',
                          authorAvatar: message.author?.avatar_url ?? null,
                          content: message.content,
                          createdAt: new Date(message.created_at ?? Date.now()).toISOString(),
                          channelName: thread?.name ?? channelName ?? null,
                        },
                      }}
                      previewAuthorName={message.author?.display_name || message.author?.username}
                      previewAuthorAvatar={message.author?.avatar_url || undefined}
                      previewContent={message.content}
                      onReply={() => setReplyingTo(message)}
                      onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                      onCopyText={() => copyToClipboard(message.content, 'Message copié')}
                      onCopyLink={() => handleCopyMessageLink(message.id)}
                      onCopyId={() => handleCopyId(message.id)}
                      onForward={() => openForwardMessage({
                        content: message.content,
                        attachments: (message.attachments ?? []) as never,
                        edited: !!message.edited_at,
                        from: { kind: 'thread', messageId: message.id, createdAt: message.created_at, threadId, threadName: thread?.name ?? null, channelId: channelId ?? null, channelName: channelName ?? null, serverId: serverId ?? null },
                      })}
                      onEdit={isOwnMessage ? () => handleStartEdit(message) : undefined}
                      onDelete={isOwnMessage ? () => handleDeleteMessage(message.id) : undefined}
                      onReport={!isOwnMessage ? () => setReportingMessage({
                        id: message.id,
                        content: message.content,
                        author: {
                          id: message.author?.id || '',
                          displayName: message.author?.display_name || 'Utilisateur',
                          username: message.author?.username || 'unknown',
                          avatar: message.author?.avatar_url || undefined,
                          status: 'offline',
                        },
                        timestamp: new Date(message.created_at),
                        edited_at: message.edited_at || null,
                      }) : undefined}
                    >
                      {/* Un seul enfant : le declencheur du menu contextuel (Radix Slot) n'en accepte pas plus. */}
                      <div>
                      {(() => {
                        // Real reply snapshot only (reply_to_id resolved).
                        if (message.repliedMessage) {
                          const cited = message.repliedMessage;
                          const citedRoles = cited.author ? memberRoles.get(cited.author.id) : undefined;
                          const topRole = citedRoles?.[0];
                          return (
                            <RepliedLine
                              repliedMessage={{
                                id: cited.id,
                                content: cited.content,
                                deleted: cited.deleted,
                                attachments: cited.attachments || [],
                                author: cited.author
                                  ? {
                                      id: cited.author.id,
                                      username: cited.author.username,
                                      displayName: cited.author.display_name,
                                      avatar: cited.author.avatar_url || undefined,
                                    }
                                  : null,
                              }}
                              indent={44}
                              avatarCenter={16}
                              authorColor={topRole?.color || undefined}
                              authorRole={topRole ?? null}
                              className="mb-1"
                            />
                          );
                        }
                        return null;
                      })()}
                      <SwipeToReplyRow
                        enabled={isMobile || isTablet}
                        onReply={() => setReplyingTo(message)}
                        onDoubleTap={() => handleAddReaction(message.id, '❤️')}
                      >
                      <div 
                        data-msg-id={message.id}
                        className={cn(
                          'flex gap-4 -mx-4 pl-4 pr-4 pt-px pb-1 message-hover relative',
                          replyingTo?.id === message.id && 'reply-target',
                          showAuthor ? 'pt-2' : '',
                          messageMentionsMe(message.content, user?.id, membersData.find(m => m.user?.id === user?.id)?.roles?.map((r: any) => r.id) ?? []) && 'message-mentioned',
                        )}
                        onMouseEnter={() => setHoveredMessageId(message.id)}
                        onMouseLeave={() => { 
                          if (openDropdownMessageId !== message.id) setHoveredMessageId(null); 
                        }}
                      >
                        <UniversalMessageActions
                          isVisible={(hoveredMessageId === message.id || openDropdownMessageId === message.id) && editingMessageId !== message.id}
                          isShiftPressed={isShiftPressed}
                          isOwnMessage={isOwnMessage}
                          onReply={() => setReplyingTo(message)}
                          onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                          onCopyLink={() => handleCopyMessageLink(message.id)}
                          onCopyId={() => handleCopyId(message.id)}
                          onCopyText={() => copyToClipboard(message.content, 'Message copié')}
                          onForward={() => openForwardMessage({
                            content: message.content,
                            attachments: (message.attachments ?? []) as never,
                            edited: !!message.edited_at,
                            from: { kind: 'thread', messageId: message.id, createdAt: message.created_at, threadId, threadName: thread?.name ?? null, channelId: channelId ?? null, channelName: channelName ?? null, serverId: serverId ?? null },
                      })}
                          onEdit={isOwnMessage ? () => handleStartEdit(message) : undefined}
                          onDelete={isOwnMessage ? () => handleDeleteMessage(message.id) : undefined}
                          onDropdownOpenChange={(open) => {
                            setOpenDropdownMessageId(open ? message.id : null);
                            if (!open) setHoveredMessageId(null);
                          }}
                        />
                        {showAuthor ? (
                          <button type="button" onClick={() => openProfile(message.author)} className="shrink-0 !min-h-0 h-auto p-0 self-start">
                            <Avatar className="w-10 h-10 mt-0.5 hover:opacity-80 transition-opacity">
                              <AvatarImage src={authorOf(message.author).avatar} />
                              <AvatarFallback className="text-sm">
                                {authorOf(message.author).displayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                        ) : (
                          <div className="w-10 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          {showAuthor && (
                            <div className="flex items-center gap-1 mb-0.5">
                              <button
                                translate="no"
                                type="button"
                                onClick={() => openProfile(message.author)}
                                className="font-semibold text-base leading-[1.375rem] hover:underline cursor-pointer truncate max-w-[200px] shrink-0 !min-h-0 h-auto p-0"
                                style={{ color: (message.author?.id ? memberRoles.get(message.author.id)?.[0]?.color : undefined) || undefined }}
                              >
                                {authorOf(message.author).displayName}
                              </button>
                              <ServerTagBadge userId={message.author?.id} />
                              {forumPost && message.author_id === thread?.created_by && (
                                <span className="self-center h-4 px-1 rounded bg-primary text-[10px] font-bold leading-4 text-white" title="Auteur du post">OP</span>
                              )}
                              <span className="ml-1 text-xs text-muted-foreground">
                                {formatTime(message.created_at)}
                              </span>
                            </div>
                          )}
                          <ForwardedFrame from={forwardedMap.get(message.id)}>
                          {editingMessageId === message.id ? (
                            <div className="space-y-2">
                              <MarkdownTextarea
                                ref={(el) => {
                                  if (el) {
                                    el.style.height = 'auto';
                                    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
                                  }
                                }}
                                value={editingContent}
                                onChange={(v) => {
                                  setEditingContent(v);
                                }}
                                onInput={(e) => {
                                  const el = e.currentTarget;
                                  el.style.height = 'auto';
                                  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                                    e.preventDefault();
                                    handleSaveEdit();
                                  }
                                  if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                className="min-h-[36px] max-h-[200px] resize-none text-sm"
                                autoFocus
                              />
                              <AttachmentEditsPanel edits={attachmentEdits} />
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Échap pour annuler</span>
                                <span>•</span>
                                <span>Entrée pour sauvegarder • Maj+Entrée nouvelle ligne</span>
                                <span className={cn('ml-auto font-mono', getCharacterCountColor())}>
                                  {editingContent.length}/2000
                                </span>
                              </div>
                            </div>
                          ) : (
                           <div className="flex flex-wrap items-baseline gap-x-1 text-base leading-[1.375rem] text-foreground break-words">{message.content && (thread?.spoiler ? <SpoilerGate><MarkdownText variant="chat" content={message.content} /></SpoilerGate> : <MarkdownText variant="chat" content={message.content} />)}{message.edited_at && !forwardedMap.get(message.id) && <span className="text-[11px] text-muted-foreground/60 select-none">(modifié)</span>}</div>
                          )}
                          {(message.attachments?.length ?? 0) > 0 && !getGifOnlyUrl(message) && editingMessageId !== message.id && (
                            <div className="mt-1">
                              <EditableAttachments attachments={message.attachments as never} authorId={message.author_id} messageId={message.id} scope={{ kind: 'thread', scopeId: threadId }} editable={isOwnMessage} hasText={!!message.content?.trim()} />
                            </div>
                          )}
                          </ForwardedFrame>
                          {(reactionsData[message.id]?.length ?? 0) > 0 && (
                            <div className="mt-1">
                              <ReactionBar
                                reactions={reactionsData[message.id] || []}
                                onToggle={(emoji) => handleAddReaction(message.id, emoji)}
                                serverId={serverId || null}
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      </SwipeToReplyRow>
                      </div>
                    </UniversalMessageContextMenu>
                    {postBar}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          ))}
          
          {timelineItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <StreamlineThreads className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-foreground mb-1">
                Début du thread
              </h3>
              <p className="text-muted-foreground text-sm">
                Soyez le premier à envoyer un message !
              </p>
            </div>
          )}
          <div ref={messagesEndRef} className="msg-end" />
          </div>
        </div>
      </div>

      {/* Typing Indicator */}
      <TypingIndicator threadId={threadId} />

      {/* Reply indicator */}
      {replyingTo && (
        <ReplyBanner
          authorName={replyingTo.author?.display_name || 'Inconnu'}
          authorId={replyingTo.author?.id}
          onJump={() => { const el = document.querySelector<HTMLElement>(`[data-msg-id="${replyingTo.id}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.classList.add('highlight-flash'); setTimeout(() => el?.classList.remove('highlight-flash'), 2000); }}
          authorAvatar={replyingTo.author?.avatar_url}
          content={replyingTo.content}
          onClear={() => setReplyingTo(null)}
        />
      )}

      {/* Input */}
      <div>
      <MessageInput
        value={messageContent}
        onChange={setMessageContent}
        onSend={handleSend}
        onSendExternalAttachment={handleSendExternalAttachment}
        placeholder={
          forumPost
              ? `Envoyer un message dans « ${thread?.name ?? ''} »`
              : `Envoyer un message dans "${thread?.name || 'le fil'}"`
        }
        disabled={sendMessage.isPending || isThreadLocked || isThreadClosed}
        isSending={sendMessage.isPending}
        onTypingStart={startTyping}
        onTypingStop={stopTyping}
        serverId={serverId}
        channelId={channelId || thread?.channel_id}
        threadId={threadId}
        members={mentionMembers}
        roles={mentionRoles}
        channels={allChannels}
        permissionDeniedMessage={permissionDeniedMessage}
        canAttachFiles={canAttachFiles}
        canCreatePolls={canCreatePolls}
        canMentionEveryone={canMentionEveryone}
        attachments={pending.attachments}
        onAddFiles={pending.addFiles}
        onRemoveAttachment={pending.removeAttachment}
        onUpdateAttachment={pending.updateAttachment}
        onToggleSpoiler={pending.toggleSpoiler}
      />
      </div>
      {/* Edit Poll Modal */}
      <CreatePollModal
        channelId={channelId || thread?.channel_id || ''}
        serverId={serverId || null}
        threadId={threadId}
        open={!!editingPoll}
        onOpenChange={(open) => !open && setEditingPoll(null)}
        editPoll={editingPoll}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={!!reportingMessage}
        onClose={() => setReportingMessage(null)}
        message={reportingMessage}
        onSubmit={(reason, details) => {
          console.log('Report submitted:', { reason, details, messageId: reportingMessage?.id });
          setReportingMessage(null);
        }}
      />
    </div>
  );
};

export default ThreadView;
