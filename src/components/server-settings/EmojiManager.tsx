import { useState, useRef, useCallback } from 'react';
import { useServerEmojis, useUploadEmoji, useDeleteEmoji } from '@/hooks/useServerAssets';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Loader2, Smile } from 'lucide-react';
import { BatchImportList, type BatchItem } from './BatchImportList';
import { toast } from 'sonner';

interface EmojiManagerProps {
  serverId: string;
}

const MAX_EMOJI_SIZE = 256 * 1024;
const ACCEPT = 'image/png,image/gif,image/webp,image/jpeg';

interface QueueItem extends BatchItem {
  file: File;
  emojiName: string;
}

const sanitize = (n: string) =>
  n.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32) || 'emoji';

export function EmojiManager({ serverId }: EmojiManagerProps) {
  const { data: emojis = [], isLoading } = useServerEmojis(serverId);
  const uploadEmoji = useUploadEmoji();
  const deleteEmoji = useDeleteEmoji();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const items: QueueItem[] = files.map((file, i) => {
      const oversize = file.size > MAX_EMOJI_SIZE;
      return {
        id: `${Date.now()}-${i}-${file.name}`,
        name: file.name,
        size: file.size,
        previewUrl: URL.createObjectURL(file),
        status: oversize ? 'error' : 'pending',
        error: oversize ? 'Fichier > 256 Ko' : undefined,
        file,
        emojiName: sanitize(file.name),
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
        await uploadEmoji.mutateAsync({
          serverId,
          name: item.emojiName,
          file: item.file,
          silent: true,
        });
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'success' } : q))
        );
      } catch (e: any) {
        const msg = e?.message?.includes('duplicate')
          ? 'Nom déjà utilisé'
          : e?.message || 'Erreur';
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'error', error: msg } : q))
        );
      }
    }

    setIsProcessing(false);
    setIsComplete(true);
  }, [queue, serverId, uploadEmoji]);

  const closeQueue = () => {
    queue.forEach((q) => q.previewUrl && URL.revokeObjectURL(q.previewUrl));
    setQueue([]);
    setIsComplete(false);
  };

  const retryFailed = () => {
    const retry = queue
      .filter((q) => q.status === 'error' && q.error !== 'Fichier > 256 Ko')
      .map((q) => ({ ...q, status: 'pending' as const, error: undefined }));
    if (retry.length === 0) {
      toast.info('Aucun fichier réessayable');
      return;
    }
    setQueue((prev) =>
      prev.map((q) => {
        const r = retry.find((x) => x.id === q.id);
        return r ?? q;
      })
    );
    processQueue(retry);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Emojis personnalisés</h4>
          <p className="text-sm text-muted-foreground">
            {emojis.length} emoji{emojis.length > 1 ? 's' : ''} · 256 Ko max
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
          onChange={handleFilesSelect}
          className="hidden"
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
        />
      )}

      {emojis.length === 0 ? (
        <div className="text-center py-12">
          <Smile className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium">Aucun emoji</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Importez plusieurs emojis à la fois pour votre serveur
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {emojis.map((emoji) => (
            <div
              key={emoji.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 group"
            >
              <img
                src={emoji.url}
                alt={emoji.name}
                className="w-10 h-10 object-contain"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">:{emoji.name}:</p>
              </div>
              <button
                onClick={() => deleteEmoji.mutate({ emojiId: emoji.id, serverId })}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-destructive transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
