import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "@/components/icons/discord/lucide";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useServers } from "@/hooks/useServers";
import { useServerOnboarding, type ServerOnboarding } from "@/hooks/useServerOnboarding";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/*
 * Accueil d'un nouveau membre (processus d'accueil active) : une page par
 * question anticipee, reponses sous forme de cartes, puis "Terminer" qui
 * appelle complete_server_onboarding (roles + salons). `preview` sert a
 * l'apercu depuis les parametres : rien n'est enregistre.
 */

interface Props {
  serverId: string;
  onboarding: ServerOnboarding;
  preview?: boolean;
  onClose: () => void;
}

export function MemberOnboardingDialog({ serverId, onboarding, preview, onClose }: Props) {
  const qc = useQueryClient();
  const { data: servers = [] } = useServers();
  const server = servers.find((s) => s.id === serverId);
  const prompts = useMemo(() => onboarding.prompts.filter((p) => p.pre_join && p.options.length > 0), [onboarding.prompts]);
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const prompt = prompts[page];

  const choose = (promptId: string, optionId: string, multiple: boolean) =>
    setAnswers((a) => {
      const cur = a[promptId] ?? [];
      const next = cur.includes(optionId) ? cur.filter((x) => x !== optionId) : multiple ? [...cur, optionId] : [optionId];
      return { ...a, [promptId]: next };
    });

  const finish = async () => {
    if (preview) return onClose();
    setBusy(true);
    const { error } = await supabase.rpc("complete_server_onboarding", { _server_id: serverId, _option_ids: Object.values(answers).flat() });
    setBusy(false);
    if (error) {
      toast.error("Impossible de terminer l'accueil");
      return;
    }
    qc.invalidateQueries({ queryKey: ["onboarding-pending", serverId] });
    qc.invalidateQueries({ queryKey: ["hidden-channels"] });
    qc.invalidateQueries({ queryKey: ["members", serverId] });
    onClose();
  };

  const canContinue = !prompt || !prompt.required || (answers[prompt.id]?.length ?? 0) > 0;
  const last = page >= prompts.length - 1;

  return (
    <Dialog open onOpenChange={(o) => !o && preview && onClose()}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden" onEscapeKeyDown={(e) => !preview && e.preventDefault()} onPointerDownOutside={(e) => !preview && e.preventDefault()}>
        {preview && <div className="px-6 py-2 bg-primary/20 text-center text-xs font-semibold text-white">Aperçu — rien n'est enregistré</div>}
        <div className="px-8 pt-8 pb-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {prompts.length === 0 ? (
            <>
              <DialogTitle className="text-2xl font-bold text-white text-center">Bienvenue sur {server?.name ?? "le serveur"} !</DialogTitle>
              <DialogDescription className="mt-2 text-center text-base text-foreground">
                {onboarding.guide.welcome || "Tout est prêt : les salons par défaut t'attendent."}
              </DialogDescription>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Question {page + 1} sur {prompts.length}{prompt.required && " · obligatoire"}</p>
              <DialogTitle className="mt-2 text-2xl font-bold text-white">{prompt.title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                {prompt.multiple ? "Tu peux choisir plusieurs réponses." : "Choisis une réponse."}
              </DialogDescription>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {prompt.options.map((o) => {
                  const on = answers[prompt.id]?.includes(o.id) ?? false;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => choose(prompt.id, o.id, prompt.multiple)}
                      className={cn(
                        "relative flex items-center gap-3 min-h-[62px] px-4 py-2 rounded-lg border text-left transition-colors",
                        on ? "border-primary bg-primary/15" : "border-white/[0.08] bg-[hsl(var(--card))] hover:bg-[hsl(var(--interactive-background-hover))]",
                      )}
                    >
                      {o.emoji && <span className="text-2xl">{o.emoji}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-medium text-white">{o.title}</span>
                        {o.description && <span className="block text-sm text-muted-foreground">{o.description}</span>}
                      </span>
                      {on && <Check className="w-5 h-5 text-primary shrink-0" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="px-6 py-4 flex items-center bg-[hsl(var(--card))]">
          {page > 0 && <button type="button" onClick={() => setPage(page - 1)} className="text-sm font-medium text-white hover:underline">Retour</button>}
          <div className="ml-auto flex gap-2">
            {prompt && !prompt.required && !last && <Button variant="ghost" onClick={() => setPage(page + 1)}>Passer</Button>}
            {prompts.length > 0 && !last ? (
              <Button disabled={!canContinue} onClick={() => setPage(page + 1)}>Suivant</Button>
            ) : (
              <Button disabled={!canContinue || busy} onClick={finish}>{preview ? "Fermer l'aperçu" : "Terminer"}</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Accueil a afficher au membre courant (processus active, pas encore termine). */
export function MemberOnboardingGate({ serverId }: { serverId: string | null }) {
  const { user } = useAuth();
  const { data: servers = [] } = useServers();
  const server = servers.find((s) => s.id === serverId);
  const isOwner = !!server && (server.owner_id === user?.id || server.secondary_owner_id === user?.id);
  const { data: onboarding } = useServerOnboarding(serverId);
  const { data: pending } = useQuery({
    queryKey: ["onboarding-pending", serverId],
    enabled: !!serverId && !!user && !!onboarding?.enabled && !isOwner,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("server_members")
        .select("onboarding_completed_at")
        .eq("server_id", serverId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error || !data) return false;
      return !data.onboarding_completed_at;
    },
  });
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (!serverId || !onboarding?.enabled || !pending || isOwner || dismissed === serverId) return null;
  return <MemberOnboardingDialog serverId={serverId} onboarding={onboarding} onClose={() => setDismissed(serverId)} />;
}
