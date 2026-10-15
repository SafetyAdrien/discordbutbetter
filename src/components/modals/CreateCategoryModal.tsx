import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smile } from 'lucide-react';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { useCreateCategory } from '@/hooks/useChannels';

interface CreateCategoryModalProps {
  serverId: string;
  onClose: () => void;
}

export function CreateCategoryModal({ serverId, onClose }: CreateCategoryModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const createCategory = useCreateCategory();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createCategory.mutate(
      { serverId, name: name.trim(), icon },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}>
        <DialogHeader>
          <DialogTitle>Créer une catégorie</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la catégorie</Label>
            <div className="relative">
              <EmojiStickerPicker
                serverId={serverId}
                onEmojiSelect={setIcon}
                trigger={
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded hover:bg-[hsl(var(--surface-hover))] transition-colors text-base"
                  >
                    {icon || <Smile className="w-4 h-4 text-muted-foreground" />}
                  </button>
                }
              />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nouvelle catégorie"
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createCategory.isPending}
              className="bg-[#5865f2] hover:bg-[#5865f2]/90"
            >
              {createCategory.isPending ? 'Création...' : 'Créer la catégorie'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
