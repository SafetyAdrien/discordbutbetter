import { useState, useMemo, useEffect } from 'react';
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
  useUpdateSelfMute,
  useUpdateStageTopic,
} from '@/hooks/useStageChannel';
import { useStageWebRTC } from '@/hooks/useStageWebRTC';
import { useMultipleChannelPermissions } from '@/hooks/useUserChannelPermissions';
import { soundEffects } from '@/utils/audio/SoundEffects';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { StreamlineStage } from '@/components/icons/StreamlineStage';
import { CreateInviteModal } from '@/components/modals/CreateInviteModal';
import { VoiceChannelChat } from './voice/VoiceChannelChat';
import { StageEventWizard } from './stage/StageEventWizard';
import { StageEndConfirm, StageTopicModal, StageWelcomeModal } from './stage/StageModals';
import { hasSeenStageWelcome } from './stage/stageWelcome';
import { Calendar, Check, ChevronDown, ChevronRight, ChevronUp, Hand, MessageCircle, Mic, MicOff, MoreHorizontal, PhoneOff, Shield, UserPlus, Users, X } from '@/components/icons/discord/lucide';
import type { StageHandRequest, StageParticipant } from '@/types/stage';

interface StageChannelProps {
  channel: {
    id: string;
    name: string;
    description?: string;
  };
  serverId: string;
  /** Hide the internal header bar when a parent shell already renders one. */
  hideHeader?: boolean;
}

/*
 * Salon de conference, d'apres la video de reference :
 *  - sans conference : ecran degrade "En attente du debut de la conference"
 *    avec trois choix (commencer, creer un evenement, continuer sans
 *    commencer) pour qui peut animer ; "Personne ne parle." sinon ;
 *  - conference en cours, pas encore rejoint : titre + Rejoindre / Inviter ;
 *  - rejoint : scene noire, "Intervenants" en tuiles, "Audience" en
 *    avatars, barre de commandes en bas, panneaux lateraux chat et
 *    demandes de prise de parole.
 */

const STAGE_GRADIENT =
  'radial-gradient(120% 90% at 50% 115%, #4b56d6 0%, #2b2f9c 30%, #161865 55%, #0b0c24 80%, #08080f 100%)';

type Panel = 'chat' | 'requests' | null;

export function StageChannel({ channel, serverId, hideHeader = false }: StageChannelProps) {
  const { user, profile } = useAuth();
  const [panel, setPanel] = useState<Panel>(null);
  const [showSpeakers, setShowSpeakers] = useState(true);
  const [showAudience, setShowAudience] = useState(true);
  const [topicModal, setTopicModal] = useState<null | 'start' | 'edit'>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(() => !hasSeenStageWelcome());

  // Reactive permissions check
  const { can: canPerm } = useMultipleChannelPermissions(channel.id, [
    'start_stage_session',
    'end_stage_session',
    'moderate_stage',
  ]);
  const canStartSession = canPerm('start_stage_session');
  const canEndSession = canPerm('end_stage_session');
  const canModerateStage = canPerm('moderate_stage');
  const canModerate = canModerateStage || canStartSession || canEndSession;

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
  const updateTopic = useUpdateStageTopic();

  // Derived state
  const myParticipation = useMemo(() => participants.find((p) => p.user_id === user?.id), [participants, user?.id]);
  const myHandRequest = useMemo(() => handRequests.find((r) => r.user_id === user?.id), [handRequests, user?.id]);
  const speakers = useMemo(() => participants.filter((p) => p.role === 'speaker' || p.role === 'moderator'), [participants]);
  const audience = useMemo(() => participants.filter((p) => p.role === 'audience'), [participants]);

  const isModerator = myParticipation?.role === 'moderator';
  const isSpeaker = myParticipation?.role === 'speaker' || isModerator;
  const isLive = session?.status === 'live';
  const isPreLive = session?.status === 'pre_live';
  const title = session?.title || channel.name;

  // WebRTC for real-time audio
  const { speakingUsers } = useStageWebRTC({
    sessionId: session?.id || null,
    isSpeaker,
    isMuted: myParticipation?.is_muted ?? true,
    isLive,
  });

  // Pre-live music management
  useEffect(() => {
    if (isPreLive && myParticipation && !isModerator) {
      soundEffects.playPreLiveMusic();
    } else {
      soundEffects.stopPreLiveMusic();
    }
    return () => {
      soundEffects.stopPreLiveMusic();
    };
  }, [isPreLive, myParticipation, isModerator]);

  // Handlers
  const handleStartWithTopic = async (topic: string) => {
    try {
      if (session && isModerator) {
        // "Continuer sans commencer" avait deja ouvert la session : on fixe
        // le sujet puis on passe en direct.
        await updateTopic.mutateAsync({ sessionId: session.id, channelId: channel.id, title: topic });
        if (isPreLive) goLive.mutate({ sessionId: session.id, channelId: channel.id });
      } else {
        const created = await startSession.mutateAsync({ channelId: channel.id, title: topic });
        if (created?.id) goLive.mutate({ sessionId: created.id, channelId: channel.id });
      }
      setTopicModal(null);
    } catch {
      /* les hooks affichent deja l'erreur */
    }
  };

  const handleEditTopic = (topic: string) => {
    if (!session) return;
    updateTopic.mutate({ sessionId: session.id, channelId: channel.id, title: topic }, { onSuccess: () => setTopicModal(null) });
  };

  const handleContinueWithoutStarting = () => {
    startSession.mutate({ channelId: channel.id, title: channel.name });
  };

  const handleConfirmEnd = () => {
    if (session) endSession.mutate({ sessionId: session.id, channelId: channel.id });
    setEndOpen(false);
  };

  const handleJoin = () => {
    if (session) joinStage.mutate(session.id);
  };

  const handleLeave = () => {
    if (session) leaveStage.mutate(session.id);
  };

  const handleRaiseHand = () => {
    if (!session) return;
    if (myHandRequest) lowerHand.mutate(session.id);
    else raiseHand.mutate(session.id);
  };

  const handleToggleMute = () => {
    if (session && myParticipation) {
      updateSelfMute.mutate({ sessionId: session.id, muted: !myParticipation.is_muted });
    }
  };

  const handleMoveToAudience = () => {
    if (session && user) changeRole.mutate({ sessionId: session.id, userId: user.id, role: 'audience' });
  };

  const togglePanel = (next: Exclude<Panel, null>) => setPanel((p) => (p === next ? null : next));

  // Which screen to show
  type View = 'loading' | 'start' | 'idle' | 'join' | 'waiting' | 'stage';
  const view: View = sessionLoading
    ? 'loading'
    : !session
      ? canModerate
        ? 'start'
        : 'idle'
      : !myParticipation
        ? 'join'
        : isPreLive && !isModerator
          ? 'waiting'
          : 'stage';

  const onGradient = view === 'start' || view === 'idle' || view === 'join' || view === 'waiting';

  return (
    <div className="flex-1 flex min-w-0 min-h-0 w-full overflow-hidden bg-black">
      <div className="flex-1 flex flex-col min-w-0 relative" style={onGradient ? { background: STAGE_GRADIENT } : undefined}>
        {!hideHeader && (
          <StageHeader
            title={view === 'stage' || view === 'join' ? title : channel.name}
            speakersCount={speakers.length}
            listenersCount={audience.length}
            dimmed={view === 'start' || view === 'idle'}
            canModerate={(canModerate || isModerator) && view === 'stage'}
            pendingRequests={handRequests.length}
            panel={panel}
            onToggle={togglePanel}
          />
        )}

        {view === 'loading' && <div className="flex-1" />}

        {view === 'start' && (
          <StartScreen
            onStart={() => setTopicModal('start')}
            onCreateEvent={() => setEventOpen(true)}
            onContinue={handleContinueWithoutStarting}
            pending={startSession.isPending}
            waitingName={profile?.display_name}
            waitingAvatar={profile?.avatar_url}
          />
        )}

        {view === 'idle' && (
          <CenteredInfo title={channel.name} subtitle="Personne ne parle.">
            <Button variant="secondary" className="bg-black/40 hover:bg-black/60 text-white" onClick={() => setInviteOpen(true)}>
              Inviter
            </Button>
          </CenteredInfo>
        )}

        {view === 'join' && (
          <CenteredInfo
            title={title}
            subtitle={speakers.length > 0 ? `${speakers.length} en train de parler · ${audience.length} en écoute` : 'Personne ne parle.'}
          >
            <Button className="bg-white text-black hover:bg-white/90" onClick={handleJoin} disabled={joinStage.isPending}>
              Rejoindre la conférence
            </Button>
            <Button variant="secondary" className="bg-black/40 hover:bg-black/60 text-white" onClick={() => setInviteOpen(true)}>
              Inviter
            </Button>
          </CenteredInfo>
        )}

        {view === 'waiting' && (
          <CenteredInfo title="En attente du début de la conférence" subtitle={`${channel.name} va bientôt commencer.`} large />
        )}

        {view === 'stage' && (
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 pb-28">
            <SectionHeader
              icon={Mic}
              label={`Intervenants — ${speakers.length}`}
              open={showSpeakers}
              onToggle={() => setShowSpeakers((v) => !v)}
            />
            {showSpeakers && (
              <div className="flex flex-wrap justify-center gap-2 py-4">
                {speakers.map((speaker) => (
                  <SpeakerTile
                    key={speaker.id}
                    participant={speaker}
                    isMe={speaker.user_id === user?.id}
                    canModerate={isModerator}
                    isSpeaking={speakingUsers.has(speaker.user_id) && !speaker.is_muted}
                    onMute={(muted) => session && toggleMute.mutate({ sessionId: session.id, participantId: speaker.id, muted })}
                    onDemote={() => session && changeRole.mutate({ sessionId: session.id, userId: speaker.user_id, role: 'audience' })}
                  />
                ))}
              </div>
            )}

            {audience.length > 0 && (
              <>
                <SectionHeader
                  icon={Users}
                  label={`Audience — ${audience.length}`}
                  open={showAudience}
                  onToggle={() => setShowAudience((v) => !v)}
                />
                {showAudience && (
                  <div className="flex flex-wrap gap-4 py-4">
                    {audience.map((member) => (
                      <AudienceMember
                        key={member.id}
                        participant={member}
                        canModerate={isModerator}
                        onPromote={() => session && changeRole.mutate({ sessionId: session.id, userId: member.user_id, role: 'speaker' })}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Animateur en pre-live : invitation a lancer la conference */}
            {isModerator && isPreLive && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-24 w-[min(480px,calc(100%-32px))]">
                <OptionCard
                  icon={StreamlineStage}
                  title="Commencer la conférence"
                  description="Choisis un sujet pour commencer la conversation."
                  onClick={() => setTopicModal('start')}
                />
              </div>
            )}

            <StageControls
              isSpeaker={isSpeaker}
              isModerator={isModerator}
              isMuted={myParticipation?.is_muted ?? true}
              handRaised={!!myHandRequest}
              canRaiseHand={isLive}
              canEnd={canEndSession || isModerator}
              onToggleMute={handleToggleMute}
              onRaiseHand={handleRaiseHand}
              onMoveToAudience={handleMoveToAudience}
              onInvite={() => setInviteOpen(true)}
              onEditTopic={() => setTopicModal('edit')}
              onLeave={handleLeave}
              onEnd={() => setEndOpen(true)}
            />
          </div>
        )}
      </div>

      {panel === 'chat' && (
        <VoiceChannelChat channelId={channel.id} channelName={channel.name} serverId={serverId} onClose={() => setPanel(null)} />
      )}
      {panel === 'requests' && (
        <RequestsPanel
          requests={handRequests}
          onClose={() => setPanel(null)}
          onDecide={(requestId, userId, approved) =>
            session && handleHandRequest.mutate({ requestId, sessionId: session.id, userId, approved })
          }
        />
      )}

      <StageWelcomeModal open={welcomeOpen} onClose={() => setWelcomeOpen(false)} />
      <StageTopicModal
        open={topicModal !== null}
        mode={topicModal ?? 'start'}
        initialTopic={topicModal === 'edit' ? session?.title ?? '' : ''}
        pending={startSession.isPending || updateTopic.isPending}
        onClose={() => setTopicModal(null)}
        onSubmit={topicModal === 'edit' ? handleEditTopic : handleStartWithTopic}
      />
      <StageEventWizard open={eventOpen} onClose={() => setEventOpen(false)} serverId={serverId} stageChannel={channel} />
      <StageEndConfirm open={endOpen} onClose={() => setEndOpen(false)} onConfirm={handleConfirmEnd} />
      {inviteOpen && <CreateInviteModal serverId={serverId} channelName={channel.name} onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

function StageHeader({
  title,
  speakersCount,
  listenersCount,
  dimmed,
  canModerate,
  pendingRequests,
  panel,
  onToggle,
}: {
  title: string;
  speakersCount: number;
  listenersCount: number;
  dimmed: boolean;
  canModerate: boolean;
  pendingRequests: number;
  panel: Panel;
  onToggle: (p: Exclude<Panel, null>) => void;
}) {
  const iconBtn = 'relative p-0.5 text-[hsl(var(--header-icon))] hover:text-white transition-colors';
  return (
    <div className="h-12 shrink-0 px-4 flex items-center gap-2 border-b border-white/[0.06]">
      <StreamlineStage className={cn('w-5 h-5 shrink-0', dimmed ? 'text-white/40' : 'text-[hsl(var(--header-icon))]')} />
      <span className={cn('text-base font-semibold truncate', dimmed ? 'text-white/50' : 'text-white')}>{title}</span>
      <span className={cn('hidden md:flex items-center gap-1 text-sm shrink-0', dimmed ? 'text-white/30' : 'text-[hsl(var(--header-icon))]')}>
        <Mic className="w-4 h-4" />
        {speakersCount} {speakersCount > 1 ? 'personnes en train de parler' : 'en train de parler'}
      </span>
      <span className={cn('hidden md:flex items-center gap-1 text-sm shrink-0', dimmed ? 'text-white/30' : 'text-[hsl(var(--header-icon))]')}>
        <Users className="w-4 h-4" />
        {listenersCount} en écoute
      </span>
      <div className="ml-auto flex items-center gap-4">
        {canModerate && (
          <button type="button" aria-label="Demandes de prise de parole" onClick={() => onToggle('requests')} className={cn(iconBtn, panel === 'requests' && 'text-white')}>
            <Hand className="w-5 h-5" />
            {pendingRequests > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
                {pendingRequests}
              </span>
            )}
          </button>
        )}
        <button type="button" aria-label="Afficher le chat" onClick={() => onToggle('chat')} className={cn(iconBtn, panel === 'chat' && 'text-white')}>
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function OptionCard({
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full min-h-[68px] px-4 py-3 flex items-center gap-4 rounded-lg bg-black/50 hover:bg-black/70 text-left transition-colors disabled:opacity-60"
    >
      <Icon className="w-5 h-5 shrink-0 text-white" />
      <span className="flex-1 min-w-0">
        <span className="block text-base font-semibold leading-5 text-white">{title}</span>
        <span className="block mt-0.5 text-[13px] leading-4 text-white/80">{description}</span>
      </span>
      <ChevronRight className="w-5 h-5 shrink-0 text-white/80" />
    </button>
  );
}

function StartScreen({
  onStart,
  onCreateEvent,
  onContinue,
  pending,
  waitingName,
  waitingAvatar,
}: {
  onStart: () => void;
  onCreateEvent: () => void;
  onContinue: () => void;
  pending: boolean;
  waitingName?: string;
  waitingAvatar?: string | null;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <h2 className="text-[32px] leading-10 font-medium text-white">En attente du début de la conférence</h2>
      <p className="mt-2 text-xl text-white/90">De quoi vas-tu parler aujourd'hui ?</p>
      <div className="mt-8 w-full max-w-[480px] flex flex-col gap-2">
        <OptionCard icon={StreamlineStage} title="Commencer la conférence" description="Choisis un sujet pour commencer la conversation." onClick={onStart} disabled={pending} />
        <OptionCard icon={Calendar} title="Créer un événement" description="Programmer une conférence à une date ultérieure." onClick={onCreateEvent} />
        <OptionCard icon={Mic} title="Continuer sans commencer" description="Vérifications du micro. Commence quand tu es prêt(e)." onClick={onContinue} disabled={pending} />
      </div>
      {waitingName && (
        <p className="mt-6 flex items-center gap-2 text-base text-white/90">
          <Avatar className="w-5 h-5">
            <AvatarImage src={waitingAvatar ?? undefined} />
            <AvatarFallback className="text-[10px]">{waitingName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          {waitingName} attend.
        </p>
      )}
    </div>
  );
}

function CenteredInfo({
  title,
  subtitle,
  large,
  children,
}: {
  title: string;
  subtitle: string;
  large?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <h2 className={cn('font-medium text-white break-words', large ? 'text-[32px] leading-10' : 'text-2xl')}>{title}</h2>
      <p className={cn('mt-1 text-white/90', large ? 'text-xl' : 'text-base')}>{subtitle}</p>
      {children && <div className="mt-5 flex items-center gap-3">{children}</div>}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  open,
  onToggle,
}: {
  icon: React.ElementType;
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full h-12 flex items-center gap-3 border-b border-white/[0.08] text-white"
    >
      <Icon className="w-5 h-5" />
      <span className="flex-1 text-left text-base font-semibold">{label}</span>
      {open ? <ChevronDown className="w-5 h-5 text-white/80" /> : <ChevronUp className="w-5 h-5 text-white/80" />}
    </button>
  );
}

function SpeakerTile({
  participant,
  isMe,
  canModerate,
  isSpeaking,
  onMute,
  onDemote,
}: {
  participant: StageParticipant;
  isMe: boolean;
  canModerate: boolean;
  isSpeaking: boolean;
  onMute: (muted: boolean) => void;
  onDemote: () => void;
}) {
  const name = participant.profile?.display_name ?? 'Membre';
  const isStageModerator = participant.role === 'moderator';
  const tile = (
    <div
      className={cn(
        'relative w-[236px] h-[132px] rounded-lg overflow-hidden flex items-center justify-center',
        'bg-gradient-to-br from-[#1c2a8c] to-[#0d1450]',
        isSpeaking && 'ring-2 ring-[hsl(var(--online))]',
        canModerate && !isMe && 'cursor-pointer',
      )}
    >
      <Avatar className={cn('w-20 h-20', isSpeaking && 'ring-[3px] ring-[hsl(var(--online))] ring-offset-2 ring-offset-[#14207a]')}>
        <AvatarImage src={participant.profile?.avatar_url} />
        <AvatarFallback className="text-2xl">{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      {isStageModerator && (
        <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white flex items-center justify-center" title="Modérateur de la conférence">
          <Shield className="w-4 h-4 text-black" fill="currentColor" />
        </span>
      )}
      <span className="absolute left-2 bottom-2 max-w-[calc(100%-16px)] h-7 px-2 rounded-md bg-black/60 flex items-center gap-1.5 text-sm font-medium text-white">
        {participant.is_muted && <MicOff className="w-4 h-4 shrink-0 text-[hsl(var(--voice-muted))]" />}
        <span className="truncate">{name}{isMe && ' (toi)'}</span>
      </span>
    </div>
  );

  if (!canModerate || isMe) return tile;
  return (
    <Popover>
      <PopoverTrigger asChild>{tile}</PopoverTrigger>
      <PopoverContent className="w-52 p-1.5">
        <button type="button" onClick={() => onMute(!participant.is_muted)} className="w-full flex items-center gap-2 px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
          {participant.is_muted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          {participant.is_muted ? 'Réactiver le micro' : 'Couper le micro'}
        </button>
        {!isStageModerator && (
          <button type="button" onClick={onDemote} className="w-full flex items-center gap-2 px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-destructive hover:bg-[hsl(var(--destructive)/0.12)] transition-colors">
            <ChevronDown className="w-4 h-4" />
            Déplacer vers l'audience
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function AudienceMember({
  participant,
  canModerate,
  onPromote,
}: {
  participant: StageParticipant;
  canModerate: boolean;
  onPromote: () => void;
}) {
  const name = participant.profile?.display_name ?? 'Membre';
  const content = (
    <div className={cn('w-16 flex flex-col items-center gap-1.5', canModerate && 'cursor-pointer')}>
      <Avatar className="w-14 h-14">
        <AvatarImage src={participant.profile?.avatar_url} />
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="w-full truncate text-center text-xs text-white/80">{name}</span>
    </div>
  );
  if (!canModerate) return content;
  return (
    <Popover>
      <PopoverTrigger asChild>{content}</PopoverTrigger>
      <PopoverContent className="w-52 p-1.5">
        <button type="button" onClick={onPromote} className="w-full flex items-center gap-2 px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
          <ChevronUp className="w-4 h-4" />
          Inviter à parler
        </button>
      </PopoverContent>
    </Popover>
  );
}

function StageControls({
  isSpeaker,
  isModerator,
  isMuted,
  handRaised,
  canRaiseHand,
  canEnd,
  onToggleMute,
  onRaiseHand,
  onMoveToAudience,
  onInvite,
  onEditTopic,
  onLeave,
  onEnd,
}: {
  isSpeaker: boolean;
  isModerator: boolean;
  isMuted: boolean;
  handRaised: boolean;
  canRaiseHand: boolean;
  canEnd: boolean;
  onToggleMute: () => void;
  onRaiseHand: () => void;
  onMoveToAudience: () => void;
  onInvite: () => void;
  onEditTopic: () => void;
  onLeave: () => void;
  onEnd: () => void;
}) {
  const btn = 'h-12 w-14 flex items-center justify-center text-white hover:bg-white/10 transition-colors';
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-5 flex items-center gap-2">
      <div className="flex items-center rounded-lg overflow-hidden bg-[#1e1f24]">
        {isSpeaker ? (
          <button
            type="button"
            aria-label={isMuted ? 'Réactiver le micro' : 'Couper le micro'}
            onClick={onToggleMute}
            className={cn(btn, isMuted && 'bg-[hsl(var(--voice-muted-background))] text-[hsl(var(--voice-muted))] hover:bg-[hsl(var(--voice-muted-background))] hover:brightness-110')}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
        ) : (
          <button
            type="button"
            aria-label={handRaised ? 'Baisser la main' : 'Demander la parole'}
            onClick={onRaiseHand}
            disabled={!canRaiseHand}
            className={cn(btn, handRaised && 'bg-white text-black hover:bg-white/90', !canRaiseHand && 'opacity-50')}
          >
            <Hand className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="flex items-center rounded-lg overflow-hidden bg-[#1e1f24]">
        {isSpeaker && !isModerator && (
          <button type="button" aria-label="Cesser la prise de parole" title="Cesser la prise de parole" onClick={onMoveToAudience} className={btn}>
            <Users className="w-6 h-6" />
          </button>
        )}
        <button type="button" aria-label="Inviter" title="Inviter" onClick={onInvite} className={btn}>
          <UserPlus className="w-6 h-6" />
        </button>
        {isModerator && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Plus d'options" className={btn}>
                <MoreHorizontal className="w-6 h-6" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="center">
              <DropdownMenuItem onClick={onEditTopic}>Modifier la conférence</DropdownMenuItem>
              {canEnd && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onEnd}>
                    Terminer la conférence
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex items-center rounded-lg overflow-hidden bg-[#da373c]">
        <button type="button" aria-label="Se déconnecter en silence" title="Se déconnecter en silence" onClick={onLeave} className="h-12 w-14 flex items-center justify-center text-white hover:bg-black/10 transition-colors">
          <PhoneOff className="w-6 h-6" />
        </button>
        {canEnd && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Options de sortie" className="h-12 w-7 flex items-center justify-center text-white border-l border-black/15 hover:bg-black/10 transition-colors">
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end">
              <DropdownMenuItem onClick={onLeave}>Quitter la conférence</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onEnd}>
                Terminer la conférence pour tout le monde
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function RequestsPanel({
  requests,
  onClose,
  onDecide,
}: {
  requests: StageHandRequest[];
  onClose: () => void;
  onDecide: (requestId: string, userId: string, approved: boolean) => void;
}) {
  return (
    <div className="w-[360px] shrink-0 border-l border-white/10 bg-background flex flex-col">
      <div className="h-12 shrink-0 px-4 flex items-center gap-2 border-b border-border">
        <Hand className="w-5 h-5 text-[hsl(var(--header-icon))]" />
        <span className="flex-1 text-base font-semibold text-white truncate">Demandes de prise de parole</span>
        <button type="button" aria-label="Fermer" onClick={onClose} className="text-[hsl(var(--header-icon))] hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="px-4 pt-4 pb-2 text-sm font-semibold text-foreground">Demandes de prise de parole</p>
      {requests.length === 0 ? (
        <div className="flex flex-col items-center text-center px-6 pt-8">
          <span className="w-16 h-16 rounded-full bg-[hsl(var(--surface-card))] flex items-center justify-center">
            <StreamlineStage className="w-8 h-8 text-[hsl(var(--header-icon))]" />
          </span>
          <p className="mt-4 text-xl font-semibold text-white">Aucune demande</p>
          <p className="mt-1 text-sm text-foreground">Les demandes de prise de parole apparaîtront ici.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center gap-3 h-12 px-2 rounded-lg hover:bg-[hsl(var(--interactive-background-hover))]">
              <Avatar className="w-8 h-8">
                <AvatarImage src={r.profile?.avatar_url} />
                <AvatarFallback>{r.profile?.display_name?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span translate="no" className="flex-1 truncate text-base text-foreground">{r.profile?.display_name}</span>
              <button type="button" aria-label="Accepter" onClick={() => onDecide(r.id, r.user_id, true)} className="w-8 h-8 rounded-full bg-[hsl(var(--surface-card))] text-[hsl(var(--online))] hover:brightness-125 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </button>
              <button type="button" aria-label="Refuser" onClick={() => onDecide(r.id, r.user_id, false)} className="w-8 h-8 rounded-full bg-[hsl(var(--surface-card))] text-destructive hover:brightness-125 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
