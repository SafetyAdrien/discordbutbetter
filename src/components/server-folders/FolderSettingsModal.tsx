import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ServerFolder } from '@/types/serverFolder';

interface FolderSettingsModalProps {
  folder: ServerFolder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, color: string) => void;
}

const PRESET_COLORS = [
  '#5865f2', // Discord blue
  '#57f287', // Green
  '#fee75c', // Yellow
  '#eb459e', // Pink
  '#ed4245', // Red
  '#f47b67', // Orange
  '#9b59b6', // Purple
  '#1abc9c', // Teal
];

export function FolderSettingsModal({
  folder,
  open,
  onOpenChange,
  onSave,
}: FolderSettingsModalProps) {
  const [name, setName] = useState(folder.name);
  const [color, setColor] = useState(folder.color);

  const handleSave = () => {
    onSave(name, color);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Paramètres du dossier</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Nom du dossier</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dossier"
              maxLength={32}
            />
          </div>

          <div className="space-y-2">
            <Label>Couleur du dossier</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  onClick={() => setColor(presetColor)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === presetColor
                      ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="custom-color" className="text-sm text-muted-foreground">
                Personnalisé:
              </Label>
              <Input
                id="custom-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-8 p-0 border-0 cursor-pointer"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-24 h-8 text-xs"
                maxLength={7}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
