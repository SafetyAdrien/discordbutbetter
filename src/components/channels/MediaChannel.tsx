import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Upload, Grid, List, Users, EyeOff } from 'lucide-react';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UploadDropOverlay } from '@/components/chat/upload/UploadDropOverlay';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';
import { CreateMediaPostModal } from '@/components/channels/media/CreateMediaPostModal';
import { useMediaPosts, useCreateMediaPost } from '@/hooks/useMediaPosts';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Real data hooks
  const { data: mediaItems = [] } = useMediaPosts(channel.id);
  const createPost = useCreateMediaPost(channel.id);

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
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setSelectedFile(file);
      }
    }
  }, []);

  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files[0]) setSelectedFile(files[0]);
    };
    input.click();
  };

  const handlePublish = async (data: {
    file: File;
    title: string;
    description: string;
    altText: string;
    isSpoiler: boolean;
  }) => {
    createPost.mutate(data);
    setSelectedFile(null);
  };

  return (
    <div
      className="flex-1 flex flex-col bg-background min-w-0 w-full overflow-x-hidden relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <AnimatePresence>
        {isDragging && <UploadDropOverlay channelName={channel.name} />}
      </AnimatePresence>

      {/* Header */}
      <div className="h-12 px-2 sm:px-4 flex items-center gap-2 sm:gap-4 border-b border-border flex-shrink-0 w-full">
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
            {mediaItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'group relative rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all',
                  viewMode === 'grid' ? 'aspect-square' : 'flex items-center gap-4 p-2',
                  item._isPending && 'opacity-60'
                )}
              >
                {/* Spoiler overlay */}
                {item.is_spoiler && (
                  <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-xl flex items-center justify-center">
                    <EyeOff className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}

                {item.file_type === 'video' ? (
                  <video
                    src={item.file_url}
                    className={cn(
                      'object-cover',
                      viewMode === 'grid' ? 'w-full h-full' : 'w-16 h-16 rounded'
                    )}
                    muted
                  />
                ) : (
                  <img
                    src={item.file_url}
                    alt={item.alt_text || item.title}
                    className={cn(
                      'object-cover',
                      viewMode === 'grid' ? 'w-full h-full' : 'w-16 h-16 rounded'
                    )}
                  />
                )}

                {/* Grid overlay with title */}
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
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Media Post Modal */}
      {selectedFile && (
        <CreateMediaPostModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onPublish={handlePublish}
          isPending={createPost.isPending}
        />
      )}
    </div>
  );
}
