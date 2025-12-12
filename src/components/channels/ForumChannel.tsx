import { useState } from 'react';
import { Plus, Search, Tag, ArrowUp, MessageCircle, Clock, Users } from 'lucide-react';
import { ForumIcon } from '@/components/icons/ForumIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

export function ForumChannel({ channel, onToggleMembers, showMembers }: ForumChannelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');

  const threads: ForumThread[] = [];

  return (
    <div className="flex-1 flex flex-col bg-background min-w-0">
      <div className="h-12 px-4 flex items-center gap-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <ForumIcon size={16} className="text-muted-foreground" />
          <h2 className="font-semibold text-foreground">{channel.name}</h2>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 w-48"
            />
          </div>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau sujet
          </Button>
        </div>
      </div>

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
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <ForumIcon size={40} className="text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucune discussion</h3>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Lancez la première discussion dans ce forum.
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Créer un sujet
            </Button>
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
    </div>
  );
}
