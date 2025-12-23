import { useState } from 'react';
import { useFriends } from '@/hooks/useFriends';
import { useCreateDMConversation } from '@/hooks/useDMs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, MessageCircle } from 'lucide-react';

const statusColors = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

interface NewMessageModalProps {
  onClose: () => void;
  onSelectConversation: (conversationId: string) => void;
}

export function NewMessageModal({ onClose, onSelectConversation }: NewMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: friends = [], isLoading } = useFriends();
  const createDM = useCreateDMConversation();

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  
  const filteredFriends = acceptedFriends.filter(f =>
    f.profile.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectFriend = async (userId: string) => {
    try {
      const result = await createDM.mutateAsync(userId);
      onSelectConversation(result.conversation_id);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Sélectionner des amis
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Tu peux ajouter {filteredFriends.length} ami{filteredFriends.length !== 1 ? 's' : ''} de plus.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Où voudrais-tu aller ?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <ScrollArea className="max-h-64">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Chargement...
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {searchQuery ? 'Aucun ami trouvé' : 'Aucun ami disponible'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFriends.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => handleSelectFriend(friend.profile.id)}
                  disabled={createDM.isPending}
                  className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md transition-colors text-left"
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={friend.profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {friend.profile.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
                      statusColors[friend.profile.status || 'offline']
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{friend.profile.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{friend.profile.username.toLowerCase()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
