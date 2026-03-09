import { useState } from 'react';
import { useServers } from '@/hooks/useServers';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ServerDeletePageProps {
  serverId: string;
  onClose: () => void;
}

export function ServerDeletePage({ serverId, onClose }: ServerDeletePageProps) {
  const { data: servers = [] } = useServers();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const server = servers.find(s => s.id === serverId);
  
  const [password, setPassword] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  if (!server || !user) return null;

  const isOwner = server.owner_id === user.id;
  const isSecondaryOwner = server.secondary_owner_id === user.id;
  const hasSecondaryOwner = !!server.secondary_owner_id;

  const handleDeleteRequest = async () => {
    if (!password.trim()) return;
    
    setIsDeleting(true);
    setPasswordError('');
    
    try {
      // Verify password first
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password,
      });

      if (authError) {
        setPasswordError('Mot de passe incorrect');
        setIsDeleting(false);
        return;
      }

      if (isOwner) {
        const { error } = await supabase.rpc('delete_server_as_owner', {
          _server_id: serverId
        });
        
        if (error) throw error;

        // Optimistic: remove server from cache instantly
        queryClient.setQueryData(['servers'], (old: any[] | undefined) =>
          old?.filter(s => s.id !== serverId) ?? []
        );
        
        toast.success('Serveur supprimé avec succès');
        onClose();
      } else if (isSecondaryOwner) {
        const { error } = await supabase.rpc('request_server_deletion', {
          _server_id: serverId
        });
        
        if (error) throw error;
        
        toast.success('Demande de suppression envoyée au propriétaire');
        setShowConfirm(false);
        setPassword('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
        <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-destructive">Zone de danger</h3>
          <p className="text-sm text-muted-foreground mt-1">
            La suppression d'un serveur est irréversible. Toutes les données, messages, 
            canaux et membres seront définitivement supprimés.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Supprimer {server.name}</h4>
          {isSecondaryOwner && hasSecondaryOwner && (
            <p className="text-sm text-muted-foreground mb-4">
              En tant que second propriétaire, votre demande de suppression devra être 
              approuvée par le propriétaire principal du serveur.
            </p>
          )}
          {isOwner && hasSecondaryOwner && (
            <p className="text-sm text-muted-foreground mb-4">
              Une notification sera envoyée au second propriétaire pour l'informer 
              de la suppression du serveur.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">
            Entrez votre mot de passe pour confirmer
          </Label>
          <PasswordInput
            id="confirm-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError('');
            }}
            placeholder="Mot de passe"
            className="max-w-sm"
          />
          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
        </div>

        <Button
          variant="destructive"
          onClick={() => setShowConfirm(true)}
          disabled={!password.trim()}
        >
          {isSecondaryOwner ? 'Demander la suppression' : 'Supprimer le serveur'}
        </Button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              {isSecondaryOwner ? 'Confirmer la demande' : 'Supprimer définitivement ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isSecondaryOwner ? (
                <>
                  Une notification sera envoyée au propriétaire principal pour approuver 
                  la suppression du serveur <strong>{server.name}</strong>.
                </>
              ) : (
                <>
                  Cette action est irréversible. Le serveur <strong>{server.name}</strong> et 
                  toutes ses données seront définitivement supprimés.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequest}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isSecondaryOwner ? 'Envoi...' : 'Suppression...'}
                </>
              ) : (
                isSecondaryOwner ? 'Envoyer la demande' : 'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
