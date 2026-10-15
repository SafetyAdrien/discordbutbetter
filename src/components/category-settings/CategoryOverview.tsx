import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Smile } from 'lucide-react';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { useUpdateCategory } from '@/hooks/useCategories';
import { toast } from 'sonner';

interface CategoryOverviewProps {
  category: {
    id: string;
    name: string;
    icon?: string | null;
    server_id: string;
  };
  onSaved?: () => void;
}

export function CategoryOverview({ category, onSaved }: CategoryOverviewProps) {
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState<string | null>(category.icon ?? null);
  const updateCategory = useUpdateCategory();

  const hasChanges = name !== category.name || icon !== (category.icon ?? null);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Le nom de la catégorie ne peut pas être vide');
      return;
    }

    try {
      await updateCategory.mutateAsync({
        categoryId: category.id,
        serverId: category.server_id,
        name: name.trim(),
        icon,
      });
      onSaved?.();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && hasChanges) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (hasChanges) handleSave(); }} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category-name">Nom de la catégorie</Label>
        <div className="relative">
          <EmojiStickerPicker
            serverId={category.server_id}
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
            id="category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nom de la catégorie"
            maxLength={100}
            className="pl-10"
            autoFocus
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="submit" 
          disabled={!hasChanges || updateCategory.isPending}
        >
          {updateCategory.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
