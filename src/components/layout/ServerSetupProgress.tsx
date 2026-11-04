import { useFirstTextChannelId, useServerSetupProgress } from '@/hooks/useServerSetupProgress';
import { cn } from '@/lib/utils';

/*
 * "Progression de la configuration" sous l'en-tete de la liste des salons
 * d'un serveur recent (video de reference) : anneau de progression vert,
 * titre, puis "Etape N sur 6 : <prochaine etape>" tronque. Un clic ouvre le
 * salon de la checklist "Bienvenue sur <serveur>" ; l'anneau et l'etape
 * avancent des qu'une etape est terminee, ici ou dans la checklist.
 */

function ProgressRing({ value }: { value: number }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 36 36" className="w-9 h-9 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="4" className="stroke-[hsl(var(--button-secondary))]" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        stroke="#3ba55c"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        className="transition-[stroke-dashoffset] duration-700 ease-out"
      />
    </svg>
  );
}

export function ServerSetupProgress({
  serverId,
  activeChannelId,
  onChannelSelect,
}: {
  serverId: string;
  activeChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
}) {
  const setup = useServerSetupProgress(serverId);
  const firstTextChannelId = useFirstTextChannelId(setup.visible ? serverId : null);
  if (!setup.visible || !setup.nextStep) return null;

  const stepNumber = setup.doneCount + 1;
  const subtitle = `Étape ${stepNumber} sur ${setup.total} : ${setup.nextStep.label}`;

  return (
    <div className="px-2 pt-2 pb-1">
      <button
        type="button"
        onClick={() => firstTextChannelId && onChannelSelect(firstTextChannelId)}
        title={subtitle}
        className={cn(
          'w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[hsl(var(--interactive-background-hover))]',
          activeChannelId === firstTextChannelId && 'bg-[hsl(var(--interactive-background-hover))]/60',
        )}
      >
        <ProgressRing value={setup.doneCount / setup.total} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-[18px] text-white truncate">Progression de la configuration</span>
          <span key={stepNumber} className="block text-xs leading-4 text-muted-foreground truncate animate-fade-in">{subtitle}</span>
        </span>
      </button>
    </div>
  );
}
