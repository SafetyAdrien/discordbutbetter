import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X, Hash, Megaphone, Folder } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useFriends } from '@/hooks/useFriends';
import { useCreateDMConversation } from '@/hooks/useDMs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NewMessageModalProps {
  onClose: () => void;
  onOpenDM: (conversationId: string) => void;
}

export function NewMessageModal({ onClose, onOpenDM }: NewMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: friends = [] } = useFriends();
  const createDM = useCreateDMConversation();

  const acceptedFriends = friends.filter(f => f.status === 'accepted');

  const filteredFriends = acceptedFriends.filter(f =>
    f.profile.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSelectFriend = async (userId: string) => {
    const result = await createDM.mutateAsync(userId);
    onOpenDM(result.conversation_id);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/60" />
      <div 
        className="relative bg-[hsl(var(--surface-2))] rounded-2xl shadow-elevation-3 w-full max-w-lg animate-scale-in overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 flex items-center border-r border-border pr-3">
              <span className="text-muted-foreground text-lg">|</span>
            </div>
            <Input
              ref={inputRef}
              placeholder="Où souhaites-tu aller ?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-10 py-3 text-lg bg-transparent border-0 focus-visible:ring-0 placeholder:text-muted-foreground/60"
            />
            <button 
              onClick={onClose}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {/* Friends Section */}
          {filteredFriends.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Amis
              </p>
              {filteredFriends.slice(0, 6).map(friend => (
                <button
                  key={friend.id}
                  onClick={() => handleSelectFriend(friend.profile.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[hsl(var(--surface-3))] transition-colors text-left"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={friend.profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {friend.profile.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{friend.profile.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{friend.profile.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Quick Actions / Categories */}
          <div className="p-2 border-t border-border">
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Salons récents
            </p>
            <div className="text-sm text-muted-foreground px-3 py-4 text-center">
              Aucun salon récent
            </div>
          </div>

          {/* Pro tip */}
          <div className="px-4 py-3 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">
              <span className="text-primary font-medium">PROTIP:</span>{' '}
              Commencez vos recherches par{' '}
              <span className="font-mono bg-muted px-1 rounded">@</span>{' '}
              <span className="font-mono bg-muted px-1 rounded">#</span>{' '}
              <span className="font-mono bg-muted px-1 rounded">!</span>{' '}
              <span className="font-mono bg-muted px-1 rounded">*</span>{' '}
              pour affiner les résultats.{' '}
              <button className="text-primary hover:underline">En savoir plus</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}