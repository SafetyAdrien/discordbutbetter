import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useVoice } from '@/contexts/VoiceContext';
import { useVoiceParticipants } from '@/contexts/VoiceContext';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { MemberList } from '@/components/layout/MemberList';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { Users, Send, Mic, MicOff, Headphones, HeadphoneOff } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VoiceChannelViewProps {
  channel: {
    id: string;
    name: string;
    description?: string;
  };
  serverId: string;
  members: any[];
  ownerId: string;
  onOpenDM: (conversationId: string) => void;
}

export function VoiceChannelView({ 
  channel, 
  serverId, 
  members,
  ownerId,
  onOpenDM 
}: VoiceChannelViewProps) {
  const [showChat, setShowChat] = useState(true);
  const { voiceState, toggleMute, toggleDeafen, speakingUsers } = useVoice();
  const { data: participants = [] } = useVoiceParticipants(channel.id);

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <header className="h-12 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <StreamlineVoice className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">{channel.name}</h2>
          {channel.description && (
            <span className="text-sm text-muted-foreground ml-2 hidden md:inline">
              {channel.description}
            </span>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setShowChat(!showChat)}
          className={cn(showChat && 'bg-muted')}
        >
          <Users className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Voice Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background/50">
          {/* Participants Grid */}
          {participants.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <StreamlineVoice className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun participant</p>
              <p className="text-sm mt-1">Rejoignez le salon vocal pour commencer</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-4xl">
              {participants.map((participant) => (
                <VoiceParticipantCard
                  key={participant.user_id}
                  participant={participant}
                  isSpeaking={speakingUsers?.has(participant.user_id) || false}
                />
              ))}
            </div>
          )}

          {/* Voice Controls (if connected to this channel) */}
          {voiceState.channelId === channel.id && (
            <div className="mt-8 flex items-center gap-2 bg-secondary/50 rounded-full px-4 py-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'rounded-full',
                  voiceState.isMuted && 'bg-destructive/20 text-destructive'
                )}
                onClick={() => toggleMute()}
              >
                {voiceState.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'rounded-full',
                  voiceState.isDeafened && 'bg-destructive/20 text-destructive'
                )}
                onClick={() => toggleDeafen()}
              >
                {voiceState.isDeafened ? <HeadphoneOff className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
              </Button>
            </div>
          )}
        </div>

        {/* Right Sidebar - Chat or Members */}
        {showChat ? (
          <VoiceChannelChat channelId={channel.id} channelName={channel.name} />
        ) : (
          <div className="w-60 border-l border-border">
            <MemberList 
              members={members} 
              ownerId={ownerId} 
              serverId={serverId}
              onOpenDM={onOpenDM}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface VoiceParticipantCardProps {
  participant: {
    user_id: string;
    muted: boolean;
    deafened: boolean;
    profile: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
  };
  isSpeaking: boolean;
}

function VoiceParticipantCard({ participant, isSpeaking }: VoiceParticipantCardProps) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
      <div className="relative">
        <Avatar 
          className={cn(
            'w-20 h-20 transition-all',
            isSpeaking && 'ring-2 ring-[hsl(var(--voice-active))] ring-offset-2 ring-offset-background voice-active-ring'
          )}
        >
          <AvatarImage src={participant.profile.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary text-2xl">
            {participant.profile.display_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {/* Mute/Deafen Indicators */}
        {(participant.muted || participant.deafened) && (
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
            {participant.deafened ? (
              <HeadphoneOff className="w-4 h-4 text-destructive" />
            ) : participant.muted ? (
              <MicOff className="w-4 h-4 text-destructive" />
            ) : null}
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="font-medium text-sm truncate max-w-[100px]">
          {participant.profile.display_name}
        </p>
        <p className="text-xs text-muted-foreground truncate max-w-[100px]">
          @{participant.profile.username.toLowerCase()}
        </p>
      </div>
    </div>
  );
}

interface VoiceChannelChatProps {
  channelId: string;
  channelName: string;
}

function VoiceChannelChat({ channelId, channelName }: VoiceChannelChatProps) {
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: messages = [] } = useMessages(channelId);
  const sendMessage = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    
    sendMessage.mutate({ channelId, content: messageInput.trim() });
    setMessageInput('');
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }, []);

  return (
    <div className="w-80 border-l border-border flex flex-col bg-secondary/20">
      {/* Chat Header */}
      <div className="h-10 px-3 flex items-center border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">
          Chat textuel
        </span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {messages.map((message) => (
            <div key={message.id} className="group">
              <div className="flex items-start gap-2">
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarImage src={message.author?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {message.author?.display_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-medium truncate">
                      {message.author?.display_name || 'Utilisateur'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {message.created_at && format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 break-words">
                    {message.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSend} className="p-2 border-t border-border">
        <div className="flex gap-1 items-end bg-background rounded-md px-2 py-1">
          <textarea
            value={messageInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channelName}`}
            className="flex-1 bg-transparent py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none min-h-[24px] max-h-[150px] overflow-y-auto"
            rows={1}
          />
          <Button 
            type="submit" 
            size="icon" 
            variant="ghost"
            className="h-7 w-7"
            disabled={!messageInput.trim()}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
