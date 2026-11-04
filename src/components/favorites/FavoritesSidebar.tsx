import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Plus, Star, X } from '@/components/icons/discord/lucide';
import { IdCard } from '@/components/icons/discord/lucide';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from '@/components/ui/context-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { useFavorites, type NewFavorite } from '@/hooks/useFavorites';
import { useDMConversations } from '@/hooks/useDMs';
import { useAllServerAssets } from '@/hooks/useAllServerAssets';
import { useAllChannels } from '@/hooks/useAllChannels';
import { useAuth } from '@/contexts/AuthContext';
import { isThreadMuted, MUTE_FOREVER, useSetThreadNotificationPrefs, useThreadNotificationPrefs, useUnfollowThread } from '@/hooks/useThreadFollow';
import { useMarkThreadAsRead } from '@/hooks/useThreadUnreadCounts';
import { MUTES, LEVELS } from '@/components/threads/ThreadContextMenuBody';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import type { FavoriteItem } from '@/lib/userSettings';
import { cn } from '@/lib/utils';
import { AddFavoritesDialog } from './AddFavoritesDialog';
import { FavTextDialog } from './FavDialog';
import { SourceTile, ThreadGlyph, channelGlyph } from './FavIcons';

/*
 * Colonne "Favoris" (video de reference) : en-tete "★ Favoris ˅ +", "Salons suggeres" (ajout en un clic, fermable),
 * favoris sans categorie puis categories repliables. Clic droit : menu du favori (deplacer, pseudo, lien, muet...).
 */

export const OPEN_ADD_FAVORITES_EVENT = 'open-add-favorites';
export const favKey = (i: Pick<FavoriteItem, 'kind' | 'ref_id'>) => `${i.kind}:${i.ref_id}`;

interface Props {
  activeKey: string | null;
  onOpen: (item: FavoriteItem) => void;
  onGoToServer: (item: FavoriteItem) => void;
}

const ITEM = 'min-h-[33px] px-2 py-1.5 text-sm whitespace-nowrap';
const SUB = cn(ITEM, '[&>svg:last-child]:!h-[11px] [&>svg:last-child]:!w-[11px]');

function FavRow({ item, active, label, onOpen, children }: { item: FavoriteItem; active: boolean; label: string; onOpen: () => void; children: React.ReactNode }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            'mx-2 flex h-8 w-[calc(100%-16px)] items-center gap-1.5 rounded-lg px-2 text-base font-medium transition-colors',
            active ? 'bg-[hsl(var(--interactive-background-selected))] text-white' : 'text-[hsl(var(--interactive-icon-default))] hover:bg-[hsl(var(--interactive-background-hover))] hover:text-[hsl(var(--interactive-text-hover))]',
          )}
        >
          {item.kind === 'dm' ? (
            <UserAvatarImage src={item.icon_url} alt="" className="h-6 w-6 shrink-0" fallbackClassName="text-[10px]" fallback={label.charAt(0).toUpperCase()} />
          ) : item.kind === 'thread' ? (
            <ThreadGlyph className="h-5 w-5 shrink-0" />
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">{channelGlyph(item.ch_type, 'h-5 w-5')}</span>
          )}
          <span translate="no" className="min-w-0 flex-1 truncate text-left">{label}</span>
        </button>
      </ContextMenuTrigger>
      {children}
    </ContextMenu>
  );
}

function ItemMenu({ item, onGoToServer, categories, onMove, onRename, onRemove }: {
  item: FavoriteItem;
  onGoToServer: () => void;
  categories: { id: string; name: string }[];
  onMove: (categoryId: string | null) => void;
  onRename: () => void;
  onRemove: () => void;
}) {
  const isThread = item.kind === 'thread';
  const isDM = item.kind === 'dm';
  const { data: prefs } = useThreadNotificationPrefs(isThread ? item.ref_id : undefined);
  const setPrefs = useSetThreadNotificationPrefs();
  const unfollow = useUnfollowThread();
  const markRead = useMarkThreadAsRead();
  const muted = isThreadMuted(prefs);
  const noun = isThread ? 'fil' : isDM ? 'MP' : 'salon';
  const levelLabel = LEVELS.find((l) => l.id === (prefs?.level ?? 'all'))?.label ?? 'Tous les messages';
  const soon = { disabled: true, title: 'Bientôt disponible' } as const;

  return (
    <ContextMenuContent className="w-[221px]">
      <ContextMenuItem className={ITEM} disabled={!isThread} onSelect={() => item.channel_id && markRead.mutate({ threadId: item.ref_id, channelId: item.channel_id })}>Marquer comme lu</ContextMenuItem>
      {!isDM && <ContextMenuItem className={ITEM} onSelect={onGoToServer}>Aller sur le serveur</ContextMenuItem>}
      <ContextMenuSub>
        <ContextMenuSubTrigger className={SUB}>Déplacer vers…</ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-[180px]">
          <ContextMenuSub>
            <ContextMenuSubTrigger className={SUB}>Catégorie</ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-[180px]">
              <ContextMenuItem className={cn(ITEM, item.category_id === null && 'opacity-50')} onSelect={() => onMove(null)}>Non catégorisé</ContextMenuItem>
              {categories.map((c) => (
                <ContextMenuItem key={c.id} className={cn(ITEM, item.category_id === c.id && 'opacity-50')} onSelect={() => onMove(c.id)}>{c.name}</ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuSubContent>
      </ContextMenuSub>
      {!isDM && <ContextMenuItem className={ITEM} onSelect={onRename}>Changer le pseudo</ContextMenuItem>}
      {isDM && <ContextMenuItem className={ITEM} onSelect={onRename}>Changer le pseudo</ContextMenuItem>}
      <ContextMenuSeparator />
      {!isDM && (
        <ContextMenuItem className={ITEM} onSelect={() => void copyToClipboard(`${window.location.origin}/${isThread ? 'thread' : 'channels'}/${item.ref_id}`, 'Lien copié')}>Copier le lien</ContextMenuItem>
      )}
      {!isDM && <ContextMenuSeparator />}
      <ContextMenuSub>
        <ContextMenuSubTrigger className={SUB} disabled={!isThread}>{muted ? `Réactiver le son du ${noun}` : `Rendre le ${noun} muet`}</ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-[260px]">
          {muted ? (
            <ContextMenuItem className={ITEM} onSelect={() => setPrefs.mutate({ threadId: item.ref_id, mutedUntil: null })}>Réactiver le son du fil</ContextMenuItem>
          ) : (
            MUTES.map((d) => (
              <ContextMenuItem key={d.label} className={ITEM} onSelect={() => setPrefs.mutate({ threadId: item.ref_id, mutedUntil: d.ms ? new Date(Date.now() + d.ms).toISOString() : MUTE_FOREVER })}>{d.label}</ContextMenuItem>
            ))
          )}
        </ContextMenuSubContent>
      </ContextMenuSub>
      {!isDM && (
        <ContextMenuSub>
          <ContextMenuSubTrigger className={cn(SUB, 'min-h-[44px]')} disabled={!isThread}>
            <span className="flex flex-col">
              <span>Paramètres de notification</span>
              <span className="text-xs font-normal text-[#b5bac1]">{levelLabel}</span>
            </span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-[260px]">
            {LEVELS.map((l) => (
              <ContextMenuItem key={l.id} className={ITEM} onSelect={() => setPrefs.mutate({ threadId: item.ref_id, level: l.id })}>{l.label}</ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}
      {!isDM && <ContextMenuItem className={ITEM} {...soon}>View Permissions</ContextMenuItem>}
      <ContextMenuSeparator />
      {isThread && <ContextMenuItem className={ITEM} onSelect={() => unfollow.mutate(item.ref_id)}>Quitter le fil</ContextMenuItem>}
      <ContextMenuItem className={cn(ITEM, 'text-[#f57976] focus:text-[#f57976] data-[highlighted]:text-[#f57976]')} onSelect={onRemove}>Retirer des favoris</ContextMenuItem>
      <ContextMenuSeparator />
      {isDM && <ContextMenuItem className={ITEM} {...soon}>View Avatar</ContextMenuItem>}
      <ContextMenuItem className={ITEM} onSelect={() => void copyToClipboard(uuidToSnowflake(item.ref_id), 'Identifiant copié')}>
        <IdCard className="h-[18px] w-[18px]" /> Copier l'identifiant du {isDM ? 'salon' : 'salon'}
      </ContextMenuItem>
    </ContextMenuContent>
  );
}

export function FavoritesSidebar({ activeKey, onOpen, onGoToServer }: Props) {
  const fav = useFavorites();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<string | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [rename, setRename] = useState<FavoriteItem | null>(null);
  useEffect(() => {
    const open = () => { setAddCategory(null); setAddOpen(true); };
    window.addEventListener(OPEN_ADD_FAVORITES_EVENT, open);
    return () => window.removeEventListener(OPEN_ADD_FAVORITES_EVENT, open);
  }, []);

  // Salons suggeres : MP recents et salons des serveurs, hors favoris.
  const { servers } = useAllServerAssets(true);
  const channels = useAllChannels(servers.map((s) => s.id)).data ?? [];
  const { data: dms = [] } = useDMConversations();
  const suggestions = useMemo<NewFavorite[]>(() => {
    const out: NewFavorite[] = [];
    const known = (k: string) => fav.items.some((i) => favKey(i) === k);
    const byServer = new Map(servers.map((s) => [s.id, s]));
    const textual = channels.filter((c) => !c.type || c.type === 'text');
    const dmRows = dms.slice(0, 2).map((d): NewFavorite => {
      const first = d.participants.find((p) => p.id !== user?.id) ?? d.participants[0];
      const name = d.is_group ? d.name || d.participants.map((p) => p.display_name).join(', ') : first?.display_name ?? 'Utilisateur';
      return { kind: 'dm', ref_id: d.id, server_id: null, channel_id: null, name, sub: d.is_group ? null : first?.username ?? null, icon_url: d.is_group ? d.icon_url : first?.avatar_url ?? null, ch_type: null };
    });
    const chRows = textual.slice(0, 2).map((c): NewFavorite => {
      const sv = byServer.get(c.server_id);
      return { kind: 'channel', ref_id: c.id, server_id: c.server_id, channel_id: null, name: c.name, sub: sv?.name ?? null, icon_url: sv?.icon_url ?? null, ch_type: c.type };
    });
    for (const r of [chRows[0], dmRows[0], chRows[1], dmRows[1]]) if (r && !known(`${r.kind}:${r.ref_id}`)) out.push(r);
    return out;
  }, [dms, channels, servers, fav.items, user?.id]);

  const existing = useMemo(() => new Set(fav.items.map(favKey)), [fav.items]);
  const uncategorized = fav.items.filter((i) => !i.category_id || !fav.categories.some((c) => c.id === i.category_id));
  const label = (i: FavoriteItem) => i.nickname || i.name;

  const row = (item: FavoriteItem) => (
    <FavRow key={item.id} item={item} active={activeKey === favKey(item)} label={label(item)} onOpen={() => onOpen(item)}>
      <ItemMenu
        item={item}
        categories={fav.categories}
        onGoToServer={() => onGoToServer(item)}
        onMove={(c) => fav.patch(item.id, { category_id: c })}
        onRename={() => setRename(item)}
        onRemove={() => fav.remove(item.id)}
      />
    </FavRow>
  );

  return (
    <div className="flex h-full min-h-0 w-[280px] flex-col rounded-tl-[11px] bg-surface-1">
      <div className="flex h-12 shrink-0 items-center border-b border-[hsl(var(--frame-border))] px-4">
        <Star className="mr-3 h-5 w-5 fill-current text-white" />
        <span className="flex items-center gap-1 text-base font-semibold text-white">Favoris <ChevronDown className="h-4 w-4" /></span>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Ajouter" className="ml-auto flex h-6 w-6 items-center justify-center text-[#b5bac1] transition-colors hover:text-white data-[state=open]:text-white">
                  <Plus className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Ajouter</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" sideOffset={6} className="w-[221px] rounded-lg border border-white/[0.08] bg-[#3b3b45] p-2 shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
            <DropdownMenuItem className={cn(ITEM, 'justify-between')} onSelect={() => { setAddCategory(null); setAddOpen(true); }}>
              Ajouter aux favoris <Plus className="h-5 w-5" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className={cn(ITEM, 'justify-between')} onSelect={() => setCatOpen(true)}>
              Créer une catégorie
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M3 6a2 2 0 012-2h4.2a2 2 0 011.5.7L12 6h7a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6zm10 4h-2v2.5H8.5v2H11V17h2v-2.5h2.5v-2H13V10z" /></svg>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto pb-[76px] pt-2">
        {!fav.hideSuggestionsFlag && suggestions.length > 0 && (
          <div className="pb-3">
            <div className="flex h-8 items-center justify-between px-5">
              <span className="text-sm font-medium text-[#b5bac1]">Salons suggérés</span>
              <button type="button" aria-label="Ignorer" onClick={fav.hideSuggestions} className="text-[#b5bac1] transition-colors hover:text-white"><X className="h-3.5 w-3.5" /></button>
            </div>
            {suggestions.map((s) => (
              <div key={`${s.kind}:${s.ref_id}`} className="mx-2 flex h-[61px] items-center gap-3 rounded-lg px-2">
                {s.kind === 'dm' ? (
                  <UserAvatarImage src={s.icon_url} alt="" className="h-10 w-10 shrink-0" fallbackClassName="text-sm" fallback={s.name.charAt(0).toUpperCase()} />
                ) : (
                  <SourceTile iconUrl={s.icon_url} label={s.sub ?? s.name} badge={channelGlyph(s.ch_type)} className="[&>span:last-child]:!bg-[hsl(var(--surface-1))] [&>span:last-child]:!ring-[hsl(var(--surface-1))]" />
                )}
                <span className="min-w-0 flex-1">
                  <span translate="no" className="block truncate text-base font-semibold leading-5 text-white">{s.name}</span>
                  <span translate="no" className="block truncate text-sm leading-[18px] text-[#b5bac1]">{s.sub}</span>
                </span>
                <button type="button" onClick={() => fav.add([s])} className="h-8 shrink-0 rounded-lg bg-[#3b3b45] px-4 text-sm font-medium text-white transition-colors hover:bg-[#464650]">Ajouter</button>
              </div>
            ))}
            <div className="mx-5 mt-3 h-px bg-white/[0.06]" />
          </div>
        )}

        {uncategorized.map(row)}

        {fav.categories.map((c) => {
          const open = !collapsed.includes(c.id);
          return (
            <div key={c.id}>
              <div className="group mt-4 flex h-[22px] items-center px-4 text-[#b5bac1] hover:text-[hsl(var(--interactive-text-hover))]">
                <button type="button" onClick={() => setCollapsed((x) => (open ? [...x, c.id] : x.filter((i) => i !== c.id)))} className="flex min-w-0 flex-1 items-center gap-1 text-left">
                  <span translate="no" className="truncate text-sm font-medium">{c.name}</span>
                  <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform duration-200', !open && '-rotate-90')} />
                </button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Ajouter à la catégorie" onClick={() => { setAddCategory(c.id); setAddOpen(true); }} className="transition-colors hover:text-white"><Plus className="h-[13px] w-[13px]" /></button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Ajouter à la catégorie</TooltipContent>
                </Tooltip>
              </div>
              {open && fav.items.filter((i) => i.category_id === c.id).map(row)}
            </div>
          );
        })}
      </div>

      <AddFavoritesDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existing={existing}
        onAdd={(list) => fav.add(list.map((l) => ({ ...l, category_id: addCategory })))}
      />
      <FavTextDialog open={catOpen} onOpenChange={setCatOpen} title="Créer une catégorie" label="Nom de la catégorie" placeholder="Nouvelle catégorie" confirm="Créer une catégorie" onConfirm={(n) => fav.addCategory(n)} />
      <FavTextDialog
        open={!!rename}
        onOpenChange={(o) => !o && setRename(null)}
        title="Changer le pseudo"
        label="Pseudo"
        placeholder={rename?.name}
        initial={rename?.nickname ?? ''}
        hint="Ce nom n'apparaîtra que dans tes favoris."
        confirm="Changer le pseudo"
        allowEmpty
        onConfirm={(v) => rename && fav.patch(rename.id, { nickname: v || null })}
      />
    </div>
  );
}
