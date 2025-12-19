import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Upload, Grid, List, Users } from 'lucide-react';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePendingAttachments } from '@/hooks/usePendingAttachments';
import { UploadDropOverlay } from '@/components/chat/upload/UploadDropOverlay';
import { AttachmentStagingArea } from '@/components/chat/upload/AttachmentStagingArea';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';

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
  // Permissions
  const { data: canUploadMedia = true } = useHasChannelPermission(channel.id, 'upload_media');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const {
    attachments,
    isDragging,
    addFiles,
    removeAttachment,
    updateAttachment,
    toggleSpoiler,
    clearAttachments,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  } = usePendingAttachments();

  // Placeholder data - will be connected to actual storage later
  const mediaItems: { id: string; url: string; name: string; type: 'image' | 'video'; uploadedAt: Date }[] = [];
  
  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,video/*';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) addFiles(Array.from(files));
    };
    input.click();
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

      {/* Staging Area for pending uploads */}
      {attachments.length > 0 && (
        <div className="p-4 border-b border-border">
          <AttachmentStagingArea
            attachments={attachments}
            onRemove={removeAttachment}
            onUpdate={updateAttachment}
            onToggleSpoiler={toggleSpoiler}
          />
          <div className="flex justify-end mt-3 gap-2">
            <Button variant="ghost" size="sm" onClick={clearAttachments}>
              Annuler
            </Button>
            <Button size="sm" onClick={() => {
              // TODO: Implement actual upload to storage
              console.log('Uploading files:', attachments);
              clearAttachments();
            }}>
              Téléverser {attachments.length} fichier{attachments.length > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {mediaItems.length === 0 && attachments.length === 0 ? (
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
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
              : 'space-y-2'
          )}>
            {mediaItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'group relative rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all',
                  viewMode === 'grid' ? 'aspect-square' : 'flex items-center gap-4 p-2'
                )}
              >
                <img
                  src={item.url}
                  alt={item.name}
                  className={cn(
                    'object-cover',
                    viewMode === 'grid' ? 'w-full h-full' : 'w-16 h-16 rounded'
                  )}
                />
                {viewMode === 'list' && (
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.uploadedAt.toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
