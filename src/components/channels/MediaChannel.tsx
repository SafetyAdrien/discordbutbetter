import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Upload, Grid, List, Users, EyeOff, Layers } from 'lucide-react';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UploadDropOverlay } from '@/components/chat/upload/UploadDropOverlay';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';
import { CreateMediaPostModal } from '@/components/channels/media/CreateMediaPostModal';
import { MediaPostDetailModal } from '@/components/channels/media/MediaPostDetailModal';
import { useMediaPosts, useCreateMediaPost, type MediaPost } from '@/hooks/useMediaPosts';
import { useMediaPostReactions, useToggleMediaReaction } from '@/hooks/useMediaReactions';
import { ReactionBar } from '@/components/chat/ReactionBar';

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
}

export function MediaChannel({ channel, onToggleMembers, showMembers }: MediaChannelProps) {
  const { data: canUploadMedia = true } = useHasChannelPermission(channel.id, 'upload_media');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);
  const [activePost, setActivePost] = useState<MediaPost | null>(null);

  // Real data hooks
  const { data: mediaItems = [] } = useMediaPosts(channel.id);
  const createPost = useCreateMediaPost(channel.id);

  // Reactions
  const postIds = useMemo(() => mediaItems.map(m => m.id), [mediaItems]);
  const { data: reactionsData = {} } = useMediaPostReactions(postIds);
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

  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
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
  }) => {
    createPost.mutate(data);
    setSelectedFiles(null);
  };

  return (
    <div
      className="flex-1 flex flex-col bg-[hsl(var(--surface-2)/0.3)] min-w-0 w-full overflow-x-hidden relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <AnimatePresence>
        {isDragging && <UploadDropOverlay channelName={channel.name} />}
      </AnimatePresence>

      {/* Header */}
      <div className="h-12 px-2 sm:px-4 flex items-center gap-2 sm:gap-4 flex-shrink-0 bg-[hsl(var(--surface-2))] w-full" style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)", boxShadow: "var(--shadow-elevation-1)", borderRadius: "0 0 var(--radius-xl) var(--radius-xl)" }}>
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <StreamlineMedia className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <h2 className="font-semibold text-foreground truncate">{channel.name}</h2>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {canUploadMedia && (
            <Button size="sm" onClick={handleUploadClick}>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {mediaItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <StreamlineMedia className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun média</h3>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Partagez des images et vidéos avec les membres de ce salon.
            </p>
            {canUploadMedia && (
              <Button onClick={handleUploadClick}>
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
            {mediaItems.map((item) => {
              const firstItem = item.items?.[0];
              const cover = firstItem ?? {
                file_url: item.file_url,
                file_type: item.file_type,
                alt_text: item.alt_text,
              };
              const albumCount = item.items?.length ?? 0;
              return (
              <div
                key={item.id}
                onClick={() => !item._isPending && setActivePost(item)}
                className={cn(
                  'group relative rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all',
                  viewMode === 'grid' ? 'aspect-square' : 'flex items-center gap-4 p-2',
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

                {viewMode === 'grid' && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-medium truncate">{item.title}</p>
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
                {viewMode === 'grid' && (
                  <div className="absolute top-2 left-2 z-20" onClick={(e) => e.stopPropagation()}>
                    <ReactionBar
                      reactions={reactionsData[item.id] || []}
                      onToggle={(emoji) => handleToggleReaction(item.id, emoji)}
                      serverId={null}
                      size="sm"
                    />
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedFiles && (
        <CreateMediaPostModal
          files={selectedFiles}
          onClose={() => setSelectedFiles(null)}
          onPublish={handlePublish}
          isPending={createPost.isPending}
        />
      )}

      {activePost && (
        <MediaPostDetailModal
          post={activePost}
          channelId={channel.id}
          onClose={() => setActivePost(null)}
        />
      )}
    </div>
  );
}
