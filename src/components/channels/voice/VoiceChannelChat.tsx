import { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useMessages, useSendMessage, useEditMessage, useDeleteMessage } from '@/hooks/useMessages';
import { useChannels } from '@/hooks/useChannels';
import { useServerRoles } from '@/hooks/useRoles';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/contexts/AuthContext';
import { X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageInput } from '@/components/chat/MessageInput';
import { UniversalMessageContextMenu } from '@/components/chat/UniversalMessageContextMenu';
import { UniversalMessageActions } from '@/components/chat/UniversalMessageActions';
import { useMessageReactions, useAddReaction, useRemoveReaction, Reaction } from '@/hooks/useReactions';
import { useShiftKey } from '@/hooks/useShiftKey';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import { MarkdownText } from '@/lib/markdown';
import { toast } from 'sonner';
import { usePendingAttachments } from '@/hooks/usePendingAttachments';
import { UploadDropOverlay } from '@/components/chat/upload/UploadDropOverlay';
import { cn } from '@/lib/utils';

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
  const isShiftPressed = useShiftKey();
  const { data: messages = [] } = useMessages(channelId);
  const sendMessage = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();
  
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
    return serverRoles.map(r => ({
      id: r.id, name: r.name, color: r.color || undefined
    }));
  }, [serverRoles]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!messageInput.trim() && attachments.length === 0) return;
    sendMessage.mutate({ channelId, content: messageInput.trim() });
    setMessageInput('');
    clearAttachments();
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
      className="w-80 border-l border-white/10 flex flex-col bg-[#2b2d31] relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <AnimatePresence>
        {isDragging && <UploadDropOverlay channelName={channelName} />}
      </AnimatePresence>
      
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
        <span className="text-sm font-semibold text-white">Chat textuel</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-0.5">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Aucun message</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Commencez la conversation !</p>
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
                    <div className="flex items-center gap-4 my-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground font-medium">{formatDate(currentDate)}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <UniversalMessageContextMenu
                    messageId={message.id}
                    isOwnMessage={isOwnMessage}
                    onReply={() => {}}
                    onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                    onCopyText={() => {
                      copyToClipboard(message.content);
                      toast.success('Texte copié');
                    }}
                    onCopyLink={() => {
                      copyToClipboard(`${window.location.origin}/channels/${serverId}/${channelId}/${message.id}`);
                      toast.success('Lien copié');
                    }}
                    onCopyId={() => {
                      copyToClipboard(message.id);
                      toast.success('ID copié');
                    }}
                    onEdit={isOwnMessage ? () => handleStartEdit(message.id, message.content) : undefined}
                    onDelete={isOwnMessage ? () => handleDelete(message.id) : undefined}
                  >
                    <div 
                      className="relative group"
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
                          toast.success('Lien copié');
                        }}
                        onCopyId={() => {
                          copyToClipboard(message.id);
                          toast.success('ID copié');
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
                            <span className="text-sm font-medium text-white truncate">
                              {message.author?.display_name || 'Utilisateur'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {message.created_at && format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                            </span>
                          </div>
                          {isEditing ? (
                            <div className="mt-1 space-y-1">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
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
                                <MarkdownText content={message.content} />
                                {message.edited_at && (
                                  <span className="text-[10px] text-muted-foreground ml-1">(modifié)</span>
                                )}
                              </div>
                              {/* Reactions display */}
                              {Object.keys(groupedReactions).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {Object.values(groupedReactions).map(({ emoji, count, userReacted }) => (
                                    <button
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
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="px-4 pb-4 pt-2">
        <MessageInput
          value={messageInput}
          onChange={setMessageInput}
          onSend={handleSend}
          placeholder={`Envoyer un message dans #${channelName}`}
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
    </div>
  );
}
