import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useFriends, useAcceptFriendRequest, useDeclineFriendRequest, useRemoveFriend } from '@/hooks/useFriends';
import { useCreateDMConversation } from '@/hooks/useDMs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddFriendModal } from './AddFriendModal';
import { UserPlus, MessageCircle, Check, X, UserMinus, Search, Users } from 'lucide-react';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

const statusColors = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

type FriendTab = 'online' | 'all' | 'pending';

interface FriendsPanelProps {
  onOpenDM: (conversationId: string) => void;
}

export function FriendsPanel({ onOpenDM }: FriendsPanelProps) {
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<FriendTab>('online');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { data: friends = [], isLoading } = useFriends();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();
  const createDM = useCreateDMConversation();

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const pendingRequests = friends.filter(f => f.status === 'pending');
  const onlineFriends = acceptedFriends.filter(f => 
    f.profile.status === 'online' || 
    f.profile.status === 'idle' || 
    f.profile.status === 'dnd'
  );

  const filteredFriends = (list: typeof friends) => 
    list.filter(f => 
      f.profile.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.profile.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleOpenDM = async (userId: string) => {
    const result = await createDM.mutateAsync(userId);
    onOpenDM(result.conversation_id);
  };

  const toggleSearch = () => {
    if (searchExpanded) {
      setSearchExpanded(false);
      setSearchQuery('');
    } else {
      setSearchExpanded(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchExpanded) {
        setSearchExpanded(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchExpanded]);

  const getCurrentList = () => {
    switch (activeTab) {
      case 'online':
        return filteredFriends(onlineFriends);
      case 'all':
        return filteredFriends(acceptedFriends);
      case 'pending':
        return pendingRequests;
      default:
        return [];
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header with tabs integrated */}
      <div className="h-12 px-4 flex items-center gap-2 border-b border-border">
        <Users className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <h2 className="font-semibold flex-shrink-0">Amis</h2>
        
        {/* Separator */}
        <div className="h-6 w-px bg-border mx-2 flex-shrink-0" />
        
        {/* Tab buttons in header */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('online')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              activeTab === 'online' 
                ? 'bg-muted text-foreground font-medium' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            En ligne — {onlineFriends.length}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              activeTab === 'all' 
                ? 'bg-muted text-foreground font-medium' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            Tous — {acceptedFriends.length}
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors relative',
              activeTab === 'pending' 
                ? 'bg-muted text-foreground font-medium' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            En attente
            {pendingRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>
        
        {/* Right side: Search icon + Add button */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Expandable search */}
          <div className="relative flex items-center">
            {searchExpanded && (
              <div className="absolute right-0 animate-fade-in">
                <div className="relative">
                  <Input
                    ref={searchInputRef}
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 pr-8 h-8 text-sm"
                  />
                  <button
                    onClick={toggleSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            {!searchExpanded && (
              <Button 
                size="icon" 
                variant="ghost"
                onClick={toggleSearch}
                className="h-8 w-8"
              >
                <Search className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <Button 
            size="sm" 
            onClick={() => setShowAddFriend(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'online' && (
          <div className="space-y-2">
            {getCurrentList().length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun ami en ligne
              </p>
            ) : (
              getCurrentList().map(friend => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  onMessage={() => handleOpenDM(friend.profile.id)}
                  onRemove={() => removeFriend.mutate(friend.id)}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="space-y-2">
            {getCurrentList().length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun ami trouvé
              </p>
            ) : (
              getCurrentList().map(friend => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  onMessage={() => handleOpenDM(friend.profile.id)}
                  onRemove={() => removeFriend.mutate(friend.id)}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="space-y-2">
            {pendingRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune demande en attente
              </p>
            ) : (
              pendingRequests.map(request => (
                <PendingCard
                  key={request.id}
                  request={request}
                  onAccept={() => acceptRequest.mutate(request.id)}
                  onDecline={() => declineRequest.mutate(request.id)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {showAddFriend && (
        <AddFriendModal onClose={() => setShowAddFriend(false)} />
      )}
    </div>
  );
}

function FriendCard({ 
  friend, 
  onMessage, 
  onRemove 
}: { 
  friend: any; 
  onMessage: () => void; 
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
      <div className="relative">
        <Avatar className="w-10 h-10">
          <AvatarImage src={friend.profile.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary">
            {friend.profile.display_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <StatusIndicator
          status={friend.profile.status || 'offline'}
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-background"
          bgClassName="bg-background"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{friend.profile.display_name}</p>
        <p className="text-sm text-muted-foreground truncate">
          {friend.profile.custom_status || `@${friend.profile.username.toLowerCase()}`}
        </p>
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" onClick={onMessage}>
          <MessageCircle className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onRemove} className="text-destructive">
          <UserMinus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function PendingCard({ 
  request, 
  onAccept, 
  onDecline 
}: { 
  request: any; 
  onAccept: () => void; 
  onDecline: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarImage src={request.profile.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/20 text-primary text-sm">
          {request.profile.display_name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{request.profile.display_name}</p>
          <span className="text-xs text-muted-foreground">@{request.profile.username.toLowerCase()}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {request.isIncoming ? 'Demande d\'ami reçue' : 'Demande envoyée'}
        </p>
      </div>
      {request.isIncoming ? (
        <div className="flex gap-2 shrink-0">
          <Button 
            size="icon" 
            className="h-8 w-8 bg-green-500 hover:bg-green-600 text-white"
            onClick={onAccept}
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button 
            size="icon" 
            className="h-8 w-8 bg-red-500 hover:bg-red-600 text-white"
            onClick={onDecline}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button 
          size="sm" 
          variant="ghost" 
          className="text-xs text-muted-foreground hover:text-destructive"
          onClick={onDecline}
        >
          Annuler
        </Button>
      )}
    </div>
  );
}