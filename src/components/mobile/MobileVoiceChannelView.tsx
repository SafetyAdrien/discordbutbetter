import { useState, useEffect } from 'react';
import { useVoice, useVoiceParticipants } from '@/contexts/VoiceContext';
import { ChevronRight, UserPlus } from 'lucide-react';
import { VoiceParticipantGrid } from '@/components/channels/voice/VoiceParticipantGrid';
import { useMultipleChannelPermissions } from '@/hooks/useUserChannelPermissions';
import { MobileChannelHeader } from './MobileChannelHeader';
import { MobileVoicePreJoin } from './MobileVoicePreJoin';
import { VoiceChannelDetailsSheet } from './VoiceChannelDetailsSheet';
import { CreateInviteModal } from '@/components/modals/CreateInviteModal';
import type { User } from '@/types/app';
import type { MemberWithProfile } from '@/hooks/useMembers';

interface Props {
  channel: { id: string; name: string; description?: string };
  serverId: string;
  members: (User & { roles?: MemberWithProfile['roles'] })[];
  ownerId: string;
  serverName?: string;
  onOpenDM: (id: string) => void;
  onBack: () => void;
  onOpenChat?: () => void;
}

export function MobileVoiceChannelView({
  channel,
  serverId,
  members,
  ownerId,
  serverName,
  onOpenDM,
  onBack,
  onOpenChat,
}: Props) {
  const {
    voiceState, joinChannel, toggleDeafen, toggleMute,
    speakingUsers, audioLevels,
    localCameraStream, localScreenStream, remoteVideoStreams, remoteScreenStreams,
  } = useVoice();

  const { data: participants = [] } = useVoiceParticipants(channel.id);
  const isConnected = voiceState.channelId === channel.id;
  const [isConnecting, setIsConnecting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [videoOnly, setVideoOnly] = useState(false);

  // Local pre-join mute preference; synced into voice state after joining.
  const [preJoinMuted, setPreJoinMuted] = useState(false);

  const { can } = useMultipleChannelPermissions(channel.id, ['connect_voice']);
  const canConnect = can('connect_voice');

  const handleJoin = async () => {
    setIsConnecting(true);
    try {
      await joinChannel(channel.id, channel.name, serverName || voiceState.serverName || 'Server');
      if (preJoinMuted && !voiceState.isMuted) {
        await toggleMute();
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Keep preJoin state in sync when actually connected
  useEffect(() => {
    if (isConnected) setPreJoinMuted(voiceState.isMuted);
  }, [isConnected, voiceState.isMuted]);

  const onlineCount = members.filter(m => {
    const s = (m as any).status;
    return s === 'online' || s === 'idle' || s === 'dnd';
  }).length;

  // Apply "video only" filter when toggled
  const visibleParticipants = videoOnly
    ? participants.filter(p => {
        const hasVideo = p.user_id === voiceState.channelId ? !!localCameraStream : remoteVideoStreams.has(p.user_id);
        return hasVideo || p.streaming;
      })
    : participants;

  const header = (
    <MobileChannelHeader
      channelName={channel.name}
      channelType="voice"
      onlineCount={onlineCount}
      onBack={onBack}
      onOpenDetails={() => setDetailsOpen(true)}
      rightSlot={
        <button
          onClick={() => setInviteOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-white/10"
          aria-label="Inviter"
        >
          <UserPlus className="w-5 h-5 text-foreground" />
        </button>
      }
    />
  );

  const detailsSheet = (
    <VoiceChannelDetailsSheet
      open={detailsOpen}
      onOpenChange={setDetailsOpen}
      channel={channel}
      serverId={serverId}
      serverName={serverName}
      ownerId={ownerId}
      members={members}
      onOpenDM={onOpenDM}
      isDeafened={voiceState.isDeafened}
      onToggleDeafen={toggleDeafen}
      videoOnly={videoOnly}
      onToggleVideoOnly={setVideoOnly}
    />
  );

  // Pre-join state
  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col bg-background h-full">
        {header}
        <MobileVoicePreJoin
          participantCount={participants.length}
          isMuted={preJoinMuted}
          isConnecting={isConnecting}
          canConnect={canConnect}
          onToggleMuted={() => setPreJoinMuted(v => !v)}
          onJoin={handleJoin}
          onOpenChat={onOpenChat}
        />
        {detailsSheet}
        {inviteOpen && (
          <CreateInviteModal
            serverId={serverId}
            channelName={channel.name}
            onClose={() => setInviteOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full relative">
      {header}

      {/* Grid area */}
      <div className="flex-1 overflow-y-auto voice-gradient-bg">
        <VoiceParticipantGrid
          participants={visibleParticipants}
          speakingUsers={speakingUsers || new Set()}
          audioLevels={audioLevels}
          localCameraStream={localCameraStream}
          localScreenStream={localScreenStream}
          remoteVideoStreams={remoteVideoStreams}
          remoteScreenStreams={remoteScreenStreams}
          channelId={channel.id}
        />
      </div>

      {/* Add people row */}
      <button
        onClick={() => setInviteOpen(true)}
        className="flex items-center gap-3 px-4 py-3 border-t border-white/5 active:bg-white/5 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-[hsl(var(--surface-1))] flex items-center justify-center shrink-0">
          <UserPlus className="w-5 h-5 text-foreground" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold text-foreground">Ajouter au salon vocal</div>
          <div className="text-xs text-muted-foreground">Invite des amis à te rejoindre</div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>

      {detailsSheet}
      {inviteOpen && (
        <CreateInviteModal
          serverId={serverId}
          channelName={channel.name}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </div>
  );
}
