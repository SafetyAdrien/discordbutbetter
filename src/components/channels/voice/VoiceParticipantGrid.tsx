import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MicOff, HeadphoneOff } from 'lucide-react';

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
  camera?: boolean;
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
}

export function VoiceParticipantGrid({ participants, speakingUsers }: VoiceParticipantGridProps) {
  // Determine grid layout based on participant count
  const getGridClass = () => {
    const count = participants.length;
    if (count === 1) return 'grid-cols-1 max-w-md';
    if (count === 2) return 'grid-cols-2 max-w-2xl';
    if (count <= 4) return 'grid-cols-2 max-w-3xl';
    if (count <= 6) return 'grid-cols-3 max-w-4xl';
    return 'grid-cols-4 max-w-5xl';
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className={cn('grid gap-4 w-full mx-auto', getGridClass())}>
        {participants.map((participant, index) => (
          <VoiceParticipantCard
            key={participant.user_id}
            participant={participant}
            isSpeaking={speakingUsers.has(participant.user_id)}
            gradientIndex={index % PARTICIPANT_GRADIENTS.length}
          />
        ))}
      </div>
    </div>
  );
}

interface VoiceParticipantCardProps {
  participant: Participant;
  isSpeaking: boolean;
  gradientIndex: number;
}

function VoiceParticipantCard({ participant, isSpeaking, gradientIndex }: VoiceParticipantCardProps) {
  const gradient = PARTICIPANT_GRADIENTS[gradientIndex];

  return (
    <div 
      className={cn(
        'relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br',
        gradient,
        'transition-all duration-300',
        isSpeaking && 'ring-4 ring-[hsl(var(--online))] voice-speaking-glow'
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
          <Avatar className="w-20 h-20 border-4 border-white/20">
            <AvatarImage src={participant.profile.avatar_url || undefined} />
            <AvatarFallback className="bg-white/10 text-white text-2xl font-bold">
              {participant.profile.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Mute/Deafen badge */}
          {(participant.muted || participant.deafened) && (
            <div className="absolute -bottom-1 -right-1 bg-[#232428] rounded-full p-1.5 border-2 border-black/20">
              {participant.deafened ? (
                <HeadphoneOff className="w-4 h-4 text-destructive" />
              ) : (
                <MicOff className="w-4 h-4 text-destructive" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Name badge at bottom */}
      <div className="absolute bottom-3 left-3 right-3">
        <div className="inline-flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-md px-2.5 py-1.5">
          <span className="text-sm font-medium text-white truncate">
            {participant.profile.display_name}
          </span>
        </div>
      </div>
    </div>
  );
}
