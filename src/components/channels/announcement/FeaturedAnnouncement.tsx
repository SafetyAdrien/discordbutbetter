import { Pin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MarkdownText } from '@/lib/markdown';
import { cn } from '@/lib/utils';
import type { AnnouncementCategory } from './AnnouncementFilters';

interface FeaturedAnnouncementProps {
  announcement: {
    id: string;
    title?: string;
    content: string;
    category?: AnnouncementCategory;
    bannerUrl?: string;
    author: {
      id: string;
      displayName: string;
      avatar?: string;
    };
    createdAt: Date;
    pinned: boolean;
    featured?: boolean;
    reactions?: { emoji: string; count: number }[];
  };
  onClick?: () => void;
}

export function FeaturedAnnouncement({ announcement, onClick }: FeaturedAnnouncementProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "À l'instant";
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  };

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden cursor-pointer group',
        'transition-all duration-300 hover:scale-[1.01] hover:shadow-xl',
        'border border-border'
      )}
      onClick={onClick}
    >
      {/* Background */}
      <div className="absolute inset-0">
        {announcement.bannerUrl ? (
          <img
            src={announcement.bannerUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-violet-500/15 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative p-6 min-h-[280px] flex flex-col justify-end">
        {/* Badges */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          {announcement.category && (
            <Badge
              className="gap-1.5"
              style={{
                backgroundColor: announcement.category.color,
                color: 'white',
              }}
            >
              {announcement.category.icon && <span>{announcement.category.icon}</span>}
              <span>{announcement.category.name}</span>
            </Badge>
          )}
          {announcement.pinned && (
            <Badge variant="secondary" className="gap-1">
              <Pin className="w-3 h-3" />
              Épinglée
            </Badge>
          )}
        </div>

        {/* Title & Content */}
        <div className="space-y-3">
          {announcement.title && (
            <h2 className="text-2xl font-bold font-ginto text-foreground leading-tight">
              {announcement.title}
            </h2>
          )}
          <div className="text-foreground/80 line-clamp-3">
            <MarkdownText content={announcement.content} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={announcement.author.avatar} />
              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                {announcement.author.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{announcement.author.displayName}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{formatDate(announcement.createdAt)}</span>
            </div>
          </div>

          {announcement.reactions && announcement.reactions.length > 0 && (
            <div className="flex items-center gap-2">
              {announcement.reactions.slice(0, 3).map((reaction, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-full text-sm"
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-muted-foreground">{reaction.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
