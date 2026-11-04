import { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownTextarea } from '@/components/chat/MarkdownTextarea';
import { useMessages, useSendMessage, useEditMessage, useDeleteMessage } from '@/hooks/useMessages';
import { useChannels } from '@/hooks/useChannels';
import { useServerRoles } from '@/hooks/useRoles';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { X, Check, MessageCircle } from '@/components/icons/discord/lucide';
import { format } from '@/lib/dateUtils';
import { fr } from '@/lib/dateUtils';
import { MessageInput } from '@/components/chat/MessageInput';
import { TypingIndicator } from '@/components/typing/TypingIndicator';
import { UniversalMessageContextMenu } from '@/components/chat/UniversalMessageContextMenu';
import { UniversalMessageActions } from '@/components/chat/UniversalMessageActions';
import { useMessageReactions, useAddReaction, useRemoveReaction, useClearMessageReactions, Reaction } from '@/hooks/useReactions';
import { ReactionsViewerModal } from '@/components/chat/ReactionsViewerModal';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';
import { useShiftKey } from '@/hooks/useShiftKey';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import { MarkdownText } from '@/lib/markdown';
import { usePendingAttachments } from '@/hooks/usePendingAttachments';
import { UploadDropOverlay } from '@/components/chat/upload/UploadDropOverlay';
import { cn } from '@/lib/utils';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';

import { appLocale } from '@/i18n/locale';
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

interface VoiceChannelChatProps {
  channelId: string;
  channelName: string;
  serverId: string;
  onClose: () => void;
}

export function VoiceChannelChat({ channelId, channelName, serverId, onClose }: VoiceChannelChatProps) {
  const [messageInput, setMessageInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [openDropdownMessageId, setOpenDropdownMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { startTyping, stopTyping } = useTypingIndicator(channelId);
  const isShiftPressed = useShiftKey();
  const { data: messages = [] } = useMessages(channelId);
  const sendMessage = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();
  const clearMessageReactions = useClearMessageReactions();
  const { data: canManageMessages = false } = useHasChannelPermission(channelId, 'manage_messages');
  const [reactionsViewerMessageId, setReactionsViewerMessageId] = useState<string | null>(null);
  
  const messageIds = useMemo(() => messages.map(m => m.id), [messages]);
  const { data: reactionsData = {} } = useMessageReactions(messageIds);
  
  const {
    attachments, isDragging, addFiles, removeAttachment,
    updateAttachment, toggleSpoiler, clearAttachments,
    handleDragEnter, handleDragLeave, handleDragOver, handleDrop,
  } = usePendingAttachments();
  
  const { data: channelsData } = useChannels(serverId);
  const { data: serverRoles = [] } = useServerRoles(serverId);
  const { data: membersData = [] } = useMembers(serverId);
  
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
  
  const mentionMembers = useMemo(() => {
    return membersData.map(m => ({
      id: m.user?.id || m.id,
      displayName: m.user?.display_name || m.nickname || 'Unknown',
      username: m.user?.username || '',
      avatar: m.user?.avatar_url || undefined
    }));
  }, [membersData]);
  
  const mentionRoles = useMemo(() => {
    return serverRoles.filter(r => !r.is_default).map(r => ({
      id: r.id, name: r.name, color: r.color || undefined
    }));
  }, [serverRoles]);

  const memberTopRoleColor = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const m of membersData) {
      const uid = (m as any).user?.id;
      if (!uid) continue;
      const roles = (((m as any).roles ?? []) as Array<{ color?: string | null; position?: number | null; name?: string }>)
        .filter((r) => r.name !== '@everyone')
        .slice()
        .sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
      map.set(uid, roles[0]?.color || undefined);
    }
    return map;
  }, [membersData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!messageInput.trim() && attachments.length === 0) return;
    sendMessage.mutate({ channelId, content: messageInput.trim() });
    setMessageInput('');
    clearAttachments();
  };

  const handleSendExternalAttachment = (attachment: { url: string; name: string; type: 'sticker' | 'gif' }) => {
    sendMessage.mutate({ channelId, content: '', externalAttachment: attachment });
  };

  const handleStartEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleSaveEdit = () => {
    if (!editingMessageId || !editContent.trim()) return;
    editMessage.mutate({ messageId: editingMessageId, channelId, content: editContent.trim() });
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleDelete = (messageId: string) => {
    deleteMessage.mutate({ messageId, channelId });
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (!user) return;
    const messageReactions = reactionsData[messageId] || [];
    const existingReaction = messageReactions.find(
      r => r.user_id === user.id && r.emoji === emoji
    );
    if (existingReaction) {
      removeReaction.mutate({ messageId, emoji });
    } else {
      addReaction.mutate({ messageId, emoji });
    }
  };

  return (
    <div 
      className="w-[488px] max-w-[45%] shrink-0 animate-in slide-in-from-right-6 fade-in-0 duration-150 border-l border-[hsl(var(--border-subtle))] flex flex-col bg-background relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <AnimatePresence>
        {isDragging && <UploadDropOverlay channelName={channelName} />}
      </AnimatePresence>
      
      {/* En-tete de la video de reference : bulle + nom du salon, croix a droite, filet fin. */}
      <div className="h-12 px-4 flex items-center gap-2 shrink-0 border-b border-[hsl(var(--border-subtle))]">
        <MessageCircle className="w-6 h-6 text-[hsl(var(--header-icon))] shrink-0" />
        <span translate="no" className="flex-1 min-w-0 truncate text-base font-medium text-[#f2f3f5]">{channelName}</span>
        <button type="button" aria-label="Fermer" title="Fermer" onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center text-[hsl(var(--header-icon))] hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <ScrollArea className="flex-1 mb-6 px-3 pt-3 pb-0 [&>div>div]:!flex [&>div>div]:min-h-full [&>div>div]:flex-col">
        <div className="space-y-0.5 flex flex-col flex-1 min-h-full">
          {messages.length === 0 ? (
            <div className="mt-auto pt-24 px-1">
              <div className="w-[68px] h-[68px] rounded-full bg-[hsl(var(--button-secondary))] flex items-center justify-center mb-2">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h1 translate="no" className="text-[32px] leading-10 font-bold text-white">Bienvenue dans {channelName} !</h1>
              <p className="text-base text-foreground">C'est le début du salon {channelName}.</p>
            </div>
          ) : (
            messages.map((message, idx) => {
              const currentDate = message.created_at ? new Date(message.created_at) : new Date();
              const prevMessage = idx > 0 ? messages[idx - 1] : null;
              const prevDate = prevMessage?.created_at ? new Date(prevMessage.created_at) : null;
              const showDateSeparator = !prevDate || currentDate.toDateString() !== prevDate.toDateString();
              const isOwnMessage = user?.id === (message as any).author_id || user?.id === message.author?.id;
              const isEditing = editingMessageId === message.id;
              const messageReactions = reactionsData[message.id] || [];
              const isHovered = hoveredMessageId === message.id || openDropdownMessageId === message.id;
              
              // Group reactions by emoji
              const groupedReactions = messageReactions.reduce<Record<string, { emoji: string; count: number; userReacted: boolean }>>((acc, r) => {
                if (!acc[r.emoji]) {
                  acc[r.emoji] = { emoji: r.emoji, count: 0, userReacted: false };
                }
                acc[r.emoji].count++;
                if (r.user_id === user?.id) acc[r.emoji].userReacted = true;
                return acc;
              }, {});
              
              return (
                <div key={message.id}>
                  {showDateSeparator && (
                    <div className="flex items-center gap-2 my-4 mx-4"><div className="flex-1 h-px bg-white/[0.06]" /><span className="text-xs font-semibold text-[#949ba4] px-1">{formatDate(currentDate)}</span><div className="flex-1 h-px bg-white/[0.06]" /></div>
                  )}
                  <UniversalMessageContextMenu
                    messageId={message.id}
                    isOwnMessage={isOwnMessage}
                    canManageMessages={canManageMessages}
                    hasReactions={(reactionsData[message.id]?.length ?? 0) > 0}
                    canManageReactions={canManageMessages}
                    previewAuthorName={message.author?.display_name || message.author?.username}
                    previewAuthorAvatar={message.author?.avatar_url || undefined}
                    previewContent={message.content}
                    onViewReactions={() => setReactionsViewerMessageId(message.id)}
                    onClearAllReactions={() => clearMessageReactions.mutate({ messageId: message.id })}
                    onReply={() => {}}
                    onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                    onCopyText={() => {
                      copyToClipboard(message.content);
                    }}
                    onCopyLink={() => {
                      copyToClipboard(`${window.location.origin}/channels/${serverId}/${channelId}/${message.id}`);
                    }}
                    onCopyId={() => {
                      copyToClipboard(uuidToSnowflake(message.id));
                    }}
                    onEdit={isOwnMessage ? () => handleStartEdit(message.id, message.content) : undefined}
                    onDelete={isOwnMessage ? () => handleDelete(message.id) : undefined}
                  >
                    <div 
                      className="relative group message-hover -mx-3 px-3 py-0.5"
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => { if (!openDropdownMessageId) setHoveredMessageId(null); }}
                    >
                      {/* Hover toolbar */}
                      <UniversalMessageActions
                        isVisible={isHovered}
                        isShiftPressed={isShiftPressed}
                        isOwnMessage={isOwnMessage}
                        onReply={() => {}}
                        onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                        onCopyLink={() => {
                          copyToClipboard(`${window.location.origin}/channels/${serverId}/${channelId}/${message.id}`);
                        }}
                        onCopyId={() => {
                          copyToClipboard(uuidToSnowflake(message.id));
                        }}
                        onCopyText={() => {
                          copyToClipboard(message.content);
                        }}
                        onEdit={isOwnMessage ? () => handleStartEdit(message.id, message.content) : undefined}
                        onDelete={isOwnMessage ? () => handleDelete(message.id) : undefined}
                        onDropdownOpenChange={(open) => setOpenDropdownMessageId(open ? message.id : null)}
                      />
                      
                      <div className="flex items-start gap-2">
                        <Avatar className="w-7 h-7 flex-shrink-0">
                          <AvatarImage src={message.author?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {message.author?.display_name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span
                              className="text-sm font-medium truncate"
                              style={{ color: (message.author?.id ? memberTopRoleColor.get(message.author.id) : undefined) || '#ffffff' }}
                            >
                              {message.author?.display_name || 'Utilisateur'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {message.created_at && format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                            </span>
                          </div>
                          {isEditing ? (
                            <div className="mt-1 space-y-1">
                              <MarkdownTextarea
                                value={editContent}
                                onChange={(v) => setEditContent(v)}
                                onKeyDown={handleEditKeyDown}
                                className="min-h-[60px] text-sm resize-none"
                                autoFocus
                              />
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={handleCancelEdit}>
                                  Annuler
                                </Button>
                                <Button size="sm" className="h-6 text-xs" onClick={handleSaveEdit}>
                                  <Check className="w-3 h-3 mr-1" />
                                  Sauvegarder
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                               <div className="text-sm text-foreground/90 break-words">
                                 <MarkdownText variant="chat" content={message.content} />
                                {message.edited_at && (
                                  <span className="text-[10px] text-muted-foreground ml-1">(modifié)</span>
                                )}
                              </div>
                              {/* Reactions display */}
                              {Object.keys(groupedReactions).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {Object.values(groupedReactions).map(({ emoji, count, userReacted }) => (
                                    <button type="button"
                                      key={emoji}
                                      onClick={() => handleAddReaction(message.id, emoji)}
                                      className={cn(
                                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors",
                                        "bg-muted/50 hover:bg-muted",
                                        userReacted && "border border-primary/60 bg-primary/10"
                                      )}
                                    >
                                      <span>{emoji}</span>
                                      <span className="text-muted-foreground">{count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </UniversalMessageContextMenu>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} className="msg-end" />
        </div>
      </ScrollArea>

      <div>
        <TypingIndicator channelId={channelId} />
        <MessageInput
          value={messageInput}
          onChange={setMessageInput}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          onSend={handleSend}
          onSendExternalAttachment={handleSendExternalAttachment}
          placeholder={`Envoyer un message dans ${channelName}`}
          disabled={sendMessage.isPending}
          isSending={sendMessage.isPending}
          compact
          serverId={serverId}
          channelId={channelId}
          members={mentionMembers}
          roles={mentionRoles}
          channels={allChannels}
          attachments={attachments}
          onAddFiles={addFiles}
          onRemoveAttachment={removeAttachment}
          onUpdateAttachment={updateAttachment}
          onToggleSpoiler={toggleSpoiler}
          onClearAttachments={clearAttachments}
        />
      </div>

      <ReactionsViewerModal
        messageId={reactionsViewerMessageId}
        canManageReactions={canManageMessages}
        onOpenChange={(open) => !open && setReactionsViewerMessageId(null)}
      />
    </div>
  );
}
