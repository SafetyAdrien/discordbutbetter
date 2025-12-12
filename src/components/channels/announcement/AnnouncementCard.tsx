import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MarkdownText } from '@/lib/markdown';
import { cn } from '@/lib/utils';
import type { AnnouncementCategory } from './AnnouncementFilters';

interface AnnouncementCardProps {
  announcement: {
    id: string;
    title?: string;
    content: string;
    category?: AnnouncementCategory;
    thumbnailUrl?: string;
    author: {
      id: string;
      displayName: string;
      avatar?: string;
    };
    createdAt: Date;
    reactions?: { emoji: string; count: number }[];
  };
  onClick?: () => void;
}

export function AnnouncementCard({ announcement, onClick }: AnnouncementCardProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "À l'instant";
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card overflow-hidden cursor-pointer group',
        'transition-all duration-200 hover:ring-2 hover:ring-primary/50 hover:shadow-lg'
      )}
      onClick={onClick}
    >
      {/* Thumbnail */}
      {announcement.thumbnailUrl && (
        <div className="aspect-video overflow-hidden">
          <img
            src={announcement.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Category Badge */}
        {announcement.category && (
          <Badge
            className="gap-1.5 text-xs"
            style={{
              backgroundColor: `${announcement.category.color}20`,
              color: announcement.category.color,
              borderColor: `${announcement.category.color}40`,
            }}
          >
            {announcement.category.icon && <span>{announcement.category.icon}</span>}
            <span>{announcement.category.name}</span>
          </Badge>
        )}

        {/* Title & Content */}
        <div className="space-y-1.5">
          {announcement.title && (
            <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {announcement.title}
            </h3>
          )}
          <div className="text-sm text-muted-foreground line-clamp-2">
            <MarkdownText content={announcement.content} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={announcement.author.avatar} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {announcement.author.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {announcement.author.displayName}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDate(announcement.createdAt)}
          </span>
        </div>

        {/* Reactions */}
        {announcement.reactions && announcement.reactions.length > 0 && (
          <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
            {announcement.reactions.slice(0, 4).map((reaction, i) => (
              <div
                key={i}
                className="flex items-center gap-0.5 px-1.5 py-0.5 bg-muted/50 rounded text-xs"
              >
                <span>{reaction.emoji}</span>
                <span className="text-muted-foreground">{reaction.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
