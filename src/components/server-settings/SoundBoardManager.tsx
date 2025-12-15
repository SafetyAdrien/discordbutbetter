import { useState } from 'react';
import { Volume2, Plus, Play, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from 'sonner';

interface SoundBoardManagerProps {
  serverId: string;
}

interface Sound {
  id: string;
  name: string;
  duration: number;
  emoji?: string;
}

export function SoundBoardManager({ serverId }: SoundBoardManagerProps) {
  // Mock data - in production, fetch from server
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Sound | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const maxSounds = 8; // Base limit, increased with boosts

  const handlePlaySound = (sound: Sound) => {
    toast.info(`🔊 Lecture de "${sound.name}"`);
  };

  const handleUploadSound = () => {
    // TODO: Implement file upload
    toast.info('Fonctionnalité en cours de développement');
  };

  const handleDeleteSound = () => {
    if (!deleteTarget) return;
    setSounds(prev => prev.filter(s => s.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success('Son supprimé');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">SoundBoard</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les sons personnalisés de votre serveur
          </p>
        </div>
        <Button onClick={handleUploadSound} disabled={sounds.length >= maxSounds}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un son
        </Button>
      </div>

      {/* Usage */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Emplacements utilisés</CardTitle>
            <span className="text-sm text-muted-foreground">{sounds.length}/{maxSounds}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${(sounds.length / maxSounds) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Boostez le serveur pour débloquer plus d'emplacements
          </p>
        </CardContent>
      </Card>

      {/* Sounds Grid */}
      {sounds.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sounds.map((sound) => (
            <Card key={sound.id} className="group relative hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-12 h-12 rounded-full"
                    onClick={() => handlePlaySound(sound)}
                  >
                    <Play className="w-5 h-5" />
                  </Button>
                  <div className="text-center">
                    <p className="text-sm font-medium truncate max-w-full">{sound.name}</p>
                    <p className="text-xs text-muted-foreground">{sound.duration}s</p>
                  </div>
                </div>
                
                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(sound)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Volume2 className="w-12 h-12 text-muted-foreground mb-4" />
            <CardTitle className="text-lg mb-2">Aucun son</CardTitle>
            <CardDescription className="text-center mb-4">
              Ajoutez des sons personnalisés pour permettre aux membres de les jouer dans les salons vocaux
            </CardDescription>
            <Button onClick={handleUploadSound}>
              <Upload className="w-4 h-4 mr-2" />
              Importer un son
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <h4 className="text-sm font-medium mb-2">Exigences pour les sons</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Format : MP3, OGG, ou WAV</li>
            <li>• Durée maximale : 5 secondes</li>
            <li>• Taille maximale : 512 Ko</li>
          </ul>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer "{deleteTarget?.name}" ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce son sera définitivement supprimé du serveur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSound}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
