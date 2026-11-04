import { useEffect, useMemo, useRef, useState } from 'react';
import { Bold, Italic, Underline, Strikethrough, Quote, Code, EyeOff } from 'lucide-react';
import { Plus, Smile, ImageIcon } from '@/components/icons/discord/lucide';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { USelect } from '@/components/user-settings/UserSettingsUI';
import { UnsavedChangesBar } from '@/components/server-settings/SettingsUI';
import { ForumTagChip } from '@/components/channels/forum/ForumTagChip';
import { useUpdateChannel, type ChannelDetails } from '@/hooks/useChannelSettings';
import {
  useForumTags,
  useForumChannelConfig,
  useUpdateForumChannelConfig,
  useCreateForumTag,
  useUpdateForumTag,
  useDeleteForumTag,
  FORUM_LAYOUTS,
  FORUM_SORT_ORDERS,
  MAX_FORUM_TAGS_PER_CHANNEL,
  type ForumChannelConfig,
  type ForumTag,
} from '@/hooks/useForumTags';
import { cn } from '@/lib/utils';
import { ForumTagModal } from './ForumTagModal';
import { useAllServerAssets } from '@/hooks/useAllServerAssets';
import { ForumEmoji } from '@/components/channels/forum/ForumEmoji';

/*
 * "Vue d'ensemble" d'un salon Forum ou Multimedia (videos de reference) :
 * nom, guide des posts, tags, reaction par defaut, mode lent des posts et
 * des messages, disposition par defaut (Forum), ordre de tri, correspondance
 * des tags, visibilite du contenu, masquage apres inactivite et, pour le
 * Multimedia, l'option de sauvegarde des medias. Les modifications sont
 * groupees dans la barre "Attention, il reste des modifications...".
 * Les tags s'enregistrent immediatement, comme chez Discord.
 */

const GUIDE_MAX = 4096;

const SLOWMODE: { value: string; label: string }[] = [
  ['0', 'Désactivé'], ['5', '5s'], ['10', '10s'], ['15', '15s'], ['30', '30s'], ['60', '1 min'], ['120', '2 min'], ['300', '5 min'],
  ['600', '10 min'], ['900', '15 min'], ['1800', '30 min'], ['3600', '1 h'], ['7200', '2 h'], ['21600', '6 h'],
].map(([value, label]) => ({ value, label }));

const ARCHIVE: { value: string; label: string }[] = [
  { value: '60', label: '1 heure' },
  { value: '1440', label: '24 heures' },
  { value: '4320', label: '3 jours' },
  { value: '10080', label: '1 semaine' },
];

type Draft = {
  name: string;
  guidelines: string;
  require_tag: boolean;
  default_reaction_emoji_name: string | null;
  default_reaction_emoji_id: string | null;
  post_slowmode_seconds: number;
  message_slowmode_seconds: number;
  default_layout: number;
  default_sort_order: number;
  default_tag_setting: string;
  content_visibility: ForumChannelConfig['content_visibility'];
  default_auto_archive_duration: number;
  hide_media_download_options: boolean;
};

const fromConfig = (channel: ChannelDetails, c: ForumChannelConfig): Draft => ({
  name: channel.name,
  guidelines: c.guidelines ?? '',
  require_tag: c.require_tag,
  default_reaction_emoji_name: c.default_reaction_emoji_name,
  default_reaction_emoji_id: c.default_reaction_emoji_id ?? null,
  post_slowmode_seconds: c.post_slowmode_seconds ?? 0,
  message_slowmode_seconds: c.message_slowmode_seconds ?? 0,
  default_layout: c.default_layout,
  default_sort_order: c.default_sort_order,
  default_tag_setting: c.default_tag_setting,
  content_visibility: c.content_visibility ?? 'default',
  default_auto_archive_duration: c.default_auto_archive_duration,
  hide_media_download_options: c.hide_media_download_options,
});

function Section({ title, description, children, className }: { title: string; description?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <section className={cn('mt-6', className)}>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {description && <p className="mt-1 text-sm leading-[18px] text-muted-foreground">{description}</p>}
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}

function SubSelect({ label, description, value, options, onChange }: { label: string; description?: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-white">{label}</p>
      <USelect value={value} onChange={onChange} options={options} className="mt-2" />
      {description && <p className="mt-2 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export function ForumOverviewSettings({ channel, serverId }: { channel: ChannelDetails; serverId: string }) {
  const isMedia = channel.type === 'media';
  const { data: tags = [] } = useForumTags(channel.id);
  const { data: config } = useForumChannelConfig(channel.id);
  const updateConfig = useUpdateForumChannelConfig(channel.id);
  const updateChannel = useUpdateChannel();
  const createTag = useCreateForumTag(channel.id);
  const updateTag = useUpdateForumTag(channel.id);
  const deleteTag = useDeleteForumTag(channel.id);
  // Emoji personnalise (`:nom:`) -> identifiant en base, en preferant les emojis de ce serveur.
  const { emojis: allEmojis } = useAllServerAssets(true);
  const pickEmojiId = (e: string): string | null => {
    if (!e.startsWith(':') || !e.endsWith(':')) return null;
    const n = e.slice(1, -1);
    return (allEmojis.find((x) => x.name === n && x.server_id === serverId) ?? allEmojis.find((x) => x.name === n))?.id ?? null;
  };
  // Reordonnancement des tags par glisser-deposer : le tag depose prend la place du tag survole.
  const [dragTag, setDragTag] = useState<string | null>(null);
  const [overTag, setOverTag] = useState<string | null>(null);
  const dropTag = (targetId: string) => {
    const from = dragTag;
    setDragTag(null);
    setOverTag(null);
    if (!from || from === targetId) return;
    const order = tags.map((t) => t.id);
    order.splice(order.indexOf(from), 1);
    order.splice(order.indexOf(targetId), 0, from);
    order.forEach((id, i) => {
      if (tags.find((t) => t.id === id)?.position !== i) updateTag.mutate({ id, position: i });
    });
  };

  const saved = useMemo(() => (config ? fromConfig(channel, config) : null), [channel, config]);
  const [draft, setDraft] = useState<Draft | null>(saved);
  const [tagModal, setTagModal] = useState<{ open: boolean; tag: ForumTag | null }>({ open: false, tag: null });
  const guideRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (saved && !draft) setDraft(saved);
  }, [saved, draft]);

  if (!draft || !saved) return null;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));
  const dirty = (Object.keys(draft) as (keyof Draft)[]).some((k) => draft[k] !== saved[k]);

  const save = async () => {
    const { name, ...rest } = draft;
    const tasks: Promise<unknown>[] = [];
    if (name.trim() && name.trim() !== channel.name) {
      tasks.push(updateChannel.mutateAsync({ channelId: channel.id, serverId, name: name.trim() }));
    }
    const patch: Partial<ForumChannelConfig> = {};
    (Object.keys(rest) as (keyof typeof rest)[]).forEach((k) => {
      if (rest[k] !== saved[k]) (patch as Record<string, unknown>)[k] = k === 'guidelines' ? (rest.guidelines.trim() || null) : rest[k];
    });
    if (Object.keys(patch).length) tasks.push(updateConfig.mutateAsync(patch));
    await Promise.allSettled(tasks);
  };

  // Barre d'outils Markdown du guide : entoure la selection.
  const wrap = (before: string, after = before) => {
    const el = guideRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const next = value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e);
    if (next.length > GUIDE_MAX) return;
    set('guidelines', next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, e + before.length);
    });
  };
  const quoteLine = () => {
    const el = guideRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const lineStart = draft.guidelines.lastIndexOf('\n', s - 1) + 1;
    set('guidelines', draft.guidelines.slice(0, lineStart) + '> ' + draft.guidelines.slice(lineStart));
  };

  const toolbar: { label: string; icon: React.ElementType; run: () => void }[] = [
    { label: 'Gras', icon: Bold, run: () => wrap('**') },
    { label: 'Italique', icon: Italic, run: () => wrap('*') },
    { label: 'Souligné', icon: Underline, run: () => wrap('__') },
    { label: 'Barré', icon: Strikethrough, run: () => wrap('~~') },
    { label: 'Citation', icon: Quote, run: quoteLine },
    { label: 'Code', icon: Code, run: () => wrap('`') },
    { label: 'Spoiler', icon: EyeOff, run: () => wrap('||') },
  ];

  return (
    <div className="pb-24">
      <h2 className="text-xl font-semibold text-white">Vue d'ensemble</h2>

      <Section title="Nom du salon">
        <input
          value={draft.name}
          maxLength={100}
          onChange={(e) => set('name', e.target.value)}
          aria-label="Nom du salon"
          className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--input))] border border-white/[0.06] focus:border-primary outline-none text-base text-foreground"
        />
      </Section>

      <Section title="Guide des posts">
        <div className="rounded-lg bg-[hsl(var(--input))] border border-white/[0.06] focus-within:border-primary">
          <div className="flex items-center gap-1 px-2 pt-2">
            {toolbar.map(({ label, icon: Icon, run }) => (
              <button key={label} type="button" title={label} aria-label={label} onClick={run} className="h-7 w-7 rounded flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white hover:bg-[hsl(var(--interactive-background-hover))]">
                <Icon className="w-4 h-4" />
              </button>
            ))}
            <EmojiStickerPicker
              serverId={serverId}
              onEmojiSelect={(emoji) => set('guidelines', (draft.guidelines + emoji).slice(0, GUIDE_MAX))}
              trigger={
                <button type="button" aria-label="Ajouter un émoji" className="ml-auto h-7 w-7 rounded flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white">
                  <Smile className="w-5 h-5" />
                </button>
              }
            />
          </div>
          <textarea
            ref={guideRef}
            value={draft.guidelines}
            maxLength={GUIDE_MAX}
            onChange={(e) => set('guidelines', e.target.value)}
            placeholder="Apprends à tout le monde comment utiliser ce salon !"
            aria-label="Guide des posts"
            className="block w-full min-h-[120px] px-3 py-2 bg-transparent outline-none resize-y text-sm text-foreground placeholder:text-[hsl(var(--text-placeholder))]"
          />
          <div className="px-3 pb-2 flex justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground cursor-default">{GUIDE_MAX - draft.guidelines.length}</span>
              </TooltipTrigger>
              <TooltipContent>{GUIDE_MAX - draft.guidelines.length} caractère(s) restant(s)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </Section>

      <Section title="Tags" description="Aide les autres à organiser leurs posts en sous-catégories grâce à la création d'un tag.">
        {tags.length === 0 ? (
          <button type="button" onClick={() => setTagModal({ open: true, tag: null })} className="h-8 px-3 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90">
            Créer un tag
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((t) => (
              <span
                key={t.id}
                draggable
                onDragStart={(e) => { setDragTag(t.id); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => { e.preventDefault(); if (dragTag && dragTag !== t.id) setOverTag(t.id); }}
                onDragLeave={() => setOverTag((o) => (o === t.id ? null : o))}
                onDrop={(e) => { e.preventDefault(); dropTag(t.id); }}
                onDragEnd={() => { setDragTag(null); setOverTag(null); }}
                className={cn('cursor-grab active:cursor-grabbing rounded-full transition-opacity', dragTag === t.id && 'opacity-40', overTag === t.id && 'ring-2 ring-primary/70')}
              >
                <ForumTagChip tag={t} onClick={() => setTagModal({ open: true, tag: t })} />
              </span>
            ))}
            {tags.length < MAX_FORUM_TAGS_PER_CHANNEL && (
              <button type="button" aria-label="Créer un tag" onClick={() => setTagModal({ open: true, tag: null })} className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90">
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        <label className="mt-4 flex items-center gap-2 text-sm text-foreground cursor-pointer w-fit">
          <Checkbox checked={draft.require_tag} onCheckedChange={(c) => set('require_tag', c === true)} />
          Tags requis lorsque les gens postent
        </label>
      </Section>

      <Section title="Réaction par défaut" description="Choisis un émoji par défaut que tes membres pourront utiliser pour réagir à un post dans ce salon.">
        <div className="flex items-start gap-6">
          <div className="flex items-center gap-3">
            <EmojiStickerPicker
              serverId={serverId}
              onEmojiSelect={(e) => { set('default_reaction_emoji_name', e); set('default_reaction_emoji_id', pickEmojiId(e)); }}
              trigger={
                <button type="button" className="h-8 px-3 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90">
                  Sélectionner un émoji
                </button>
              }
            />
            {draft.default_reaction_emoji_name && <span className="h-8 w-8 rounded-lg bg-[hsl(var(--button-secondary))] flex items-center justify-center"><ForumEmoji emoji={draft.default_reaction_emoji_name} className="text-xl" /></span>}
            {draft.default_reaction_emoji_name && (
              <button type="button" onClick={() => { set('default_reaction_emoji_name', null); set('default_reaction_emoji_id', null); }} className="text-sm font-medium text-[#f57976] hover:underline">
                Supprimer
              </button>
            )}
          </div>
          {/* Apercu : une carte de post avec la reaction en bas */}
          <div className="ml-auto w-[150px] shrink-0 rounded-lg bg-[hsl(var(--card))] p-2.5" aria-hidden="true">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5 pt-1">
                <span className="block h-1.5 w-20 rounded-full bg-white/10" />
                <span className="block h-1.5 w-14 rounded-full bg-white/10" />
                <span className="block h-1.5 w-16 rounded-full bg-white/10" />
              </div>
              <span className="h-9 w-9 rounded bg-white/10" />
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><ForumEmoji emoji={draft.default_reaction_emoji_name ?? '🙂'} /> 17</span>
              <span className="h-1.5 w-6 rounded-full bg-white/10" />
              <span className="h-1.5 w-6 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Mode lent">
        <SubSelect
          label="Posts"
          value={String(draft.post_slowmode_seconds)}
          options={SLOWMODE}
          onChange={(v) => set('post_slowmode_seconds', Number(v))}
          description="Les membres n'auront le droit de créer qu'un post lors de cet intervalle de temps, à moins qu'ils ne possèdent la permission Ignorer le mode lent."
        />
        <SubSelect
          label="Messages"
          value={String(draft.message_slowmode_seconds)}
          options={SLOWMODE}
          onChange={(v) => set('message_slowmode_seconds', Number(v))}
          description="Les membres ne pourront envoyer qu'un message par intervalle sur les nouveaux posts, à moins qu'ils ne possèdent la permission Ignorer le mode lent."
        />
      </Section>

      {!isMedia && (
        <Section title="Disposition par défaut">
          <div className="flex items-start gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-[18px] text-muted-foreground">
                Définis la disposition par défaut sur une galerie centrée sur les contenus médias ou une liste centrée sur le texte. Les membres pourront toujours passer d'une option à l'autre.
              </p>
              <USelect
                value={String(draft.default_layout === FORUM_LAYOUTS.GRID ? FORUM_LAYOUTS.GRID : FORUM_LAYOUTS.LIST)}
                onChange={(v) => set('default_layout', Number(v))}
                options={[
                  { value: String(FORUM_LAYOUTS.LIST), label: 'Affichage en liste' },
                  { value: String(FORUM_LAYOUTS.GRID), label: 'Affichage en galerie' },
                ]}
                className="mt-3 max-w-[220px]"
              />
            </div>
            <div className="flex gap-2 shrink-0" aria-hidden="true">
              <LayoutIllustration kind="gallery" active={draft.default_layout === FORUM_LAYOUTS.GRID} />
              <LayoutIllustration kind="list" active={draft.default_layout !== FORUM_LAYOUTS.GRID} />
            </div>
          </div>
        </Section>
      )}

      <Section title="Ordre de tri" description="Définis l'ordre de tri par défaut pour les nouveaux posts. Les membres pourront toujours passer d'une option à l'autre.">
        <USelect
          value={String(draft.default_sort_order)}
          onChange={(v) => set('default_sort_order', Number(v))}
          options={[
            { value: String(FORUM_SORT_ORDERS.LATEST_ACTIVITY), label: 'Activité récente' },
            { value: String(FORUM_SORT_ORDERS.CREATION_TIME), label: 'Heure de création' },
          ]}
        />
      </Section>

      <Section title="Correspondance des tags" description="Définis le comportement de correspondance des tags par défaut. Les membres pourront toujours passer d'une option à l'autre.">
        <USelect
          value={draft.default_tag_setting}
          onChange={(v) => set('default_tag_setting', v)}
          options={[
            { value: 'match_some', label: 'Faire correspondre certains' },
            { value: 'match_all', label: 'Faire tout correspondre' },
          ]}
        />
      </Section>

      <Section title="Visibilité du contenu">
        <div role="radiogroup" className="space-y-3">
          {([
            ['default', 'Par défaut', 'Le contenu du salon est toujours visible.'],
            ['spoiler', 'Salon de spoiler', "Marque ce salon comme contenant des spoilers, afin que les rebondissements de l'histoire, les sujets sensibles ou d'autres discussions importantes soient masqués jusqu'à ce que les utilisateurs et utilisatrices choisissent de les afficher."],
            ['age_restricted', "Salon soumis à une limite d'âge", "Les utilisateurs devront confirmer qu'ils ont l'âge légal pour voir le contenu de ce salon. Les salons soumis à une limite d'âge sont exemptés du filtre de contenu explicite."],
          ] as const).map(([value, label, desc]) => (
            <button key={value} type="button" role="radio" aria-checked={draft.content_visibility === value} onClick={() => set('content_visibility', value)} className="flex items-start gap-3 text-left">
              <span className={cn('mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center', draft.content_visibility === value ? 'border-primary' : 'border-[hsl(var(--icon-default))]')}>
                {draft.content_visibility === value && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </span>
              <span>
                <span className="block text-sm font-medium text-white">{label}</span>
                <span className="block text-xs leading-4 text-muted-foreground">{desc}</span>
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Masquer après une période d'inactivité">
        <USelect value={String(draft.default_auto_archive_duration)} onChange={(v) => set('default_auto_archive_duration', Number(v))} options={ARCHIVE} />
        <p className="mt-2 text-xs text-muted-foreground">Les nouveaux posts n'apparaîtront plus dans la liste des salons après une période d'inactivité préalablement définie.</p>
      </Section>

      {isMedia && (
        <div className="mt-6 flex items-start justify-between gap-6">
          <div>
            <p className="text-base font-semibold text-white">Afficher l'option pour sauvegarder et copier les médias intégrés</p>
            <p className="mt-1 text-sm leading-[18px] text-muted-foreground">
              Permet aux membres de sauvegarder, copier et partager des pièces jointes multimédias uploadées dans ce salon. Les fichiers qui ne peuvent pas être intégrés peuvent toujours être téléchargés.
            </p>
          </div>
          <Switch checked={!draft.hide_media_download_options} onCheckedChange={(c) => set('hide_media_download_options', !c)} />
        </div>
      )}

      <UnsavedChangesBar visible={dirty} onReset={() => setDraft(saved)} onSave={save} saving={updateConfig.isPending || updateChannel.isPending} />

      <ForumTagModal
        open={tagModal.open}
        tag={tagModal.tag}
        serverId={serverId}
        saving={createTag.isPending || updateTag.isPending}
        onClose={() => setTagModal({ open: false, tag: null })}
        onSave={(input) => {
          const done = { onSuccess: () => setTagModal({ open: false, tag: null }) };
          if (tagModal.tag) updateTag.mutate({ id: tagModal.tag.id, ...input }, done);
          else createTag.mutate(input, done);
        }}
        onDelete={tagModal.tag ? () => deleteTag.mutate(tagModal.tag!.id, { onSuccess: () => setTagModal({ open: false, tag: null }) }) : undefined}
      />
    </div>
  );
}

function LayoutIllustration({ kind, active }: { kind: 'gallery' | 'list'; active: boolean }) {
  return (
    <div className={cn('w-[78px] h-[96px] rounded-lg bg-[hsl(var(--card))] p-2 flex flex-col gap-1.5 ring-2 transition-colors', active ? 'ring-primary' : 'ring-transparent')}>
      {kind === 'gallery' ? (
        <>
          <span className="flex-1 rounded bg-white/10 flex items-center justify-center text-[hsl(var(--icon-default))]">
            <ImageIcon className="w-4 h-4" />
          </span>
          <span className="h-1.5 w-full rounded-full bg-white/10" />
          <span className="h-1.5 w-3/4 rounded-full bg-white/10" />
        </>
      ) : (
        <>
          {[0, 1, 2].map((i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="flex-1 space-y-1">
                <span className="block h-1.5 w-full rounded-full bg-white/10" />
                <span className="block h-1.5 w-2/3 rounded-full bg-white/10" />
              </span>
              <span className="h-5 w-5 rounded bg-white/10" />
            </span>
          ))}
        </>
      )}
    </div>
  );
}
