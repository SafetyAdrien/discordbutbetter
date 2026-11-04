import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { ScrollText } from "@/components/icons/discord/lucide";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { userKey } from '@/lib/userScope';

/*
 * Garde-fous de la page "Acces" cote chat :
 *  - RulesGate remplace le composeur tant que le membre n'a pas accepte les
 *    regles (la base refuse aussi ses messages, voir enforce_server_message_rules) ;
 *  - AgeGate couvre le salon tant que la limite d'age n'est pas confirmee
 *    (confirmation memorisee par navigateur, comme l'avertissement Discord).
 */

function useRuleAcceptance(serverId: string | undefined, enabled: boolean) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["server-rule-acceptance", serverId, user?.id];
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("server_rule_acceptances")
        .select("accepted_at")
        .eq("server_id", serverId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: enabled && !!serverId && !!user,
  });
  const accept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("server_rule_acceptances").insert({ server_id: serverId!, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.setQueryData(key, true),
  });
  return { accepted: query.data ?? false, loading: query.isLoading, accept };
}

export function RulesGate({
  enabled,
  serverId,
  rules,
  children,
}: {
  enabled: boolean;
  serverId: string | undefined;
  rules: string[];
  children: React.ReactNode;
}) {
  const { accepted, loading, accept } = useRuleAcceptance(serverId, enabled);
  const [open, setOpen] = useState(false);
  if (!enabled || loading || accepted) return <>{children}</>;

  return (
    <div className="px-2 pb-2">
      <div className="min-h-[58px] flex items-center gap-3 px-4 rounded-lg bg-[hsl(var(--input))] border border-[hsl(var(--input-border))]">
        <ScrollText className="w-5 h-5 shrink-0 text-[hsl(var(--icon-default))]" />
        <p className="flex-1 text-sm text-foreground">Accepte les règles du serveur pour pouvoir discuter.</p>
        <Button size="sm" onClick={() => setOpen(true)}>Lire les règles</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px] p-6 gap-0">
          <DialogTitle className="text-xl font-semibold text-white">Règles du serveur</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Lis et accepte ces règles avant de participer.
          </DialogDescription>
          <ol className="mt-5 space-y-2 max-h-[50vh] overflow-y-auto scrollbar-thin">
            {rules.map((rule, i) => (
              <li key={rule} className="flex gap-3 p-3 rounded-lg bg-[hsl(var(--card))] text-sm text-foreground">
                <span className="font-semibold text-muted-foreground">{i + 1}.</span>
                {rule}
              </li>
            ))}
          </ol>
          <Button
            className="mt-6"
            disabled={accept.isPending}
            onClick={() => accept.mutate(undefined, { onSuccess: () => setOpen(false) })}
          >
            J'ai lu et j'accepte les règles
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const AGE_KEY = "age-gate-confirmed:";

export function AgeGate({ serverId, onLeave }: { serverId: string; onLeave?: () => void }) {
  const [confirmed, setConfirmed] = useState(() => {
    try {
      return localStorage.getItem(userKey(AGE_KEY + serverId)) === "1";
    } catch {
      return false;
    }
  });
  if (confirmed) return null;
  const confirm = () => {
    try {
      localStorage.setItem(userKey(AGE_KEY + serverId), "1");
    } catch {
      /* stockage indisponible : confirmation pour cette session */
    }
    setConfirmed(true);
  };
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/95 backdrop-blur-sm px-6">
      <div className="max-w-[420px] text-center">
        <ShieldAlert className="w-14 h-14 mx-auto text-[#f0b232]" />
        <h2 className="mt-4 text-2xl font-semibold text-white">Serveur soumis à une limite d'âge</h2>
        <p className="mt-2 text-base text-muted-foreground">
          Ce serveur peut contenir du contenu réservé aux adultes. Confirme que tu as l'âge légal pour le consulter.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {onLeave && <Button variant="secondary" onClick={onLeave}>Retour</Button>}
          <Button onClick={confirm}>J'ai l'âge légal</Button>
        </div>
      </div>
    </div>
  );
}
