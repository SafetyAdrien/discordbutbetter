import { useState } from 'react';
import { toast } from 'sonner';
import { Gamepad2 } from '@/components/icons/discord/lucide';
import { DiscordMic as Mic } from '@/components/icons/DiscordMic';
import { DiscordMicOff as MicOff } from '@/components/icons/DiscordMicOff';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Video, VideoOff, MessageCircle, Users, MoreHorizontal, ChevronDown, UserPlus, Settings, Check } from '@/components/icons/discord/lucide';
import { createDiscordIcon } from '@/components/icons/discord/createDiscordIcon';
import { diApps, diEffects, diHangUp, diScreenShare } from '@/components/icons/discord/discordIconData';
import { useVoiceViewPrefs, setVoiceViewPref } from '@/hooks/useVoiceViewPrefs';
import { useUserSettings } from '@/hooks/useUserSettings';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScreenShareQualityModal } from './ScreenShareQualityModal';
import { MicrophoneSettingsPopover } from './MicrophoneSettingsPopover';
import { useVoice } from '@/contexts/VoiceContext';
import type { ScreenShareOptions } from '@/utils/webrtc/MediaManager';
import type { NoiseSuppressonMode, VADSensitivity } from '@/utils/webrtc/AudioProcessor';

const CALL_REGIONS = ['Automatique', 'Brésil', 'Hong Kong', 'Inde', 'Japon', 'Rotterdam', 'Singapour', 'Afrique du Sud', 'Sydney', 'US Centre', 'US Est', 'US Sud', 'US Ouest'];
const HangUp = createDiscordIcon(diHangUp, 'VoiceHangUp');
const MonitorUp = createDiscordIcon(diScreenShare, 'VoiceScreenShare');
const Activities = createDiscordIcon(diApps, 'VoiceActivities');
const Soundboard = createDiscordIcon(diEffects, 'VoiceSoundboard');

interface VoiceActionBarProps {
  onOpenSettings?: () => void;
  onInvite?: () => void;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  showChat?: boolean;
  showMembers?: boolean;
  /** "dm" : menu "..." de l'appel de MP (affichage, Xbox, region) au lieu de celui d'un salon vocal. */
  variant?: 'channel' | 'dm';
  /** Appele avant de decocher "Afficher ma camera" (confirmation). */
  onHideSelfRequest?: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: (options?: ScreenShareOptions) => void;
  onToggleChat?: () => void;
  onToggleMembers?: () => void;
  onDisconnect: () => void;
  hasMicrophoneAccess: boolean;
  canSpeak?: boolean;
  canVideo?: boolean;
  canStream?: boolean;
  // Mic settings
  micVolume: number;
  onMicVolumeChange: (v: number) => void;
  vadSensitivity: VADSensitivity;
  onVadSensitivityChange: (s: VADSensitivity) => void;
  noiseSuppression: NoiseSuppressonMode;
  onNoiseSuppressionChange: (m: NoiseSuppressonMode) => void;
  rnnoiseAvailable: boolean;
  audioFilters: { deEsser: boolean; lowShelf: boolean; highPass: boolean };
  onAudioFilterChange: (filter: 'deEsser' | 'lowShelf' | 'highPass', enabled: boolean) => void;
}

export function VoiceActionBar({
  onOpenSettings,
  onInvite,
  isMuted,
  isDeafened,
  isCameraOn,
  isScreenSharing,
  showChat = false,
  showMembers = false,
  variant = 'channel',
  onHideSelfRequest,
  onToggleMute,
  onToggleDeafen,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onToggleMembers,
  onDisconnect,
  hasMicrophoneAccess,
  canSpeak = true,
  canVideo = true,
  canStream = true,
  micVolume,
  onMicVolumeChange,
  vadSensitivity,
  onVadSensitivityChange,
  noiseSuppression,
  onNoiseSuppressionChange,
  rnnoiseAvailable,
  audioFilters,
  onAudioFilterChange,
}: VoiceActionBarProps) {
  const [showScreenShareModal, setShowScreenShareModal] = useState(false);
  const prefs = useVoiceViewPrefs();
  const { settings, update } = useUserSettings();
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const loadCameras = () => { navigator.mediaDevices?.enumerateDevices?.().then((d) => setCameras(d.filter((x) => x.kind === 'videoinput'))).catch(() => undefined); };
  const { inputDeviceId, availableInputs, setInputDeviceId, micPermission, refreshDevices, requestMicPermission } = useVoice();


  const handleScreenShareClick = () => {
    if (isScreenSharing) {
      onToggleScreenShare();
    } else {
      setShowScreenShareModal(true);
    }
  };

  const handleScreenShareStart = (options: ScreenShareOptions) => {
    onToggleScreenShare(options);
  };

  const grp = 'flex items-center gap-0.5 p-[5px] rounded-xl bg-black/70 border border-white/[0.07]';
  const btn = (extra?: string) =>
    cn('h-[42px] w-[42px] rounded-lg flex items-center justify-center text-[#dcddea] hover:bg-white/10 active:bg-white/[0.16] transition-colors disabled:opacity-50 disabled:cursor-not-allowed', extra);
  const soon = (label: string, icon: React.ReactNode) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={label} aria-disabled className={cn(btn(), 'cursor-default')}>{icon}</button>
      </TooltipTrigger>
      <TooltipContent side="top">{label} — Bientôt disponible</TooltipContent>
    </Tooltip>
  );

  return (
    <>
      {/* Barre de la video de reference : deux blocs sombres a coins de 12px (micro + camera,
          puis partage / activites / soundboard / plus) et un bouton de deconnexion rouge de 80x50. */}
      <div className="shrink-0 pb-4 pt-3 px-4">
        <div className="flex items-center justify-center gap-2">
          <TooltipProvider delayDuration={0}>
            <div className={grp}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={isMuted ? 'Activer le micro' : 'Couper le micro'}
                    className={btn(cn(isMuted && 'text-[#f5787b]', (!hasMicrophoneAccess || !canSpeak) && 'opacity-50'))}
                    onClick={onToggleMute}
                    disabled={!canSpeak}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {!canSpeak ? 'Permission non accordée' : !hasMicrophoneAccess ? 'Microphone non disponible' : isMuted ? 'Activer le micro' : 'Couper le micro'}
                </TooltipContent>
              </Tooltip>

              <MicrophoneSettingsPopover
                micVolume={micVolume}
                onMicVolumeChange={onMicVolumeChange}
                vadSensitivity={vadSensitivity}
                onVadSensitivityChange={onVadSensitivityChange}
                noiseSuppression={noiseSuppression}
                onNoiseSuppressionChange={onNoiseSuppressionChange}
                rnnoiseAvailable={rnnoiseAvailable}
                enableDeEsser={audioFilters.deEsser}
                onToggleDeEsser={(v) => onAudioFilterChange('deEsser', v)}
                enableLowShelf={audioFilters.lowShelf}
                onToggleLowShelf={(v) => onAudioFilterChange('lowShelf', v)}
                enableHighPass={audioFilters.highPass}
                onToggleHighPass={(v) => onAudioFilterChange('highPass', v)}
                inputDeviceId={inputDeviceId}
                availableInputs={availableInputs}
                onInputDeviceChange={setInputDeviceId}
                micPermission={micPermission}
                onRequestPermission={requestMicPermission}
                onOpenRefresh={refreshDevices}
              >
                <button type="button" aria-label="Paramètres du micro" className="h-[42px] w-6 rounded-lg flex items-center justify-center text-[#dcddea] hover:bg-white/10 transition-colors">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </MicrophoneSettingsPopover>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={isCameraOn ? 'Désactiver la caméra' : 'Activer la caméra'}
                    className={btn(cn(isCameraOn && 'text-[hsl(var(--online))]', !canVideo && 'opacity-50'))}
                    onClick={onToggleCamera}
                  >
                    {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {!canVideo ? 'Permission non accordée' : isCameraOn ? 'Désactiver la caméra' : 'Activer la caméra'}
                </TooltipContent>
              </Tooltip>
              <DropdownMenu modal={false} onOpenChange={(o) => o && loadCameras()}>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label="Paramètres de la caméra" className="h-[42px] w-6 rounded-lg flex items-center justify-center text-[#dcddea] hover:bg-white/10 data-[state=open]:bg-white/10 transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" sideOffset={10} className="w-[272px] p-2 rounded-lg bg-[#3b3b45] border border-white/[0.08]">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="h-auto min-h-[42px] px-2 py-1 rounded-[4px] flex-col items-start justify-center gap-0">
                      <span className="text-[15px] leading-5">Caméra</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {cameras.find((c) => c.deviceId === settings.voice.camera_device)?.label || 'Caméra par défaut'}
                      </span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-[260px] p-2 rounded-lg bg-[#3b3b45] border border-white/[0.08]">
                      {[{ deviceId: 'default', label: 'Caméra par défaut' }, ...cameras.filter((c) => c.deviceId)].map((c) => (
                        <DropdownMenuItem key={c.deviceId} className="h-9 px-2 text-[15px] rounded-[4px] gap-2" onSelect={() => update({ voice: { camera_device: c.deviceId } })}>
                          <span className="flex-1 truncate">{c.label || 'Caméra'}</span>
                          {settings.voice.camera_device === c.deviceId && <span className="w-4 h-4 rounded-full bg-primary shrink-0" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem disabled className="h-9 px-2 text-[15px] rounded-[4px]">Aperçu de la caméra — bientôt</DropdownMenuItem>
                  <DropdownMenuItem className="h-9 px-2 text-[15px] rounded-[4px] gap-2" onSelect={() => onOpenSettings?.()}>
                    <Settings className="w-5 h-5" /> Paramètres vidéo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className={grp}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={isScreenSharing ? 'Arrêter le partage' : "Partager l'écran"}
                    className={btn(cn(isScreenSharing && 'bg-[hsl(var(--online))] text-[#0b2b17] hover:bg-[hsl(var(--online))]/90'))}
                    onClick={handleScreenShareClick}
                    disabled={!canStream}
                  >
                    <MonitorUp className="w-6 h-6" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {!canStream ? 'Permission non accordée' : isScreenSharing ? "Arrêter le partage d'écran" : 'Partage ton écran'}
                </TooltipContent>
              </Tooltip>
              {soon('Choisis une Activité', <Activities className="w-6 h-6" />)}
              {soon('Ouvrir SoundBoard', <Soundboard className="w-6 h-6" />)}
              <DropdownMenu modal={false}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button type="button" aria-label="Plus d'options" className={btn('data-[state=open]:bg-white/10')}>
                        <MoreHorizontal className="w-6 h-6" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">Plus d'options</TooltipContent>
                </Tooltip>
                <DropdownMenuContent side="top" align="end" sideOffset={10} className="w-[304px] p-2 rounded-lg bg-[#3b3b45] border border-white/[0.08] [&>[role=separator]]:my-2 [&>[role=separator]]:bg-white/[0.08]">
                  {variant === 'channel' && (
                    <>
                      <DropdownMenuItem className="h-9 gap-2 px-2 text-[15px] rounded-[4px]" onSelect={() => onInvite?.()}>
                        <UserPlus className="w-5 h-5" /> Inviter dans le salon vocal
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {([
                    ['grid', 'Affichage en grille'],
                    ['showSelf', 'Afficher ma caméra'],
                    ['showNoVideo', 'Afficher les participants sans vidéo'],
                  ] as const).map(([k, label]) => (
                    <DropdownMenuItem key={k} className="h-9 gap-2 px-2 text-[15px] rounded-[4px]" onSelect={(e) => { e.preventDefault(); if (variant === 'dm' && k === 'showSelf' && prefs[k]) { onHideSelfRequest?.(); return; } setVoiceViewPref(k, !prefs[k]); }}>
                      <span className="flex-1">{label}</span>
                      <span className={cn('w-5 h-5 rounded-[4px] flex items-center justify-center border-2', prefs[k] ? 'bg-primary border-primary' : 'border-[hsl(var(--header-icon))]')}>
                        {prefs[k] && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                    </DropdownMenuItem>
                  ))}
                  {variant === 'dm' ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="h-9 gap-2 px-2 text-[15px] rounded-[4px]" onSelect={() => toast.info('Bientôt disponible')}>
                        <Gamepad2 className="w-5 h-5" /> Transférer vers Xbox
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="h-9 gap-2 px-2 text-[15px] rounded-[4px]" onSelect={() => onOpenSettings?.()}>
                        <Settings className="w-5 h-5" /> Paramètres vocaux et vidéo
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="h-auto min-h-[42px] px-2 py-1 rounded-[4px] flex-col items-start justify-center gap-0">
                          <span className="text-[15px] leading-5">Région</span>
                          <span className="text-xs text-muted-foreground">Automatique</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="max-h-[320px] w-[220px] overflow-y-auto scrollbar-thin p-2 rounded-lg bg-[#3b3b45] border border-white/[0.08]">
                          {CALL_REGIONS.map((r, i) => (
                            <DropdownMenuItem key={r} className="h-9 gap-2 px-2 text-[15px] rounded-[4px]" onSelect={() => i > 0 && toast.info('Bientôt disponible')}>
                              <span className="flex-1">{r}</span>
                              <span className={cn('h-4 w-4 rounded-full border-2', i === 0 ? 'border-primary bg-primary shadow-[inset_0_0_0_3px_#3b3b45]' : 'border-[hsl(var(--header-icon))]')} />
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem disabled className="h-9 gap-2 px-2 text-[15px] rounded-[4px]">
                        <span className="flex-1">Afficher les aperçus des nouveaux messages — bientôt</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="h-9 gap-2 px-2 text-[15px] rounded-[4px]" onSelect={() => onOpenSettings?.()}>
                        <Settings className="w-5 h-5" /> Paramètres vocaux et vidéo
                      </DropdownMenuItem>
                      <DropdownMenuItem className="h-9 gap-2 px-2 text-[15px] rounded-[4px]" onSelect={() => onToggleChat?.()}>
                        <MessageCircle className="w-5 h-5" /> {showChat ? 'Masquer le chat' : 'Afficher le chat'}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="h-9 gap-2 px-2 text-[15px] rounded-[4px]" onSelect={() => onToggleMembers?.()}>
                        <Users className="w-5 h-5" /> {showMembers ? 'Masquer les membres' : 'Afficher les membres'}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Déconnexion"
                  className="h-[52px] w-20 rounded-xl bg-[#da373c] hover:bg-[#a12828] active:bg-[#8f2323] text-white flex items-center justify-center transition-colors"
                  onClick={onDisconnect}
                >
                  <HangUp className="w-6 h-6" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Déconnecter</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <ScreenShareQualityModal
        open={showScreenShareModal}
        onOpenChange={setShowScreenShareModal}
        onStart={handleScreenShareStart}
        onOpenAudioSettings={onOpenSettings}
      />
    </>
  );
}
