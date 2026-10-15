import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Upload, Grid, List, Users, EyeOff, Layers, Tag as TagIcon, Lock, Clock, Pin,
} from 'lucide-react';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { UploadDropOverlay } from '@/components/chat/upload/UploadDropOverlay';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';
import { CreateMediaPostModal } from '@/components/channels/media/CreateMediaPostModal';
import { MediaPostSidePanel } from '@/components/channels/media/MediaPostSidePanel';
import { useMediaPosts, useCreateMediaPost, type MediaPost } from '@/hooks/useMediaPosts';
import { useMediaPostReactions, useToggleMediaReaction } from '@/hooks/useMediaReactions';
import { ReactionBar } from '@/components/chat/ReactionBar';
import { useForumTags, useForumChannelConfig, FORUM_LAYOUTS, FORUM_SORT_ORDERS } from '@/hooks/useForumTags';

interface Channel {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface MediaChannelProps {
  channel: Channel;
  onToggleMembers?: () => void;
  showMembers?: boolean;
  /** Hide the internal header bar when a parent shell already renders one. */
  hideHeader?: boolean;
}

export function MediaChannel({ channel, onToggleMembers, showMembers, hideHeader = false }: MediaChannelProps) {
  const { data: canUploadMedia = true } = useHasChannelPermission(channel.id, 'upload_media');
  // Forum preset configuration (Fluxer: GUILD_MEDIA shares the Forum contract).
  const { data: definedTags = [] } = useForumTags(channel.id);
  const { data: config } = useForumChannelConfig(channel.id);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const tagSetting = config?.default_tag_setting ?? 'match_some';
  const requireTag = config?.require_tag ?? false;
  const hideDownload = config?.hide_media_download_options ?? false;

  // Fluxer: a media channel is a forum — it only has LIST and GRID layouts.
  // The social "feed" (stories) view is gone.
  const [viewModeOverride, setViewModeOverride] = useState<'grid' | 'list' | null>(null);
  const forumLayout = config?.default_layout ?? FORUM_LAYOUTS.DEFAULT;
  const viewMode: 'grid' | 'list' =
    viewModeOverride ?? (forumLayout === FORUM_LAYOUTS.LIST ? 'list' : 'grid');
  const setViewMode = (v: 'grid' | 'list') => setViewModeOverride(v);
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);
  const [quotedPost, setQuotedPost] = useState<MediaPost | null>(null);
  const [activePost, setActivePost] = useState<MediaPost | null>(null);


  // Real data hooks
  const { data: mediaItems = [] } = useMediaPosts(channel.id);
  const createPost = useCreateMediaPost(channel.id);

  // Reactions
  const postIds = useMemo(() => mediaItems.map(m => m.id), [mediaItems]);
  const { data: reactionsData = {} } = useMediaPostReactions(postIds);

  const tagById = useMemo(() => {
    const m = new Map<string, (typeof definedTags)[number]>();
    definedTags.forEach(t => m.set(t.id, t));
    return m;
  }, [definedTags]);

  /**
   * Posts after the Forum tag filter.
   *
   * `match_some` = at least one selected tag (Fluxer's default),
   * `match_all`  = every selected tag. A post with no tags never matches a
   * filter, which is the expected behaviour once tags are configured.
   */
  const visibleMedia = useMemo(() => {
    let list = mediaItems;

    if (selectedTagIds.length > 0) {
      list = list.filter((m) => {
        const applied = m.applied_tags ?? [];
        return tagSetting === 'match_all'
          ? selectedTagIds.every((id) => applied.includes(id))
          : selectedTagIds.some((id) => applied.includes(id));
      });
    }

    // Forum ordering: pinned first, then by the channel's default sort order
    // (LATEST_ACTIVITY or CREATION_TIME). Archived posts are hidden.
    const visible = list.filter((m) => !m.archived);
    const pinned = visible.filter((m) => m.is_pinned);
    const rest = visible.filter((m) => !m.is_pinned);

    if (config?.default_sort_order === FORUM_SORT_ORDERS.CREATION_TIME) {
      rest.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    } else {
      rest.sort((a, b) =>
        (b.last_activity_at ?? b.created_at ?? '').localeCompare(a.last_activity_at ?? a.created_at ?? ''));
    }

    return [...pinned, ...rest];
  }, [mediaItems, selectedTagIds, tagSetting, config?.default_sort_order]);
  const toggleReaction = useToggleMediaReaction();
  const handleToggleReaction = (postId: string, emoji: string) => {
    const currentReactions = reactionsData?.[postId] || [];
    toggleReaction.mutate({ postId, emoji, currentReactions });
  };

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter((c) => {
      if (c === 0) setIsDragging(true);
      return c + 1;
    });
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragCounter((c) => {
      const next = c - 1;
      if (next <= 0) { setIsDragging(false); return 0; }
      return next;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragCounter(0);
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    if (dropped.length > 0) {
      setSelectedFiles(dropped);
    }
  }, []);

  const handleUploadClick = (forReply: MediaPost | null = null) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        setQuotedPost(forReply);
        setSelectedFiles(Array.from(files));
      }
    };
    input.click();
  };


  const handlePublish = (data: {
    files: File[];
    title: string;
    description: string;
    altTexts: string[];
    isSpoiler: boolean;
    appliedTags?: string[];
  }) => {
    createPost.mutate(data, {
      onSuccess: (created) => {
        if (created) setActivePost(created as MediaPost);
      },
    });
    setSelectedFiles(null);
    setQuotedPost(null);
  };


  return (
    <div className="flex-1 flex min-w-0 w-full overflow-hidden">
    <div
      className={cn('flex flex-col bg-[hsl(var(--surface-2)/0.3)] min-w-0 overflow-x-hidden relative', activePost ? 'flex-1 hidden md:flex' : 'flex-1 w-full')}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >

      <AnimatePresence>
        {isDragging && <UploadDropOverlay channelName={channel.name} />}
      </AnimatePresence>

      {/* Header */}
      {!hideHeader && (
      <div className="h-12 px-2 sm:px-4 flex items-center gap-2 sm:gap-4 flex-shrink-0 bg-[hsl(var(--surface-2))] w-full" style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)", boxShadow: "var(--shadow-elevation-1)" }}>
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <StreamlineMedia className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <h2 className="font-semibold text-foreground truncate">{channel.name}</h2>
          {/* Post count, so the channel reads as a collection rather than a feed. */}
          <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
            {visibleMedia.length}
            {mediaItems.length !== visibleMedia.length && `/${mediaItems.length}`}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <Clock className="w-3.5 h-3.5" />
          {config?.default_sort_order === FORUM_SORT_ORDERS.CREATION_TIME ? 'Par date' : 'Par activité'}
        </div>

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <div className="flex rounded-md border border-border overflow-hidden">
            <button type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
              title="Grille"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
              title="Liste"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {canUploadMedia && (
            <Button size="sm" onClick={() => handleUploadClick()} className="hidden sm:inline-flex">
              <Upload className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Téléverser</span>
            </Button>
          )}
          {onToggleMembers && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMembers}
              className={cn(showMembers && 'bg-muted')}
            >
              <Users className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      )}

      {/* Tag filters — Fluxer's available_tags on the channel */}
      {definedTags.length > 0 && (
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-1 flex-wrap">
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
                    onClick={() => setSelectedTagIds(prev =>
                      prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                  >
                    {t.emoji_name ? <span>{t.emoji_name}</span> : <TagIcon className="w-3 h-3" />}
                    {t.name}
                    {t.moderated && <Lock className="w-2.5 h-2.5 opacity-70" />}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {tagSetting === 'match_all' && selectedTagIds.length > 1
                    ? 'Tous les tags sélectionnés sont requis'
                    : t.name}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}

      {/* Content */}
      <div className={cn('flex-1 overflow-y-auto', viewMode === 'grid' && 'p-4')}>
        {visibleMedia.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <StreamlineMedia className="w-10 h-10 text-muted-foreground/50" />
            </div>
            {/* Distinguish "this channel is empty" from "filters match nothing" —
                they need different actions. */}
            <h3 className="text-lg font-semibold mb-2">
              {mediaItems.length === 0 ? 'Aucun média' : 'Aucun résultat'}
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              {mediaItems.length === 0
                ? 'Partagez des images et vidéos avec les membres de ce salon.'
                : 'Aucun média ne correspond aux filtres sélectionnés.'}
            </p>
            {mediaItems.length > 0 && selectedTagIds.length > 0 && (
              <Button variant="secondary" onClick={() => setSelectedTagIds([])}>
                Réinitialiser les filtres
              </Button>
            )}
            {canUploadMedia && mediaItems.length === 0 && (
              <Button onClick={() => handleUploadClick()}>
                <Upload className="w-4 h-4 mr-2" />
                Téléverser un fichier
              </Button>
            )}
          </div>
        ) : (
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
                : 'space-y-2'
            )}
          >
            {visibleMedia.map((item) => {
              const firstItem = item.items?.[0];
              const cover = firstItem ?? {
                file_url: item.file_url,
                file_type: item.file_type,
                alt_text: item.alt_text,
              };
              const albumCount = item.items?.length ?? 0;
              const isVideoLike = cover.file_type === 'video' || (cover.file_url?.toLowerCase().endsWith('.gif'));
              return (
              <div
                key={item.id}
                onClick={() => !item._isPending && setActivePost(item)}
                className={cn(
                  'group relative overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all',
                  // Pinned posts get a visible accent instead of only a corner icon.
                  item.is_pinned && 'ring-2 ring-[hsl(var(--online))]',
                  viewMode === 'grid' ? 'aspect-square rounded-[15%]' : 'flex items-center gap-4 p-2 rounded-lg',
                  item._isPending && 'opacity-60 cursor-default'
                )}
              >
                {item.is_spoiler && (
                  <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-xl flex items-center justify-center">
                    <EyeOff className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}

                {cover.file_type === 'video' ? (
                  <video
                    src={cover.file_url}
                    className={cn('object-cover', viewMode === 'grid' ? 'w-full h-full' : 'w-16 h-16 rounded')}
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={cover.file_url}
                    alt={cover.alt_text || item.title}
                    className={cn('object-cover', viewMode === 'grid' ? 'w-full h-full' : 'w-16 h-16 rounded')}
                  />
                )}

                {albumCount > 1 && (
                  <div className="absolute top-2 right-2 z-20 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-xs font-semibold flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {albumCount}
                  </div>
                )}

                {/* Forum state badges — pinned posts first, locked posts read-only. */}
                {(item.is_pinned || item.is_locked) && (
                  <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
                    {item.is_pinned && (
                      <span className="p-1 rounded-md bg-black/70 text-[hsl(var(--online))]" title="Épinglé">
                        <Pin className="w-3 h-3" />
                      </span>
                    )}
                    {item.is_locked && (
                      <span className="p-1 rounded-md bg-black/70 text-white" title="Verrouillé">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                )}

                {/* Channel tags, so a grid can be scanned by topic. */}
                {viewMode === 'grid' && (item.applied_tags?.length ?? 0) > 0 && (
                  <div className="absolute bottom-2 left-2 right-2 z-20 flex gap-1 overflow-hidden">
                    {(item.applied_tags ?? [])
                      .slice(0, 2)
                      .map((id) => {
                        const tag = tagById.get(id);
                        if (!tag) return null;
                        return (
                          <span
                            key={id}
                            className="px-1.5 py-0.5 rounded bg-black/75 text-white text-[10px] font-medium truncate"
                          >
                            {tag.emoji_name ? `${tag.emoji_name} ` : ''}{tag.name}
                          </span>
                        );
                      })}
                  </div>
                )}

                {viewMode === 'list' && (
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString('fr-FR')}
                    </p>
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                      <ReactionBar
                        reactions={reactionsData[item.id] || []}
                        onToggle={(emoji) => handleToggleReaction(item.id, emoji)}
                        serverId={null}
                        size="sm"
                      />
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {canUploadMedia && (
        <button type="button"
          onClick={() => handleUploadClick()}
          className="sm:hidden fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-10"
          aria-label="Téléverser"
        >
          <Upload className="w-6 h-6" />
        </button>
      )}

      {selectedFiles && (
        <CreateMediaPostModal
          channelId={channel.id}
          files={selectedFiles}
          onClose={() => { setSelectedFiles(null); setQuotedPost(null); }}
          onPublish={handlePublish}
          isPending={createPost.isPending}
          quotedPost={quotedPost ? { id: quotedPost.id, title: quotedPost.title, authorName: null } : null}
        />
      )}


    </div>

    {activePost && (
      <div className="w-full md:w-[440px] lg:w-[520px] flex-shrink-0 h-full">
        <MediaPostSidePanel
          post={activePost}
          channelId={channel.id}
          onClose={() => setActivePost(null)}
        />
      </div>
    )}
    </div>
  );
}

