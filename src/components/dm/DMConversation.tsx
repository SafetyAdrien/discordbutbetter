import { useState, useRef, useEffect, useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, ArrowLeft, Phone, Video, Check, X, UserCircle, AtSign } from 'lucide-react';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { TypingIndicator } from '@/components/typing/TypingIndicator';
import { DMCallView } from './DMCallView';
import { MessageInput } from '@/components/chat/MessageInput';
import { UniversalMessageActions } from '@/components/chat/UniversalMessageActions';
import { UniversalMessageContextMenu } from '@/components/chat/UniversalMessageContextMenu';
import { ReportModal } from '@/components/chat/ReportModal';
import { useShiftKey } from '@/hooks/useShiftKey';
import { copyToClipboard } from '@/lib/clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Message } from '@/types/app';
import { MarkdownText } from '@/lib/markdown';
import { LinkEmbeds } from '@/components/chat/LinkEmbed';
import { usePendingAttachments, PendingAttachment } from '@/hooks/usePendingAttachments';
import { UploadDropOverlay } from '@/components/chat/upload/UploadDropOverlay';
import { MessageAttachments, StoredAttachment } from '@/components/chat/MessageAttachments';
import { UserProfilePopup } from '@/components/profile/UserProfilePopup';
import { DMUserInfoPanel } from './DMUserInfoPanel';
import { FullUserProfileModal } from '@/components/profile/FullUserProfileModal';
import { DMPinnedMessagesPopover } from './DMPinnedMessagesPopover';
import { usePinDMMessage, useUnpinDMMessage, useDMPinnedMessages } from '@/hooks/useDMPinnedMessages';
import { useDMMessageReactions, useToggleDMReaction } from '@/hooks/useDMReactions';
import { ReactionBar } from '@/components/chat/ReactionBar';
import { RepliedLine } from '@/components/chat/RepliedLine';
import { Reply, X as XIcon } from 'lucide-react';
import { SwipeToReplyRow } from '@/components/mobile/SwipeToReplyRow';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useBreakpoint } from '@/hooks/useBreakpoint';

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
  return date.toLocaleDateString("fr-FR", {
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
  const { isMobile } = useBreakpoint();
  const swipeBack = useSwipeBack({ onBack: () => onBack?.() });
  const [messageInput, setMessageInput] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [openDropdownMessageId, setOpenDropdownMessageId] = useState<string | null>(null);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<DMMessage | null>(null);
  const [showUserInfoPanel, setShowUserInfoPanel] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<'about' | 'servers' | 'friends'>('about');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  const { user, profile } = useAuth();
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
  const { data: messages = [], isLoading } = useDMMessages(conversationId);
  const sendMessage = useSendDMMessage();
  const editMessage = useEditDMMessage();
  const deleteMessage = useDeleteDMMessage();
  const { activeCall, startCall, endCall } = useDMCalls(conversationId);
  const pinMessage = usePinDMMessage();
  const unpinMessage = useUnpinDMMessage();
  const { data: pinnedMessages = [] } = useDMPinnedMessages(conversationId);

  // Reactions
  const messageIds = useMemo(() => messages.map((m: any) => m.id), [messages]);
  const { data: reactionsData = {} } = useDMMessageReactions(messageIds);
  const toggleReaction = useToggleDMReaction();

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
  // Mark conversation as read when opened
  useEffect(() => {
    if (conversationId) {
      markAsRead.mutate(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleVoiceCall = () => {
    startCall.mutate({ callType: 'voice' });
  };

  const handleVideoCall = () => {
    startCall.mutate({ callType: 'video' });
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
    setEditingContent(message.content);
  };

  const handleSaveEdit = async () => {
    if (editingMessageId && editingContent.trim()) {
      await editMessage.mutateAsync({
        messageId: editingMessageId,
        conversationId,
        content: editingContent.trim(),
      });
      setEditingMessageId(null);
      setEditingContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
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

  const displayName = conversation?.is_group
    ? conversation.name || 'Groupe'
    : participant?.display_name || 'Utilisateur';

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
      {/* Active Call View */}
      {activeCall && (activeCall.status === 'ringing' || activeCall.status === 'active') && (
        <DMCallView 
          call={activeCall} 
          participant={participant || null} 
          onEndCall={handleEndCall}
          isInitiator={activeCall.initiator_id === user?.id}
        />
      )}

      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-3 border-b border-border bg-[hsl(var(--surface-header))]">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="relative">
          <Avatar className="w-8 h-8">
            <AvatarImage src={participant?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {participant?.status && (
            <div 
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-[hsl(var(--surface-header))]",
                participant.status === 'online' && 'bg-status-online',
                participant.status === 'idle' && 'bg-status-idle',
                participant.status === 'dnd' && 'bg-status-dnd',
                (!participant.status || participant.status === 'offline') && 'bg-status-offline'
              )}
            />
          )}
        </div>
        <div 
          className="flex items-center gap-1.5 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setShowUserInfoPanel(!showUserInfoPanel)}
        >
          <AtSign className="w-5 h-5 text-muted-foreground shrink-0" />
          <h2 className="font-semibold text-base truncate">{displayName}</h2>
        </div>
        <div className="h-6 w-px bg-border mx-1" />
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVoiceCall}
                disabled={startCall.isPending || !!activeCall}
                className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:bg-muted/40 disabled:text-muted-foreground transition-all active:scale-95"
                aria-label="Appel vocal"
              >
                <Phone className="w-[18px] h-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Appel vocal</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVideoCall}
                disabled={startCall.isPending || !!activeCall}
                className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:bg-muted/40 disabled:text-muted-foreground transition-all active:scale-95"
                aria-label="Appel vidéo"
              >
                <Video className="w-[18px] h-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Appel vidéo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DMPinnedMessagesPopover conversationId={conversationId} />
              </div>
            </TooltipTrigger>
            <TooltipContent>Messages épinglés</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowUserInfoPanel(!showUserInfoPanel)}
                className={showUserInfoPanel ? 'bg-muted' : ''}
              >
                <UserCircle className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Profil de l'utilisateur</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left column: Messages + Input */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col justify-end min-h-full p-4 space-y-0.5">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Avatar className="w-16 h-16 mb-4">
                    <AvatarImage src={participant?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-lg font-semibold">{displayName}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    C'est le début de votre conversation avec {displayName}
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message, idx) => {
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

                    return (
                      <div
                        key={message.id}
                        ref={(el) => {
                          if (el) messageRefs.current.set(message.id, el);
                          else messageRefs.current.delete(message.id);
                        }}
                      >
                        {/* Date Separator */}
                        {showDateSeparator && (
                          <div className="flex items-center gap-4 my-2">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground font-medium">
                              {formatDate(currentDate)}
                            </span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                        )}
                        {/* Replied line (Discord-like, faithful resolution) */}
                        {message.repliedMessage && (
                          <div className="-mb-0.5">
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
                              indent={48}
                            />
                          </div>
                        )}
                        <UniversalMessageContextMenu
                        key={message.id}
                        isOwnMessage={isOwnMessage}
                        isPinned={isMessagePinned(message.id)}
                        messageId={message.id}
                        previewAuthorName={message.author?.display_name || message.author?.username}
                        previewAuthorAvatar={message.author?.avatar_url || undefined}
                        previewContent={message.content}
                        onReply={() => handleReply(message)}
                        onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                        onCopyText={() => handleCopyMessage(message.content)}
                        onCopyLink={() => handleCopyLink(message.id)}
                        onCopyId={() => handleCopyId(message.id)}
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
                          enabled={isMobile}
                          onReply={() => handleReply(message)}
                          onDoubleTap={() => handleAddReaction(message.id, '❤️')}
                        >
                        <div 
                          className={cn(
                            'flex gap-3 group message-hover px-2 -mx-2 relative',
                            showAuthor ? 'pt-1' : 'py-0',
                            !showAuthor && 'pl-12',
                            messageMentionsMe(message.content, user?.id, []) && 'message-mentioned !-mx-4 !px-6',
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
                            onEdit={isOwnMessage ? () => handleStartEdit(message) : undefined}
                            onDelete={isOwnMessage ? () => handleDeleteMessage(message.id) : undefined}
                            onDropdownOpenChange={(open) => {
                              setOpenDropdownMessageId(open ? message.id : null);
                              if (!open) setHoveredMessageId(null);
                            }}
                          />
                          {showAuthor && (
                            <Avatar className="w-9 h-9 flex-shrink-0">
                              <AvatarImage src={message.author?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                                {message.author?.display_name?.charAt(0).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <div className="flex-1 min-w-0">
                            {showAuthor && (
                              <div className="flex items-center gap-2">
                                <button
                                  className="font-semibold text-sm hover:underline text-left"
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
                                  {message.author?.display_name || 'Utilisateur'}
                                </button>
                                <span className="text-[.625rem] text-muted-foreground/60">
                                  {timestamp}
                                </span>
                              </div>
                            )}

                            {editingMessageId === message.id ? (
                              <div className="mt-1 space-y-2">
                                <Textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  className="min-h-[60px] resize-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveEdit();
                                    }
                                    if (e.key === 'Escape') {
                                      handleCancelEdit();
                                    }
                                  }}
                                />
                                <div className="flex items-center justify-between">
                                  <span className={cn('text-xs', getCharacterCountColor())}>
                                    {editingContent.length}/2000
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                                      <X className="w-4 h-4 mr-1" />
                                      Annuler
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      onClick={handleSaveEdit}
                                      disabled={!editingContent.trim() || editingContent.length > 2000}
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      Sauvegarder
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className={cn(
                                  'text-sm break-words font-ginto',
                                  message.isPending && 'opacity-50'
                                )}>
                                  <MarkdownText content={message.content} />
                                </div>
                              </>
                            )}

                            {/* Message Attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <MessageAttachments attachments={message.attachments as StoredAttachment[]} />
                            )}

                            {/* Link Embeds */}
                            <LinkEmbeds content={message.content} />

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

                            {/* Edited indicator - after attachments */}
                            {message.edited_at && (
                              <span className="text-[.625rem] text-muted-foreground/40 mt-0.5 block">(modifié)</span>
                            )}
                          </div>
                        </div>
                        </SwipeToReplyRow>
                      </UniversalMessageContextMenu>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </ScrollArea>

          {/* Typing Indicator */}
          <TypingIndicator conversationId={conversationId} />

          {/* Reply preview (above input) */}
          {replyingTo && (
            <div className="mx-4 mb-2 flex items-center gap-2 bg-[hsl(var(--surface-3))] rounded-xl px-3 py-2 border-l-[3px] border-primary shadow-sm">
              <Reply className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Avatar className="w-5 h-5 flex-shrink-0">
                {replyingTo.author?.avatar_url && (
                  <AvatarImage src={replyingTo.author.avatar_url} alt={replyingTo.author.display_name} />
                )}
                <AvatarFallback className="text-[9px] bg-primary/15 text-primary font-semibold">
                  {(replyingTo.author?.display_name || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-xs font-semibold flex-shrink-0 text-primary">
                  @{replyingTo.author?.display_name || 'Utilisateur'}
                </span>
                <span
                  className="text-sm text-muted-foreground whitespace-nowrap overflow-hidden min-w-0"
                  style={{
                    maskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent)',
                  }}
                >
                  {(replyingTo.content || '').replace(/\s+/g, ' ').trim().slice(0, 64) ||
                    (replyingTo.attachments.length > 0 ? '📎 Pièce jointe' : '')}
                </span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-muted rounded transition-colors"
                aria-label="Annuler la réponse"
              >
                <XIcon className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Input */}
          <div className="px-4 pb-4 pt-2">
          <MessageInput
            value={messageInput}
            onChange={setMessageInput}
            onSend={() => {
              if (!messageInput.trim() && attachments.length === 0) return;
              sendMessage.mutate({
                conversationId,
                content: messageInput.trim(),
                attachments,
                replyToId: replyingTo?.id ?? null,
              });
              setMessageInput('');
              setReplyingTo(null);
              clearAttachments();
              stopTyping();
            }}
            placeholder={replyingTo ? `Répondre à ${replyingTo.author?.display_name || 'Utilisateur'}` : `Envoyer un message à ${displayName}`}
            disabled={sendMessage.isPending}
            isSending={sendMessage.isPending}
            onTypingStart={startTyping}
            onTypingStop={stopTyping}
            attachments={attachments}
            onAddFiles={addFiles}
            onRemoveAttachment={removeAttachment}
            onUpdateAttachment={updateAttachment}
            onToggleSpoiler={toggleSpoiler}
            onClearAttachments={clearAttachments}
          />
          </div>
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
            onViewFullProfile={() => {
              setProfileInitialTab('about');
              setShowFullProfile(true);
            }}
            onOpenNotes={handleOpenNotes}
          />
        )}
      </div>


      {/* Report Modal */}
      <ReportModal
        isOpen={!!reportingMessage}
        onClose={() => setReportingMessage(null)}
        message={reportingMessage}
        onSubmit={(reason, details) => {
          console.log('Report submitted:', { reason, details, messageId: reportingMessage?.id });
          toast.success('Signalement envoyé. Merci !');
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
