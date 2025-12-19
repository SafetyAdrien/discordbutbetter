import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAdminServers, useFollowChannel, useSendFollowSystemMessage } from "@/hooks/useChannelFollowers";
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
  const sendSystemMessage = useSendFollowSystemMessage();

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

      // Send system message to target channel
      await sendSystemMessage.mutateAsync({
        targetChannelId: selectedChannelId,
        sourceServerName,
        sourceChannelName,
      });

      onSuccess();
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader className="flex flex-col items-center text-center pb-2">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-14 w-14 rounded-xl">
              {sourceServerIcon ? (
                <AvatarImage src={sourceServerIcon} alt={sourceServerName} />
              ) : null}
              <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-xl">
                {sourceServerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2 bg-primary/20 px-3 py-1.5 rounded-full">
              <StreamlineMegaphone className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{sourceChannelName}</span>
            </div>
          </div>
          <DialogTitle className="text-xl">
            Ajoute les mises à jour de ce salon à ton serveur !
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Sélectionne l'endroit où tu souhaites recevoir ces mises à jour. Tu
            peux revenir sur ce choix à tout moment dans Paramètres du serveur
            &gt; Intégrations &gt; Salons suivis.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Envoyer vers
            </label>
            <Select
              value={selectedServerId}
              onValueChange={(value) => {
                setSelectedServerId(value);
                setSelectedChannelId("");
              }}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Sélectionner un serveur" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : adminServers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Tu n'es administrateur d'aucun serveur
                  </div>
                ) : (
                  adminServers.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5 rounded">
                          {server.icon_url ? (
                            <AvatarImage src={server.icon_url} />
                          ) : null}
                          <AvatarFallback className="rounded text-xs">
                            {server.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {server.name}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Sélectionner le salon
            </label>
            <Select
              value={selectedChannelId}
              onValueChange={setSelectedChannelId}
              disabled={!selectedServerId}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {selectedServer?.channels.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Aucun salon disponible
                  </div>
                ) : (
                  selectedServer?.channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      #{channel.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Seuls les serveurs et les salons dont tu as les autorisations de
            webhook sont affichés.
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleFollow}
            disabled={!selectedChannelId || followChannel.isPending}
          >
            {followChannel.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Suivre
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
