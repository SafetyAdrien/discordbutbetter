import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Trash2, AlertTriangle } from 'lucide-react';
import { useDeleteCategory } from '@/hooks/useChannels';
import { toast } from 'sonner';

interface CategoryDangerZoneProps {
  categoryId: string;
  categoryName: string;
  serverId: string;
  channelCount: number;
  onDeleted: () => void;
}

export function CategoryDangerZone({ 
  categoryId, 
  categoryName, 
  serverId, 
  channelCount,
  onDeleted 
}: CategoryDangerZoneProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const deleteCategory = useDeleteCategory();

  const handleDelete = async () => {
    try {
      await deleteCategory.mutateAsync({ categoryId, serverId });
      toast.success('Catégorie supprimée');
      onDeleted();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-4 border-t border-destructive/20 pt-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="w-4 h-4" />
        <h3 className="font-semibold">Zone de danger</h3>
      </div>

      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
        <p className="text-sm text-muted-foreground mb-3">
          La suppression de cette catégorie est irréversible. 
          {channelCount > 0 
            ? ` Les ${channelCount} salon(s) de cette catégorie deviendront des salons sans catégorie.`
            : ' Cette catégorie est vide.'
          }
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Supprimer la catégorie
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <form onSubmit={(e) => { e.preventDefault(); if (confirmName === categoryName) handleDelete(); }}>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Supprimer la catégorie "{categoryName}" ?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span className="block font-semibold text-destructive">
                  Cette action est irréversible.
                </span>
                <span className="block">
                  Pour confirmer, tapez le nom de la catégorie ci-dessous :
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="my-4">
              <Label htmlFor="confirm-name" className="sr-only">Nom de la catégorie</Label>
              <Input
                id="confirm-name"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={categoryName}
                autoComplete="off"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel type="button" onClick={() => setConfirmName('')}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                type="submit"
                disabled={confirmName !== categoryName || deleteCategory.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
