import { X } from "@/components/icons/discord/lucide";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { setReplyMention, useReplyMention } from "@/lib/replyMention";
import { useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ReplyBannerProps {
  authorName: string;
  /** Auteur du message : le bouton de mention n'existe que pour un autre utilisateur. */
  authorId?: string | null;
  authorAvatar?: string | null;
  authorColor?: string | null;
  content?: string;
  attachmentsCount?: number;
  onClear: () => void;
  /** Clic sur le nom : va au message auquel on repond. */
  onJump?: () => void;
  className?: string;
}

/*
 * Bandeau "Repondre a X" (video de reference) : colle au-dessus du champ de saisie (meme largeur, coins hauts arrondis,
 * le champ perd les siens via `.reply-banner ~ * .composer-box`), 38 px, fond un peu plus clair que le champ, filet de
 * separation, nom en gras blanc et croix ronde a droite.
 */
export function ReplyBanner({ authorName, authorId, authorColor, onClear, onJump, className }: ReplyBannerProps) {
  const { user } = useAuth();
  const mention = useReplyMention();
  const canMention = !!authorId && authorId !== user?.id;
  // Chaque nouvelle reponse repart avec la mention activee.
  useEffect(() => setReplyMention(true), [authorId]);
  return (
    <div className={cn("reply-banner mx-2 flex h-9 shrink-0 items-center justify-between rounded-t-lg border border-b-0 border-[hsl(var(--input-border))] border-b-[#43434b] bg-[#3b3b45] px-4 text-sm", className)}>
      <span className="min-w-0 truncate">
        <span className="text-[#dbdee1]">Répondre à</span> <button type="button" onClick={onJump} translate="no" className="cursor-pointer font-semibold hover:underline" style={{ color: authorColor || "#fff" }}>{authorName}</button>
      </span>
      <div className="flex shrink-0 items-center">
      {canMention && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={() => setReplyMention(!mention)} aria-pressed={mention} aria-label={mention ? "Mention activée" : "Mention désactivée"} className={cn("flex h-6 items-center gap-1.5 text-xs font-bold uppercase leading-4 transition-colors", mention ? "text-[#5ea8ff] hover:text-[#8cc0ff]" : "text-[#b1b1bb] hover:text-white")}>
                <span className="text-sm font-semibold leading-none">@</span>
                {mention ? "Activé" : "Désactivé"}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="w-[200px] text-center">
              {mention ? "Clique pour désactiver la mention de l'auteur original." : "Clique pour activer la mention de l'auteur original."}
            </TooltipContent>
          </Tooltip>
          <span aria-hidden className="mx-3 h-5 w-px bg-white/[0.06]" />
        </>
      )}
      <button type="button" onClick={onClear} aria-label="Annuler la réponse" className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full bg-[#c3c3cb] text-[#3b3b45] transition-colors hover:bg-white">
        <X className="h-[8px] w-[8px]" strokeWidth={3} />
      </button>
      </div>
    </div>
  );
}
