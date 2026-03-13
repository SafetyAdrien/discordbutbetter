import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Puzzle, Bot, Webhook, ExternalLink } from "lucide-react";

interface IntegrationsPageProps {
  serverId: string;
}

export function IntegrationsPage({ serverId }: IntegrationsPageProps) {
  const integrations = [
    {
      id: "webhooks",
      name: "Webhooks",
      description: "Recevez des notifications automatiques depuis d'autres services",
      icon: Webhook,
      enabled: true,
      count: 0,
    },
    {
      id: "bots",
      name: "Bots",
      description: "Ajoutez des bots pour automatiser des tâches",
      icon: Bot,
      enabled: false,
      count: 0,
    },
    {
      id: "followed-channels",
      name: "Channels Followed",
      icon: Webhook,
      enabled: false,
      count: 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Intégrations</h3>
        <p className="text-sm text-muted-foreground">Connectez des applications et services externes à votre serveur</p>
      </div>

      <div className="space-y-4">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <integration.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Gérer
                  <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              </div>
            </CardHeader>
            {integration.count > 0 && (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {integration.count} {integration.name.toLowerCase()} actif{integration.count > 1 ? "s" : ""}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center py-8 border border-dashed border-border rounded-lg">
        <Puzzle className="w-8 h-8 text-muted-foreground mb-3" />
        <h4 className="font-medium mb-1">Plus d'intégrations bientôt</h4>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          De nouvelles intégrations seront disponibles prochainement pour enrichir votre serveur.
        </p>
      </div>
    </div>
  );
}
