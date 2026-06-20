import { useState, useRef, useCallback } from 'react';
import { useServerStickers, useUploadSticker, useDeleteSticker } from '@/hooks/useServerAssets';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Loader2, Sticker } from 'lucide-react';
import { BatchImportList, type BatchItem } from './BatchImportList';
import { toast } from 'sonner';

interface StickerManagerProps {
  serverId: string;
}

const MAX_STICKER_SIZE = 16 * 1024 * 1024; // 16 Mo — HD
const ACCEPT = 'image/png,image/gif,image/webp,image/apng,image/avif,image/jpeg';


interface QueueItem extends BatchItem {
  file: File;
  stickerName: string;
}

export function StickerManager({ serverId }: StickerManagerProps) {
  const { data: stickers = [], isLoading } = useServerStickers(serverId);
  const uploadSticker = useUploadSticker();
  const deleteSticker = useDeleteSticker();

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const items: QueueItem[] = files.map((file, i) => {
      const oversize = file.size > MAX_STICKER_SIZE;
      return {
        id: `${Date.now()}-${i}-${file.name}`,
        name: file.name,
        size: file.size,
        previewUrl: URL.createObjectURL(file),
        status: oversize ? 'error' : 'pending',
        error: oversize ? 'Fichier > 16 Mo' : undefined,
        file,
        stickerName: file.name.replace(/\.[^/.]+$/, '').slice(0, 30) || 'sticker',
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
        await uploadSticker.mutateAsync({
          serverId,
          name: item.stickerName,
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
  }, [queue, serverId, uploadSticker]);

  const closeQueue = () => {
    queue.forEach((q) => q.previewUrl && URL.revokeObjectURL(q.previewUrl));
    setQueue([]);
    setIsComplete(false);
  };

  const retryFailed = () => {
    const retry = queue
      .filter((q) => q.status === 'error' && q.error !== 'Fichier > 16 Mo')
      .map((q) => ({ ...q, status: 'pending' as const, error: undefined }));
    if (retry.length === 0) {
      toast.info('Aucun fichier réessayable');
      return;
    }
    setQueue((prev) =>
      prev.map((q) => retry.find((x) => x.id === q.id) ?? q)
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
          <h4 className="text-sm font-medium">Stickers personnalisés</h4>
          <p className="text-sm text-muted-foreground">
            {stickers.length} sticker{stickers.length > 1 ? 's' : ''} · 16 Mo max (HD)
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

      {stickers.length === 0 ? (
        <div className="text-center py-12">
          <Sticker className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium">Aucun sticker</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Importez plusieurs stickers à la fois pour votre serveur
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {stickers.map((sticker) => (
            <div
              key={sticker.id}
              className="p-4 rounded-lg bg-muted/30 group relative"
            >
              <img
                src={sticker.url}
                alt={sticker.name}
                className="w-full aspect-square object-contain mb-2"
                loading="lazy"
              />
              <p className="text-sm font-medium truncate">{sticker.name}</p>
              {sticker.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {sticker.description}
                </p>
              )}
              <button
                onClick={() => deleteSticker.mutate({ stickerId: sticker.id, serverId })}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-background/80 hover:text-destructive transition-all"
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
