import { useState, useRef, useEffect, useMemo, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { uuidToSnowflake } from '@/lib/snowflake';
import { messageMentionsMe } from '@/lib/mention-detection';
import { AnimatePresence } from 'framer-motion';
import { useDMMessages, useSendDMMessage, useEditDMMessage, useDeleteDMMessage, DMMessage } from '@/hooks/useDMMessages';
import { useDMConversations } from '@/hooks/useDMs';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useDMCalls } from '@/hooks/useDMCalls';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { useImageGuardProps } from '@/hooks/useDownloadPermissions';

function GuardedAvatarImg({ src, ownerId }: { src?: string; ownerId?: string | null }) {
  const g = useImageGuardProps(ownerId ?? null);
  return <AvatarImage src={src} draggable={g.draggable as any} onContextMenu={g.onContextMenu} />;
}
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownTextarea } from '@/components/chat/MarkdownTextarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from '@/lib/dateUtils';
import { fr } from '@/lib/dateUtils';
import { Loader2, UserCircle } from 'lucide-react';
import { ArrowLeft, Phone, Video, Check, X, AtSign } from '@/components/icons/discord/lucide';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { TypingIndicator } from '@/components/typing/TypingIndicator';
import { MessageInput } from '@/components/chat/MessageInput';
import { UniversalMessageActions } from '@/components/chat/UniversalMessageActions';
import { UniversalMessageContextMenu } from '@/components/chat/UniversalMessageContextMenu';
import { ReportModal } from '@/components/chat/ReportModal';
import { useShiftKey } from '@/hooks/useShiftKey';
import { copyToClipboard } from '@/lib/clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/types/app';
import { MarkdownText, setMarkdownContext, getMarkdownContext } from '@/lib/markdown';
import { SmartLinkEmbeds as LinkEmbeds } from '@/components/chat/embeds';
import { usePendingAttachments, PendingAttachment } from '@/hooks/usePendingAttachments';
import { UploadDropOverlay } from '@/components/chat/upload/UploadDropOverlay';
import { MessageAttachments, StoredAttachment } from '@/components/chat/MessageAttachments';
import { PollClosedRow } from '@/components/chat/PollClosedSystemMessage';
import { ForwardedFrame } from '@/components/chat/ForwardedFrame';
import { OPEN_SERVER_EVENT } from '@/lib/invites';
import { toast } from 'sonner';
import { EditableAttachments } from '@/components/chat/EditableAttachments';
import { AttachmentEditsPanel, useAttachmentEdits } from '@/components/chat/upload/AttachmentEditsPanel';
import { useForwardedFrom } from '@/hooks/useForwardedFrom';
import { useMarkMessageUnread } from '@/hooks/useMarkMessageUnread';
import { openForwardMessage } from '@/lib/forwardMessage';
import { UserProfilePopup } from '@/components/profile/UserProfilePopup';
import { DMUserInfoPanel } from './DMUserInfoPanel';
import { DMCallStage } from './DMCallStage';
import { DMCallRow } from './DMCallRow';
import { withReplyMention } from '@/lib/replyMention';
import { joinCallSession, useDMCallSession } from '@/lib/dmCallSession';
import type { DMCall } from '@/hooks/useDMCalls';
import { useRelations } from '@/hooks/useRelations';
import { useBlockedIds, useUnblockUser } from '@/hooks/useFriends';
import { HiddenMessagesRow } from './DMChrome';
import { DMHeader, DMIntro } from './DMChrome';
import { useEphemeralMessages } from '@/lib/ephemeralMessages';
import { EphemeralMessageRow } from '@/components/chat/slash/EphemeralMessageRow';
import { ClydeProfileCard } from '@/components/chat/slash/ClydeProfileCard';
import { formatClock } from '@/lib/userSettings';
import { ServerTagBadge } from '@/components/server-tags/ServerTagBadge';
import { FullUserProfileModal } from '@/components/profile/FullUserProfileModal';
import { DMPinnedMessagesPopover } from './DMPinnedMessagesPopover';
import { usePinDMMessage, useUnpinDMMessage, useDMPinnedMessages } from '@/hooks/useDMPinnedMessages';
import { useDMMessageReactions, useToggleDMReaction } from '@/hooks/useDMReactions';
import { ReactionBar } from '@/components/chat/ReactionBar';
import { RepliedLine } from '@/components/chat/RepliedLine';
import { ReplyBanner } from '@/components/chat/ReplyBanner';
import { Reply, X as XIcon } from 'lucide-react';
import { SwipeToReplyRow } from '@/components/mobile/SwipeToReplyRow';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useScreenCaptureDetection } from '@/hooks/useScreenCaptureDetection';
import { Camera, Video as VideoIcon, VideoOff } from 'lucide-react';
import { useDMPolls, useDeleteDMPoll, DMPoll } from '@/hooks/useDMPolls';
import { DMPollDisplay } from '@/components/chat/DMPollDisplay';
import { BarChart2 } from 'lucide-react';
import { computePollWinner } from '@/lib/pollWinner';

import { appLocale } from '@/i18n/locale';
const statusColors: Record<string, string> = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

function formatDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return "Aujourd'hui";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Hier";
  }
  return date.toLocaleDateString(appLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export interface DMConversationProps {
  conversationId: string;
  onBack?: () => void;
}

export function DMConversation({ conversationId, onBack }: DMConversationProps) {
  const { isMobile, isTablet } = useBreakpoint();
  const swipeBack = useSwipeBack({ onBack: () => onBack?.(), fullScreen: isMobile });
  const [messageInput, setMessageInput] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [openDropdownMessageId, setOpenDropdownMessageId] = useState<string | null>(null);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<DMMessage | null>(null);
  const [showUserInfoPanel, setShowUserInfoPanel] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1100);
  const ephemeral = useEphemeralMessages(conversationId);
  const [clydeCard, setClydeCard] = useState<DOMRect | null>(null);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<'about' | 'servers' | 'friends'>('about');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  const { user, profile } = useAuth();
  const attachmentEdits = useAttachmentEdits();
  const isShiftPressed = useShiftKey();
  const { startTyping, stopTyping } = useTypingIndicator(null, conversationId);
  const { markAsRead } = useUnreadCounts();
  
  const {
    attachments,
    isDragging,
    addFiles,
    removeAttachment,
    updateAttachment,
    toggleSpoiler,
    clearAttachments,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  } = usePendingAttachments();

  const { data: conversations = [] } = useDMConversations();
  const { data: allMessages = [], isLoading, loadOlder, hasMoreOlder, isLoadingOlder } = useDMMessages(conversationId);
  const { nameFor, isIgnored } = useRelations();
  // Comptes ignores ou bloques : leurs messages sont replies sous "N messages bloques - Afficher".
  const blockedIds = useBlockedIds();
  const [showHidden, setShowHidden] = useState(false);
  const messages = useMemo(() => (showHidden ? allMessages : allMessages.filter((m) => !(m.author?.id && (blockedIds.has(m.author.id) || isIgnored(m.author.id))))), [allMessages, isIgnored, blockedIds, showHidden]);
  const hiddenCount = showHidden ? 0 : allMessages.length - messages.length;
  const unblock = useUnblockUser();
  // Instantane de la lecture a l'ouverture : le premier message non lu recoit le separateur rouge "Nouveau".
  const { data: readSnapshot } = useQuery({
    queryKey: ['dm-read-snapshot', conversationId, user?.id],
    enabled: !!user?.id,
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async () => {
      const { data } = await supabase.from('dm_read_states').select('last_read_at').eq('conversation_id', conversationId).eq('user_id', user!.id).maybeSingle();
      return data?.last_read_at ?? null;
    },
  });
  const firstUnreadId = useMemo(() => (readSnapshot ? messages.find((m) => m.author?.id !== user?.id && !!m.created_at && m.created_at > readSnapshot)?.id ?? null : null), [messages, readSnapshot, user?.id]);
  const forwardedMap = useForwardedFrom('dm', conversationId, messages.map((m) => m.id));
  const markMessageUnread = useMarkMessageUnread();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const loadingOlderRef = useRef(false);
  const sendMessage = useSendDMMessage();
  const editMessage = useEditDMMessage();
  const deleteMessage = useDeleteDMMessage();
  const { activeCall, history: callHistory, startCall, endCall, acceptCall } = useDMCalls(conversationId);
  const callSession = useDMCallSession();
  const inCall = !!activeCall && callSession.joined?.callId === activeCall.id;
  const sortedCalls = useMemo(() => [...callHistory].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), [callHistory]);
  const pinMessage = usePinDMMessage();
  const unpinMessage = useUnpinDMMessage();
  const { data: pinnedMessages = [] } = useDMPinnedMessages(conversationId);

  // Reactions
  const messageIds = useMemo(() => messages.map((m: any) => m.id), [messages]);
  const { data: reactionsData = {} } = useDMMessageReactions(messageIds);
  const toggleReaction = useToggleDMReaction();

  // DM Polls
  const { data: polls = [] } = useDMPolls(conversationId);
  const deletePoll = useDeleteDMPoll();
  const sortedPolls = useMemo(
    () => [...polls].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [polls],
  );

  const renderCall = (c: DMCall) => (
    <DMCallRow
      key={`call-${c.id}`}
      call={c}
      meId={user?.id}
      initiatorName={nameFor(c.initiator?.id ?? c.initiator_id, c.initiator?.display_name ?? c.initiator?.username ?? 'Quelqu\'un')}
      joined={callSession.joined?.callId === c.id}
      onJoin={() => void joinActiveCall()}
    />
  );

  const renderPoll = (poll: DMPoll) => {
    const isOwn = poll.author_id === user?.id;
    return (
      <div
        key={`poll-${poll.id}`}
        className="group message-hover -mx-4 px-8 py-2"
        ref={(el) => { if (el) messageRefs.current.set(poll.id, el); }}
      >
        <div className="flex items-start gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarImage src={poll.author?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {poll.author?.display_name?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{poll.author?.display_name || 'Utilisateur'}</span>
              <span className="text-[.625rem] text-muted-foreground/60">
                {format(new Date(poll.created_at), 'HH:mm', { locale: fr })}
              </span>
              <div className="flex items-center gap-1 text-primary text-[10px] font-medium bg-primary/10 px-1.5 py-0.5 rounded">
                <BarChart2 className="w-3 h-3" />
                SONDAGE
              </div>
              {isOwn && (
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-destructive hover:text-destructive"
                    onClick={() => deletePoll.mutate({ pollId: poll.id, conversationId })}
                  >
                    Supprimer
                  </Button>
                </div>
              )}
            </div>
            <DMPollDisplay poll={poll} conversationId={conversationId} />
          </div>
        </div>
      </div>
    );
  };

  const conversation = conversations.find((c) => c.id === conversationId);
  const participantFromList = conversation?.participants[0] ?? null;

  const { data: directParticipant } = useQuery({
    queryKey: ['dm-participant', conversationId, user?.id],
    enabled: !!user && !participantFromList,
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('dm_participants')
        .select(
          `
          user:profiles!dm_participants_user_id_fkey (
            id, username, display_name, avatar_url, status, bio, banner_url
          )
        `
        )
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data?.user as any) ?? null;
    },
  });

  const participant = participantFromList ?? directParticipant ?? null;
  // Mark conversation as read when opened OR when new messages arrive while focused.
  // Mirrors ChatArea.tsx: skip if tab hidden, 400ms debounce.
  useEffect(() => {
    if (!user || !conversationId) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const t = setTimeout(() => {
      markAsRead.mutate(conversationId);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user, messages.length]);

  // Native: detect screenshots / screen recordings and post a system message.
  useScreenCaptureDetection(conversationId);

  // Clear server-scoped fields from the markdown context: DMs have no roles,
  // so RoleMention must not inherit a stale serverId from another surface.
  useEffect(() => {
    const prev = getMarkdownContext();
    setMarkdownContext({
      ...prev,
      serverId: undefined,
      roles: undefined,
    });
    return () => {
      setMarkdownContext(prev);
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Infinite scroll: load older DMs when user scrolls near top, preserving position
  useEffect(() => {
    const vp = scrollAreaRef.current?.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]');
    if (!vp) return;
    const onScroll = () => {
      if (
        hasMoreOlder &&
        !loadingOlderRef.current &&
        !isLoadingOlder &&
        vp.scrollTop < 200 &&
        messages.length > 0
      ) {
        loadingOlderRef.current = true;
        const prevHeight = vp.scrollHeight;
        const prevTop = vp.scrollTop;
        void loadOlder().then((added) => {
          requestAnimationFrame(() => {
            if (added && added > 0) {
              const delta = vp.scrollHeight - prevHeight;
              vp.scrollTop = prevTop + delta;
            }
            loadingOlderRef.current = false;
          });
        });
      }
    };
    vp.addEventListener('scroll', onScroll, { passive: true });
    return () => vp.removeEventListener('scroll', onScroll);
  }, [hasMoreOlder, isLoadingOlder, loadOlder, messages.length, conversationId]);

  const beginCall = (callType: 'voice' | 'video') =>
    startCall.mutate(
      { callType },
      { onSuccess: (c) => joinCallSession(c.id, conversationId, participant ? nameFor(participant.id, participant.display_name) : '') },
    );
  const handleVoiceCall = () => {
    if (activeCall && !inCall) void joinActiveCall();
    else if (!activeCall) beginCall('voice');
  };

  const handleVideoCall = () => beginCall('video');

  /** Rejoindre un appel en cours : le statut devient actif des que le second participant arrive. */
  const joinActiveCall = async () => {
    if (!activeCall) return;
    if (activeCall.status === 'ringing' && activeCall.initiator_id !== user?.id) await acceptCall.mutateAsync(activeCall.id);
    joinCallSession(activeCall.id, conversationId, participant ? nameFor(participant.id, participant.display_name) : '');
  };

  const handleEndCall = () => {
    if (activeCall) {
      endCall.mutate(activeCall.id);
    }
  };

  const handleCopyMessage = (content: string) => {
    copyToClipboard(content, 'Message copié');
  };

  const handleCopyId = (id: string) => {
    copyToClipboard(uuidToSnowflake(id), 'ID copié');
  };

  const handleCopyLink = (messageId: string) => {
    const link = `${window.location.origin}/dm/${conversationId}/${messageId}`;
    copyToClipboard(link, 'Lien copié');
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    const currentReactions = reactionsData?.[messageId] || [];
    toggleReaction.mutate({ messageId, emoji, currentReactions });
  };

  const handleReply = (message: DMMessage) => {
    setReplyingTo(message);
  };

  const handleJumpToMessage = (id: string) => {
    const el = messageRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('message-mentioned');
    setTimeout(() => el.classList.remove('message-mentioned'), 1500);
  };

  const handleStartEdit = (message: DMMessage) => {
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
        conversationId,
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
    deleteMessage.mutate({ messageId, conversationId });
  };

  const handlePinMessage = (messageId: string) => {
    pinMessage.mutate({ messageId, conversationId });
  };

  const handleUnpinMessage = (messageId: string) => {
    unpinMessage.mutate({ messageId, conversationId });
  };

  const isMessagePinned = (messageId: string) => {
    return pinnedMessages.some(p => p.message_id === messageId);
  };

  const handleOpenNotes = () => {
    setProfileInitialTab('about');
    setShowFullProfile(true);
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

  const displayName = conversation?.is_group
    ? conversation.name || 'Groupe'
    : participant ? nameFor(participant.id, participant.display_name) : 'Utilisateur';

  const peerBlocked = !!participant?.id && !conversation?.is_group && blockedIds.has(participant.id);
  const introPerson = participant ? { id: participant.id, display_name: participant.display_name, username: participant.username, avatar_url: participant.avatar_url, status: participant.status || 'offline' } : null;

  return (
    <div 
      className="flex-1 flex flex-col bg-background relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onTouchStart={isMobile && onBack ? swipeBack.onTouchStart : undefined}
      onTouchMove={isMobile && onBack ? swipeBack.onTouchMove : undefined}
      onTouchEnd={isMobile && onBack ? swipeBack.onTouchEnd : undefined}
    >
      <AnimatePresence>
        {isDragging && <UploadDropOverlay channelName={displayName} />}
      </AnimatePresence>
      {/* Header */}
      <div className={cn(activeCall && 'bg-black')}>
      <DMHeader
        dark={!!activeCall}
        callState={activeCall ? (inCall ? 'in' : 'other') : null}
        person={participant ? { id: participant.id, display_name: participant.display_name, username: participant.username, avatar_url: participant.avatar_url, status: participant.status || 'offline', custom_status: (participant as { custom_status?: string | null }).custom_status ?? null } : null}
        title={displayName}
        isGroup={!!conversation?.is_group}
        conversationId={conversationId}
        panelOpen={showUserInfoPanel}
        onTogglePanel={() => setShowUserInfoPanel(!showUserInfoPanel)}
        onVoice={handleVoiceCall}
        onVideo={handleVideoCall}
        callDisabled={startCall.isPending}
        onBack={isMobile ? onBack : undefined}
        onOpenDM={(id) => window.dispatchEvent(new CustomEvent(OPEN_SERVER_EVENT, { detail: { serverId: null, conversationId: id } }))}
        onSearch={(q) => {
          const hit = [...messages].reverse().find((m) => m.content?.toLowerCase().includes(q.toLowerCase()));
          if (!hit) return toast.info('Aucun résultat dans les messages chargés');
          messageRefs.current.get(hit.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />
      {activeCall && (activeCall.status === 'ringing' || activeCall.status === 'active') && (
        <DMCallStage
          call={activeCall}
          conversationId={conversationId}
          peer={participant ? { id: participant.id, display_name: nameFor(participant.id, participant.display_name), username: participant.username, avatar_url: participant.avatar_url } : null}
          peerName={participant ? nameFor(participant.id, participant.display_name) : ''}
          onJoin={async () => { await joinActiveCall(); }}
          onEnd={handleEndCall}
        />
      )}
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left column: Messages + Input */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 mb-6">
            <div className="flex flex-col justify-end min-h-full px-4 pt-4 pb-0 space-y-px">
              {isLoadingOlder && (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <>
                  <DMIntro person={introPerson} title={displayName} isGroup={!!conversation?.is_group} />
                  {hiddenCount > 0 && <HiddenMessagesRow count={hiddenCount} blocked={peerBlocked} onShow={() => setShowHidden(true)} />}
                  {sortedCalls.map((c) => renderCall(c))}
                  <div ref={messagesEndRef} className="msg-end" />
                </>
              ) : (
                <>
                  {(!hasMoreOlder || messages.length < 50) && <DMIntro person={introPerson} title={displayName} isGroup={!!conversation?.is_group} />}
                  {hiddenCount > 0 && <HiddenMessagesRow count={hiddenCount} blocked={peerBlocked} onShow={() => setShowHidden(true)} />}
                  {(() => {
                    let pollCursor = 0;
                    let callCursor = 0;
                    const flushPollsBefore = (ts: number) => {
                      const out: JSX.Element[] = [];
                      while (callCursor < sortedCalls.length && new Date(sortedCalls[callCursor].created_at).getTime() <= ts) {
                        out.push(renderCall(sortedCalls[callCursor]));
                        callCursor++;
                      }
                      while (pollCursor < sortedPolls.length && new Date(sortedPolls[pollCursor].created_at).getTime() <= ts) {
                        out.push(renderPoll(sortedPolls[pollCursor]));
                        pollCursor++;
                      }
                      return out;
                    };
                    const messageNodes = messages.map((message, idx) => {
                    const currentDate = message.created_at ? new Date(message.created_at) : new Date();
                    const prevMessage = idx > 0 ? messages[idx - 1] : null;
                    const prevDate = prevMessage?.created_at ? new Date(prevMessage.created_at) : null;
                    const showDateSeparator = !prevDate || currentDate.toDateString() !== prevDate.toDateString();
                    
                    const hasReply = Boolean(message.reply_to_id || message.repliedMessage);
                    const showAuthor = idx === 0 || messages[idx - 1]?.author?.id !== message.author?.id || hasReply;
                    const isOwnMessage = user?.id === message.author?.id;
                    const timestamp = message.created_at
                      ? format(new Date(message.created_at), 'HH:mm', { locale: fr })
                      : '';

                    const msgTs = currentDate.getTime();
                    const pollsBefore = flushPollsBefore(msgTs);
                    return (<Fragment key={message.id}>
                      {pollsBefore}
                      <div
                        key={message.id}
                        ref={(el) => {
                          if (el) messageRefs.current.set(message.id, el);
                          else messageRefs.current.delete(message.id);
                        }}
                      >
                        {/* Date Separator */}
                        {(showDateSeparator || message.id === firstUnreadId) && (
                          message.id === firstUnreadId ? (
                            <div className="relative my-4 mx-4 flex items-center gap-2"><div className="h-px flex-1 bg-[#da373c]" />{showDateSeparator && <span className="px-1 text-xs font-semibold text-[#da373c]">{formatDate(currentDate)}</span>}<div className="h-px flex-1 bg-[#da373c]" /><span className="absolute -right-0 -top-[1px] -translate-y-1/2 rounded-[3px] bg-[#da373c] px-1 text-[10px] font-bold uppercase leading-[13px] text-white">Nouveau</span></div>
                          ) : (
                            <div className="flex items-center gap-2 my-4 mx-4"><div className="flex-1 h-px bg-white/[0.06]" /><span className="text-xs font-semibold text-[#949ba4] px-1">{formatDate(currentDate)}</span><div className="flex-1 h-px bg-white/[0.06]" /></div>
                          )
                        )}
                        {message.system_type === 'poll_closed' && (() => {
                          const closedPoll = polls.find((p) => p.id === message.system_poll_id);
                          const winnerResult = closedPoll
                            ? computePollWinner({ options: closedPoll.options, votes: closedPoll.votes })
                            : null;
                          const winnerLabel = winnerResult?.label ?? null;
                          const hasWinner = winnerResult?.hasWinner ?? false;
                          const winnerPercentage = winnerResult?.winnerPercentage ?? null;
                          return (
                            <UniversalMessageContextMenu
                              messageId={message.id}
                              isOwnMessage={isOwnMessage}
                              canAddReactions={false}
                              variant="system"
                              copyLinkLabel="Copier le lien du message"
                              copyIdLabel="Copier l'identifiant du message"
                              onAddReaction={() => {}}
                              onCopyLink={() => handleCopyLink(message.id)}
                              onCopyId={() => handleCopyId(message.id)}
                              onDelete={() => handleDeleteMessage(message.id)}
                            >
                              <PollClosedRow
                                question={closedPoll?.question ?? 'inconnu'}
                                authorName={closedPoll?.author?.display_name ?? "quelqu'un"}
                                timeLabel={timestamp}
                                mentionsMe={!!closedPoll && closedPoll.author_id === user?.id}
                                result={closedPoll ? (hasWinner ? { kind: 'winner', text: String(winnerLabel), pct: winnerPercentage ?? 0 } : { kind: 'none' }) : null}
                                onOpen={closedPoll ? () => handleJumpToMessage(closedPoll.id) : undefined}
                              />
                            </UniversalMessageContextMenu>
                          );
                        })()}
                        {message.system_type && message.system_type !== 'poll_closed' && (() => {
                          const who = nameFor(message.author?.id, message.author?.display_name || message.author?.username || 'Quelqu\'un');
                          const Icon =
                            message.system_type === 'screenshot'
                              ? Camera
                              : message.system_type === 'screen_recording_start'
                              ? VideoIcon
                              : VideoOff;
                          const label =
                            message.system_type === 'screenshot'
                              ? `${who} a pris une capture d'écran.`
                              : message.system_type === 'screen_recording_start'
                              ? `${who} a démarré un enregistrement d'écran.`
                              : `${who} a arrêté l'enregistrement d'écran.`;
                          return (
                            <UniversalMessageContextMenu
                              messageId={message.id}
                              isOwnMessage={isOwnMessage}
                              canAddReactions={false}
                              variant="system"
                              copyLinkLabel="Copier le lien du message"
                              copyIdLabel="Copier l'identifiant du message"
                              onAddReaction={() => {}}
                              onCopyLink={() => handleCopyLink(message.id)}
                              onCopyId={() => handleCopyId(message.id)}
                              onDelete={() => handleDeleteMessage(message.id)}
                            >
                              <div className="message-hover -mx-4 px-4 flex items-center justify-center gap-2 py-1.5 text-xs italic text-muted-foreground">
                                <Icon className="w-3.5 h-3.5" />
                                <span>{label}</span>
                              </div>
                            </UniversalMessageContextMenu>
                          );
                        })()}
                        {!message.system_type && (<>
                        {/* --- Regular message rendering below --- */}
                        {/* Replied line (Discord-like, faithful resolution) */}
                        {message.repliedMessage && (
                          <div className={cn("pt-1.5", showAuthor ? "" : "pt-2.5") }>
                            <RepliedLine
                              repliedMessage={{
                                id: message.repliedMessage.id,
                                content: message.repliedMessage.content,
                                deleted: message.repliedMessage.deleted,
                                attachments: (message.repliedMessage.attachments || []).map((a) => ({
                                  id: a.id,
                                  url: a.url,
                                  name: a.name,
                                  type: a.type,
                                })),
                                author: message.repliedMessage.author
                                  ? {
                                      id: message.repliedMessage.author.id,
                                      username: message.repliedMessage.author.username,
                                      displayName: message.repliedMessage.author.display_name,
                                      avatar: message.repliedMessage.author.avatar_url || undefined,
                                    }
                                  : null,
                              }}
                              onJump={handleJumpToMessage}
                              indent={56}
                              avatarCenter={23}
                              className="mb-1"
                            />
                          </div>
                        )}
                        <UniversalMessageContextMenu
                        key={message.id}
                        isOwnMessage={isOwnMessage}
                        isPinned={isMessagePinned(message.id)}
                        messageId={message.id}
                        reminder={{
                          source: 'dm',
                          messageId: message.id,
                          conversationId,
                          snapshot: {
                            authorId: message.author?.id,
                            authorName: message.author?.display_name || message.author?.username || 'Utilisateur',
                            authorAvatar: message.author?.avatar_url ?? null,
                            content: message.content,
                            createdAt: new Date(message.created_at ?? Date.now()).toISOString(),
                            channelName: displayName,
                            serverName: 'Messages privés',
                          },
                        }}
                        previewAuthorName={message.author?.display_name || message.author?.username}
                        previewAuthorAvatar={message.author?.avatar_url || undefined}
                        previewContent={message.content}
                        onReply={() => handleReply(message)}
                        onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                        onCopyText={() => handleCopyMessage(message.content)}
                        onCopyLink={() => handleCopyLink(message.id)}
                        onCopyId={() => handleCopyId(message.id)}
                        onForward={() => openForwardMessage({
                          content: message.content,
                          attachments: (message.attachments ?? []) as StoredAttachment[],
                          edited: !!message.edited_at,
                          from: { kind: 'dm', messageId: message.id, createdAt: message.created_at, conversationId },
                        })}
                        onMarkUnread={() => markMessageUnread({ kind: 'dm', conversationId, createdAt: message.created_at })}
                        onEdit={isOwnMessage ? () => handleStartEdit(message) : undefined}
                        onDelete={isOwnMessage ? () => handleDeleteMessage(message.id) : undefined}
                        onPin={() => isMessagePinned(message.id) 
                          ? handleUnpinMessage(message.id) 
                          : handlePinMessage(message.id)
                        }
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
                          timestamp: new Date(message.created_at || Date.now()),
                          edited_at: message.edited_at || null,
                        }) : undefined}
                      >
                        <SwipeToReplyRow
                          enabled={isMobile || isTablet}
                          onReply={() => handleReply(message)}
                          onDoubleTap={() => handleAddReaction(message.id, '❤️')}
                        >
                        <div 
                          className={cn(
                            'flex gap-4 group message-hover -mx-4 pl-4 pr-4 relative',
                            replyingTo?.id === message.id && 'reply-target',
                            showAuthor ? 'pt-1 pb-1' : 'pb-1',
                            !showAuthor && 'pl-[72px]',
                            messageMentionsMe(message.content, user?.id, []) && 'message-mentioned',
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
                            onReply={() => handleReply(message)}
                            onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                            onCopyLink={() => handleCopyLink(message.id)}
                            onCopyId={() => handleCopyId(message.id)}
                            onCopyText={() => handleCopyMessage(message.content)}
                            onForward={() => openForwardMessage({
                              content: message.content,
                              attachments: (message.attachments ?? []) as StoredAttachment[],
                              edited: !!message.edited_at,
                              from: { kind: 'dm', messageId: message.id, createdAt: message.created_at, conversationId },
                            })}
                            onMarkUnread={() => markMessageUnread({ kind: 'dm', conversationId, createdAt: message.created_at })}
                            onEdit={isOwnMessage ? () => handleStartEdit(message) : undefined}
                            onDelete={isOwnMessage ? () => handleDeleteMessage(message.id) : undefined}
                            onDropdownOpenChange={(open) => {
                              setOpenDropdownMessageId(open ? message.id : null);
                              if (!open) setHoveredMessageId(null);
                            }}
                          />
                          {showAuthor && (
                            <Avatar className="w-10 h-10 flex-shrink-0">
                              <GuardedAvatarImg src={message.author?.avatar_url || undefined} ownerId={message.author?.id} />
                              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                                {message.author?.display_name?.charAt(0).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <div className="flex-1 min-w-0">
                            {showAuthor && (
                              <div className="flex items-center gap-2">
                                <button type="button"
                                  className="font-semibold text-base leading-[1.375rem] hover:underline text-left"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProfileUser({
                                      id: message.author?.id,
                                      displayName: message.author?.display_name,
                                      username: message.author?.username,
                                      avatar: message.author?.avatar_url,
                                      status: 'offline',
                                    });
                                  }}
                                >
                                  {nameFor(message.author?.id, message.author?.display_name || 'Utilisateur')}
                                </button>
                                <ServerTagBadge userId={message.author?.id} variant="compact" />
                                <span className="text-xs text-muted-foreground">
                                  {timestamp}
                                </span>
                              </div>
                            )}

                            <ForwardedFrame from={forwardedMap.get(message.id)}>
                            {editingMessageId === message.id ? (
                              <div className="mt-1 space-y-2">
                                <MarkdownTextarea
                                  value={editingContent}
                                  onChange={(v) => setEditingContent(v)}
                                  className="min-h-[36px] resize-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                                      e.preventDefault();
                                      handleSaveEdit();
                                    }
                                    if (e.key === 'Escape') {
                                      handleCancelEdit();
                                    }
                                  }}
                                />
                                <AttachmentEditsPanel edits={attachmentEdits} />
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>Échap pour annuler</span>
                                  <span>•</span>
                                  <span>Entrée pour sauvegarder • Maj+Entrée nouvelle ligne</span>
                                  <span className={cn('ml-auto', getCharacterCountColor())}>
                                    {editingContent.length}/2000
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className={cn('flex flex-wrap items-baseline gap-x-1 text-base leading-[1.375rem] break-words font-ginto', message.isPending && 'opacity-50')}>
                                   <MarkdownText variant="chat" content={message.content} />
                                   {message.edited_at && !forwardedMap.get(message.id) && <span className="text-[11px] text-muted-foreground/60 select-none">(modifié)</span>}
                                   {message.isQueued && <span className="text-[11px] text-muted-foreground select-none">(en attente du réseau)</span>}
                                 </div>
                              </>
                            )}

                            {/* Message Attachments */}
                            {message.attachments && message.attachments.length > 0 && editingMessageId !== message.id && (
                              <EditableAttachments attachments={message.attachments as StoredAttachment[]} authorId={(message as any).author_id ?? (message as any).user_id ?? null} messageId={message.id} scope={{ kind: 'dm', scopeId: conversationId }} editable={isOwnMessage && !message.isPending} hasText={!!message.content?.trim()} />
                            )}

                            {/* Link Embeds */}
                            <LinkEmbeds content={message.content} />
                            </ForwardedFrame>

                            {/* Reactions */}
                            {(reactionsData[message.id]?.length ?? 0) > 0 && (
                              <div className="mt-1">
                                <ReactionBar
                                  reactions={reactionsData[message.id] || []}
                                  onToggle={(emoji) => handleAddReaction(message.id, emoji)}
                                  serverId={null}
                                  size="sm"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        </SwipeToReplyRow>
                      </UniversalMessageContextMenu>
                      </>)}
                      </div>
                    </Fragment>);
                  });
                  return (<>
                    {messageNodes}
                    {sortedCalls.slice(callCursor).map((c) => renderCall(c))}
                    {sortedPolls.slice(pollCursor).map((p) => renderPoll(p))}
                  </>);
                  })()}
                  {ephemeral.map((m) => <EphemeralMessageRow key={m.id} message={m} time={formatClock(m.createdAt)} onAuthorClick={(r) => setClydeCard(r)} />)}
                  <div ref={messagesEndRef} className="msg-end" />
                </>
              )}
            </div>
          </ScrollArea>

          {/* Typing Indicator */}
          <TypingIndicator conversationId={conversationId} />

          {/* Reply preview (above input) */}
          {replyingTo && (
            <ReplyBanner
              authorName={replyingTo.author?.display_name || 'Utilisateur'}
              authorId={replyingTo.author?.id}
              onJump={() => handleJumpToMessage(replyingTo.id)}
              authorAvatar={replyingTo.author?.avatar_url}
              content={replyingTo.content}
              attachmentsCount={replyingTo.attachments?.length ?? 0}
              onClear={() => setReplyingTo(null)}
            />
          )}

          {/* Input */}
          {peerBlocked && participant ? (
            <div className="mx-4 mb-6 flex h-[44px] items-center gap-3 rounded-lg bg-[hsl(var(--surface-card))] pl-4 pr-1.5">
              <p className="flex-1 truncate text-base font-semibold text-white">Tu ne peux pas envoyer de messages à un utilisateur que tu as bloqué.</p>
              <button type="button" onClick={() => unblock.mutate(participant.id)} className="h-8 shrink-0 rounded-[4px] bg-white/[0.08] px-4 text-sm font-medium text-white transition-colors hover:bg-white/[0.12]">Débloquer</button>
            </div>
          ) : (
          <div>
          <MessageInput
            value={messageInput}
            onChange={setMessageInput}
            onSend={() => {
              if (!messageInput.trim() && attachments.length === 0) return;
              sendMessage.mutate({
                conversationId,
                content: replyingTo ? withReplyMention(messageInput.trim(), replyingTo.author?.id, user?.id) : messageInput.trim(),
                attachments,
                replyToId: replyingTo?.id ?? null,
              });
              setMessageInput('');
              setReplyingTo(null);
              clearAttachments();
              stopTyping();
            }}
            onSendExternalAttachment={(attachment) => {
              sendMessage.mutate({
                conversationId,
                content: '',
                replyToId: replyingTo?.id ?? null,
                externalAttachment: attachment,
              });
              setReplyingTo(null);
              stopTyping();
            }}
            placeholder={
              `Envoyer un message à ${conversation?.is_group ? '' : '@'}${displayName}`
            }
            disabled={sendMessage.isPending}
            dmConversationId={conversationId}
            isSending={sendMessage.isPending}
            onTypingStart={startTyping}
            onTypingStop={stopTyping}
            attachments={attachments}
            onAddFiles={addFiles}
            onRemoveAttachment={removeAttachment}
            onUpdateAttachment={updateAttachment}
            onToggleSpoiler={toggleSpoiler}
            onClearAttachments={clearAttachments}
            slash={{
              sendText: (content) => sendMessage.mutate({ conversationId, content, replyToId: null }),
              sendExternal: (attachment) => sendMessage.mutate({ conversationId, content: '', replyToId: null, externalAttachment: attachment }),
            }}
          />
          </div>
          )}
        </div>

      {/* User Info Panel - Sheet on mobile, panel on desktop */}
        {showUserInfoPanel && participant && (
          <DMUserInfoPanel 
            participant={{
              id: participant.id,
              display_name: participant.display_name,
              username: participant.username,
              avatar_url: participant.avatar_url,
              banner_url: participant.banner_url,
              bio: participant.bio,
              status: participant.status || 'offline',
              created_at: participant.created_at,
            }}
            onViewFullProfile={(focus) => {
              setProfileInitialTab(focus ?? 'about');
              setShowFullProfile(true);
            }}
            onOpenNotes={handleOpenNotes}
            blocked={peerBlocked}
          />
        )}
      </div>


      {clydeCard && <ClydeProfileCard anchor={clydeCard} onClose={() => setClydeCard(null)} />}

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

      {/* User Profile Popup */}
      <UserProfilePopup
        user={selectedProfileUser}
        open={!!selectedProfileUser}
        onOpenChange={(open) => !open && setSelectedProfileUser(null)}
      />

      {/* Full User Profile Modal */}
      {participant && (
        <FullUserProfileModal
          user={{
            id: participant.id,
            display_name: participant.display_name,
            username: participant.username,
            avatar_url: participant.avatar_url,
            banner_url: participant.banner_url,
            bio: participant.bio,
            status: participant.status || 'offline',
            created_at: participant.created_at,
          }}
          open={showFullProfile}
          onOpenChange={setShowFullProfile}
          initialTab={profileInitialTab}
        />
      )}
    </div>
  );
}
