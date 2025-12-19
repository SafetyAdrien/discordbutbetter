import { useState } from 'react';
import { Upload, Grid, List, Users } from 'lucide-react';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Placeholder data - will be connected to actual storage later
  const mediaItems: { id: string; url: string; name: string; type: 'image' | 'video'; uploadedAt: Date }[] = [];

  return (
    <div className="flex-1 flex flex-col bg-background min-w-0 overflow-hidden">
      {/* Header */}
      <div className="h-12 px-2 sm:px-4 flex items-center gap-2 sm:gap-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <StreamlineMedia className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <h2 className="font-semibold text-foreground truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">{channel.name}</h2>
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
          <Button size="sm">
            <Upload className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Téléverser</span>
          </Button>
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
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Téléverser un fichier
            </Button>
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
