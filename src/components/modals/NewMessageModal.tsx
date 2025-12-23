import { useState, useEffect, useRef } from 'react';
import { Search, Hash, X, MessageCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDMConversations } from '@/hooks/useDMs';
import { useChannels } from '@/hooks/useChannels';
import { useServers } from '@/hooks/useServers';
import { useFriends } from '@/hooks/useFriends';
import { cn } from '@/lib/utils';

interface NewMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConversation: (conversationId: string) => void;
  onSelectChannel?: (channelId: string, serverId: string) => void;
}

export function NewMessageModal({
  open,
  onOpenChange,
  onSelectConversation,
  onSelectChannel,
}: NewMessageModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { data: conversations = [] } = useDMConversations();
  const { data: friends = [] } = useFriends();
  const { data: servers = [] } = useServers();

  // Reset query when modal opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Filter friends based on query
  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const filteredFriends = query.trim()
    ? acceptedFriends.filter(f =>
        f.profile.display_name.toLowerCase().includes(query.toLowerCase()) ||
        f.profile.username.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  // Recent conversations (last 5)
  const recentConversations = conversations.slice(0, 5);

  const handleSelectFriend = (friendId: string) => {
    // Find existing conversation with this friend or create new one
    const existingConvo = conversations.find(c => 
      c.participants?.some(p => p.id === friendId)
    );
    if (existingConvo) {
      onSelectConversation(existingConvo.id);
    }
    onOpenChange(false);
  };

  const handleSelectConversation = (convoId: string) => {
    onSelectConversation(convoId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 bg-card border-border overflow-hidden">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Où voulez-vous aller ?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto">
          {/* Search Results */}
          {query.trim() && filteredFriends.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Amis
              </p>
              {filteredFriends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => handleSelectFriend(friend.profile.id)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={friend.profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {friend.profile.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{friend.profile.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{friend.profile.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent Conversations */}
          {!query.trim() && recentConversations.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Conversations récentes
              </p>
              {recentConversations.map((convo) => {
                const otherParticipant = convo.participants?.[0];
                const displayName = convo.is_group 
                  ? convo.name || 'Groupe' 
                  : otherParticipant?.display_name || 'Utilisateur';
                const avatarUrl = convo.is_group 
                  ? convo.icon_url 
                  : otherParticipant?.avatar_url;
                
                return (
                  <button
                    key={convo.id}
                    onClick={() => handleSelectConversation(convo.id)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{displayName}</p>
                    </div>
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {query.trim() && filteredFriends.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <p>Aucun résultat trouvé</p>
            </div>
          )}

          {!query.trim() && recentConversations.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <p>Aucune conversation récente</p>
            </div>
          )}
        </div>

        {/* Pro Tip Footer */}
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Astuce :</span> Commencez votre recherche par @ pour trouver un ami
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
