import { useState } from 'react';
import { Megaphone, Pin, Bell, BellOff, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MarkdownText } from '@/lib/markdown';

interface AnnouncementChannelProps {
  channelId: string;
  channelName: string;
}

interface Announcement {
  id: string;
  content: string;
  author: {
    id: string;
    displayName: string;
    avatar?: string;
  };
  createdAt: Date;
  pinned: boolean;
  reactions?: { emoji: string; count: number }[];
}

export function AnnouncementChannel({ channelId, channelName }: AnnouncementChannelProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Placeholder data
  const announcements: Announcement[] = [];

  const pinnedAnnouncements = announcements.filter((a) => a.pinned);
  const regularAnnouncements = announcements.filter((a) => !a.pinned);

  return (
    <div className="flex-1 flex flex-col bg-background min-w-0">
      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">{channelName}</h2>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          >
            {notificationsEnabled ? (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Notifications activées
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 mr-2" />
                Notifications désactivées
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Megaphone className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucune annonce</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Les annonces importantes du serveur apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pinned announcements */}
            {pinnedAnnouncements.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Pin className="w-4 h-4" />
                  Épinglées
                </h3>
                {pinnedAnnouncements.map((announcement) => (
                  <AnnouncementCard key={announcement.id} announcement={announcement} />
                ))}
              </div>
            )}

            {/* Regular announcements */}
            {regularAnnouncements.length > 0 && (
              <div className="space-y-4">
                {pinnedAnnouncements.length > 0 && (
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Récentes
                  </h3>
                )}
                {regularAnnouncements.map((announcement) => (
                  <AnnouncementCard key={announcement.id} announcement={announcement} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <div className={cn(
      'p-4 rounded-lg border',
      announcement.pinned ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'
    )}>
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={announcement.author.avatar} />
          <AvatarFallback className="bg-primary/20 text-primary">
            {announcement.author.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{announcement.author.displayName}</span>
            {announcement.pinned && (
              <Badge variant="secondary" className="text-xs">
                <Pin className="w-3 h-3 mr-1" />
                Épinglée
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {announcement.createdAt.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="text-foreground">
            <MarkdownText content={announcement.content} />
          </div>
          {announcement.reactions && announcement.reactions.length > 0 && (
            <div className="flex gap-1 mt-3">
              {announcement.reactions.map((reaction, i) => (
                <button
                  key={i}
                  className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-sm hover:bg-primary/20 transition-colors"
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-xs text-muted-foreground">{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
