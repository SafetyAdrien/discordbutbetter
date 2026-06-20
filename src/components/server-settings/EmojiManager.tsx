import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerEmojis, useUploadEmoji, useDeleteEmoji } from '@/hooks/useServerAssets';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Loader2, Smile } from 'lucide-react';
import { UploadingOverlay } from './UploadingOverlay';
import { EmojiStickerEditor, type EditorResult } from './EmojiStickerEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmojiManagerProps {
  serverId: string;
}

const MAX_EMOJI_SIZE = 8 * 1024 * 1024; // 8 Mo — HD
const ACCEPT = 'image/png,image/gif,image/webp,image/jpeg,image/avif,image/apng';

const sanitize = (n: string) =>
  n.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32) || 'emoji';

// Loading time scales (gently) with file size: ~250ms baseline + 60ms / MB, capped at 2.5s
const computePrepDelay = (bytes: number) =>
  Math.min(2500, 250 + Math.round((bytes / (1024 * 1024)) * 60));

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

export function EmojiManager({ serverId }: EmojiManagerProps) {
  const { data: emojis = [], isLoading } = useServerEmojis(serverId);
  const uploadEmoji = useUploadEmoji();
  const deleteEmoji = useDeleteEmoji();
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
      if (f.size > MAX_EMOJI_SIZE) {
        toast.error(`${f.name} dépasse 8 Mo`);
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
      await uploadEmoji.mutateAsync({
        serverId: result.serverId,
        name: result.name,
        file: fileForUpload,
        silent: true,
      });
      toast.success(`:${result.name}: ajouté`);
    } catch (e: any) {
      toast.error(
        e?.message?.includes('duplicate') ? 'Nom déjà utilisé' : "Erreur lors de l'ajout"
      );
    }
    // Chain remaining
    if (pending.length > 0) {
      const [next, ...rest] = pending;
      openNext(next, rest);
    }
  };

  const uploaderProfiles = useUploaderProfiles(emojis.map((e) => e.creator_id || '').filter(Boolean));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const slotsTotal = 50;
  const slotsAvailable = Math.max(0, slotsTotal - emojis.length);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Emojis personnalisés</h4>
          <p className="text-sm text-muted-foreground">
            {emojis.length} emoji{emojis.length > 1 ? 's' : ''} · 8 Mo max (HD)
          </p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()}>
          <Plus className="w-4 h-4 mr-2" />
          Upload Emoji
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

      {/* Emoji section header — like image 3 */}
      <div>
        <h3 className="text-2xl font-bold mb-0.5">Emoji</h3>
        <p className="text-sm text-muted-foreground mb-3">
          {slotsAvailable} slots available
        </p>

        {emojis.length === 0 ? (
          <div className="rounded-lg bg-muted/30 py-10 text-center">
            <Smile className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Aucun emoji pour ce serveur</p>
          </div>
        ) : (
          <div className="rounded-lg bg-muted/30 overflow-hidden">
            <div className="hidden sm:grid grid-cols-[80px_1fr_1fr_40px] gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border/30">
              <div>Image</div>
              <div>Name</div>
              <div>Uploaded By</div>
              <div />
            </div>
            <ul className="divide-y divide-border/20">
              {emojis.map((emoji) => {
                const up = emoji.creator_id ? uploaderProfiles.data?.[emoji.creator_id] : null;
                const uploader = up?.username || up?.display_name || '—';
                return (
                  <li
                    key={emoji.id}
                    className="flex sm:grid sm:grid-cols-[80px_1fr_1fr_40px] sm:gap-3 sm:items-center gap-3 items-center px-3 sm:px-4 py-2 group hover:bg-muted/30 transition-colors"
                  >
                    <img
                      src={emoji.url}
                      alt={emoji.name}
                      className="w-10 h-10 object-contain rounded shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0 sm:contents">
                      <p className="text-sm font-medium truncate">:{emoji.name}:</p>
                      <div className="flex items-center gap-2 min-w-0 mt-0.5 sm:mt-0">
                        {up?.avatar_url ? (
                          <img
                            src={up.avatar_url}
                            alt=""
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {(uploader[0] || '?').toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs sm:text-sm text-muted-foreground truncate">
                          {uploader}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEmoji.mutate({ emojiId: emoji.id, serverId })}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive transition-all shrink-0"
                      aria-label="Delete emoji"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <UploadingOverlay open={preparing} />

      <EmojiStickerEditor
        open={!!current}
        file={current}
        type="emoji"
        defaultName={current ? sanitize(current.name) : 'emoji'}
        currentServerId={serverId}
        onClose={handleEditorClose}
        onFinish={handleEditorFinish}
      />
    </div>
  );
}
