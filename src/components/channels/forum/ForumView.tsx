import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Search, X, Info, Users, ChevronDown, Pencil, Check, ChevronRight, FileText, MessageCircle } from '@/components/icons/discord/lucide';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';
import { MarkdownText } from '@/lib/markdown';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';
import { useForumTags, useForumChannelConfig, FORUM_LAYOUTS, FORUM_SORT_ORDERS } from '@/hooks/useForumTags';
import {
  useForumThreads,
  useFollowedThreadIds,
  useCreateForumPost,
  useUpdateForumThread,
  useDeleteForumThread,
  type ForumThread,
} from '@/hooks/useForumThreads';
import { useThreadMessageReactions, useToggleThreadReaction } from '@/hooks/useThreadReactions';
import { useFollowThread, useUnfollowThread } from '@/hooks/useThreadFollow';
import { useMarkThreadAsRead, useThreadUnreadCounts } from '@/hooks/useThreadUnreadCounts';
import { LazyChannelSettingsModal as ChannelSettingsModal } from '@/components/lazy/LazyModals';
import type { ChannelSettingsTab } from '@/components/channel-settings/ChannelSettingsModal';
import { ForumComposer } from './ForumComposer';
import { ForumGettingStarted } from './ForumGettingStarted';
import { EXAMPLE_POST_TITLES, OPEN_FORUM_POST_EVENT, CLOSE_FORUM_POST_EVENT, publishOpenForumPost, takePendingForumPost } from '@/lib/forum';
import { ForumPostCard } from './ForumPostCard';
import { ForumPostMenu } from './ForumPostMenu';
import { useDeletePostConfirm } from './useDeletePostConfirm';
import { ForumPostSettingsModal } from './ForumPostSettingsModal';
import { ForumTagChip } from './ForumTagChip';

const ThreadView = lazy(() => import('@/components/threads/ThreadView'));

/*
 * Salons Forum et Multimedia, refaits d'apres les videos de reference de
 * Discord : recherche / creation de post, "Trier et afficher", filtres par
 * tags, carte "Commencer" des moderateurs, guide des posts, posts en galerie
 * ou en liste (tuiles pour le Multimedia), "Anciens posts", et le post ouvert
 * dans un panneau a droite (ou en pleine fenetre). Un post est un fil du
 * salon : ses reponses utilisent le chat des fils.
 */

interface ForumViewProps {
  channel: { id: string; name: string; type: string; server_id?: string };
  mode: 'forum' | 'media';
  serverId: string;
  onToggleMembers?: () => void;
  showMembers?: boolean;
  hideHeader?: boolean;
}

const lsGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* stockage indisponible */
  }
};

export function ForumView({ channel, mode, serverId, onToggleMembers, showMembers, hideHeader = false }: ForumViewProps) {
  const { user } = useAuth();
  const { data: tags = [] } = useForumTags(channel.id);
  const { data: config } = useForumChannelConfig(channel.id);
  const { data: posts = [], isLoading } = useForumThreads(channel.id);
  const { data: canPost = true } = useHasChannelPermission(channel.id, 'send_messages');
  const { data: canManageThreads = false } = useHasChannelPermission(channel.id, 'manage_threads');
  const { data: canManageChannel = false } = useHasChannelPermission(channel.id, 'manage_channels');
  const canModerate = canManageThreads || canManageChannel;
  const createPost = useCreateForumPost(channel.id);
  const updatePost = useUpdateForumThread(channel.id);
  const deletePost = useDeleteForumThread(channel.id);
  const followThread = useFollowThread();
  const unfollowThread = useUnfollowThread();
  const markRead = useMarkThreadAsRead();
  const { data: unreadCounts = {} } = useThreadUnreadCounts(channel.id);
  const toggleReaction = useToggleThreadReaction();

  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [composer, setComposer] = useState<{ title: string; tags?: string[] } | null>(null);
  const [initialPost] = useState(() => takePendingForumPost(channel.id));
  const [activeId, setActiveId] = useState<string | null>(initialPost?.threadId ?? null);
  const [fullscreen, setFullscreen] = useState(initialPost?.fullscreen ?? false);
  // Post ouvert (ou ferme) depuis la liste des salons alors que le salon est deja affiche.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const { channelId, threadId, fullscreen: fs } = (e as CustomEvent<{ channelId: string; threadId: string; fullscreen?: boolean }>).detail;
      if (channelId !== channel.id) return;
      takePendingForumPost(channel.id);
      setActiveId(threadId);
      setFullscreen(!!fs);
    };
    const onClose = (e: Event) => {
      if ((e as CustomEvent<{ channelId: string }>).detail.channelId !== channel.id) return;
      setActiveId(null);
      setFullscreen(false);
    };
    window.addEventListener(OPEN_FORUM_POST_EVENT, onOpen);
    window.addEventListener(CLOSE_FORUM_POST_EVENT, onClose);
    return () => {
      window.removeEventListener(OPEN_FORUM_POST_EVENT, onOpen);
      window.removeEventListener(CLOSE_FORUM_POST_EVENT, onClose);
    };
  }, [channel.id]);
  // La liste des salons surligne le post (et non le salon) quand le post est en pleine fenetre.
  useEffect(() => {
    publishOpenForumPost({ channelId: channel.id, threadId: activeId, fullscreen: !!activeId && fullscreen });
  }, [channel.id, activeId, fullscreen]);
  useEffect(() => () => publishOpenForumPost({ channelId: null, threadId: null, fullscreen: false }), []);
  const [editingPost, setEditingPost] = useState<ForumThread | null>(null);
  const [settingsTab, setSettingsTab] = useState<ChannelSettingsTab | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOverride, setSortOverride] = useState<number | null>(null);
  const [layoutOverride, setLayoutOverride] = useState<number | null>(null);
  const [matchOverride, setMatchOverride] = useState<string | null>(null);
  const [showOld, setShowOld] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const gsKey = `forum-getting-started:${channel.id}`;
  const guideKey = `forum-guide-hidden:${channel.id}`;
  const ageKey = `forum-age-ok:${channel.id}`;
  const [gsState, setGsState] = useState<'open' | 'collapsed' | 'dismissed'>(() => (lsGet(gsKey) as 'collapsed' | 'dismissed' | null) ?? 'open');
  const [guideHidden, setGuideHidden] = useState(() => lsGet(guideKey) === '1');
  const [ageOk, setAgeOk] = useState(() => lsGet(ageKey) === '1');
  const setGs = (v: typeof gsState) => {
    setGsState(v);
    lsSet(gsKey, v === 'open' ? null : v);
  };

  const sortOrder = sortOverride ?? config?.default_sort_order ?? FORUM_SORT_ORDERS.LATEST_ACTIVITY;
  const layout = mode === 'media' ? 'media' : (layoutOverride ?? config?.default_layout ?? FORUM_LAYOUTS.LIST) === FORUM_LAYOUTS.GRID ? 'gallery' : 'list';
  const tagMatch = matchOverride ?? config?.default_tag_setting ?? 'match_some';
  const defaultEmoji = config?.default_reaction_emoji_name ?? null;
  const guidelines = config?.guidelines?.trim() || '';

  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const { data: followed = new Set<string>() } = useFollowedThreadIds(postIds);
  const starterIds = useMemo(() => posts.map((p) => p.starter_message_id).filter(Boolean) as string[], [posts]);
  const { data: reactions = {} } = useThreadMessageReactions(starterIds);

  const { active, old } = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = posts;
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.starter?.content ?? '').toLowerCase().includes(q));
    if (selectedTags.length) {
      list = list.filter((p) => (tagMatch === 'match_all' ? selectedTags.every((t) => p.applied_tags.includes(t)) : selectedTags.some((t) => p.applied_tags.includes(t))));
    }
    const key = (p: ForumThread) => (sortOrder === FORUM_SORT_ORDERS.CREATION_TIME ? p.created_at : p.last_message_at ?? p.created_at);
    const sorted = [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || key(b).localeCompare(key(a)));
    return { active: sorted.filter((p) => !p.archived), old: sorted.filter((p) => p.archived) };
  }, [posts, query, selectedTags, tagMatch, sortOrder]);

  const activePost = posts.find((p) => p.id === activeId) ?? null;
  const tagsOf = (p: ForumThread) => p.applied_tags.map((id) => tags.find((t) => t.id === id)).filter(Boolean) as typeof tags;

  const openPost = (p: ForumThread) => {
    setActiveId(p.id);
    setFullscreen(false);
    markRead.mutate({ threadId: p.id, channelId: channel.id });
  };
  const toggleFollow = (p: ForumThread) => (followed.has(p.id) ? unfollowThread.mutate(p.id) : followThread.mutate(p.id));
  const react = (p: ForumThread, emoji: string) => {
    if (!p.starter_message_id) return;
    toggleReaction.mutate({ messageId: p.starter_message_id, emoji, currentReactions: reactions[p.starter_message_id] ?? [] });
  };
  const { ask: askDelete, dialog: deleteDialog } = useDeletePostConfirm((p) => {
    deletePost.mutate(p.id);
    if (activeId === p.id) setActiveId(null);
    setEditingPost(null);
  });

  const startComposer = (title = query, tags?: string[]) => {
    if (!canPost) return;
    setComposer({ title, tags });
    setQuery('');
  };

  const menuFor = (p: ForumThread, kind: 'context' | 'dropdown', inPanel = false) => (
    <ForumPostMenu
      kind={kind}
      post={p}
      tags={tags}
      isAuthor={p.created_by === user?.id}
      canModerate={canModerate}
      isFollowing={followed.has(p.id)}
      onToggleFollow={() => toggleFollow(p)}
      onUpdate={(patch) => updatePost.mutate({ threadId: p.id, patch })}
      onEdit={() => setEditingPost(p)}
      onDelete={() => askDelete(p)}
      onMarkRead={inPanel ? undefined : () => markRead.mutate({ threadId: p.id, channelId: channel.id })}
      unread={((unreadCounts as Record<string, number>)[p.id] ?? 0) > 0}
      onOpenFullscreen={inPanel && !fullscreen ? () => setFullscreen(true) : undefined}
      onScrollTop={inPanel ? () => document.querySelector('[data-thread-scroller]')?.scrollTo({ top: 0, behavior: 'smooth' }) : undefined}
    />
  );

  const Icon = mode === 'media' ? StreamlineMedia : StreamlineForum;
  const ageRestricted = config?.content_visibility === 'age_restricted' && !ageOk;
  const showGs = canManageChannel && gsState !== 'dismissed';
  const noPosts = !isLoading && posts.length === 0;

  const renderCard = (p: ForumThread) => (
    <ContextMenu key={p.id}>
      <ContextMenuTrigger asChild>
        <div>
          <ForumPostCard
            post={p}
            tags={tags}
            variant={layout}
            active={p.id === activeId}
            unread={(unreadCounts as Record<string, number>)[p.id] > 0}
            defaultEmoji={defaultEmoji}
            reactions={p.starter_message_id ? reactions[p.starter_message_id] ?? [] : []}
            myUserId={user?.id}
            onOpen={() => openPost(p)}
            onReact={(e) => react(p, e)}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-[266px]">{menuFor(p, 'context')}</ContextMenuContent>
    </ContextMenu>
  );

  const grid = (list: ForumThread[]) =>
    layout === 'list' ? (
      <div className="space-y-2">{list.map(renderCard)}</div>
    ) : (
      <div className={cn('grid gap-3', activePost ? 'grid-cols-1' : 'grid-cols-[repeat(auto-fill,minmax(260px,1fr))]')}>{list.map(renderCard)}</div>
    );

  const panel = activePost && (
    <div className={cn('min-w-0 flex flex-col', fullscreen ? 'flex-1' : 'flex-[1.25_1_0%] border-l border-[hsl(var(--border-subtle))]')}>
      <div className="flex-1 min-h-0">
        <Suspense fallback={null}>
          <ThreadView
            key={activePost.id}
            threadId={activePost.id}
            channelId={channel.id}
            serverId={serverId}
            channelName={channel.name}
            isFullscreen={fullscreen}
            onToggleFullscreen={() => setFullscreen((f) => !f)}
            onToggleMembers={onToggleMembers}
            membersOpen={showMembers}
            onBack={() => {
              setActiveId(null);
              setFullscreen(false);
            }}
            forumPost={{
              starterMessageId: activePost.starter_message_id,
              tags: tagsOf(activePost),
              defaultEmoji,
              isFollowing: followed.has(activePost.id),
              onToggleFollow: () => toggleFollow(activePost),
              menu: menuFor(activePost, 'dropdown', true),
            }}
          />
        </Suspense>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex min-w-0 w-full overflow-hidden bg-background">
      {!(activePost && fullscreen) && (
        <div className={cn('flex flex-col min-w-0', activePost ? 'hidden md:flex flex-1 max-w-[480px]' : 'flex-1')}>
          {!hideHeader && (
            <div className="h-12 px-4 flex items-center gap-2 shrink-0 border-b border-[hsl(var(--border-subtle))]">
              <Icon className="w-5 h-5 text-[hsl(var(--header-icon))] shrink-0" size={20} />
              <h2 translate="no" className="font-semibold text-base text-white truncate">{channel.name}</h2>
              <div className="ml-auto flex items-center gap-3">
                {canManageChannel && gsState === 'dismissed' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="Afficher la liste Commencer" onClick={() => setGs('open')} className="text-[hsl(var(--header-icon))] hover:text-white">
                        <Info className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Afficher la liste Commencer</TooltipContent>
                  </Tooltip>
                )}
                {onToggleMembers && !activePost && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label={showMembers ? 'Masquer la liste des membres' : 'Afficher la liste des membres'} onClick={onToggleMembers} className={cn('text-[hsl(var(--header-icon))] hover:text-white', showMembers && 'text-white')}>
                        <Users className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{showMembers ? 'Masquer la liste des membres' : 'Afficher la liste des membres'}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          )}

          {ageRestricted ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <p className="text-xl font-semibold text-white">Salon soumis à une limite d'âge</p>
              <p className="mt-2 max-w-[420px] text-sm text-muted-foreground">Ce salon peut contenir du contenu réservé aux adultes. Confirme que tu as l'âge légal pour le consulter.</p>
              <Button className="mt-4" onClick={() => { setAgeOk(true); lsSet(ageKey, '1'); }}>J'ai l'âge légal</Button>
            </div>
          ) : (
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-4 pt-4 pb-8 space-y-4">
            {/* Recherche / composeur */}
            {composer ? (
              <ForumComposer
                key={composer.title}
                mode={mode}
                serverId={serverId}
                initialTitle={composer.title}
                initialTags={composer.tags}
                tags={tags}
                requireTag={!!config?.require_tag}
                canModerate={canModerate}
                submitting={createPost.isPending}
                onCancel={() => setComposer(null)}
                onSubmit={(input) =>
                  createPost.mutate(input, {
                    onSuccess: (threadId) => {
                      setComposer(null);
                      if (threadId) setActiveId(threadId);
                    },
                  })
                }
              />
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-2.5 h-[42px] pl-3 pr-1.5 rounded-lg bg-[#303038] border border-white/[0.04] focus-within:border-primary">
                    <Search className="w-[22px] h-[22px] shrink-0 text-[#b5bac1]" />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.shiftKey) {
                          e.preventDefault();
                          startComposer();
                        } else if (e.key === 'Escape') {
                          setQuery('');
                        }
                      }}
                      placeholder="Recherche ou création d'un post..."
                      aria-label="Rechercher ou créer un post"
                      className="flex-1 min-w-0 bg-transparent outline-none text-[20px] leading-6 text-foreground placeholder:text-[#80848e]"
                    />
                    {query && (
                      <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery('')} className="text-[hsl(var(--icon-default))] hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {guidelines && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label="Guide des posts" aria-pressed={!guideHidden} onClick={() => { const next = !guideHidden; setGuideHidden(next); lsSet(guideKey, next ? '1' : null); }} className="shrink-0 h-7 w-7 rounded-[4px] bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-[#dbdee1]">
                            <FileText className="w-4 h-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Guide des posts</TooltipContent>
                      </Tooltip>
                    )}
                    {canPost && (
                      <button type="button" onClick={() => startComposer()} className="shrink-0 h-[30px] px-3 rounded-[6px] bg-[#5865f2] text-white text-sm font-medium flex items-center gap-1.5 hover:bg-[#4752c4]">
                        <MessageCircle className="w-4 h-4" /> Nouveau post
                      </button>
                    )}
                  </div>
                </div>
                {searchFocused && query && canPost && (
                  <p className="mt-1.5 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <kbd className="px-1 rounded bg-[hsl(var(--button-secondary))] text-[10px] font-bold text-white">SHIFT</kbd>+
                    <kbd className="px-1 rounded bg-[hsl(var(--button-secondary))] text-[10px] font-bold text-white">ENTRÉE</kbd>
                    pour créer un nouveau post
                  </p>
                )}
              </div>
            )}

            {/* Guide des posts */}
            {guidelines && !guideHidden && (
              <section className="rounded-xl bg-[#35353d] border border-white/[0.05] p-3.5">
                <div className="flex items-center gap-2.5 min-h-8">
                  <FileText className="w-[22px] h-[22px] text-[#dbdee1]" />
                  <p className="text-xl leading-6 font-medium text-white">Guide des posts</p>
                  {canManageChannel && (
                    <button type="button" aria-label="Modifier le guide des posts" onClick={() => setSettingsTab('overview')} className="text-[#dbdee1] hover:text-white">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  <button type="button" aria-label="Masquer le guide" onClick={() => { setGuideHidden(true); lsSet(guideKey, '1'); }} className="ml-auto p-1 text-[#dbdee1] hover:text-white">
                    <X className="w-3.5 h-3.5" strokeWidth={2.2} />
                  </button>
                </div>
                <div className="mt-2.5 rounded-md bg-[#404048] px-4 py-3.5 text-sm text-[#dbdee1]">
                  <MarkdownText content={guidelines} variant="chat" />
                </div>
              </section>
            )}

            {/* Tri / affichage et tags */}
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="h-8 px-3 rounded-full bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-subtle))] text-sm font-medium text-white flex items-center gap-1.5 hover:bg-[hsl(var(--interactive-background-hover))]">
                    <ArrowUpDown className="w-4 h-4" /> {mode === 'media' ? 'Trier' : 'Trier et afficher'} <ChevronDown className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-1">
                  <p className="px-2 pt-1.5 pb-1 text-xs font-semibold uppercase text-muted-foreground">Trier par</p>
                  {[
                    [FORUM_SORT_ORDERS.LATEST_ACTIVITY, 'Activité récente'],
                    [FORUM_SORT_ORDERS.CREATION_TIME, 'Date de création'],
                  ].map(([v, label]) => (
                    <MenuRadio key={label} checked={sortOrder === v} onClick={() => setSortOverride(v as number)}>{label}</MenuRadio>
                  ))}
                  {mode === 'forum' && (
                    <>
                      <p className="px-2 pt-2.5 pb-1 text-xs font-semibold uppercase text-muted-foreground">Afficher en tant que</p>
                      <MenuRadio checked={layout === 'list'} onClick={() => setLayoutOverride(FORUM_LAYOUTS.LIST)}>Liste</MenuRadio>
                      <MenuRadio checked={layout === 'gallery'} onClick={() => setLayoutOverride(FORUM_LAYOUTS.GRID)}>Galerie</MenuRadio>
                    </>
                  )}
                </PopoverContent>
              </Popover>

              {tags.length > 0 && (
                <>
                  <span className="h-6 w-px bg-[hsl(var(--border-subtle))]" />
                  {tags.slice(0, 5).map((t) => (
                    <ForumTagChip
                      key={t.id}
                      tag={t}
                      selected={selectedTags.includes(t.id)}
                      onClick={() => setSelectedTags((prev) => (prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]))}
                      className="h-8 px-3"
                    />
                  ))}
                  <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
                    <PopoverTrigger asChild>
                      <button type="button" className="h-8 px-3 rounded-full bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-subtle))] text-sm font-medium text-white flex items-center gap-1.5 hover:bg-[hsl(var(--interactive-background-hover))]">
                        {selectedTags.length > 0 ? <TagCount n={selectedTags.length} /> : 'Tout'}
                        <ChevronDown className={cn('w-4 h-4 transition-transform', tagsOpen && 'rotate-180')} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[333px] p-3">
                      <p className="flex items-center gap-2 text-base font-medium text-[#b5bac1]">Sélectionner les tags <TagCount n={selectedTags.length} /></p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tags.map((t) => (
                          <ForumTagChip
                            key={t.id}
                            tag={t}
                            selected={selectedTags.includes(t.id)}
                            onClick={() => setSelectedTags((prev) => (prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]))}
                          />
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/[0.06]">
                        <button type="button" onClick={() => setSelectedTags([])} className="text-base text-[hsl(var(--text-link))] hover:underline">Tout effacer</button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </>
              )}
            </div>

            {showGs && (
              <ForumGettingStarted
                channelId={channel.id}
                serverId={serverId}
                mode={mode}
                hasGuide={!!guidelines}
                hasTags={tags.length > 0}
                hasDefaultReaction={!!defaultEmoji}
                hasPosts={posts.length > 0}
                collapsed={gsState === 'collapsed'}
                onToggleCollapsed={() => setGs(gsState === 'collapsed' ? 'open' : 'collapsed')}
                onDismiss={() => setGs('dismissed')}
                onOpenSettings={(tab) => setSettingsTab(tab)}
                onCreatePost={(title) => startComposer(title ?? '')}
              />
            )}

            {/* Posts */}
            {selectedTags.length > 0 && active.length === 0 && old.length === 0 && !isLoading ? (
              <div className="py-10 flex flex-col items-center text-center">
                <p className="text-base font-semibold text-white">Il n'y a pour le moment aucun post avec {selectedTags.length > 1 ? 'ces tags' : 'ce tag'} !</p>
                <p className="mt-1 text-sm text-muted-foreground">Ouvre le bal en lançant une conversation avec {selectedTags.length > 1 ? 'ces tags' : 'ce tag'}</p>
                {canPost && <Button variant="secondary" className="mt-4" onClick={() => startComposer('', selectedTags)}>Créer un post</Button>}
              </div>
            ) : noPosts ? (
              <div className="py-10 flex flex-col items-center text-center">
                <p className="text-base font-semibold text-white">Ouvre le bal en lançant la conversation !</p>
                <p className="mt-1 text-sm text-muted-foreground">Qu'est-ce que tu aimerais aborder dans ton post dans le salon <span translate="no">#{channel.name}</span> ?</p>
                {canPost && (
                  mode === 'media' ? (
                    <Button variant="secondary" className="mt-4" onClick={() => startComposer('')}>Créer un post</Button>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="secondary" className="mt-4">Voir des exemples</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-1">
                        {EXAMPLE_POST_TITLES.map((t) => (
                          <button key={t} type="button" onClick={() => startComposer(t)} className="w-full px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
                            {t}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  )
                )}
              </div>
            ) : active.length === 0 && old.length === 0 && !isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Aucun post ne correspond à ta recherche.</p>
            ) : (
              <>
                {grid(active)}
                {old.length > 0 && (
                  <div>
                    <button type="button" onClick={() => setShowOld((v) => !v)} className="mb-2 flex items-center gap-1 text-sm font-semibold text-[hsl(var(--header-icon))] hover:text-white">
                      Anciens posts <ChevronDown className={cn('w-4 h-4 transition-transform', !showOld && '-rotate-90')} />
                    </button>
                    {showOld && grid(old)}
                  </div>
                )}
              </>
            )}
          </div>
          )}
        </div>
      )}

      {panel}

      {editingPost && (
        <ForumPostSettingsModal
          post={editingPost}
          channelName={channel.name}
          serverId={serverId}
          canModerate={canModerate}
          onClose={() => setEditingPost(null)}
          onSave={(patch) => updatePost.mutate({ threadId: editingPost.id, patch })}
          onDelete={() => askDelete(editingPost)}
        />
      )}
      {settingsTab && <ChannelSettingsModal channelId={channel.id} serverId={serverId} initialTab={settingsTab} onClose={() => setSettingsTab(null)} />}
      {deleteDialog}
    </div>
  );
}

/** Pastille bleue du nombre de tags selectionnes. */
function TagCount({ n }: { n: number }) {
  return <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#5865f2] text-white text-xs font-semibold flex items-center justify-center">{n}</span>;
}

function MenuRadio({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={checked} onClick={onClick} className="w-full flex items-center gap-2 px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
      <span className="flex-1">{children}</span>
      {checked && <Check className="w-4 h-4 text-primary" />}
    </button>
  );
}
