import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useUpdateCategory } from '@/hooks/useCategories';
import { toast } from 'sonner';

interface CategoryOverviewProps {
  category: {
    id: string;
    name: string;
    server_id: string;
  };
  onSaved?: () => void;
}

export function CategoryOverview({ category, onSaved }: CategoryOverviewProps) {
  const [name, setName] = useState(category.name);
  const updateCategory = useUpdateCategory();

  const hasChanges = name !== category.name;

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
        <Input
          id="category-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nom de la catégorie"
          maxLength={100}
          autoFocus
        />
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
