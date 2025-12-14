import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useStageSession, 
  useStageParticipants, 
  useStageHandRequests,
  useStartStageSession,
  useGoLive,
  useEndStageSession,
  useJoinStage,
  useLeaveStage,
  useRaiseHand,
  useLowerHand,
  useHandleHandRequest,
  useChangeParticipantRole,
  useToggleParticipantMute,
  useUpdateSelfMute
} from '@/hooks/useStageChannel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Mic, 
  MicOff, 
  Hand, 
  Users, 
  Play, 
  Square, 
  LogOut, 
  LogIn,
  Crown,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Radio,
  Music
} from 'lucide-react';
import type { StageParticipant, StageHandRequest } from '@/types/stage';

interface StageChannelProps {
  channel: {
    id: string;
    name: string;
    description?: string;
  };
  serverId: string;
  canModerate: boolean;
}

export function StageChannel({ channel, serverId, canModerate }: StageChannelProps) {
  const { user } = useAuth();
  const [showAudience, setShowAudience] = useState(true);
  
  // Data hooks
  const { data: session, isLoading: sessionLoading } = useStageSession(channel.id);
  const { data: participants = [] } = useStageParticipants(session?.id || null);
  const { data: handRequests = [] } = useStageHandRequests(session?.id || null);
  
  // Mutations
  const startSession = useStartStageSession();
  const goLive = useGoLive();
  const endSession = useEndStageSession();
  const joinStage = useJoinStage();
  const leaveStage = useLeaveStage();
  const raiseHand = useRaiseHand();
  const lowerHand = useLowerHand();
  const handleHandRequest = useHandleHandRequest();
  const changeRole = useChangeParticipantRole();
  const toggleMute = useToggleParticipantMute();
  const updateSelfMute = useUpdateSelfMute();

  // Derived state
  const myParticipation = useMemo(() => 
    participants.find(p => p.user_id === user?.id),
    [participants, user?.id]
  );
  
  const myHandRequest = useMemo(() =>
    handRequests.find(r => r.user_id === user?.id),
    [handRequests, user?.id]
  );

  const speakers = useMemo(() => 
    participants.filter(p => p.role === 'speaker' || p.role === 'moderator'),
    [participants]
  );
  
  const audience = useMemo(() => 
    participants.filter(p => p.role === 'audience'),
    [participants]
  );

  const isModerator = myParticipation?.role === 'moderator';
  const isSpeaker = myParticipation?.role === 'speaker' || isModerator;
  const isLive = session?.status === 'live';
  const isPreLive = session?.status === 'pre_live';

  // Handlers
  const handleStartSession = () => {
    startSession.mutate({ channelId: channel.id, title: channel.name });
  };

  const handleGoLive = () => {
    if (session) goLive.mutate(session.id);
  };

  const handleEndSession = () => {
    if (session) endSession.mutate(session.id);
  };

  const handleJoin = () => {
    if (session) joinStage.mutate(session.id);
  };

  const handleLeave = () => {
    if (session) leaveStage.mutate(session.id);
  };

  const handleRaiseHand = () => {
    if (session) {
      if (myHandRequest) {
        lowerHand.mutate(session.id);
      } else {
        raiseHand.mutate(session.id);
      }
    }
  };

  const handleToggleMute = () => {
    if (session && myParticipation) {
      updateSelfMute.mutate({ sessionId: session.id, muted: !myParticipation.is_muted });
    }
  };

  // No session state
  if (!session && !sessionLoading) {
    return (
      <div className="flex-1 flex flex-col bg-background">
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center px-4">
          <Radio className="w-5 h-5 mr-2 text-muted-foreground" />
          <span className="font-semibold">{channel.name}</span>
        </div>
        
        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Radio className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Aucune session en cours</h3>
              <p className="text-sm text-muted-foreground">
                {canModerate ? 'Démarrez une session pour commencer.' : 'Attendez qu\'un modérateur démarre une session.'}
              </p>
            </div>
            {canModerate && (
              <Button onClick={handleStartSession} disabled={startSession.isPending}>
                <Play className="w-4 h-4 mr-2" />
                Démarrer une session
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header with status */}
      <div className={cn(
        "h-12 border-b flex items-center px-4 justify-between transition-colors",
        isLive ? "bg-[hsl(var(--online))]/10 border-[hsl(var(--online))]" : "border-border"
      )}>
        <div className="flex items-center gap-2">
          <Radio className={cn("w-5 h-5", isLive && "text-[hsl(var(--online))] animate-pulse")} />
          <span className="font-semibold">{channel.name}</span>
          {isLive && (
            <Badge variant="secondary" className="bg-[hsl(var(--online))] text-white text-xs">
              EN DIRECT
            </Badge>
          )}
          {isPreLive && (
            <Badge variant="secondary" className="text-xs">
              PRÉ-LIVE
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            <Users className="w-4 h-4 inline mr-1" />
            {participants.length}
          </span>
          
          {isModerator && (
            <>
              {isPreLive && (
                <Button size="sm" onClick={handleGoLive} className="bg-[hsl(var(--online))] hover:bg-[hsl(var(--online))]/90">
                  <Play className="w-4 h-4 mr-1" />
                  Passer en direct
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={handleEndSession}>
                <Square className="w-4 h-4 mr-1" />
                Terminer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Pre-live waiting screen */}
      {isPreLive && !isModerator && (
        <div className="flex-1 flex items-center justify-center bg-muted/30">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Music className="w-12 h-12 text-muted-foreground animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Session en préparation</h3>
              <p className="text-sm text-muted-foreground">
                Les modérateurs préparent la session. Veuillez patienter...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main stage area */}
      {(isLive || isModerator) && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Speakers Grid */}
          <div className="flex-1 p-4">
            <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
              Sur scène — {speakers.length}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {speakers.map(speaker => (
                <SpeakerCard
                  key={speaker.id}
                  participant={speaker}
                  isMe={speaker.user_id === user?.id}
                  isModerator={isModerator}
                  sessionId={session?.id || ''}
                  onMute={(muted) => toggleMute.mutate({ sessionId: session?.id || '', participantId: speaker.id, muted })}
                  onDemote={() => changeRole.mutate({ sessionId: session?.id || '', userId: speaker.user_id, role: 'audience' })}
                />
              ))}
            </div>

            {/* Hand requests (moderator only) */}
            {isModerator && handRequests.length > 0 && (
              <div className="mt-6">
                <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                  <Hand className="w-4 h-4" />
                  Demandes de parole — {handRequests.length}
                </div>
                <div className="flex flex-wrap gap-2">
                  {handRequests.map(request => (
                    <div key={request.id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={request.profile?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {request.profile?.display_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{request.profile?.display_name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-[hsl(var(--online))]"
                        onClick={() => handleHandRequest.mutate({
                          requestId: request.id,
                          sessionId: session?.id || '',
                          userId: request.user_id,
                          approved: true
                        })}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        onClick={() => handleHandRequest.mutate({
                          requestId: request.id,
                          sessionId: session?.id || '',
                          userId: request.user_id,
                          approved: false
                        })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Audience section (collapsible) */}
          <div className="border-t border-border">
            <button
              onClick={() => setShowAudience(!showAudience)}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Audience — {audience.length}
              </span>
              {showAudience ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            
            {showAudience && audience.length > 0 && (
              <ScrollArea className="h-32">
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                  {audience.map(member => (
                    <AudienceMember
                      key={member.id}
                      participant={member}
                      isModerator={isModerator}
                      onPromote={() => changeRole.mutate({ sessionId: session?.id || '', userId: member.user_id, role: 'speaker' })}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="h-16 border-t border-border bg-muted/30 flex items-center justify-center gap-3 px-4">
        {!myParticipation ? (
          <Button onClick={handleJoin} disabled={joinStage.isPending}>
            <LogIn className="w-4 h-4 mr-2" />
            Rejoindre
          </Button>
        ) : (
          <>
            {isSpeaker && (
              <Button
                variant={myParticipation.is_muted ? 'secondary' : 'default'}
                size="icon"
                className="rounded-full w-12 h-12"
                onClick={handleToggleMute}
              >
                {myParticipation.is_muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
            )}
            
            {!isSpeaker && isLive && (
              <Button
                variant={myHandRequest ? 'default' : 'secondary'}
                onClick={handleRaiseHand}
                className={cn(myHandRequest && 'bg-amber-500 hover:bg-amber-600')}
              >
                <Hand className="w-4 h-4 mr-2" />
                {myHandRequest ? 'Main levée' : 'Lever la main'}
              </Button>
            )}
            
            <Button variant="destructive" onClick={handleLeave}>
              <LogOut className="w-4 h-4 mr-2" />
              Quitter
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// Speaker card component
function SpeakerCard({
  participant,
  isMe,
  isModerator,
  sessionId,
  onMute,
  onDemote
}: {
  participant: StageParticipant;
  isMe: boolean;
  isModerator: boolean;
  sessionId: string;
  onMute: (muted: boolean) => void;
  onDemote: () => void;
}) {
  const isSpeakerModerator = participant.role === 'moderator';
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={cn(
          "relative flex flex-col items-center p-4 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors",
          !participant.is_muted && "ring-2 ring-[hsl(var(--online))] ring-offset-2 ring-offset-background"
        )}>
          <Avatar className="w-16 h-16 mb-2">
            <AvatarImage src={participant.profile?.avatar_url} />
            <AvatarFallback className="text-xl">
              {participant.profile?.display_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {isSpeakerModerator && (
            <Crown className="absolute top-2 right-2 w-4 h-4 text-amber-500" />
          )}
          
          <span className="text-sm font-medium truncate max-w-full">
            {participant.profile?.display_name}
            {isMe && ' (Toi)'}
          </span>
          
          <div className="mt-1">
            {participant.is_muted ? (
              <MicOff className="w-4 h-4 text-destructive" />
            ) : (
              <Mic className="w-4 h-4 text-[hsl(var(--online))]" />
            )}
          </div>
        </div>
      </PopoverTrigger>
      
      {isModerator && !isMe && (
        <PopoverContent className="w-48 p-2">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => onMute(!participant.is_muted)}
            >
              {participant.is_muted ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
              {participant.is_muted ? 'Activer le micro' : 'Couper le micro'}
            </Button>
            {!isSpeakerModerator && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive"
                onClick={onDemote}
              >
                <ChevronDown className="w-4 h-4 mr-2" />
                Rétrograder
              </Button>
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

// Audience member component
function AudienceMember({
  participant,
  isModerator,
  onPromote
}: {
  participant: StageParticipant;
  isModerator: boolean;
  onPromote: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5 cursor-pointer hover:bg-muted/80 transition-colors">
          <Avatar className="w-5 h-5">
            <AvatarImage src={participant.profile?.avatar_url} />
            <AvatarFallback className="text-xs">
              {participant.profile?.display_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{participant.profile?.display_name}</span>
        </div>
      </PopoverTrigger>
      
      {isModerator && (
        <PopoverContent className="w-48 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={onPromote}
          >
            <ChevronUp className="w-4 h-4 mr-2" />
            Promouvoir speaker
          </Button>
        </PopoverContent>
      )}
    </Popover>
  );
}
