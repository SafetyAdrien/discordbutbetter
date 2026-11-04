import { useState, useEffect, useRef, lazy, Suspense } from 'react';

const AccountSettingsModal = lazy(() =>
  import('@/components/account-settings/AccountSettingsModal').then((m) => ({ default: m.AccountSettingsModal }))
);
import { useScreenShareInfo } from '@/lib/screenShareInfo';
import { useVoiceChannelStatuses } from '@/hooks/useVoiceChannelStatus';
import { OPEN_VOICE_INVITE_EVENT, OPEN_VOICE_STATUS_EVENT } from '@/lib/invites';
import { cn } from '@/lib/utils';
import { useVoice, useVoiceParticipants, useVoiceLevels } from '@/contexts/VoiceContext';
import { useAuth } from '@/contexts/AuthContext';
import { MemberList } from '@/components/layout/MemberList';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { MessageCircle, UserPlus, Maximize2 } from '@/components/icons/discord/lucide';
import { createDiscordIcon } from '@/components/icons/discord/createDiscordIcon';
import { diApps, diPopOut } from '@/components/icons/discord/discordIconData';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/* Tuile du bas quand on est seul (video de reference) : degrade grenat vers le noir et un trophee. */
function VoiceAloneTile() {
  return (
    <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-b from-[#3a0f40] via-[#12041a] to-black flex items-center justify-center" aria-hidden>
      <svg width="260" height="170" viewBox="0 0 260 170">
        <defs>
          <linearGradient id="vt-cup" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8f9bff" /><stop offset="1" stopColor="#5a46c8" /></linearGradient>
          <linearGradient id="vt-shell" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff5bd0" /><stop offset="1" stopColor="#8a2fc4" /></linearGradient>
        </defs>
        <ellipse cx="130" cy="148" rx="82" ry="10" fill="#000" opacity=".45" />
        <path d="M140 18h56v34c0 22-12 38-28 40-16-2-28-18-28-40z" fill="url(#vt-cup)" />
        <path d="M140 26c-16 0-20 20-4 28M196 26c16 0 20 20 4 28" fill="none" stroke="#6f6fe0" strokeWidth="6" strokeLinecap="round" />
        <path d="M156 92h24l-4 26h-16z" fill="#6a5bd8" />
        <rect x="146" y="116" width="44" height="12" rx="3" fill="#7a63e8" />
        <path d="M168 34l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#4b2fa5" />
        <path d="M40 92c0-30 30-46 62-38 22 6 32 26 22 46-12 22-52 28-72 8-8-6-12-10-12-16z" fill="url(#vt-shell)" />
        <path d="M44 100c20 22 70 22 84-6" fill="none" stroke="#8c9cff" strokeWidth="9" strokeLinecap="round" />
        <path d="M112 118l22-14 16 22-10 20-26-2z" fill="#3fb88a" />
        <path d="M112 118l22-14 4 20z" fill="#9bf0c8" />
      </svg>
    </div>
  );
}

const Activities = createDiscordIcon(diApps, 'VoiceActivitiesChip');
const PopOut = createDiscordIcon(diPopOut, 'VoicePopOut');
import { MarkdownText } from '@/lib/markdown';
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

  // React to initialShowChat prop changes
  useEffect(() => {
    if (initialShowChat) {
      setShowChat(true);
      onChatOpened?.();
    }
  }, [initialShowChat, onChatOpened]);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const { 
    voiceState, 
    joinChannel, 
    leaveChannel, 
    toggleMute, 
    toggleDeafen, 
    speakingUsers,
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
    // Noise suppression
    noiseSuppression,
    setNoiseSuppression,
    rnnoiseAvailable,
    // Mic settings
    micVolume,
    setMicVolume,
    vadSensitivity,
    setVadSensitivity,
    audioFilters,
    setAudioFilter,
  } = useVoice();
  const { audioLevels } = useVoiceLevels();
  
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

  const voiceStatus = useVoiceChannelStatuses(serverId)[channel.id];
  const openInvite = () => window.dispatchEvent(new CustomEvent(OPEN_VOICE_INVITE_EVENT, { detail: channel.id }));
  const openStatus = () => window.dispatchEvent(new CustomEvent(OPEN_VOICE_STATUS_EVENT, { detail: channel.id }));
  const frameRef = useRef<HTMLDivElement>(null);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frameRef.current?.requestFullscreen?.();
  };

  // Comme Discord : sans mouvement de souris pendant ~2,5 s, l'en-tete, les invitations, la barre
  // d'actions et les boutons de coin s'estompent ; le moindre mouvement les fait revenir.
  const [idle, setIdle] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const wake = () => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      // Un menu ouvert (plus d'options, micro...) garde les commandes visibles.
      if (document.querySelector('[role="menu"][data-state="open"], [role="dialog"][data-state="open"]')) return wake();
      setIdle(true);
    }, 2500);
  };
  useEffect(() => {
    if (!isConnectedToThisChannel) { setIdle(false); return; }
    wake();
    return () => clearTimeout(idleTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnectedToThisChannel]);
  const fade = cn('transition-opacity duration-300', idle && isConnectedToThisChannel && 'opacity-0 pointer-events-none');

  const shareInfo = useScreenShareInfo();
  const streamer = isScreenSharing ? participants.find((p) => p.user_id === user?.id) : participants.find((p) => p.streaming);
  const streamerName = streamer?.profile.display_name;

  const showEmpty = !isConnectedToThisChannel && participants.length === 0;

  // En-tete transparent (video de reference) : le fond de la zone (degrade quand le salon est
  // vide, noir une fois connecte) passe derriere lui, sans filet ni couleur propre.
  const header = (
    <header className={cn("h-12 shrink-0 flex items-center justify-between px-3 relative z-10", fade)}>
      <div className="flex items-center gap-2 min-w-0">
        <StreamlineVoice className="w-6 h-6 text-[#b5b7c9] shrink-0" />
        <h2 translate="no" className="text-base font-medium text-[#f2f3f5] truncate">{channel.name}</h2>
        {streamer && (
          <>
            <span className="text-[#6d6f78] mx-1">•</span>
            <span className="flex items-center gap-2 text-base font-medium text-[#f2f3f5] truncate">
              {streamer.profile.avatar_url ? <img src={streamer.profile.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" /> : <span className="w-5 h-5 rounded-full bg-white/[0.12]" />}
              Écran de {streamerName}
            </span>
          </>
        )}
        {channel.description && (
          <span className="text-sm text-[#9b9ca8] ml-2 hidden md:inline truncate max-w-[260px] [&_.markdown-content]:inline [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_p]:inline [&_*]:!m-0">
            <MarkdownText content={channel.description} variant="chat" className="[&_.markdown-content]:text-[#9b9ca8]" />
          </span>
        )}
      </div>
      {voiceStatus && (
        <button type="button" onClick={isConnectedToThisChannel ? openStatus : undefined} className="absolute left-[44px] top-[34px] max-w-[60%] truncate text-xs text-[#9b9ca8] hover:text-[#c9cbd6] text-left">
          {voiceStatus}
        </button>
      )}
      {streamer && (
        <span className="ml-auto mr-3 flex items-center rounded-md overflow-hidden text-xs font-bold shrink-0">
          {isScreenSharing && shareInfo && <span className="h-6 px-2 flex items-center gap-1 bg-black/60 text-white">◉ {shareInfo.label}</span>}
          <span className="h-6 px-2 flex items-center bg-[#da373c] text-white uppercase">En direct</span>
        </span>
      )}
      <button
        type="button"
        aria-label={showChat ? 'Masquer le chat' : 'Afficher le chat'}
        onClick={handleToggleChat}
        className={cn('w-8 h-8 rounded-md flex items-center justify-center text-[#b5b7c9] hover:text-white transition-colors', showChat && 'text-white')}
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </header>
  );

  if (showEmpty) {
    return (
      <div className="flex-1 flex min-w-0 bg-black">
        <div className="flex-1 flex flex-col min-w-0 voice-gradient-bg">
          {header}
          <VoiceEmptyState
            channelName={channel.name}
            onJoin={canConnect ? handleJoinChannel : undefined}
            isConnecting={isConnecting}
            permissionDenied={!canConnect}
          />
        </div>
        {showChat && (
          <VoiceChannelChat
            channelId={channel.id}
            channelName={channel.name}
            serverId={serverId}
            onClose={() => setShowChat(false)}
          />
        )}
      </div>
    );
  }

  // Connecte, ou des participants sont presents : fond noir, tuiles centrees, barre d'actions en bas.
  return (
    <div className="flex-1 flex min-w-0 bg-black">
      <div ref={frameRef} data-idle={idle && isConnectedToThisChannel} onMouseMove={wake} onMouseDown={wake} className="flex-1 flex flex-col relative min-w-0 bg-black">
        {header}
        <div className="flex-1 min-h-0 relative flex flex-col">
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
            footer={isConnectedToThisChannel && participants.length <= 1 ? <VoiceAloneTile /> : undefined}
          />

          {/* Seul dans le salon : les deux invitations de la video (sans backend : "Bientot disponible"). */}
          {isConnectedToThisChannel && participants.length <= 1 && (
            <div className="shrink-0 flex justify-center gap-2 pb-6">
              <button type="button" onClick={openInvite} className="h-10 px-3 rounded-lg bg-white/[0.06] hover:bg-white/10 border border-white/[0.07] text-[15px] font-medium text-[#c9cbd6] flex items-center gap-1.5 transition-colors">
                <UserPlus className="w-5 h-5" />Inviter dans le salon vocal
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-disabled className="h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.07] text-[15px] font-medium text-[#c9cbd6] flex items-center gap-1.5 cursor-default">
                    <Activities className="w-5 h-5" />Choisis une Activité
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Choisis une Activité — Bientôt disponible</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Action Bar - only show if connected */}
          {isConnectedToThisChannel && (
            <div className={fade}>
            <VoiceActionBar
              onOpenSettings={() => setSettingsOpen(true)}
              onInvite={openInvite}
              isMuted={voiceState.isMuted}
              isDeafened={voiceState.isDeafened}
              isCameraOn={isCameraActive}
              isScreenSharing={isScreenSharing}
              showChat={showChat}
              showMembers={showMembers}
              onToggleMute={toggleMute}
              onToggleDeafen={toggleDeafen}
              onToggleCamera={toggleCamera}
              onToggleScreenShare={canStream ? toggleScreenShare : undefined}
              canVideo={canVideo}
              onToggleChat={handleToggleChat}
              onToggleMembers={handleToggleMembers}
              onDisconnect={leaveChannel}
              hasMicrophoneAccess={hasMicrophoneAccess}
              micVolume={micVolume}
              onMicVolumeChange={setMicVolume}
              vadSensitivity={vadSensitivity}
              onVadSensitivityChange={setVadSensitivity}
              noiseSuppression={noiseSuppression}
              onNoiseSuppressionChange={setNoiseSuppression}
              rnnoiseAvailable={rnnoiseAvailable}
              audioFilters={audioFilters}
              onAudioFilterChange={setAudioFilter}
            />
            </div>
          )}

          {isConnectedToThisChannel && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="Inviter dans le salon vocal" onClick={openInvite} className={cn("absolute left-3 bottom-4 w-8 h-8 rounded-md flex items-center justify-center text-[#8d8f9c] hover:text-white transition-opacity duration-300", fade)}>
                    <UserPlus className="w-6 h-6" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Inviter dans le salon vocal</TooltipContent>
              </Tooltip>
              <div className={cn("absolute right-3 bottom-4 flex items-center gap-1", fade)}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Ouvrir dans une fenêtre" aria-disabled className="w-8 h-8 rounded-md flex items-center justify-center text-[#8d8f9c] cursor-default">
                      <PopOut className="w-6 h-6" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Ouvrir dans une fenêtre — Bientôt disponible</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Plein écran" onClick={toggleFullscreen} className="w-8 h-8 rounded-md flex items-center justify-center text-[#8d8f9c] hover:text-white transition-colors">
                      <Maximize2 className="w-6 h-6" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Plein écran</TooltipContent>
                </Tooltip>
              </div>
            </>
          )}

          {/* Join button if not connected but others are in the channel */}
          {!isConnectedToThisChannel && participants.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center">
              <button
                type="button"
                onClick={handleJoinChannel}
                disabled={isConnecting || !canConnect}
                className="h-10 px-4 rounded-lg bg-[#fdfdfd] hover:bg-white text-black text-base font-medium disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {!canConnect ? 'Accès refusé' : isConnecting ? 'Connexion...' : 'Rejoindre le salon vocal'}
              </button>
            </div>
          )}
        </div>
      </div>

      {settingsOpen && (
        <Suspense fallback={null}>
          <AccountSettingsModal onClose={() => setSettingsOpen(false)} initialTab="voice" />
        </Suspense>
      )}

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
  );
}
