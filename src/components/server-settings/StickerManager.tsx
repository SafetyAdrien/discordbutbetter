import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerStickers, useUploadSticker, useDeleteSticker } from '@/hooks/useServerAssets';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Trash2 } from '@/components/icons/discord/lucide';
import { SettingsDivider, SettingsPage } from './SettingsUI';
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
      (data || []).forEach((p) => (map[p.id] = p));
      return map;
    },
  });
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '';

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
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) || "Erreur lors de l'ajout");
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
    <SettingsPage
      title="Autocollants"
      description="Les autocollants peuvent être utilisés par tous les membres du serveur dans les salons et les fils. Formats PNG, APNG, GIF ou WEBP, 16 Mo maximum."
    >
      <div>
        <Button onClick={() => fileInputRef.current?.click()}>Uploader un autocollant</Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={handleFilesSelect}
          className="hidden"
          aria-label="Importer des stickers personnalisés"
        />
      </div>

      <SettingsDivider />

      {stickers.length === 0 ? (
        <div>
          <p className="text-base font-semibold text-muted-foreground">Aucun autocollant</p>
          <p className="mt-1 text-sm text-muted-foreground">Uploade ton premier autocollant pour que tout le serveur en profite.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stickers.map((sticker) => {
            const up = sticker.creator_id ? uploaderProfiles.data?.[sticker.creator_id] : null;
            return (
              <div
                key={sticker.id}
                className="p-3 rounded-lg bg-[hsl(var(--card))] group relative"
              >
                <img
                  src={sticker.url}
                  alt={sticker.name}
                  className="w-full aspect-square object-contain mb-2"
                  loading="lazy"
                />
                <p translate="no" className="text-sm font-medium truncate">{sticker.name}</p>
                {up && (
                  <p className="text-xs text-muted-foreground truncate">
                    par {up.username || up.display_name}
                  </p>
                )}
                <button type="button"
                  onClick={() => deleteSticker.mutate({ stickerId: sticker.id, serverId })}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-background/80 hover:text-destructive transition-all"
                  aria-label="Supprimer l\'autocollant"
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
    </SettingsPage>
  );
}
