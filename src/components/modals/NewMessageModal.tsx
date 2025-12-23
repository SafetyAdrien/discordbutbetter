import { useState, useEffect, useRef } from 'react';
import { Search, X, Hash, MessageCircle, AtSign } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFriends } from '@/hooks/useFriends';
import { useCreateDMConversation, useDMConversations } from '@/hooks/useDMs';
import { cn } from '@/lib/utils';

interface NewMessageModalProps {
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
}

export function NewMessageModal({ onClose, onSelectConversation }: NewMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { data: friends = [] } = useFriends();
  const { data: conversations = [] } = useDMConversations();
  const createDM = useCreateDMConversation();
  
  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  
  // Filter friends based on search
  const filteredFriends = acceptedFriends.filter(f =>
    f.profile.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get recent conversations (last 5)
  const recentConversations = conversations.slice(0, 5);

  useEffect(() => {
    // Focus input on mount
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSelectFriend = async (userId: string) => {
    try {
      const result = await createDM.mutateAsync(userId);
      onSelectConversation(result.conversation_id);
      onClose();
    } catch (error) {
      console.error('Failed to create DM:', error);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    onSelectConversation(conversationId);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-card border-border overflow-hidden">
        {/* Search Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Où voulez-vous aller ?"
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto">
          {/* Search results */}
          {searchQuery ? (
            <div className="p-2">
              {filteredFriends.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Aucun résultat pour "{searchQuery}"
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1">AMIS</p>
                  {filteredFriends.map(friend => (
                    <button
                      key={friend.id}
                      onClick={() => handleSelectFriend(friend.profile.id)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={friend.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {friend.profile.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{friend.profile.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{friend.profile.username}</p>
                      </div>
                      <AtSign className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Recent Conversations */}
              {recentConversations.length > 0 && (
                <div className="p-2">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">
                    CONVERSATIONS RÉCENTES
                  </p>
                  <div className="space-y-1">
                    {recentConversations.map(conv => {
                      const otherParticipant = conv.participants?.[0];
                      if (!otherParticipant) return null;
                      
                      return (
                        <button
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv.id)}
                          className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={otherParticipant.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary text-sm">
                              {otherParticipant.display_name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {conv.is_group ? conv.name : otherParticipant.display_name}
                            </p>
                            {conv.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate">
                                {conv.lastMessage.content}
                              </p>
                            )}
                          </div>
                          <MessageCircle className="w-4 h-4 text-muted-foreground" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Friends suggestion */}
              {acceptedFriends.length > 0 && (
                <div className="p-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">
                    AMIS
                  </p>
                  <div className="space-y-1">
                    {acceptedFriends.slice(0, 5).map(friend => (
                      <button
                        key={friend.id}
                        onClick={() => handleSelectFriend(friend.profile.id)}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={friend.profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary text-sm">
                            {friend.profile.display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{friend.profile.display_name}</p>
                          <p className="text-xs text-muted-foreground truncate">@{friend.profile.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pro tip footer */}
        <div className="px-4 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Astuce :</span> Commencez par @ pour rechercher un ami
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}