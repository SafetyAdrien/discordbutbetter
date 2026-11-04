import { Video, VideoOff } from '@/components/icons/discord/lucide';
import { createDiscordIcon } from '@/components/icons/discord/createDiscordIcon';
import { diApps, diEffects, diHangUp, diScreenShare, diScreenShareStop, diSoundboard } from '@/components/icons/discord/discordIconData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NoiseSuppressionPanel } from './NoiseSuppressionPopover';
import { useVoice } from '@/contexts/VoiceContext';
import { VoiceConnectionIndicator } from '@/components/channels/voice/VoiceConnectionIndicator';
import { useScreenShareInfo } from '@/lib/screenShareInfo';
import { cn } from '@/lib/utils';

const HangUp = createDiscordIcon(diHangUp, 'PanelHangUp');
const Krisp = createDiscordIcon(diSoundboard, 'PanelKrisp');
const Share = createDiscordIcon(diScreenShare, 'PanelShare');
const ShareStop = createDiscordIcon(diScreenShareStop, 'PanelShareStop');
const Apps = createDiscordIcon(diApps, 'PanelApps');
const Effects = createDiscordIcon(diEffects, 'PanelEffects');

interface VoiceStatusBadgeProps {
  channelName: string;
  serverName: string | null;
  onDisconnect: () => void;
  connectedToProfile?: boolean;
}

/*
 * Bloc "Voix connectee" au-dessus du panneau utilisateur (video de reference) : signal,
 * "Voix connectee" en vert, "salon / serveur", Krisp et raccrocher, puis quatre boutons
 * (camera, partage d'ecran, activites, soundboard).
 */
export function VoiceStatusBadge({ channelName, serverName, onDisconnect, connectedToProfile }: VoiceStatusBadgeProps) {
  const { connectionStats, isReconnecting, isCameraActive, toggleCamera, isScreenSharing, toggleScreenShare, noiseSuppression } = useVoice();
  const krispActive = noiseSuppression !== 'off';
  const share = useScreenShareInfo();

  const iconBtn = 'h-6 w-8 rounded-md flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white hover:bg-white/10 transition-colors shrink-0';
  const tile = (label: string, active: boolean, onClick: (() => void) | undefined, icon: React.ReactNode) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-disabled={!onClick}
          onClick={onClick}
          className={cn(
            'h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-[hsl(var(--icon-default))] transition-colors',
            onClick ? 'hover:bg-white/10 hover:text-white' : 'cursor-default',
            active && 'text-[hsl(var(--online))]',
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{onClick ? label : `${label} — Bientôt disponible`}</TooltipContent>
    </Tooltip>
  );

  return (
    <div
      className={cn(
        'w-full px-2.5 pt-2 pb-2 bg-[hsl(var(--input))] border-t border-white/[0.06]',
        connectedToProfile ? 'border-b-0' : 'rounded-2xl mx-2 mb-1 border',
      )}
      style={{ boxShadow: connectedToProfile ? undefined : 'var(--shadow-elevation-2)' }}
    >
      {isScreenSharing && (
        <div className="mb-2 pb-2 border-b border-white/[0.06] flex items-center gap-3">
          <span className="w-10 h-10 rounded-lg bg-[#f0b232] flex items-center justify-center shrink-0 text-[#1e1f22] font-extrabold text-lg">G</span>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-white leading-5 truncate">Go Live</p>
            <p className="flex items-center gap-1 text-sm text-[#b27df0] leading-[18px]"><span className="w-2 h-2 rounded-full bg-[#b27df0]" />{share?.label ?? 'En direct'}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Arrêter le partage" onClick={() => toggleScreenShare()} className="w-8 h-8 rounded-md flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white hover:bg-white/10 transition-colors">
                <ShareStop className="w-6 h-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Arrêter le partage d'écran</TooltipContent>
          </Tooltip>
        </div>
      )}
      <div className="flex items-center gap-2">
        <VoiceConnectionIndicator stats={connectionStats} connected reconnecting={isReconnecting} className="[&_svg]:w-6 [&_svg]:h-6 px-0.5" />
        <div className="flex-1 min-w-0">
          <p className={cn('text-base font-semibold leading-5', isReconnecting ? 'text-yellow-500' : 'text-[hsl(var(--online))]')}>{isReconnecting ? 'Reconnexion en cours…' : 'Voix connectée'}</p>
          <p translate="no" className="text-sm text-[hsl(var(--muted-foreground))] truncate leading-[18px]">
            {channelName}{serverName ? ` / ${serverName}` : ''}
          </p>
        </div>
        <TooltipProvider delayDuration={0}>
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Suppression du bruit" className={cn(iconBtn, krispActive && 'text-white')}>
                    <Krisp className="w-6 h-6" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Suppression du bruit</TooltipContent>
            </Tooltip>
            <PopoverContent side="top" align="end" sideOffset={10} className="z-[140] w-auto p-0 rounded-lg bg-[#383840] border border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
              <NoiseSuppressionPanel />
            </PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Se déconnecter" onClick={onDisconnect} className={iconBtn}>
                <HangUp className="w-6 h-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Déconnecter</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2">
        <TooltipProvider delayDuration={0}>
          {tile(isCameraActive ? 'Désactiver la caméra' : 'Activer la caméra', isCameraActive, () => toggleCamera(), isCameraActive ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />)}
          {tile(isScreenSharing ? "Arrêter le partage d'écran" : 'Partage ton écran', isScreenSharing, () => toggleScreenShare(), isScreenSharing ? <ShareStop className="w-6 h-6" /> : <Share className="w-6 h-6" />)}
          {tile('Activités', false, undefined, <Apps className="w-6 h-6" />)}
          {tile('Ouvrir SoundBoard', false, undefined, <Effects className="w-6 h-6" />)}
        </TooltipProvider>
      </div>
    </div>
  );
}
