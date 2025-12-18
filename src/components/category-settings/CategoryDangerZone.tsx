import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
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
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const handleDelete = async () => {
    if (deleteCategory.isPending) return;
    try {
      await deleteCategory.mutateAsync({ categoryId, serverId });
      toast.success('Catégorie supprimée');
      onDeleted();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Global ENTER key listener when modal is open
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
  }, [showDeleteDialog, deleteCategory.isPending]);

  // Focus cancel button on open for safety
  useEffect(() => {
    if (showDeleteDialog && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
  }, [showDeleteDialog]);

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
        <AlertDialogContent className="max-w-md">
          <button 
            onClick={() => setShowDeleteDialog(false)}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la catégorie</AlertDialogTitle>
            <AlertDialogDescription>
              Tu es sûr(e) de vouloir supprimer <strong className="text-foreground">{categoryName}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:justify-center">
            <Button
              ref={cancelButtonRef}
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
            >
              {deleteCategory.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer la catégorie
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
