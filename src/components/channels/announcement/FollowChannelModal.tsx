import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "./SearchableSelect";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAdminServers, useFollowChannel } from "@/hooks/useChannelFollowers";
import { StreamlineHash } from "@/components/icons/StreamlineHash";
import { Loader2 } from "lucide-react";
import { StreamlineMegaphone } from "@/components/icons/StreamlineMegaphone";

interface FollowChannelModalProps {
  open: boolean;
  onClose: () => void;
  sourceChannelId: string;
  sourceChannelName: string;
  sourceServerName: string;
  sourceServerIcon?: string;
  onSuccess: () => void;
}

export function FollowChannelModal({
  open,
  onClose,
  sourceChannelId,
  sourceChannelName,
  sourceServerName,
  sourceServerIcon,
  onSuccess,
}: FollowChannelModalProps) {
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");

  const { data: adminServers = [], isLoading } = useAdminServers();
  const followChannel = useFollowChannel();

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setSelectedServerId("");
      setSelectedChannelId("");
    }
  }, [open]);

  const selectedServer = adminServers.find((s) => s.id === selectedServerId);

  const handleFollow = async () => {
    if (!selectedChannelId) return;

    try {
      await followChannel.mutateAsync({
        sourceChannelId,
        targetChannelId: selectedChannelId,
      });

      // Le message "X a ajoute ... dans ce salon" est poste par la base
      // (trigger channel_followed_message).
      onSuccess();
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden">
        {/* Bandeau : icone du serveur source + pastille du salon d'annonces */}
        <div className="h-[80px] flex items-center justify-center gap-5 bg-[hsl(var(--card))]">
          <Avatar className="h-14 w-14 rounded-full">
            {sourceServerIcon ? <AvatarImage src={sourceServerIcon} alt={sourceServerName} /> : null}
            <AvatarFallback className="rounded-full bg-primary text-primary-foreground text-xl">
              {sourceServerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-[hsl(var(--button-secondary))]">
            <StreamlineMegaphone className="w-5 h-5 text-[hsl(var(--icon-default))]" />
            <span translate="no" className="text-base font-medium text-white">{sourceChannelName}</span>
          </div>
        </div>

        <div className="px-6 pt-5">
          <DialogHeader className="text-center sm:text-center space-y-0">
            <DialogTitle className="text-2xl font-bold text-white leading-[30px]">
              Ajoute les mises à jour de ce salon à ton serveur !
            </DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Sélectionne l'endroit où tu souhaites recevoir ces mises à jour. Tu peux revenir sur ce choix à tout moment dans Paramètres du serveur &gt; Intégrations &gt; Salons suivis.
          </p>

          <label className="block mt-6 mb-2 text-base font-medium text-foreground">Envoyer vers</label>
          <SearchableSelect
            ariaLabel="Envoyer vers"
            value={selectedServerId}
            placeholder={isLoading ? "Chargement…" : "Sélectionner un serveur"}
            emptyLabel="Aucun serveur où tu peux gérer les webhooks"
            onChange={(v) => {
              setSelectedServerId(v);
              setSelectedChannelId("");
            }}
            options={adminServers.map((server) => ({
              value: server.id,
              label: server.name,
              icon: server.icon_url ? (
                <img src={server.icon_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
              ) : (
                <span className="w-5 shrink-0 text-center text-xs font-semibold text-foreground">{server.name.charAt(0).toUpperCase()}</span>
              ),
            }))}
          />

          <label className="block mt-4 mb-2 text-base font-medium text-foreground">Sélectionner le salon</label>
          <SearchableSelect
            ariaLabel="Sélectionner le salon"
            value={selectedChannelId}
            placeholder="Sélectionner"
            disabled={!selectedServerId}
            emptyLabel="Aucun salon disponible"
            onChange={setSelectedChannelId}
            options={(selectedServer?.channels ?? []).map((channel) => ({
              value: channel.id,
              label: channel.name,
              icon: channel.type === "announcement"
                ? <StreamlineMegaphone className="w-5 h-5 shrink-0 text-[hsl(var(--icon-default))]" />
                : <StreamlineHash className="w-5 h-5 shrink-0 text-[hsl(var(--icon-default))]" />,
            }))}
          />

          <p className="mt-4 text-sm text-muted-foreground">
            Seuls les serveurs et les salons dont tu as les autorisations de webhook sont affichés.
          </p>
        </div>

        <div className="px-6 pt-6 pb-6 flex justify-end gap-2">
          <Button variant="secondary" className="h-11 px-7 text-base" onClick={onClose}>Annuler</Button>
          <Button className="h-11 px-8 text-base" onClick={handleFollow} disabled={!selectedChannelId || followChannel.isPending}>
            {followChannel.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Suivre
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
