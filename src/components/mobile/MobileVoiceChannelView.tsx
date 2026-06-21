import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useVoice, useVoiceParticipants } from '@/contexts/VoiceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Volume2, VolumeX, UserPlus } from 'lucide-react';
import { VoiceParticipantGrid } from '@/components/channels/voice/VoiceParticipantGrid';
import { VoiceEmptyState } from '@/components/channels/voice/VoiceEmptyState';
import { useMultipleChannelPermissions } from '@/hooks/useUserChannelPermissions';

interface Props {
  channel: { id: string; name: string; description?: string };
  serverId: string;
  members: any[];
  ownerId: string;
  onOpenDM: (id: string) => void;
  onBack: () => void;
}

export function MobileVoiceChannelView({ channel, onBack }: Props) {
  const { user } = useAuth();
  const {
    voiceState, joinChannel, leaveChannel, toggleDeafen,
    speakingUsers, audioLevels,
    isCameraActive, localCameraStream, toggleCamera,
    localScreenStream, remoteVideoStreams, remoteScreenStreams,
  } = useVoice();

  const { data: participants = [] } = useVoiceParticipants(channel.id);
  const isConnected = voiceState.channelId === channel.id;
  const [isConnecting, setIsConnecting] = useState(false);

  const { can } = useMultipleChannelPermissions(channel.id, ['connect_voice', 'video']);
  const canConnect = can('connect_voice');
  const canVideo = can('video');

  const handleJoin = async () => {
    setIsConnecting(true);
    try { await joinChannel(channel.id, channel.name, voiceState.serverName || 'Server'); }
    finally { setIsConnecting(false); }
  };

  if (!isConnected && participants.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-background h-full">
        <MobileVoiceHeader channelName={channel.name} onBack={onBack} isDeafened={voiceState.isDeafened} onToggleDeafen={toggleDeafen} canShowDeafen={false} />
        <VoiceEmptyState
          channelName={channel.name}
          onJoin={canConnect ? handleJoin : undefined}
          isConnecting={isConnecting}
          permissionDenied={!canConnect}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full relative">
      <MobileVoiceHeader
        channelName={channel.name}
        onBack={onBack}
        isDeafened={voiceState.isDeafened}
        onToggleDeafen={toggleDeafen}
        canShowDeafen={isConnected}
      />

      {/* Grid area */}
      <div className="flex-1 overflow-y-auto voice-gradient-bg">
        <VoiceParticipantGrid
          participants={participants}
          speakingUsers={speakingUsers || new Set()}
          audioLevels={audioLevels}
          localCameraStream={isConnected ? localCameraStream : null}
          localScreenStream={isConnected ? localScreenStream : null}
          remoteVideoStreams={remoteVideoStreams}
          remoteScreenStreams={remoteScreenStreams}
          channelId={channel.id}
        />
      </div>

      {/* Add people row */}
      {isConnected && (
        <button className="flex items-center gap-3 px-4 py-3 border-t border-white/5 active:bg-white/5 transition-colors">
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--surface-1))] flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold text-white">Ajouter au salon vocal</div>
            <div className="text-xs text-muted-foreground">Invite des amis à te rejoindre</div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      )}

      {/* Join button when not connected */}
      {!isConnected && (
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            onClick={handleJoin}
            disabled={isConnecting || !canConnect}
            className="w-full bg-[hsl(var(--online))] hover:bg-[hsl(var(--online))]/90 text-white py-6 text-base rounded-full font-semibold"
          >
            {!canConnect ? 'Accès refusé' : isConnecting ? 'Connexion...' : 'Rejoindre le salon'}
          </Button>
        </div>
      )}
    </div>
  );
}

function MobileVoiceHeader({ channelName, onBack, isDeafened, onToggleDeafen, canShowDeafen }: { channelName: string; onBack: () => void; isDeafened: boolean; onToggleDeafen: () => void; canShowDeafen: boolean }) {
  return (
    <header className="h-14 flex items-center justify-between px-3 bg-background shrink-0">
      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full active:bg-white/10" aria-label="Réduire">
        <ChevronDown className="w-6 h-6 text-white" />
      </button>
      <button className="flex-1 flex items-center justify-center gap-1 min-w-0" onClick={onBack}>
        <span className="font-bold text-white truncate">{channelName}</span>
        <ChevronRight className="w-4 h-4 text-white shrink-0" />
      </button>
      <div className="flex items-center gap-1">
        {canShowDeafen && (
          <button
            onClick={onToggleDeafen}
            className={cn(
              'w-10 h-10 flex items-center justify-center rounded-full',
              isDeafened ? 'bg-destructive text-destructive-foreground' : 'bg-white text-black'
            )}
            aria-label="Sourdine casque"
          >
            {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        )}
        <button className="w-10 h-10 flex items-center justify-center rounded-full active:bg-white/10" aria-label="Ajouter">
          <UserPlus className="w-5 h-5 text-white" />
        </button>
      </div>
    </header>
  );
}
