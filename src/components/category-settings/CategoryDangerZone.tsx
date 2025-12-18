import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
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
  const deleteCategory = useDeleteCategory();

  const handleDelete = useCallback(async () => {
    if (deleteCategory.isPending) return;
    try {
      await deleteCategory.mutateAsync({ categoryId, serverId });
      toast.success('Catégorie supprimée');
      onDeleted();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  }, [categoryId, serverId, deleteCategory, onDeleted]);

  // Keyboard handler for Enter key
  useEffect(() => {
    if (!showDeleteDialog) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !deleteCategory.isPending) {
        e.preventDefault();
        handleDelete();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteDialog, handleDelete, deleteCategory.isPending]);

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

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer la catégorie</DialogTitle>
            <DialogDescription>
              Tu es sûr(e) de vouloir supprimer <strong className="text-foreground">{categoryName}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCategory.isPending}
              className="flex-1"
              autoFocus
            >
              {deleteCategory.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer la catégorie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
