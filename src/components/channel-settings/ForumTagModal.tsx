import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { Smile, XCircle } from '@/components/icons/discord/lucide';
import { ForumEmoji } from '@/components/channels/forum/ForumEmoji';
import { useAllServerAssets } from '@/hooks/useAllServerAssets';
import { FORUM_TAG_NAME_MAX_LENGTH, type ForumTag } from '@/hooks/useForumTags';

/*
 * "Creer un tag" / "Modifier le tag" (video de reference) : emoji a gauche du
 * champ, effacement a droite, case "Autoriser uniquement les moderateurs a
 * appliquer un tag", et en edition "Supprimer le tag".
 */
export function ForumTagModal({
  open,
  tag,
  serverId,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  /** null = creation. */
  tag: ForumTag | null;
  serverId: string | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (input: { name: string; emoji_name: string | null; emoji_id: string | null; moderated: boolean }) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string | null>(null);
  const [moderated, setModerated] = useState(false);
  // Emojis personnalises des serveurs : `:nom:` est resolu en identifiant (le tag garde ainsi son emoji meme renomme).
  const { emojis } = useAllServerAssets(open);
  const customId = (e: string | null) => {
    if (!e || !e.startsWith(':') || !e.endsWith(':')) return null;
    const name = e.slice(1, -1);
    return (emojis.find((x) => x.name === name && x.server_id === serverId) ?? emojis.find((x) => x.name === name))?.id ?? null;
  };

  useEffect(() => {
    if (!open) return;
    setName(tag?.name ?? '');
    setEmoji(tag?.emoji_name ?? null);
    setModerated(tag?.moderated ?? false);
  }, [open, tag]);

  const valid = name.trim().length > 0;
  const changed = !tag || name.trim() !== tag.name || emoji !== tag.emoji_name || moderated !== tag.moderated;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-4 gap-0 bg-[hsl(var(--surface-card))] border-[hsl(var(--border-subtle))]">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-xl font-semibold text-white">{tag ? 'Modifier le tag' : 'Créer un tag'}</DialogTitle>
          <DialogDescription className="text-sm text-foreground">
            Crée un tag pour aider les autres à organiser leurs posts en sous-catégories. {FORUM_TAG_NAME_MAX_LENGTH} caractères maximum.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && changed && !saving) onSave({ name: name.trim(), emoji_name: emoji, emoji_id: customId(emoji), moderated });
          }}
        >
          <div className="mt-4 flex items-center gap-2 h-10 px-2 rounded-lg bg-[hsl(var(--input))] border border-white/[0.06] focus-within:border-[#5b63e4] overflow-hidden">
            <EmojiStickerPicker
              serverId={serverId}
              onEmojiSelect={setEmoji}
              trigger={
                <button type="button" aria-label="Choisir un émoji" className="h-6 w-6 shrink-0 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white">
                  {emoji ? <ForumEmoji emoji={emoji} className="text-lg h-6 w-6" /> : <Smile className="w-5 h-5" />}
                </button>
              }
            />
            <input
              autoFocus
              value={name}
              maxLength={FORUM_TAG_NAME_MAX_LENGTH}
              onChange={(e) => setName(e.target.value)}
              placeholder="Relations, Conseils, Art, Mode, Santé, Recettes"
              aria-label="Nom du tag"
              className="flex-1 min-w-0 bg-transparent outline-none text-sm text-foreground placeholder:text-[hsl(var(--text-placeholder))]"
            />
            {(name || emoji) && (
              <button
                type="button"
                aria-label="Effacer"
                onClick={() => {
                  setName('');
                  setEmoji(null);
                }}
                className="shrink-0 text-[hsl(var(--icon-default))] hover:text-white"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-foreground cursor-pointer w-fit">
            <Checkbox checked={moderated} onCheckedChange={(c) => setModerated(c === true)} />
            Autoriser uniquement les modérateurs à appliquer un tag
          </label>

          <div className="mt-6 flex items-center gap-2">
            {tag && onDelete && (
              <button type="button" onClick={onDelete} className="mr-auto text-sm font-medium text-[#f57976] hover:underline">
                Supprimer le tag
              </button>
            )}
            <div className={tag ? 'flex gap-2' : 'grid grid-cols-2 gap-2 w-full'}>
              <Button type="button" variant="secondary" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={!valid || !changed || saving}>
                Enregistrer
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
