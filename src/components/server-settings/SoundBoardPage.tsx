import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Plus, Play, Pause, Trash2, Upload, Loader2 } from 'lucide-react';
import {
  useServerSounds,
  useUploadSound,
  useDeleteSound,
  type ServerSound,
} from '@/hooks/useServerAssets';
import { toast } from 'sonner';
import { BatchImportList, type BatchItem } from './BatchImportList';

interface SoundBoardPageProps {
  serverId: string;
}

const MAX_FILE_SIZE = 512 * 1024;
const ACCEPT = 'audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm';

interface QueueItem extends BatchItem {
  file: File;
  soundName: string;
}

export function SoundBoardPage({ serverId }: SoundBoardPageProps) {
  const { data: sounds = [], isLoading } = useServerSounds(serverId);
  const uploadSound = useUploadSound();
  const deleteSound = useDeleteSound();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const items: QueueItem[] = files.map((file, i) => {
      const oversize = file.size > MAX_FILE_SIZE;
      return {
        id: `${Date.now()}-${i}-${file.name}`,
        name: file.name,
        size: file.size,
        status: oversize ? 'error' : 'pending',
        error: oversize ? 'Fichier > 512 Ko' : undefined,
        file,
        soundName: file.name.replace(/\.[^/.]+$/, '').slice(0, 32) || 'son',
      };
    });
    setQueue(items);
    setIsComplete(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processQueue = useCallback(async (itemsToProcess?: QueueItem[]) => {
    const targets = itemsToProcess ?? queue.filter((i) => i.status === 'pending');
    if (targets.length === 0) {
      setIsComplete(true);
      return;
    }
    setIsProcessing(true);
    setIsComplete(false);

    for (const item of targets) {
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' } : q))
      );
      try {
        await uploadSound.mutateAsync({
          serverId,
          name: item.soundName,
          volume: 1,
          file: item.file,
          silent: true,
        });
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'success' } : q))
        );
      } catch (e: any) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'error', error: e?.message || 'Erreur' } : q
          )
        );
      }
    }

    setIsProcessing(false);
    setIsComplete(true);
  }, [queue, serverId, uploadSound]);

  const closeQueue = () => {
    setQueue([]);
    setIsComplete(false);
  };

  const retryFailed = () => {
    const retry = queue
      .filter((q) => q.status === 'error' && q.error !== 'Fichier > 512 Ko')
      .map((q) => ({ ...q, status: 'pending' as const, error: undefined }));
    if (retry.length === 0) {
      toast.info('Aucun fichier réessayable');
      return;
    }
    setQueue((prev) => prev.map((q) => retry.find((x) => x.id === q.id) ?? q));
    processQueue(retry);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">SoundBoard</h3>
          <p className="text-sm text-muted-foreground">
            Importez plusieurs sons (max 512 Ko) à utiliser dans les salons vocaux.
          </p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
          <Plus className="w-4 h-4 mr-2" />
          Importer
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={handleFilesSelect}
        />
      </div>

      {queue.length > 0 && (
        <BatchImportList
          items={queue}
          isProcessing={isProcessing}
          isComplete={isComplete}
          onStart={() => processQueue()}
          onCancel={closeQueue}
          onClose={closeQueue}
          onRetry={retryFailed}
          renderPreview={() => <Volume2 className="w-4 h-4 text-muted-foreground" />}
        />
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
            Importez plusieurs sons à la fois pour vos salons vocaux.
          </p>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Importer des sons
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
                    onClick={() => deleteSound.mutate({ soundId: sound.id, serverId, path: sound.url })}
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
