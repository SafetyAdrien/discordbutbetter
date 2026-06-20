import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerStickers, useUploadSticker, useDeleteSticker } from '@/hooks/useServerAssets';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Loader2, Sticker } from 'lucide-react';
import { UploadingOverlay } from './UploadingOverlay';
import { EmojiStickerEditor, type EditorResult } from './EmojiStickerEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StickerManagerProps {
  serverId: string;
}

const MAX_STICKER_SIZE = 16 * 1024 * 1024; // 16 Mo — HD
const ACCEPT = 'image/png,image/gif,image/webp,image/apng,image/avif,image/jpeg';

const sanitize = (n: string) =>
  n.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30) || 'sticker';

const computePrepDelay = (bytes: number) =>
  Math.min(3000, 300 + Math.round((bytes / (1024 * 1024)) * 50));

function useUploaderProfiles(ids: string[]) {
  const unique = useMemo(() => Array.from(new Set(ids.filter(Boolean))), [ids]);
  return useQuery({
    queryKey: ['profiles-mini', unique.sort().join(',')],
    enabled: unique.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', unique);
      if (error) throw error;
      const map: Record<string, { username: string; display_name?: string | null; avatar_url?: string | null }> = {};
      (data || []).forEach((p: any) => (map[p.id] = p));
      return map;
    },
  });
}

export function StickerManager({ serverId }: StickerManagerProps) {
  const { data: stickers = [], isLoading } = useServerStickers(serverId);
  const uploadSticker = useUploadSticker();
  const deleteSticker = useDeleteSticker();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<File[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [current, setCurrent] = useState<File | null>(null);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length === 0) return;

    const valid: File[] = [];
    files.forEach((f) => {
      if (f.size > MAX_STICKER_SIZE) {
        toast.error(`${f.name} dépasse 16 Mo`);
      } else {
        valid.push(f);
      }
    });
    if (valid.length === 0) return;
    setPending(valid);
    openNext(valid[0], valid.slice(1));
  };

  const openNext = (file: File, rest: File[]) => {
    setPreparing(true);
    setCurrent(null);
    const delay = computePrepDelay(file.size);
    window.setTimeout(() => {
      setPreparing(false);
      setCurrent(file);
      setPending(rest);
    }, delay);
  };

  const handleEditorClose = () => {
    setCurrent(null);
    setPending([]);
  };

  const handleEditorFinish = async (result: EditorResult) => {
    const fileForUpload = new File([result.blob], `${result.name}.${result.ext}`, {
      type: result.mime,
    });
    setCurrent(null);
    try {
      await uploadSticker.mutateAsync({
        serverId: result.serverId,
        name: result.name,
        file: fileForUpload,
        silent: true,
      });
      toast.success(`${result.name} ajouté`);
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'ajout");
    }
    if (pending.length > 0) {
      const [next, ...rest] = pending;
      openNext(next, rest);
    }
  };

  const uploaderProfiles = useUploaderProfiles(
    stickers.map((s) => s.creator_id || '').filter(Boolean)
  );

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
        <Button onClick={() => fileInputRef.current?.click()}>
          <Plus className="w-4 h-4 mr-2" />
          Upload Sticker
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

      {stickers.length === 0 ? (
        <div className="text-center py-12">
          <Sticker className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-medium">Aucun sticker</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Importez vos stickers en haute définition
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {stickers.map((sticker) => {
            const up = sticker.creator_id ? uploaderProfiles.data?.[sticker.creator_id] : null;
            return (
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
                {up && (
                  <p className="text-xs text-muted-foreground truncate">
                    by {up.username || up.display_name}
                  </p>
                )}
                <button
                  onClick={() => deleteSticker.mutate({ stickerId: sticker.id, serverId })}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-background/80 hover:text-destructive transition-all"
                  aria-label="Delete sticker"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <UploadingOverlay open={preparing} />

      <EmojiStickerEditor
        open={!!current}
        file={current}
        type="sticker"
        defaultName={current ? sanitize(current.name) : 'sticker'}
        currentServerId={serverId}
        onClose={handleEditorClose}
        onFinish={handleEditorFinish}
      />
    </div>
  );
}
