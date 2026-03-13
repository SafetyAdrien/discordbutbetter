import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Webhook, ExternalLink, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChannels } from "@/hooks/useChannels";
import { useCreateWebhook } from "@/hooks/useWebhooks";

interface IntegrationsPageProps {
  serverId: string;
}

export function IntegrationsPage({ serverId }: IntegrationsPageProps) {
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookChannel, setWebhookChannel] = useState("");
  const { data } = useChannels(serverId);
  const createWebhook = useCreateWebhook();

  const textChannels = data?.categories
    ?.flatMap((cat) => cat.channels)
    .filter((ch) => ch.type === "text") ?? [];

  const integrations = [
    {
      id: "webhooks",
      name: "Webhooks",
      description: "Recevez des notifications automatiques depuis d'autres services",
      icon: Webhook,
      count: 0,
    },
    {
      id: "bots",
      name: "Bots",
      description: "Ajoutez des bots pour automatiser des tâches",
      icon: Bot,
      count: 0,
    },
    {
      id: "followed-channels",
      name: "Channels Followed",
      description: "Suivez des salons d'autres serveurs",
      icon: Webhook,
      count: 0,
    },
  ];

  const handleCreateWebhook = () => {
    if (!webhookName.trim() || !webhookChannel) return;
    createWebhook.mutate(
      { channelId: webhookChannel, name: webhookName.trim() },
      {
        onSuccess: () => {
          setShowCreateWebhook(false);
          setWebhookName("");
          setWebhookChannel("");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Intégrations</h3>
        <p className="text-sm text-muted-foreground">
          Connectez des applications et services externes à votre serveur
        </p>
      </div>

      <div className="space-y-2">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="flex items-center justify-between py-3 px-4 border border-border rounded-lg bg-card"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <integration.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-semibold text-sm">{integration.name}</span>
                {integration.description && (
                  <span className="text-xs text-muted-foreground">{integration.description}</span>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 ml-4">
              Gérer
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowCreateWebhook(true)}
      >
        <Plus className="w-4 h-4 mr-2" />
        Créer un Webhook
      </Button>

      <Dialog open={showCreateWebhook} onOpenChange={setShowCreateWebhook}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un Webhook</DialogTitle>
            <DialogDescription>
              Les webhooks permettent à des services externes d'envoyer des messages dans vos salons.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="webhook-name">Nom</Label>
              <Input
                id="webhook-name"
                placeholder="Mon Webhook"
                value={webhookName}
                onChange={(e) => setWebhookName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Salon</Label>
              <Select value={webhookChannel} onValueChange={setWebhookChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un salon" />
                </SelectTrigger>
                <SelectContent>
                  {textChannels.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      # {ch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateWebhook(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateWebhook}
              disabled={!webhookName.trim() || !webhookChannel || createWebhook.isPending}
            >
              {createWebhook.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
