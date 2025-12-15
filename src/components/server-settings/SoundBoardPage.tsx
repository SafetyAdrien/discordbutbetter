import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Volume2, Plus, Play, Trash2, Upload } from 'lucide-react';

interface SoundBoardPageProps {
  serverId: string;
}

export function SoundBoardPage({ serverId }: SoundBoardPageProps) {
  const [sounds, setSounds] = useState<{ id: string; name: string; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Placeholder - would be implemented with Supabase Storage
  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">SoundBoard</h3>
          <p className="text-sm text-muted-foreground">
            Ajoutez des sons personnalisés pour les utiliser dans les salons vocaux
          </p>
        </div>
        <Button onClick={handleUpload}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un son
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
        />
      </div>

      {sounds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Volume2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h4 className="font-medium mb-2">Aucun son</h4>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            Ajoutez des sons personnalisés que les membres pourront utiliser dans les salons vocaux.
          </p>
          <Button variant="outline" onClick={handleUpload}>
            <Upload className="w-4 h-4 mr-2" />
            Importer un son
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sounds.map((sound) => (
            <div
              key={sound.id}
              className="p-3 bg-surface-elevated rounded-lg border border-border group hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium truncate">{sound.name}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <Button variant="secondary" size="sm" className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Jouer
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
