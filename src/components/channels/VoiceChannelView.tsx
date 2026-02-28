import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useVoice, useVoiceParticipants } from '@/contexts/VoiceContext';
import { useAuth } from '@/contexts/AuthContext';
import { MemberList } from '@/components/layout/MemberList';
import { Button } from '@/components/ui/button';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { MessageSquare } from 'lucide-react';
import { useMultipleChannelPermissions } from '@/hooks/useUserChannelPermissions';

// Sub-components
import { VoiceActionBar } from './voice/VoiceActionBar';
import { VoiceEmptyState } from './voice/VoiceEmptyState';
import { VoiceParticipantGrid } from './voice/VoiceParticipantGrid';
import { VoiceChannelChat } from './voice/VoiceChannelChat';

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
  initialShowChat?: boolean;
  onChatOpened?: () => void;
}

export function VoiceChannelView({ 
  channel, 
  serverId, 
  members,
  ownerId,
  onOpenDM,
  initialShowChat = false,
  onChatOpened,
}: VoiceChannelViewProps) {
  const { user } = useAuth();
  const [showChat, setShowChat] = useState(initialShowChat);
  const [showMembers, setShowMembers] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const { 
    voiceState, 
    joinChannel, 
    leaveChannel, 
    toggleMute, 
    toggleDeafen, 
    speakingUsers,
    audioLevels,
    hasMicrophoneAccess,
    // Camera & Screen share
    isCameraActive,
    localCameraStream,
    toggleCamera,
    isScreenSharing,
    localScreenStream,
    toggleScreenShare,
    remoteVideoStreams,
    remoteScreenStreams,
  } = useVoice();
  
  const { data: participants = [] } = useVoiceParticipants(channel.id);
  const isConnectedToThisChannel = voiceState.channelId === channel.id;
  
  // Check voice permissions
  const { can: canPerm } = useMultipleChannelPermissions(channel.id, [
    'connect_voice',
    'speak_voice',
    'video',
    'stream',
  ]);
  
  const canConnect = canPerm('connect_voice');
  const canSpeak = canPerm('speak_voice');
  const canVideo = canPerm('video');
  const canStream = canPerm('stream');

  const handleJoinChannel = async () => {
    setIsConnecting(true);
    try {
      await joinChannel(channel.id, channel.name, voiceState.serverName || 'Server');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleToggleChat = () => {
    setShowChat(!showChat);
    if (!showChat) setShowMembers(false);
  };

  const handleToggleMembers = () => {
    setShowMembers(!showMembers);
    if (!showMembers) setShowChat(false);
  };

  // If not connected and no participants, show empty state
  if (!isConnectedToThisChannel && participants.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-background">
        {/* Header */}
        <header className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-background">
          <div className="flex items-center gap-2">
            <StreamlineVoice className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-white">{channel.name}</h2>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleToggleChat}
            className={cn('text-muted-foreground hover:text-white', showChat && 'bg-white/10 text-white')}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
        </header>

        <div className="flex-1 flex">
          <VoiceEmptyState 
            channelName={channel.name}
            onJoin={canConnect ? handleJoinChannel : undefined}
            isConnecting={isConnecting}
            permissionDenied={!canConnect}
          />
          
          {/* Chat panel */}
          {showChat && (
            <VoiceChannelChat 
              channelId={channel.id} 
              channelName={channel.name}
              serverId={serverId}
              onClose={() => setShowChat(false)}
            />
          )}
        </div>
      </div>
    );
  }

  // Connected or has participants - show full interface
  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <header className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-2">
          <StreamlineVoice className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-white">{channel.name}</h2>
          {channel.description && (
            <span className="text-sm text-muted-foreground ml-2 hidden md:inline">
              {channel.description}
            </span>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleToggleChat}
          className={cn('text-muted-foreground hover:text-white', showChat && 'bg-white/10 text-white')}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Voice Area */}
        <div className="flex-1 flex flex-col relative voice-gradient-bg">
          {/* Participants Grid */}
          <VoiceParticipantGrid 
            participants={participants}
            speakingUsers={speakingUsers || new Set()}
            audioLevels={audioLevels}
            localCameraStream={isConnectedToThisChannel ? localCameraStream : null}
            localScreenStream={isConnectedToThisChannel ? localScreenStream : null}
            remoteVideoStreams={remoteVideoStreams}
            remoteScreenStreams={remoteScreenStreams}
            channelId={channel.id}
            canModerate={ownerId === user?.id}
          />

          {/* Action Bar - only show if connected */}
          {isConnectedToThisChannel && (
            <VoiceActionBar
              isMuted={voiceState.isMuted}
              isDeafened={voiceState.isDeafened}
              isCameraOn={isCameraActive}
              isScreenSharing={isScreenSharing}
              showChat={showChat}
              showMembers={showMembers}
              onToggleMute={toggleMute}
              onToggleDeafen={toggleDeafen}
              onToggleCamera={canVideo ? toggleCamera : undefined}
              onToggleScreenShare={canStream ? toggleScreenShare : undefined}
              onToggleChat={handleToggleChat}
              onToggleMembers={handleToggleMembers}
              onDisconnect={leaveChannel}
              hasMicrophoneAccess={hasMicrophoneAccess && canSpeak}
            />
          )}

          {/* Join button if not connected but others are in the channel */}
          {!isConnectedToThisChannel && participants.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
              <div className="flex justify-center">
                <Button
                  onClick={handleJoinChannel}
                  disabled={isConnecting || !canConnect}
                  className="bg-[hsl(var(--online))] hover:bg-[hsl(var(--online))]/90 text-white px-6 py-5 text-base rounded-full"
                >
                  {!canConnect ? 'Accès refusé' : isConnecting ? 'Connexion...' : 'Rejoindre le salon'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Chat */}
        {showChat && (
          <VoiceChannelChat 
            channelId={channel.id} 
            channelName={channel.name}
            serverId={serverId}
            onClose={() => setShowChat(false)}
          />
        )}

        {/* Right Sidebar - Members */}
        {showMembers && (
          <div className="w-60 border-l border-white/10 bg-card">
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