import { useState } from 'react';
import { Plus, Search, Tag, ArrowUp, MessageCircle, Clock, Users, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { useHasChannelPermission } from '@/hooks/useUserChannelPermissions';

interface Channel {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface ForumChannelProps {
  channel: Channel;
  onToggleMembers?: () => void;
  showMembers?: boolean;
  hideHeader?: boolean;
}

interface ForumThread {
  id: string;
  title: string;
  author: string;
  createdAt: Date;
  lastActivity: Date;
  replyCount: number;
  upvotes: number;
  tags: string[];
  pinned?: boolean;
}

export function ForumChannel({ channel, onToggleMembers, showMembers, hideHeader = false }: ForumChannelProps) {
  // Permissions
  const { data: canCreatePosts = true } = useHasChannelPermission(channel.id, 'create_forum_posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');

  const threads: ForumThread[] = [];

  return (
    <div className="flex-1 flex flex-col bg-[hsl(var(--surface-2)/0.3)] min-w-0 w-full overflow-x-hidden">
      {!hideHeader && (
      <div className="h-12 px-2 sm:px-4 flex items-center gap-2 sm:gap-4 flex-shrink-0 bg-[hsl(var(--surface-2))] w-full" style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)", boxShadow: "var(--shadow-elevation-1)", borderRadius: "0 0 var(--radius-xl) var(--radius-xl)" }}>

        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <StreamlineForum className="text-muted-foreground flex-shrink-0" size={16} />
          <h2 className="font-semibold text-foreground truncate">{channel.name}</h2>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 w-32 md:w-48"
            />
          </div>
          {canCreatePosts && (
            <Button size="sm" className="hidden sm:inline-flex">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nouveau sujet</span>
            </Button>
          )}
          {onToggleMembers && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={onToggleMembers}
                  className={cn(showMembers && "bg-surface-hover")}
                >
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
      <div className="px-4 py-3 border-b border-border flex items-center gap-4">
        <div className="flex gap-1">
          <Button
            variant={sortBy === 'recent' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('recent')}
          >
            <Clock className="w-4 h-4 mr-1" />
            Récent
          </Button>
          <Button
            variant={sortBy === 'popular' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('popular')}
          >
            <ArrowUp className="w-4 h-4 mr-1" />
            Populaire
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="flex items-center gap-2 px-3 py-2 mb-6 rounded-md bg-muted/40 border border-border/60 text-xs text-muted-foreground max-w-md">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Le système de réponse sera disponible avec la prochaine version des posts forum.</span>
            </div>
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <StreamlineForum className="text-muted-foreground/50" size={40} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucune discussion</h3>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Lancez la première discussion dans ce forum.
            </p>
            {canCreatePosts && (
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Créer un sujet
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className="p-4 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {thread.pinned && (
                        <Badge variant="secondary" className="text-xs">
                          Épinglé
                        </Badge>
                      )}
                      <h4 className="font-medium truncate">{thread.title}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{thread.author}</span>
                      <span>•</span>
                      <span>{thread.createdAt.toLocaleDateString('fr-FR')}</span>
                    </div>
                    {thread.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {thread.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {thread.replyCount}
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowUp className="w-4 h-4" />
                      {thread.upvotes}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {canCreatePosts && (
        <button
          className="sm:hidden fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-10"
          aria-label="Nouveau sujet"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
