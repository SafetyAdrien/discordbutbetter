import { useState } from 'react';
import { Puzzle, Bot, Webhook, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface IntegrationsManagerProps {
  serverId: string;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon?: string;
  type: 'bot' | 'webhook' | 'app';
  enabled: boolean;
}

export function IntegrationsManager({ serverId }: IntegrationsManagerProps) {
  // Mock data - in production, fetch from server
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Integration | null>(null);

  const handleRemoveIntegration = () => {
    if (!deleteTarget) return;
    setIntegrations(prev => prev.filter(i => i.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success('Intégration supprimée');
  };

  const handleAddIntegration = () => {
    toast.info('Fonctionnalité en cours de développement');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Intégrations</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les bots et applications connectés à votre serveur
          </p>
        </div>
      </div>

      <Tabs defaultValue="bots">
        <TabsList>
          <TabsTrigger value="bots" className="gap-2">
            <Bot className="w-4 h-4" />
            Bots
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="w-4 h-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="apps" className="gap-2">
            <Puzzle className="w-4 h-4" />
            Applications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bots" className="mt-4 space-y-4">
          {integrations.filter(i => i.type === 'bot').length > 0 ? (
            integrations.filter(i => i.type === 'bot').map(integration => (
              <Card key={integration.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{integration.name}</h4>
                      <p className="text-sm text-muted-foreground">{integration.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={integration.enabled ? 'default' : 'secondary'}>
                      {integration.enabled ? 'Actif' : 'Inactif'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(integration)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bot className="w-12 h-12 text-muted-foreground mb-4" />
                <CardTitle className="text-lg mb-2">Aucun bot</CardTitle>
                <CardDescription className="text-center mb-4">
                  Ajoutez des bots pour automatiser des tâches et ajouter des fonctionnalités
                </CardDescription>
                <Button onClick={handleAddIntegration}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un bot
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4 space-y-4">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Webhook className="w-12 h-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg mb-2">Webhooks</CardTitle>
              <CardDescription className="text-center mb-4">
                Les webhooks sont configurés au niveau des salons individuels.
                Allez dans les paramètres d'un salon pour créer des webhooks.
              </CardDescription>
              <Button variant="outline" asChild>
                <a href="#" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  En savoir plus
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apps" className="mt-4 space-y-4">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Puzzle className="w-12 h-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg mb-2">Aucune application</CardTitle>
              <CardDescription className="text-center mb-4">
                Connectez des applications tierces pour étendre les fonctionnalités de votre serveur
              </CardDescription>
              <Button onClick={handleAddIntegration}>
                <Plus className="w-4 h-4 mr-2" />
                Parcourir les applications
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer "{deleteTarget?.name}" ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette intégration sera retirée du serveur. Vous pourrez l'ajouter à nouveau plus tard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveIntegration}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
