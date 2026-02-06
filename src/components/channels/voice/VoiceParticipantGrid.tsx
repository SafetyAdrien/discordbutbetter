import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MicOff, HeadphoneOff } from 'lucide-react';
import { VoiceVideoTile } from './VoiceVideoTile';
import { VoiceParticipantPopover } from './VoiceParticipantPopover';
import { AudioLevelIndicator } from './AudioLevelIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceUserSettings } from '@/hooks/useVoiceUserSettings';
import { useVoice } from '@/contexts/VoiceContext';

// Array of gradient backgrounds for participants
const PARTICIPANT_GRADIENTS = [
  'from-red-600/80 to-red-900/80',
  'from-blue-600/80 to-blue-900/80',
  'from-purple-600/80 to-purple-900/80',
  'from-green-600/80 to-green-900/80',
  'from-orange-600/80 to-orange-900/80',
  'from-pink-600/80 to-pink-900/80',
  'from-cyan-600/80 to-cyan-900/80',
  'from-indigo-600/80 to-indigo-900/80',
];

interface Participant {
  user_id: string;
  muted: boolean;
  deafened: boolean;
  server_muted?: boolean;
  server_deafened?: boolean;
  camera?: boolean;
  streaming?: boolean;
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface VoiceParticipantGridProps {
  participants: Participant[];
  speakingUsers: Set<string>;
  audioLevels?: Map<string, number>;
  localCameraStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  remoteVideoStreams: Map<string, MediaStream>;
  remoteScreenStreams: Map<string, MediaStream>;
  channelId: string;
  canModerate?: boolean;
}

export function VoiceParticipantGrid({ 
  participants, 
  speakingUsers,
  audioLevels = new Map(),
  localCameraStream,
  localScreenStream,
  remoteVideoStreams,
  remoteScreenStreams,
  channelId,
  canModerate = false,
}: VoiceParticipantGridProps) {
  const { user } = useAuth();
  const { getUserVolume, setUserVolume, serverMuteUser, serverDeafenUser } = useVoiceUserSettings();
  
  // Check if anyone is screen sharing (for focus mode)
  const screenShareUser = participants.find(p => p.streaming);
  const hasScreenShare = !!screenShareUser || !!localScreenStream;

  // Determine grid layout based on participant count and screen share
  const getGridClass = () => {
    if (hasScreenShare) {
      // Focus layout: screen share takes most space
      return 'grid-cols-1';
    }
    
    const count = participants.length;
    if (count === 1) return 'grid-cols-1 max-w-md';
    if (count === 2) return 'grid-cols-2 max-w-2xl';
    if (count <= 4) return 'grid-cols-2 max-w-3xl';
    if (count <= 6) return 'grid-cols-3 max-w-4xl';
    return 'grid-cols-4 max-w-5xl';
  };

  // Render screen share in focus mode
  if (hasScreenShare) {
    const screenStream = localScreenStream || (screenShareUser ? remoteScreenStreams.get(screenShareUser.user_id) : null);
    const screenOwner = localScreenStream 
      ? participants.find(p => p.user_id === user?.id)
      : screenShareUser;

    return (
      <div className="flex-1 flex flex-col gap-4 p-4">
        {/* Main screen share */}
        <div className="flex-1 min-h-0">
          {screenStream && screenOwner && (
            <VoiceVideoTile
              stream={screenStream}
              type="screen"
              participantName={screenOwner.profile.display_name}
              isSpeaking={speakingUsers.has(screenOwner.user_id)}
              isMuted={screenOwner.muted}
              isLocal={screenOwner.user_id === user?.id}
              className="h-full"
            />
          )}
        </div>

        {/* Participant strip at bottom */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {participants.map((participant, index) => {
            const isLocal = participant.user_id === user?.id;
            const hasCameraStream = isLocal 
              ? !!localCameraStream 
              : remoteVideoStreams.has(participant.user_id);
            const cameraStream = isLocal 
              ? localCameraStream 
              : remoteVideoStreams.get(participant.user_id);

            return (
              <div key={participant.user_id} className="flex-shrink-0 w-40">
                {hasCameraStream && cameraStream ? (
                  <VoiceVideoTile
                    stream={cameraStream}
                    type="camera"
                    participantName={participant.profile.display_name}
                    isSpeaking={speakingUsers.has(participant.user_id)}
                    isMuted={participant.muted}
                    isLocal={isLocal}
                    className="aspect-video"
                  />
                ) : (
                  <VoiceParticipantPopover
                    participant={participant}
                    canModerate={canModerate && !isLocal}
                    volume={getUserVolume(participant.user_id)}
                    onVolumeChange={(vol) => setUserVolume.mutate({ targetUserId: participant.user_id, volume: vol })}
                    onServerMute={(muted) => serverMuteUser.mutate({ channelId, targetUserId: participant.user_id, muted })}
                    onServerDeafen={(deafened) => serverDeafenUser.mutate({ channelId, targetUserId: participant.user_id, deafened })}
                  >
                    <div className="cursor-pointer">
                      <VoiceParticipantCard
                        participant={participant}
                        isSpeaking={speakingUsers.has(participant.user_id)}
                        audioLevel={audioLevels.get(participant.user_id) || 0}
                        gradientIndex={index % PARTICIPANT_GRADIENTS.length}
                        compact
                      />
                    </div>
                  </VoiceParticipantPopover>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Normal grid layout (no screen share)
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className={cn('grid gap-4 w-full mx-auto', getGridClass())}>
        {participants.map((participant, index) => {
          const isLocal = participant.user_id === user?.id;
          const hasCameraStream = isLocal 
            ? !!localCameraStream 
            : remoteVideoStreams.has(participant.user_id);
          const cameraStream = isLocal 
            ? localCameraStream 
            : remoteVideoStreams.get(participant.user_id);

          // Show video tile if camera is on
          if (hasCameraStream && cameraStream) {
            return (
              <VoiceVideoTile
                key={participant.user_id}
                stream={cameraStream}
                type="camera"
                participantName={participant.profile.display_name}
                isSpeaking={speakingUsers.has(participant.user_id)}
                isMuted={participant.muted}
                isLocal={isLocal}
              />
            );
          }

          // Show avatar card if no camera
          return (
            <VoiceParticipantPopover
              key={participant.user_id}
              participant={participant}
              canModerate={canModerate && !isLocal}
              volume={getUserVolume(participant.user_id)}
              onVolumeChange={(vol) => setUserVolume.mutate({ targetUserId: participant.user_id, volume: vol })}
              onServerMute={(muted) => serverMuteUser.mutate({ channelId, targetUserId: participant.user_id, muted })}
              onServerDeafen={(deafened) => serverDeafenUser.mutate({ channelId, targetUserId: participant.user_id, deafened })}
            >
              <div className="cursor-pointer">
                <VoiceParticipantCard
                  participant={participant}
                  isSpeaking={speakingUsers.has(participant.user_id)}
                  audioLevel={audioLevels.get(participant.user_id) || 0}
                  gradientIndex={index % PARTICIPANT_GRADIENTS.length}
                />
              </div>
            </VoiceParticipantPopover>
          );
        })}
      </div>
    </div>
  );
}

interface VoiceParticipantCardProps {
  participant: Participant;
  isSpeaking: boolean;
  audioLevel?: number;
  gradientIndex: number;
  compact?: boolean;
}

function VoiceParticipantCard({ participant, isSpeaking, audioLevel = 0, gradientIndex, compact }: VoiceParticipantCardProps) {
  const gradient = PARTICIPANT_GRADIENTS[gradientIndex];

  return (
    <div 
      className={cn(
        'relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br',
        gradient,
        'transition-all duration-300',
        isSpeaking && 'ring-4 ring-[hsl(var(--online))] voice-speaking-glow',
        compact && 'rounded-xl'
      )}
    >
      {/* Subtle inner glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      
      {/* Avatar centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={cn(
          'relative transition-transform duration-200',
          isSpeaking && 'scale-105'
        )}>
          <Avatar className={cn(
            'transition-all duration-150',
            isSpeaking 
              ? 'ring-4 ring-[hsl(var(--online))] voice-speaking-ring border-4 border-[hsl(var(--online))]' 
              : 'border-4 border-white/20',
            compact ? 'w-12 h-12' : 'w-20 h-20'
          )}>
            <AvatarImage src={participant.profile.avatar_url || undefined} />
            <AvatarFallback className={cn(
              'bg-white/10 text-white font-bold',
              compact ? 'text-lg' : 'text-2xl'
            )}>
              {participant.profile.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Mute/Deafen badge */}
          {(participant.muted || participant.deafened) && (
            <div className={cn(
              'absolute -bottom-1 -right-1 bg-[#232428] rounded-full border-2 border-black/20',
              compact ? 'p-1' : 'p-1.5'
            )}>
              {participant.deafened ? (
                <HeadphoneOff className={cn(compact ? 'w-3 h-3' : 'w-4 h-4', 'text-destructive')} />
              ) : (
                <MicOff className={cn(compact ? 'w-3 h-3' : 'w-4 h-4', 'text-destructive')} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Name badge with audio level indicator */}
      <div className={cn('absolute left-2 right-2', compact ? 'bottom-1.5' : 'bottom-3')}>
        <div className={cn(
          'inline-flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-md',
          compact ? 'px-1.5 py-0.5' : 'px-2.5 py-1.5'
        )}>
          {/* Audio level indicator */}
          {!participant.muted && (
            <AudioLevelIndicator 
              level={audioLevel}
              isSpeaking={isSpeaking}
              variant="bar"
              showWhenSilent={false}
            />
          )}
          <span className={cn(
            'font-medium text-white truncate',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {participant.profile.display_name}
          </span>
        </div>
      </div>
    </div>
  );
}