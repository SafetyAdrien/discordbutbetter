import { MessageSquare, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  participantCount: number;
  isMuted: boolean;
  isConnecting: boolean;
  canConnect: boolean;
  onToggleMuted: () => void;
  onJoin: () => void;
  onOpenChat?: () => void;
}

/**
 * Discord-style pre-join screen for voice channels (mobile).
 * Header is rendered separately by the parent; this is the content + bottom pill.
 */
export function MobileVoicePreJoin({
  participantCount,
  isMuted,
  isConnecting,
  canConnect,
  onToggleMuted,
  onJoin,
  onOpenChat,
}: Props) {
  const empty = participantCount === 0;

  return (
    <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
      {/* Centered helper text */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="text-center">
          {empty ? (
            <>
              <p className="text-base font-medium text-foreground/90">Personne n'est encore là !</p>
              <p className="text-base text-muted-foreground mt-1">
                Quand tu es prêt à parler, rejoins le salon.
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-medium text-foreground/90">
                {participantCount} {participantCount > 1 ? 'membres parlent' : 'membre parle'} actuellement
              </p>
              <p className="text-base text-muted-foreground mt-1">Rejoins-les quand tu es prêt.</p>
            </>
          )}
        </div>
      </div>

      {/* Bottom control pill */}
      <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="relative bg-[hsl(var(--surface-1))] rounded-full p-2 flex items-center gap-2 shadow-lg">

          {/* Mic toggle */}
          <button
            type="button"
            onClick={onToggleMuted}
            aria-label={isMuted ? 'Activer le micro' : 'Couper le micro'}
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors',
              isMuted
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-[hsl(var(--surface-2))] text-foreground active:bg-[hsl(var(--surface-3))]'
            )}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Join Voice */}
          <button
            type="button"
            onClick={onJoin}
            disabled={isConnecting || !canConnect}
            className={cn(
              'flex-1 h-12 rounded-full font-semibold text-white text-base transition-colors',
              !canConnect
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-[hsl(var(--online))] active:bg-[hsl(var(--online))]/80',
              isConnecting && 'opacity-70'
            )}
          >
            {!canConnect ? 'Accès refusé' : isConnecting ? 'Connexion…' : 'Rejoindre le salon'}
          </button>

          {/* Chat */}
          {onOpenChat && (
            <button
              type="button"
              onClick={onOpenChat}
              aria-label="Ouvrir le chat du salon"
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-[hsl(var(--surface-2))] text-foreground active:bg-[hsl(var(--surface-3))] transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
