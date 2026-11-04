import { ArrowDown } from "lucide-react";
import { Check, ChevronRight } from "@/components/icons/discord/lucide";
import { Integrations as Gamepad2, Gem, MemberAdd as MailOpen, Customize as Palette, Welcome as Send } from "@/components/icons/serverSettingsIcons";
import { cn } from "@/lib/utils";
import { SETUP_STEPS, type ChecklistStepId } from "@/hooks/useServerSetupProgress";

/**
 * Checklist "Bienvenue sur <serveur>" affichee en tete du premier salon
 * textuel d'un serveur fraichement cree, pour son proprietaire. Reprend la
 * capture de reference : titre sur deux lignes, texte d'intro, puis six
 * cartes (400px, fond #3a3b41, bordure #45464c, 8px d'ecart). Une etape
 * terminee passe en gris avec une pastille verte a la place du chevron.
 *
 * L'etat des etapes vient de useServerSetupProgress, partage avec la ligne
 * "Progression de la configuration" sous l'en-tete de la liste des salons.
 */

interface ServerWelcomeChecklistProps {
  serverName: string;
  /** Etapes accomplies (useServerSetupProgress). */
  done: Partial<Record<ChecklistStepId, boolean>>;
  /** Memorise une etape qui ne laisse aucune trace en base. */
  onMarkLocal: (id: ChecklistStepId) => void;
  onInvite: () => void;
  onCustomizeIcon: () => void;
  onFirstMessage: () => void;
  onAddApp: () => void;
  onBoosts: () => void;
}

const STEP_ICONS: Record<ChecklistStepId, { icon: React.ElementType; iconClass: string }> = {
  invite: { icon: MailOpen, iconClass: "text-[#a77bf3]" },
  icon: { icon: Palette, iconClass: "text-[#f0883e]" },
  message: { icon: Send, iconClass: "text-[#b9c6ff]" },
  download: { icon: ArrowDown, iconClass: "text-[#3ba55c]" },
  app: { icon: Gamepad2, iconClass: "text-[#7289da]" },
  boost: { icon: Gem, iconClass: "text-[#ff73fa]" },
};
const STEPS = SETUP_STEPS.map((s) => ({ ...s, ...STEP_ICONS[s.id] }));

export function ServerWelcomeChecklist({
  serverName,
  done,
  onMarkLocal,
  onInvite,
  onCustomizeIcon,
  onFirstMessage,
  onAddApp,
  onBoosts,
}: ServerWelcomeChecklistProps) {
  const isDone = (id: ChecklistStepId) => !!done[id];

  const handleStep = (id: ChecklistStepId) => {
    switch (id) {
      case "invite":
        onInvite();
        break;
      case "icon":
        onCustomizeIcon();
        break;
      case "message":
        onFirstMessage();
        break;
      case "download":
        onMarkLocal("download");
        window.open("/install", "_blank", "noopener");
        break;
      case "app":
        onMarkLocal("app");
        onAddApp();
        break;
      case "boost":
        onMarkLocal("boost");
        onBoosts();
        break;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[400px] text-center animate-fade-in">
      <h1 className="text-[28px] leading-[34px] font-medium text-white">
        Bienvenue sur
        <br />
        <span translate="no" className="break-words">{serverName}</span>
      </h1>
      <p className="mt-2 text-sm leading-[18px] text-foreground">
        Voilà ton nouveau serveur, tout beau tout propre. Tu peux voir ici quelques étapes pour
        t'aider dans tes débuts. Pour en savoir plus, va jeter un œil à notre{" "}
        <a href="/trust" target="_blank" rel="noopener" className="text-[hsl(var(--text-link))] hover:underline">
          Guide des premiers pas
        </a>
        .
      </p>

      <div className="mt-4 flex flex-col gap-2 text-left">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const completed = isDone(step.id);
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStep(step.id)}
              className="group flex items-center gap-3 text-left min-h-[57px] px-4 py-3 rounded-lg bg-[hsl(var(--checklist-card))] border border-[hsl(var(--checklist-card-border))] hover:bg-[hsl(var(--interactive-background-selected))] transition-colors"
            >
              <Icon className={cn("w-6 h-6 shrink-0", step.iconClass)} strokeWidth={2.25} />
              <span
                className={cn(
                  "flex-1 text-[15px] leading-[18px] font-semibold",
                  completed ? "text-[hsl(var(--checklist-done-text))]" : "text-white",
                )}
              >
                {step.label}
              </span>
              {completed ? (
                <span className="w-6 h-6 shrink-0 rounded-full bg-[hsl(var(--checklist-done))] flex items-center justify-center">
                  <Check className="w-4 h-4 text-[hsl(var(--checklist-done-text))]" strokeWidth={3} />
                </span>
              ) : (
                <ChevronRight className="w-5 h-5 shrink-0 text-[hsl(var(--header-icon))] group-hover:text-white transition-colors" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
