import { useState } from 'react';
import { Trash2, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { useServers } from '@/hooks/useServers';
import { useAuth } from '@/contexts/AuthContext';
import { useDeleteServer } from '@/hooks/useDeleteServer';
import { toast } from 'sonner';

interface DeleteServerPageProps {
  serverId: string;
  serverName: string;
  onClose: () => void;
}

export function DeleteServerPage({ serverId, serverName, onClose }: DeleteServerPageProps) {
  const { data: servers = [] } = useServers();
  const { user } = useAuth();
  const { deleteAsOwner, requestDeletion, isDeleting } = useDeleteServer();
  
  const server = servers.find(s => s.id === serverId);
  const isOwner = server?.owner_id === user?.id;
  const isSecondaryOwner = server?.secondary_owner_id === user?.id;
  
  const [confirmText, setConfirmText] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const canDelete = confirmText === serverName;

  const handleDelete = async () => {
    if (isOwner) {
      // Primary owner - delete directly
      deleteAsOwner.mutate(serverId, {
        onSuccess: () => {
          toast.success('Serveur supprimé');
          onClose();
        }
      });
    } else if (isSecondaryOwner) {
      // Secondary owner - request deletion
      requestDeletion.mutate(serverId, {
        onSuccess: () => {
          toast.success('Demande de suppression envoyée au propriétaire');
          setShowConfirmDialog(false);
        }
      });
    }
  };

  if (!isOwner && !isSecondaryOwner) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-4 pt-6">
            <Shield className="w-10 h-10 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Accès refusé</h3>
              <p className="text-sm text-muted-foreground">
                Seuls le propriétaire et le second propriétaire peuvent supprimer ce serveur.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-destructive mb-1">Supprimer le serveur</h3>
        <p className="text-sm text-muted-foreground">
          Cette action est irréversible. Toutes les données seront perdues.
        </p>
      </div>

      {/* Warning Card */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Zone de danger
          </CardTitle>
          <CardDescription>
            La suppression du serveur entraînera la perte définitive de :
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Tous les salons et catégories</li>
            <li>• Tous les messages et fichiers</li>
            <li>• Tous les rôles et permissions</li>
            <li>• Tous les emojis et stickers personnalisés</li>
            <li>• L'historique d'audit complet</li>
          </ul>
        </CardContent>
      </Card>

      {/* Secondary Owner Notice */}
      {isSecondaryOwner && !isOwner && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="flex items-center gap-4 pt-6">
            <Shield className="w-10 h-10 text-yellow-500" />
            <div>
              <h3 className="font-semibold">Vous êtes second propriétaire</h3>
              <p className="text-sm text-muted-foreground">
                En tant que second propriétaire, votre demande de suppression devra être 
                approuvée par le propriétaire principal du serveur.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confirmer la suppression</CardTitle>
          <CardDescription>
            Tapez <strong className="text-foreground">{serverName}</strong> pour confirmer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm">Nom du serveur</Label>
            <Input
              id="confirm"
              placeholder={serverName}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="font-mono"
            />
          </div>

          <Button 
            variant="destructive" 
            className="w-full"
            disabled={!canDelete || isDeleting}
            onClick={() => setShowConfirmDialog(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isSecondaryOwner && !isOwner 
              ? 'Demander la suppression' 
              : 'Supprimer définitivement'
            }
          </Button>
        </CardContent>
      </Card>

      {/* Final Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              {isSecondaryOwner && !isOwner 
                ? 'Confirmer la demande de suppression ?' 
                : 'Supprimer définitivement ce serveur ?'
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isSecondaryOwner && !isOwner ? (
                <>
                  Une notification sera envoyée au propriétaire principal pour 
                  approuver ou refuser cette demande de suppression.
                </>
              ) : (
                <>
                  Cette action est <strong>irréversible</strong>. Le serveur 
                  <strong> {serverName}</strong> et toutes ses données seront 
                  définitivement supprimés.
                  {server?.secondary_owner_id && (
                    <span className="block mt-2">
                      Le second propriétaire sera notifié de cette suppression.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Suppression...' : (
                isSecondaryOwner && !isOwner 
                  ? 'Envoyer la demande' 
                  : 'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
