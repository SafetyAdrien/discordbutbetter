import { useState, useMemo } from 'react';
import {
  Plus, Search, Tag as TagIcon, ArrowUp, MessageCircle, Clock, Users,
  Pin, Lock, LayoutGrid, List, Star, Archive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';
import {
  useForumPosts, useCreateForumPost, useForumVotes, useToggleForumVote,
  type ForumPost,
} from '@/hooks/useForumPosts';
import {
  useForumTags, useForumChannelConfig, FORUM_LAYOUTS, FORUM_SORT_ORDERS,
} from '@/hooks/useForumTags';
import { CreateForumPostModal } from '@/components/channels/forum/CreateForumPostModal';
import { ForumPostSidePanel } from '@/components/channels/forum/ForumPostSidePanel';

interface Channel { id: string; name: string; type: string; description?: string; server_id?: string; }

export interface ForumChannelProps {
  channel: Channel;
  serverId?: string;
  onToggleMembers?: () => void;
  showMembers?: boolean;
  hideHeader?: boolean;
}

export function ForumChannel({ channel, serverId, onToggleMembers, showMembers, hideHeader = false }: ForumChannelProps) {
  const { data: canCreatePosts = true } = useHasChannelPermission(channel.id, 'create_forum_posts');
  const { data: canManageTags = false } = useHasChannelPermission(channel.id, 'manage_forum_tags');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [createOpen, setCreateOpen] = useState(false);
  const [activePost, setActivePost] = useState<ForumPost | null>(null);

  // Tag entities defined on the channel, plus the persisted channel config.
  const { data: definedTags = [] } = useForumTags(channel.id);
  const { data: config } = useForumChannelConfig(channel.id);

  // Fluxer-style multi-tag selection with match_some / match_all semantics.
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  // Layout can be overridden per session, defaulting to the channel setting.
  const [layoutOverride, setLayoutOverride] = useState<number | null>(null);

  const tagSetting = config?.default_tag_setting ?? 'match_some';
  const layout = layoutOverride ?? config?.default_layout ?? FORUM_LAYOUTS.DEFAULT;

  const effectiveServerId = serverId ?? (channel as unknown as { server_id?: string }).server_id ?? '';
  const { data: posts = [] } = useForumPosts(channel.id);
  const createPost = useCreateForumPost(channel.id, effectiveServerId);
  const postIds = useMemo(() => posts.map(p => p.id), [posts]);
  const { data: votedSet = new Set<string>() } = useForumVotes(channel.id, postIds);
  const toggleVote = useToggleForumVote(channel.id);

  const tagById = useMemo(() => {
    const m = new Map<string, (typeof definedTags)[number]>();
    definedTags.forEach(t => m.set(t.id, t));
    return m;
  }, [definedTags]);

  /**
   * Tags to display for a post: the tag entities applied to it, falling back to
   * the legacy free-text tags for posts created before the tag entities existed.
   */
  const tagsForPost = (post: ForumPost) => {
    const ids = post.applied_tags ?? [];
    if (ids.length > 0) {
      return ids.map(id => tagById.get(id)).filter(Boolean) as Array<(typeof definedTags)[number]>;
    }
    return post.tags.map(name => ({
      id: name, name, moderated: false, emoji_name: null, channel_id: channel.id, position: 0,
    }));
  };

  const filtered = useMemo(() => {
    let list = posts.filter(p => !p.archived);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) || (p.content ?? '').toLowerCase().includes(q));
    }

    if (selectedTagIds.length > 0) {
      list = list.filter(p => {
        const applied = p.applied_tags ?? [];
        // Legacy posts carry free-text names, so match those against tag names.
        const names = applied.length > 0
          ? applied
          : p.tags.filter((t) => selectedTagIds.includes(t));
        return tagSetting === 'match_all'
          ? selectedTagIds.every((id) => names.includes(id))
          : selectedTagIds.some((id) => names.includes(id));
      });
    }

    // Pinned posts always float to the top, whichever sort is active.
    const pinned = list.filter(p => p.is_pinned);
    const rest = list.filter(p => !p.is_pinned);

    if (sortBy === 'popular') {
      rest.sort((a, b) => b.upvote_count - a.upvote_count || b.comment_count - a.comment_count);
    } else if (config?.default_sort_order === FORUM_SORT_ORDERS.CREATION_TIME) {
      rest.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else {
      rest.sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at));
    }

    return [...pinned, ...rest];
  }, [posts, searchQuery, selectedTagIds, sortBy, tagSetting, config?.default_sort_order]);

  const toggleTagFilter = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  const toggleLayout = () => {
    // DEFAULT behaves as LIST; toggling moves between the two visible modes.
    setLayoutOverride(layout === FORUM_LAYOUTS.GRID ? FORUM_LAYOUTS.LIST : FORUM_LAYOUTS.GRID);
  };

  return (
    <div className="flex-1 flex min-w-0 w-full overflow-hidden">
      <div className={cn('flex flex-col bg-[hsl(var(--surface-2)/0.3)] min-w-0 overflow-x-hidden', activePost ? 'flex-1 hidden md:flex' : 'flex-1')}>

      {/* Header */}
      {!hideHeader && (
      <div className="h-12 px-2 sm:px-4 flex items-center gap-2 sm:gap-4 flex-shrink-0 bg-[hsl(var(--surface-2))] w-full" style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)", boxShadow: "var(--shadow-elevation-1)" }}>
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <StreamlineForum className="text-muted-foreground flex-shrink-0" size={16} />
          <h2 className="font-semibold text-foreground truncate">{channel.name}</h2>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-8 w-32 md:w-48" />
          </div>
          {definedTags.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="iconSm" onClick={toggleLayout}>
                  {layout === FORUM_LAYOUTS.GRID
                    ? <LayoutGrid className="w-5 h-5" />
                    : <List className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {layout === FORUM_LAYOUTS.GRID ? 'Vue grille' : 'Vue liste'}
              </TooltipContent>
            </Tooltip>
          )}
          {canCreatePosts && effectiveServerId && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="hidden sm:inline-flex">
              <Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Nouveau sujet</span>
            </Button>
          )}
          {onToggleMembers && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="iconSm" onClick={onToggleMembers} className={cn(showMembers && "bg-surface-hover")}>
                  <Users className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showMembers ? 'Masquer les membres' : 'Afficher les membres'}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      )}

      {/* Filters */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-4 flex-wrap">
        <div className="flex gap-1">
          <Button variant={sortBy === 'recent' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortBy('recent')}>
            <Clock className="w-4 h-4 mr-1" />
            {config?.default_sort_order === FORUM_SORT_ORDERS.CREATION_TIME ? 'Récents' : 'Activité'}
          </Button>
          <Button variant={sortBy === 'popular' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortBy('popular')}>
            <ArrowUp className="w-4 h-4 mr-1" />Populaire
          </Button>
        </div>

        {definedTags.length > 0 ? (
          <div className="flex gap-1 flex-wrap items-center">
            <Badge
              variant={selectedTagIds.length === 0 ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedTagIds([])}
            >
              Tous
            </Badge>
            {definedTags.map((t) => {
              const active = selectedTagIds.includes(t.id);
              return (
                <Tooltip key={t.id}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={active ? 'default' : 'outline'}
                      className="cursor-pointer gap-1"
                      onClick={() => toggleTagFilter(t.id)}
                    >
                      {t.emoji_name ? <span>{t.emoji_name}</span> : <TagIcon className="w-3 h-3" />}
                      {t.name}
                      {t.moderated && <Lock className="w-2.5 h-2.5 opacity-70" />}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {tagSetting === 'match_all' && selectedTagIds.length > 1
                      ? 'Filtre actif : tous les tags sélectionnés sont requis'
                      : t.name}
                  </TooltipContent>
                </Tooltip>
              );
            })}
            {selectedTagIds.length > 1 && (
              <span className="text-[11px] text-muted-foreground">
                ({tagSetting === 'match_all' ? 'tous' : 'au moins un'})
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <StreamlineForum className="text-muted-foreground/50" size={40} />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {posts.length === 0 ? 'Aucune discussion' : 'Aucun résultat'}
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              {posts.length === 0
                ? 'Lancez la première discussion dans ce forum.'
                : 'Essayez d\'autres filtres ou une autre recherche.'}
            </p>
            {canCreatePosts && posts.length === 0 && effectiveServerId && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />Créer un sujet
              </Button>
            )}
          </div>
        ) : layout === FORUM_LAYOUTS.GRID ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {filtered.map((post) => (
              <ForumPostTile
                key={post.id}
                post={post}
                tags={tagsForPost(post)}
                voted={votedSet.has(post.id)}
                onOpen={() => setActivePost(post)}
                onVote={() => toggleVote.mutate({ postId: post.id, voted: votedSet.has(post.id) })}
              />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((post) => {
              const voted = votedSet.has(post.id);
              const tags = tagsForPost(post);
              return (
                <div
                  key={post.id}
                  onClick={() => setActivePost(post)}
                  className="p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {post.is_pinned && <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                        {post.is_locked && <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                        {post.archived && <Archive className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                        <span className="font-semibold text-foreground truncate">{post.title}</span>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mb-1">
                          {tags.slice(0, 3).map((t) => (
                            <Badge key={t.id} variant="secondary" className="text-[10px] h-5 gap-1">
                              {t.emoji_name ? <span>{t.emoji_name}</span> : <TagIcon className="w-2.5 h-2.5" />}
                              {t.name}
                            </Badge>
                          ))}
                          {tags.length > 3 && (
                            <Badge variant="secondary" className="text-[10px] h-5">+{tags.length - 3}</Badge>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />{post.comment_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(post.last_activity_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-col items-center gap-1 flex-shrink-0 w-10"
                    >
                      <button
                        type="button"
                        onClick={() => toggleVote.mutate({ postId: post.id, voted })}
                        className={cn(
                          'flex flex-col items-center gap-0.5 px-1.5 py-1 rounded transition-colors',
                          voted ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted/50',
                        )}
                        aria-label={voted ? 'Retirer le vote' : 'Voter'}
                      >
                        <ArrowUp className="w-4 h-4" />
                        <span className="text-xs font-medium">{post.upvote_count}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {activePost && (
        <ForumPostSidePanel
          post={activePost}
          tags={tagsForPost(activePost)}
          onClose={() => setActivePost(null)}
        />
      )}

      <CreateForumPostModal
        open={createOpen}
        channelId={channel.id}
        isPending={createPost.isPending}
        canModerate={canManageTags}
        onClose={() => setCreateOpen(false)}
        onSubmit={(data) => {
          createPost.mutate(data, { onSuccess: () => setCreateOpen(false) });
        }}
      />
    </div>
  );
}

/** GRID layout card (Fluxer's ForumLayoutTypes.GRID). */
function ForumPostTile({
  post, tags, voted, onOpen, onVote,
}: {
  post: ForumPost;
  tags: Array<{ id: string; name: string; emoji_name: string | null }>;
  voted: boolean;
  onOpen: () => void;
  onVote: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="border border-border/60 rounded-xl p-4 hover:bg-muted/30 cursor-pointer transition-colors flex flex-col min-h-[110px]"
    >
      <div className="flex items-start gap-2 mb-2">
        {post.is_pinned && <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />}
        {post.is_locked && <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />}
        <span className="font-semibold text-foreground text-sm leading-snug">{post.title}</span>
      </div>

      {tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          {tags.slice(0, 3).map((t) => (
            <Badge key={t.id} variant="secondary" className="text-[10px] h-5 gap-1">
              {t.emoji_name ? <span>{t.emoji_name}</span> : <TagIcon className="w-2.5 h-2.5" />}
              {t.name}
            </Badge>
          ))}
          {tags.length > 3 && <Badge variant="secondary" className="text-[10px] h-5">+{tags.length - 3}</Badge>}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onVote(); }}
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors',
            voted ? 'text-primary bg-primary/10' : 'hover:bg-muted/50',
          )}
          aria-label={voted ? 'Retirer le vote' : 'Voter'}
        >
          <ArrowUp className="w-3.5 h-3.5" />{post.upvote_count}
        </button>
        <span className="flex items-center gap-1">
          <MessageCircle className="w-3 h-3" />{post.comment_count}
        </span>
      </div>
    </div>
  );
}