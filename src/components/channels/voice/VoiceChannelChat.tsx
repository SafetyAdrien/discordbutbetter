import { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { useChannels } from '@/hooks/useChannels';
import { useServerRoles } from '@/hooks/useRoles';
import { useMembers } from '@/hooks/useMembers';
import { X, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageInput } from '@/components/chat/MessageInput';
import { usePendingAttachments } from '@/hooks/usePendingAttachments';
import { UploadDropOverlay } from '@/components/chat/upload/UploadDropOverlay';

interface VoiceChannelChatProps {
  channelId: string;
  channelName: string;
  serverId: string;
  onClose: () => void;
}

export function VoiceChannelChat({ channelId, channelName, serverId, onClose }: VoiceChannelChatProps) {
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: messages = [] } = useMessages(channelId);
  const sendMessage = useSendMessage();
  
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
  
  // Fetch data for mention autocomplete
  const { data: channelsData } = useChannels(serverId);
  const { data: serverRoles = [] } = useServerRoles(serverId);
  const { data: membersData = [] } = useMembers(serverId);
  
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
  
  // Build roles list for mentions
  const mentionRoles = useMemo(() => {
    return serverRoles.map(r => ({
      id: r.id,
      name: r.name,
      color: r.color || undefined
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
      
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/10">
        <span className="text-sm font-semibold text-white">Chat textuel</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="flex flex-col min-h-full space-y-0.5">
          {/* Spacer to push content to bottom */}
          <div className="flex-1" />

          {/* Welcome message - positioned at bottom */}
          <div className="mb-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-gradient-gaming flex items-center justify-center mb-3">
              <Hash className="w-5 h-5 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-display font-bold mb-1">Bienvenue dans #{channelName} !</h2>
            <p className="text-sm text-muted-foreground">C'est le début du salon #{channelName}.</p>
          </div>

          {messages.map((message) => (
              <div key={message.id} className="group">
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
                    <p className="text-sm text-foreground/90 break-words">
                      {message.content}
                      {message.edited_at && (
                        <span className="text-[10px] text-muted-foreground ml-1">(modifié)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
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
  );
}
