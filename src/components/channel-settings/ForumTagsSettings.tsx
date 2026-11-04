import { useState } from 'react';
import { LockOpen } from 'lucide-react';
import { Plus, X, Lock, Tag as TagIcon } from '@/components/icons/discord/lucide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ForumEmoji } from '@/components/channels/forum/ForumEmoji';
import {
  useForumTags, useForumChannelConfig, useCreateForumTag, useUpdateForumTag,
  useDeleteForumTag, useUpdateForumChannelConfig,
  MAX_FORUM_TAGS_PER_CHANNEL, FORUM_LAYOUTS, FORUM_SORT_ORDERS,
} from '@/hooks/useForumTags';

/**
 * Forum tag management (Fluxer's `available_tags` + channel config).
 *
 * Fluxer models tags as channel-level entities with an emoji and a `moderated`
 * flag, capped at 20 per channel. This screen lets moderators define that
 * vocabulary, decide whether a tag is mandatory (REQUIRE_TAG), and pick the
 * default layout / sort order.
 */
export function ForumTagsSettings({ channelId, channelType }: { channelId: string; channelType?: string }) {
  // HIDE_MEDIA_DOWNLOAD_OPTIONS is a media-only flag in Fluxer
  // (settableChannelFlags: GUILD_MEDIA gets REQUIRE_TAG | HIDE_MEDIA_DOWNLOAD_OPTIONS).
  const isMedia = channelType === 'media';
  const { data: tags = [] } = useForumTags(channelId);
  const { data: config } = useForumChannelConfig(channelId);
  const createTag = useCreateForumTag(channelId);
  const updateTag = useUpdateForumTag(channelId);
  const deleteTag = useDeleteForumTag(channelId);
  const updateConfig = useUpdateForumChannelConfig(channelId);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [moderated, setModerated] = useState(false);

  const atLimit = tags.length >= MAX_FORUM_TAGS_PER_CHANNEL;

  const handleCreate = () => {
    const n = name.trim();
    if (!n || atLimit) return;
    createTag.mutate(
      { name: n, emoji_name: emoji.trim() || null, moderated },
      { onSuccess: () => { setName(''); setEmoji(''); setModerated(false); } },
    );
  };

  return (
    <div className="space-y-6">
      {/* Tag list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold">
            Étiquettes du salon
          </Label>
          <span className="text-xs text-muted-foreground">
            {tags.length}/{MAX_FORUM_TAGS_PER_CHANNEL}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Les membres choisissent parmi ces étiquettes pour classer leurs sujets.
          Fluxer limite à {MAX_FORUM_TAGS_PER_CHANNEL} par salon.
        </p>

        {tags.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Aucune étiquette définie. Sans étiquette, les membres saisissent un texte libre.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5"
              >
                {tag.emoji_name
                  ? <ForumEmoji emoji={tag.emoji_name} className="text-base w-5" />
                  : <TagIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                <span translate="no" className="text-sm truncate flex-1">{tag.name}</span>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="iconSm"
                      variant="ghost"
                      onClick={() => updateTag.mutate({ id: tag.id, moderated: !tag.moderated })}
                      aria-label={tag.moderated ? 'Retirer le statut modéré' : 'Marquer comme modéré'}
                    >
                      {tag.moderated
                        ? <Lock className="w-3.5 h-3.5 text-primary" />
                        : <LockOpen className="w-3.5 h-3.5 text-muted-foreground" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {tag.moderated ? 'Réservé aux modérateurs' : 'Accessible à tous'}
                  </TooltipContent>
                </Tooltip>

                <Button
                  type="button"
                  size="iconSm"
                  variant="ghost"
                  onClick={() => deleteTag.mutate(tag.id)}
                  aria-label={`Supprimer ${tag.name}`}
                >
                  <X className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Add form */}
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="Emoji"
              maxLength={8}
              className="w-16 text-center"
              disabled={atLimit}
            />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
              placeholder="Nom de l'étiquette"
              maxLength={50}
              disabled={atLimit}
            />
            <Button type="button" onClick={handleCreate} disabled={!name.trim() || atLimit || createTag.isPending}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={moderated}
              onChange={(e) => setModerated(e.target.checked)}
              className="accent-[hsl(var(--primary))]"
            />
            Réservée aux modérateurs (permission « Gérer les étiquettes »)
          </label>
          {atLimit && (
            <p className="text-xs text-destructive">
              Limite de {MAX_FORUM_TAGS_PER_CHANNEL} étiquettes atteinte.
            </p>
          )}
        </div>
      </div>

      {/* REQUIRE_TAG */}
      <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
        <div className="pr-3">
          <Label className="text-sm font-medium">Étiquette obligatoire</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Les membres devront choisir au moins une étiquette pour publier.
          </p>
        </div>
        <Switch
          checked={config?.require_tag ?? false}
          onCheckedChange={(v) => updateConfig.mutate({ require_tag: v })}
        />
      </div>

      {/* HIDE_MEDIA_DOWNLOAD_OPTIONS — media channels only */}
      {isMedia && (
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div className="pr-3">
            <Label className="text-sm font-medium">Masquer les options de téléchargement</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Les membres peuvent voir les médias mais ne peuvent pas les enregistrer.
            </p>
          </div>
          <Switch
            checked={config?.hide_media_download_options ?? false}
            onCheckedChange={(v) => updateConfig.mutate({ hide_media_download_options: v })}
          />
        </div>
      )}

      {/* Default layout / sort / multi-tag semantics */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Affichage par défaut</Label>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Disposition</span>
          <Select
            value={String(config?.default_layout ?? FORUM_LAYOUTS.DEFAULT)}
            onValueChange={(v) => updateConfig.mutate({ default_layout: Number(v) })}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(FORUM_LAYOUTS.DEFAULT)}>Par défaut</SelectItem>
              <SelectItem value={String(FORUM_LAYOUTS.LIST)}>Liste</SelectItem>
              <SelectItem value={String(FORUM_LAYOUTS.GRID)}>Grille</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Tri par défaut</span>
          <Select
            value={String(config?.default_sort_order ?? FORUM_SORT_ORDERS.LATEST_ACTIVITY)}
            onValueChange={(v) => updateConfig.mutate({ default_sort_order: Number(v) })}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(FORUM_SORT_ORDERS.LATEST_ACTIVITY)}>Activité récente</SelectItem>
              <SelectItem value={String(FORUM_SORT_ORDERS.CREATION_TIME)}>Date de création</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Filtre multi-étiquettes</span>
          <Select
            value={config?.default_tag_setting ?? 'match_some'}
            onValueChange={(v) => updateConfig.mutate({ default_tag_setting: v })}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match_some">Au moins une</SelectItem>
              <SelectItem value="match_all">Toutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}