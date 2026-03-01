import { useState } from 'react';
import { X, ArrowRight, Search } from 'lucide-react';
import { X, ArrowRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useFriends } from '@/hooks/useFriends';
import { useCreateDMConversation } from '@/hooks/useDMs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NewDMSheetProps {
  onClose: () => void;
  onOpenDM: (conversationId: string) => void;
}

export function NewDMSheet({ onClose, onOpenDM }: NewDMSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: friends = [] } = useFriends();
  const createDM = useCreateDMConversation();

  const acceptedFriends = friends
    .filter(f => f.status === 'accepted')
    .sort((a, b) => a.profile.display_name.localeCompare(b.profile.display_name));

  const filteredFriends = acceptedFriends.filter(f =>
    f.profile.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectFriend = async (userId: string) => {
    const result = await createDM.mutateAsync(userId);
    onOpenDM(result.conversation_id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative mt-auto bg-card rounded-t-2xl shadow-xl w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-base">Nouveau message</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un ami..."
              className="pl-9 h-10 bg-input text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Friend list */}
        <div className="flex-1 overflow-y-auto px-2 pb-safe">
          {filteredFriends.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Aucun ami trouvé
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredFriends.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => handleSelectFriend(friend.profile.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={friend.profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {friend.profile.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{friend.profile.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{friend.profile.username}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
