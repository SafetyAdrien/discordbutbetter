import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Volume2, Plus, Play, Pause, Trash2, Upload, Loader2 } from 'lucide-react';
import {
  useServerSounds,
  useUploadSound,
  useDeleteSound,
  type ServerSound,
} from '@/hooks/useServerAssets';
import { toast } from 'sonner';

interface SoundBoardPageProps {
  serverId: string;
}

const MAX_FILE_SIZE = 512 * 1024; // 512 KB (Discord-style)

export function SoundBoardPage({ serverId }: SoundBoardPageProps) {
  const { data: sounds = [], isLoading } = useServerSounds(serverId);
  const uploadSound = useUploadSound();
  const deleteSound = useDeleteSound();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [volume, setVolume] = useState(1);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      toast.error('Le fichier dépasse 512 Ko');
      return;
    }
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^/.]+$/, ''));
    setShowUpload(true);
  };

  const resetForm = () => {
    setShowUpload(false);
    setFile(null);
    setName('');
    setEmoji('');
    setVolume(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = () => {
    if (!file || !name.trim()) return;
    uploadSound.mutate(
      { serverId, name: name.trim(), emoji: emoji.trim() || undefined, volume, file },
      { onSuccess: resetForm }
    );
  };

  const handlePlay = (sound: ServerSound) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingId === sound.id) {
      setPlayingId(null);
      return;
    }
    const src = sound.signedUrl || sound.url;
    if (!src) return;
    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, sound.volume ?? 1));
    audio.onended = () => setPlayingId(null);
    audio.play().catch(() => toast.error('Lecture impossible'));
    audioRef.current = audio;
    setPlayingId(sound.id);
  };

  const handleDelete = (sound: ServerSound) => {
    deleteSound.mutate({ soundId: sound.id, serverId, path: sound.url });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">SoundBoard</h3>
          <p className="text-sm text-muted-foreground">
            Ajoutez des sons personnalisés (max 512 Ko) à utiliser dans les salons vocaux.
          </p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploadSound.isPending}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un son
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {showUpload && file && (
        <div className="p-4 rounded-lg bg-muted/50 space-y-4">
          <div className="grid grid-cols-[80px_1fr] gap-4">
            <div className="space-y-1">
              <Label htmlFor="sound-emoji">Emoji</Label>
              <Input
                id="sound-emoji"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
                placeholder="🔊"
                className="text-center text-xl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sound-name">Nom</Label>
              <Input
                id="sound-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mon son"
                maxLength={32}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Volume par défaut : {Math.round(volume * 100)}%</Label>
            <Slider
              value={[volume * 100]}
              onValueChange={(v) => setVolume(v[0] / 100)}
              min={0}
              max={100}
              step={1}
            />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            Fichier : {file.name} ({(file.size / 1024).toFixed(1)} Ko)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetForm}>
              Annuler
            </Button>
            <Button onClick={handleUpload} disabled={!name.trim() || uploadSound.isPending}>
              {uploadSound.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Téléchargement...
                </>
              ) : (
                'Télécharger'
              )}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : sounds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Volume2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h4 className="font-medium mb-2">Aucun son</h4>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            Ajoutez des sons que les membres pourront utiliser dans les salons vocaux.
          </p>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Importer un son
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sounds.map((sound) => {
            const isPlaying = playingId === sound.id;
            return (
              <div
                key={sound.id}
                className="p-3 bg-surface-elevated rounded-lg border border-border group hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{sound.emoji || '🔊'}</span>
                    <span className="text-sm font-medium truncate">{sound.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={() => handleDelete(sound)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => handlePlay(sound)}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Jouer
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
