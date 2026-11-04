import { Video, VideoOff } from '@/components/icons/discord/lucide';
import { createDiscordIcon } from '@/components/icons/discord/createDiscordIcon';
import { diApps, diEffects, diHangUp, diScreenShare, diScreenShareStop } from '@/components/icons/discord/discordIconData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { VoiceConnectionIndicator } from '@/components/channels/voice/VoiceConnectionIndicator';
import { emitCallAction, useDMCallSession } from '@/lib/dmCallSession';
import { cn } from '@/lib/utils';

const HangUp = createDiscordIcon(diHangUp, 'DMPanelHangUp');
const Share = createDiscordIcon(diScreenShare, 'DMPanelShare');
const ShareStop = createDiscordIcon(diScreenShareStop, 'DMPanelShareStop');
const Apps = createDiscordIcon(diApps, 'DMPanelApps');
const Effects = createDiscordIcon(diEffects, 'DMPanelEffects');

/*
 * Bloc "Voix connectee" d'un appel de MP, au-dessus du panneau utilisateur (video de reference) : signal, "Voix connectee"
 * en vert, nom de l'interlocuteur, raccrocher, puis quatre boutons (camera, partage d'ecran, activites, soundboard).
 * Les actions sont envoyees a la scene d'appel ouverte.
 */
export function DMCallStatusBadge() {
  const { joined, camera, screen, peerName } = useDMCallSession();
  if (!joined) return null;
  const tile = (label: string, active: boolean, onClick: (() => void) | undefined, icon: React.ReactNode) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-disabled={!onClick}
          onClick={onClick}
          className={cn('flex h-9 items-center justify-center rounded-lg bg-white/[0.06] text-[hsl(var(--icon-default))] transition-colors', onClick ? 'hover:bg-white/10 hover:text-white' : 'cursor-default', active && 'text-[hsl(var(--online))]')}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{onClick ? label : `${label} — Bientôt disponible`}</TooltipContent>
    </Tooltip>
  );

  return (
    <div className="w-full border-b-0 border-t border-white/[0.06] bg-[hsl(var(--input))] px-2.5 pb-2 pt-2">
      <div className="flex items-center gap-2">
        <VoiceConnectionIndicator stats={null} connected className="px-0.5 [&_svg]:h-6 [&_svg]:w-6" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold leading-5 text-[hsl(var(--online))]">Voix connectée</p>
          <p translate="no" className="truncate text-sm leading-[18px] text-[hsl(var(--muted-foreground))]">{peerName}</p>
        </div>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="Se déconnecter" onClick={() => emitCallAction('hangup')} className="flex h-6 w-8 shrink-0 items-center justify-center rounded-md text-[hsl(var(--icon-default))] transition-colors hover:bg-white/10 hover:text-white">
                <HangUp className="h-6 w-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Déconnecter</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        <TooltipProvider delayDuration={0}>
          {tile(camera ? 'Désactiver la caméra' : 'Activer la caméra', camera, () => emitCallAction('camera'), camera ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />)}
          {tile(screen ? "Arrêter le partage d'écran" : 'Partage ton écran', screen, () => emitCallAction('screen'), screen ? <ShareStop className="h-6 w-6" /> : <Share className="h-6 w-6" />)}
          {tile('Activités', false, undefined, <Apps className="h-6 w-6" />)}
          {tile('Ouvrir SoundBoard', false, undefined, <Effects className="h-6 w-6" />)}
        </TooltipProvider>
      </div>
    </div>
  );
}
