import { useState, useMemo } from 'react';
import { Plus, Search, Tag, ArrowUp, MessageCircle, Clock, Users, Pin, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';
import { useForumPosts, useCreateForumPost, useForumVotes, useToggleForumVote, type ForumPost } from '@/hooks/useForumPosts';
import { CreateForumPostModal } from '@/components/channels/forum/CreateForumPostModal';
import { ForumPostSidePanel } from '@/components/channels/forum/ForumPostSidePanel';


interface Channel { id: string; name: string; type: string; description?: string; server_id?: string; }

export interface ForumChannelProps {
  channel: Channel;
  serverId?: string;
  onToggleMembers?: () => void;
  showMembers?: boolean;
  /** Hide the internal header bar (used when a parent shell — e.g. MobileLayout — already renders one). */
  hideHeader?: boolean;
}

export function ForumChannel({ channel, serverId, onToggleMembers, showMembers, hideHeader = false }: ForumChannelProps) {
  const { data: canCreatePosts = true } = useHasChannelPermission(channel.id, 'create_forum_posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [createOpen, setCreateOpen] = useState(false);
  const [activePost, setActivePost] = useState<ForumPost | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const effectiveServerId = serverId ?? (channel as any).server_id ?? '';
  const { data: posts = [] } = useForumPosts(channel.id);
  const createPost = useCreateForumPost(channel.id, effectiveServerId);
  const postIds = useMemo(() => posts.map(p => p.id), [posts]);
  const { data: votedSet = new Set<string>() } = useForumVotes(channel.id, postIds);
  const toggleVote = useToggleForumVote(channel.id);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    posts.forEach(p => p.tags.forEach(t => s.add(t)));
    return Array.from(s).sort();
  }, [posts]);

  const filtered = useMemo(() => {
    let list = posts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || (p.content ?? '').toLowerCase().includes(q));
    }
    if (tagFilter) list = list.filter(p => p.tags.includes(tagFilter));
    if (sortBy === 'popular') {
      list = [...list].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return b.upvote_count - a.upvote_count;
      });
    }
    return list;
  }, [posts, searchQuery, tagFilter, sortBy]);

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
              <TooltipContent>{showMembers ? "Masquer les membres" : "Afficher les membres"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      )}

      {/* Filters */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-4 flex-wrap">
        <div className="flex gap-1">
          <Button variant={sortBy === 'recent' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortBy('recent')}>
            <Clock className="w-4 h-4 mr-1" />Récent
          </Button>
          <Button variant={sortBy === 'popular' ? 'secondary' : 'ghost'} size="sm" onClick={() => setSortBy('popular')}>
            <ArrowUp className="w-4 h-4 mr-1" />Populaire
          </Button>
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <Badge variant={tagFilter === null ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setTagFilter(null)}>Tous</Badge>
            {allTags.map((t) => (
              <Badge key={t} variant={tagFilter === t ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setTagFilter(t === tagFilter ? null : t)}>
                <Tag className="w-3 h-3 mr-1" />{t}
              </Badge>
            ))}
          </div>
        )}
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
              {posts.length === 0 ? 'Lancez la première discussion dans ce forum.' : 'Essayez d\'autres filtres ou une autre recherche.'}
            </p>
            {canCreatePosts && posts.length === 0 && effectiveServerId && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />Créer un sujet
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((post) => {
              const voted = votedSet.has(post.id);
              return (
                <div
                  key={post.id}
                  onClick={() => setActivePost(post)}
                  className="p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleVote.mutate({ postId: post.id, voted }); }}
                      className={cn(
                        'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md transition-colors flex-shrink-0',
                        voted ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70 text-muted-foreground'
                      )}
                    >
                      <ArrowUp className={cn('w-4 h-4', voted && 'fill-current')} />
                      <span className="text-xs font-semibold">{post.upvote_count}</span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {post.is_pinned && <Badge variant="secondary" className="text-[10px]"><Pin className="w-3 h-3 mr-1" />Épinglé</Badge>}
                        {post.is_locked && <Badge variant="outline" className="text-[10px]"><Lock className="w-3 h-3 mr-1" />Verrouillé</Badge>}
                        <h4 className="font-medium truncate">{post.title}</h4>
                      </div>
                      {post.content && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{post.content}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{post.comment_count}</span>
                        <span>•</span>
                        <span>{new Date(post.last_activity_at).toLocaleDateString('fr-FR')}</span>
                        {post.tags.length > 0 && (
                          <div className="flex gap-1">
                            {post.tags.slice(0, 3).map(t => (
                              <Badge key={t} variant="outline" className="text-[10px] h-4"><Tag className="w-2.5 h-2.5 mr-0.5" />{t}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {canCreatePosts && effectiveServerId && (
        <button
          onClick={() => setCreateOpen(true)}
          className="sm:hidden fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-10"
          aria-label="Nouveau sujet"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <CreateForumPostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        isPending={createPost.isPending}
        onSubmit={(data) => {
          createPost.mutate(data, {
            onSuccess: (created) => {
              setCreateOpen(false);
              if (created) setActivePost(created as ForumPost);
            },
          });
        }}
      />

      </div>

      {activePost && (
        <div className="w-full md:w-[440px] lg:w-[500px] flex-shrink-0 h-full">
          <ForumPostSidePanel
            post={activePost}
            hasVoted={votedSet.has(activePost.id)}
            onClose={() => setActivePost(null)}
          />
        </div>
      )}
    </div>
  );
}

