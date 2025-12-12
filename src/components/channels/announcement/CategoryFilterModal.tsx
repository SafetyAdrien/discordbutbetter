import { useState } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AnnouncementCategory } from './AnnouncementFilters';

interface CategoryFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: AnnouncementCategory[];
  onAddCategory: (category: Omit<AnnouncementCategory, 'id'>) => void;
  onDeleteCategory: (id: string) => void;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f59e0b', // orange
  '#ef4444', // red
  '#10b981', // green
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

const PRESET_ICONS = ['🔄', '🎉', '🔧', '⚠️', '💬', '📢', '🎮', '🏆', '💡', '🔥'];

export function CategoryFilterModal({
  open,
  onOpenChange,
  categories,
  onAddCategory,
  onDeleteCategory,
}: CategoryFilterModalProps) {
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(PRESET_ICONS[0]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAddCategory({
      name: newName.trim(),
      color: selectedColor,
      icon: selectedIcon,
    });
    setNewName('');
    setSelectedColor(PRESET_COLORS[0]);
    setSelectedIcon(PRESET_ICONS[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gérer les catégories</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Liste des catégories existantes */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune catégorie personnalisée
              </p>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/30"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="flex-1 text-sm">{cat.icon} {cat.name}</span>
                  {cat.count !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {cat.count}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteCategory(cat.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Formulaire nouvelle catégorie */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="text-sm font-medium">Nouvelle catégorie</h4>

            <Input
              placeholder="Nom de la catégorie"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />

            {/* Sélecteur d'icône */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Icône</label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={cn(
                      'w-8 h-8 rounded-md flex items-center justify-center text-lg transition-all',
                      selectedIcon === icon
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'bg-muted/50 hover:bg-muted'
                    )}
                    onClick={() => setSelectedIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Sélecteur de couleur */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Couleur</label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'w-7 h-7 rounded-full transition-all',
                      selectedColor === color && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>

            {/* Prévisualisation */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-muted-foreground">Aperçu:</span>
              <Badge
                className="gap-1.5"
                style={{
                  backgroundColor: `${selectedColor}20`,
                  color: selectedColor,
                  borderColor: `${selectedColor}40`,
                }}
              >
                <span>{selectedIcon}</span>
                <span>{newName || 'Catégorie'}</span>
              </Badge>
            </div>

            <Button onClick={handleAdd} disabled={!newName.trim()} className="w-full">
              Ajouter la catégorie
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
