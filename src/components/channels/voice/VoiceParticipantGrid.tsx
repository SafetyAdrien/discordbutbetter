import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MicOff, HeadphoneOff, ChevronDown, ChevronRight, Monitor, X, Maximize2 } from 'lucide-react';
import { VoiceVideoTile } from './VoiceVideoTile';
import { VoiceParticipantPopover } from './VoiceParticipantPopover';
import { VoiceParticipantContextMenu } from './VoiceParticipantContextMenu';
import { AudioLevelIndicator } from './AudioLevelIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceUserSettings } from '@/hooks/useVoiceUserSettings';
import { useVoice } from '@/contexts/VoiceContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UserProfilePopup } from '@/components/profile/UserProfilePopup';
import { User } from '@/types/app';

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

type FocusTarget = 
  | { type: 'participant'; userId: string }
  | { type: 'screen'; userId: string }
  | null;

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
  
  const [screensOpen, setScreensOpen] = useState(true);
  const [participantsOpen, setParticipantsOpen] = useState(true);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cardPosition, setCardPosition] = useState<{ top: number; right: number }>({ top: 100, right: 280 });

  const handleOpenProfile = (participant: Participant, e?: React.MouseEvent) => {
    const userObj: User = {
      id: participant.profile.id,
      username: participant.profile.username,
      displayName: participant.profile.display_name,
      avatar: participant.profile.avatar_url || undefined,
      status: 'online',
    };
    setSelectedUser(userObj);
    if (e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setCardPosition({
        top: Math.min(rect.top, window.innerHeight - 400),
        right: window.innerWidth - rect.right - 340,
      });
    }
    setProfileOpen(true);
  };

  // Collect all screen shares
  const screenShares: { userId: string; stream: MediaStream; ownerName: string; isLocal: boolean }[] = [];
  
  if (localScreenStream && user) {
    const localParticipant = participants.find(p => p.user_id === user.id);
    screenShares.push({
      userId: user.id,
      stream: localScreenStream,
      ownerName: localParticipant?.profile.display_name || 'Vous',
      isLocal: true,
    });
  }
  
  participants.forEach(p => {
    if (p.streaming && p.user_id !== user?.id) {
      const stream = remoteScreenStreams.get(p.user_id);
      if (stream) {
        screenShares.push({
          userId: p.user_id,
          stream,
          ownerName: p.profile.display_name,
          isLocal: false,
        });
      }
    }
  });

  const hasScreenShares = screenShares.length > 0;

  // Grid class for participants when screen shares are present (compact row)
  const getParticipantGridClass = () => {
    const count = participants.length;
    if (count === 1) return 'grid-cols-1 max-w-[180px]';
    if (count === 2) return 'grid-cols-2 max-w-sm';
    if (count <= 4) return 'grid-cols-4 max-w-xl';
    if (count <= 6) return 'grid-cols-6 max-w-3xl';
    return 'grid-cols-8 max-w-4xl';
  };

  // Grid class for screen shares
  const getScreenGridClass = () => {
    const count = screenShares.length;
    if (count === 1) return 'grid-cols-1 max-w-5xl mx-auto';
    if (count === 2) return 'grid-cols-2 max-w-5xl mx-auto';
    return 'grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto';
  };

  const handleFocus = (target: FocusTarget) => {
    setFocusTarget(prev => {
      if (prev && prev.type === target?.type && prev.userId === target?.userId) return null;
      return target;
    });
  };

  // Render focused view
  if (focusTarget) {
    const isScreenFocus = focusTarget.type === 'screen';
    const participant = participants.find(p => p.user_id === focusTarget.userId);

    let focusStream: MediaStream | null = null;
    let focusName = '';
    let isLocal = false;

    if (isScreenFocus) {
      const share = screenShares.find(s => s.userId === focusTarget.userId);
      focusStream = share?.stream || null;
      focusName = share?.ownerName || '';
      isLocal = share?.isLocal || false;
    } else {
      isLocal = focusTarget.userId === user?.id;
      const cameraStream = isLocal ? localCameraStream : remoteVideoStreams.get(focusTarget.userId);
      focusStream = cameraStream || null;
      focusName = participant?.profile.display_name || '';
    }

    return (
      <div className="flex-1 flex flex-col gap-2 p-3 overflow-hidden">
        {/* Focused content */}
        <div className="flex-1 min-h-0 relative rounded-xl overflow-hidden bg-[hsl(var(--surface-elevated))]">
          {/* Close button */}
          <button
            onClick={() => setFocusTarget(null)}
            className="absolute top-3 right-3 z-20 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {isScreenFocus && focusStream ? (
            <VoiceVideoTile
              stream={focusStream}
              type="screen"
              participantName={focusName}
              isSpeaking={speakingUsers.has(focusTarget.userId)}
              isMuted={participant?.muted || false}
              isLocal={isLocal}
              className="w-full h-full"
            />
          ) : focusStream ? (
            <VoiceVideoTile
              stream={focusStream}
              type="camera"
              participantName={focusName}
              isSpeaking={speakingUsers.has(focusTarget.userId)}
              isMuted={participant?.muted || false}
              isLocal={isLocal}
              className="w-full h-full"
            />
          ) : participant ? (
            <div className="w-full h-full flex items-center justify-center">
              <VoiceParticipantCard
                participant={participant}
                isSpeaking={speakingUsers.has(participant.user_id)}
                audioLevel={audioLevels.get(participant.user_id) || 0}
                gradientIndex={participants.indexOf(participant) % PARTICIPANT_GRADIENTS.length}
              />
            </div>
          ) : null}
        </div>

        {/* Bottom strip: other participants */}
        <div className="flex gap-2 overflow-x-auto pb-1 flex-shrink-0">
          {screenShares.map(share => (
            <button
              key={`screen-${share.userId}`}
              onClick={() => handleFocus({ type: 'screen', userId: share.userId })}
              className={cn(
                'flex-shrink-0 w-28 sm:w-36 rounded-lg overflow-hidden border-2 transition-all',
                focusTarget.type === 'screen' && focusTarget.userId === share.userId
                  ? 'border-primary'
                  : 'border-transparent hover:border-white/20'
              )}
            >
              <VoiceVideoTile
                stream={share.stream}
                type="screen"
                participantName={share.ownerName}
                isSpeaking={false}
                isMuted={false}
                isLocal={share.isLocal}
                className="aspect-video pointer-events-none"
              />
            </button>
          ))}
          {participants.map((participant, index) => {
            const isLocalP = participant.user_id === user?.id;
            const cameraStream = isLocalP ? localCameraStream : remoteVideoStreams.get(participant.user_id);
            const hasCam = !!cameraStream;

            return (
              <button
                key={participant.user_id}
                onClick={() => handleFocus({ type: 'participant', userId: participant.user_id })}
                className={cn(
                  'flex-shrink-0 w-28 sm:w-36 rounded-lg overflow-hidden border-2 transition-all',
                  focusTarget.type === 'participant' && focusTarget.userId === participant.user_id
                    ? 'border-primary'
                    : 'border-transparent hover:border-white/20'
                )}
              >
                {hasCam && cameraStream ? (
                  <VoiceVideoTile
                    stream={cameraStream}
                    type="camera"
                    participantName={participant.profile.display_name}
                    isSpeaking={speakingUsers.has(participant.user_id)}
                    isMuted={participant.muted}
                    isLocal={isLocalP}
                    className="aspect-video pointer-events-none"
                  />
                ) : (
                  <VoiceParticipantCard
                    participant={participant}
                    isSpeaking={speakingUsers.has(participant.user_id)}
                    audioLevel={audioLevels.get(participant.user_id) || 0}
                    gradientIndex={index % PARTICIPANT_GRADIENTS.length}
                    compact
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Normal view with collapsible sections
  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-3 gap-2">
      {/* Screen Shares Section */}
      {hasScreenShares && (
        <Collapsible open={screensOpen} onOpenChange={setScreensOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 px-2 py-1.5 w-full text-left hover:bg-white/5 rounded-md transition-colors group">
            {screensOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <Monitor className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Partages d'écran — {screenShares.length}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className={cn('grid gap-3 mt-2', getScreenGridClass())}>
              {screenShares.map(share => {
                const participant = participants.find(p => p.user_id === share.userId);
                return (
                  <div
                    key={`screen-${share.userId}`}
                    className="relative group cursor-pointer rounded-xl overflow-hidden"
                    onClick={() => handleFocus({ type: 'screen', userId: share.userId })}
                  >
                    <VoiceVideoTile
                      stream={share.stream}
                      type="screen"
                      participantName={share.ownerName}
                      isSpeaking={speakingUsers.has(share.userId)}
                      isMuted={participant?.muted || false}
                      isLocal={share.isLocal}
                      className="aspect-video"
                    />
                    {/* Expand overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Maximize2 className="w-8 h-8 text-white drop-shadow-lg" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Participants Section */}
      <Collapsible open={participantsOpen} onOpenChange={setParticipantsOpen} className="flex-1 flex flex-col">
        <CollapsibleTrigger className="flex items-center gap-2 px-2 py-1.5 w-full text-left hover:bg-white/5 rounded-md transition-colors group">
          {participantsOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Participants — {participants.length}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex-1">
          <div className={cn(
            'grid gap-3 mt-2 mx-auto',
            hasScreenShares ? getParticipantGridClass() : getFullGridClass(participants.length)
          )}>
            {participants.map((participant, index) => {
              const isLocal = participant.user_id === user?.id;
              const hasCameraStream = isLocal 
                ? !!localCameraStream 
                : remoteVideoStreams.has(participant.user_id);
              const cameraStream = isLocal 
                ? localCameraStream 
                : remoteVideoStreams.get(participant.user_id);

              if (hasCameraStream && cameraStream) {
                return (
                  <VoiceParticipantContextMenu
                    key={participant.user_id}
                    participantUserId={participant.user_id}
                    participantName={participant.profile.display_name}
                    onViewProfile={() => handleOpenProfile(participant)}
                  >
                    <div
                      className="relative group cursor-pointer rounded-xl overflow-hidden"
                      onClick={(e) => handleOpenProfile(participant, e)}
                      onDoubleClick={() => handleFocus({ type: 'participant', userId: participant.user_id })}
                    >
                      <VoiceVideoTile
                        stream={cameraStream}
                        type="camera"
                        participantName={participant.profile.display_name}
                        isSpeaking={speakingUsers.has(participant.user_id)}
                        isMuted={participant.muted}
                        isLocal={isLocal}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Maximize2 className="w-6 h-6 text-white drop-shadow-lg" />
                      </div>
                    </div>
                  </VoiceParticipantContextMenu>
                );
              }

              return (
                <VoiceParticipantContextMenu
                  key={participant.user_id}
                  participantUserId={participant.user_id}
                  participantName={participant.profile.display_name}
                  onViewProfile={() => handleOpenProfile(participant)}
                >
                  <VoiceParticipantPopover
                    participant={participant}
                    canModerate={canModerate && !isLocal}
                    volume={getUserVolume(participant.user_id)}
                    onVolumeChange={(vol) => setUserVolume.mutate({ targetUserId: participant.user_id, volume: vol })}
                    onServerMute={(muted) => serverMuteUser.mutate({ channelId, targetUserId: participant.user_id, muted })}
                    onServerDeafen={(deafened) => serverDeafenUser.mutate({ channelId, targetUserId: participant.user_id, deafened })}
                  >
                    <div 
                      className="cursor-pointer group relative"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProfile(participant, e);
                      }}
                      onDoubleClick={() => handleFocus({ type: 'participant', userId: participant.user_id })}
                    >
                      <VoiceParticipantCard
                        participant={participant}
                        isSpeaking={speakingUsers.has(participant.user_id)}
                        audioLevel={audioLevels.get(participant.user_id) || 0}
                        gradientIndex={index % PARTICIPANT_GRADIENTS.length}
                        compact={hasScreenShares}
                      />
                      <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Maximize2 className="w-6 h-6 text-white drop-shadow-lg" />
                      </div>
                    </div>
                  </VoiceParticipantPopover>
                </VoiceParticipantContextMenu>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Profile Popup */}
      <UserProfilePopup
        user={selectedUser}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        mode="card"
        cardPosition={cardPosition}
      />
    </div>
  );
}

// Full grid class when no screen shares
function getFullGridClass(count: number) {
  if (count === 1) return 'grid-cols-1 max-w-lg mx-auto';
  if (count === 2) return 'grid-cols-2 max-w-3xl mx-auto';
  if (count <= 4) return 'grid-cols-2 max-w-4xl mx-auto';
  if (count <= 6) return 'grid-cols-3 max-w-5xl mx-auto';
  if (count <= 9) return 'grid-cols-3 lg:grid-cols-4 max-w-6xl mx-auto';
  return 'grid-cols-4 lg:grid-cols-5 max-w-7xl mx-auto';
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
              'absolute -bottom-1 -right-1 bg-[hsl(var(--surface-elevated))] rounded-full border-2 border-black/20',
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
