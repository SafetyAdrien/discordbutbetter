import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useFriends, useAcceptFriendRequest, useDeclineFriendRequest, useRemoveFriend } from '@/hooks/useFriends';
import { useCreateDMConversation } from '@/hooks/useDMs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddFriendModal } from './AddFriendModal';
import { UserPlus, MessageCircle, Check, X, UserMinus, Search, Users } from 'lucide-react';
import { useBreakpoint } from '@/hooks/use-mobile';

const statusColors = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]',
};

type TabValue = 'online' | 'all' | 'pending';

interface FriendsPanelProps {
  onOpenDM: (conversationId: string) => void;
}

export function FriendsPanel({ onOpenDM }: FriendsPanelProps) {
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('online');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const breakpoint = useBreakpoint();
  
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

  // Close search on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    
    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSearchOpen]);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

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

  // Determine if we should show compact filters (tablet) or full filters (desktop)
  const isCompact = breakpoint === 'lg';
  const isMobile = breakpoint === 'sm' || breakpoint === 'md';

  const FilterButton = ({ 
    tab, 
    label, 
    count, 
    showBadge = false 
  }: { 
    tab: TabValue; 
    label: string; 
    count?: number;
    showBadge?: boolean;
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={cn(
        'px-2 lg:px-2.5 py-1 text-xs lg:text-sm rounded transition-all duration-200 whitespace-nowrap shrink-0',
        activeTab === tab 
          ? 'bg-muted text-foreground' 
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
    >
      {isCompact ? (
        // Tablet: compact version
        <span className="flex items-center gap-1">
          <span>{label}</span>
          {count !== undefined && <span className="text-[10px]">({count})</span>}
          {showBadge && pendingRequests.length > 0 && (
            <span className="ml-0.5 w-2 h-2 bg-destructive rounded-full" />
          )}
        </span>
      ) : (
        // Desktop: full version
        <span className="flex items-center gap-1">
          {label}
          {count !== undefined && <span>— {count}</span>}
          {showBadge && pendingRequests.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </span>
      )}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col bg-background min-w-0">
      {/* Header with filters */}
      <div className="border-b border-border">
        {/* Main header row */}
        <div className="h-12 px-3 md:px-4 flex items-center gap-2 transition-all duration-200">
          <Users className="w-5 h-5 text-muted-foreground shrink-0" />
          <h2 className="font-semibold shrink-0">Amis</h2>
          
          {/* Separator - tablet/desktop only */}
          <div className="hidden md:block w-px h-5 bg-border mx-1 shrink-0" />
          
          {/* Filter tabs in header - tablet/desktop only */}
          <div className="hidden md:flex items-center gap-0.5 lg:gap-1 overflow-x-auto transition-all duration-200">
            <FilterButton tab="online" label="En ligne" count={onlineFriends.length} />
            <FilterButton tab="all" label="Tous" count={acceptedFriends.length} />
            <FilterButton tab="pending" label="Attente" showBadge />
          </div>

          <div className="ml-auto flex items-center gap-1 md:gap-2 shrink-0">
            {/* Extensible Search */}
            <div ref={searchRef} className="relative flex items-center">
              {isSearchOpen ? (
                <div className="animate-fade-in flex items-center">
                  <Input
                    ref={inputRef}
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "h-8 text-sm transition-all duration-200",
                      "w-28 sm:w-36 md:w-40 lg:w-48"
                    )}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 ml-1 shrink-0"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsSearchOpen(true)}
                >
                  <Search className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <Button 
              size="sm" 
              onClick={() => setShowAddFriend(true)}
              className="h-8 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Ajouter</span>
            </Button>
          </div>
        </div>

        {/* Filter tabs - mobile only (second row) */}
        <div className="md:hidden px-3 pb-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('online')}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors whitespace-nowrap shrink-0',
              activeTab === 'online' 
                ? 'bg-muted text-foreground' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            En ligne — {onlineFriends.length}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors whitespace-nowrap shrink-0',
              activeTab === 'all' 
                ? 'bg-muted text-foreground' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            Tous — {acceptedFriends.length}
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors relative whitespace-nowrap shrink-0',
              activeTab === 'pending' 
                ? 'bg-muted text-foreground' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            En attente
            {pendingRequests.length > 0 && (
              <span className="ml-1 px-1 py-0.5 text-[10px] bg-destructive text-destructive-foreground rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {activeTab === 'pending' ? (
          pendingRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune demande en attente
            </p>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map(request => (
                <PendingCard
                  key={request.id}
                  request={request}
                  onAccept={() => acceptRequest.mutate(request.id)}
                  onDecline={() => declineRequest.mutate(request.id)}
                />
              ))}
            </div>
          )
        ) : (
          getCurrentList().length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {activeTab === 'online' ? 'Aucun ami en ligne' : 'Aucun ami trouvé'}
            </p>
          ) : (
            <div className="space-y-2">
              {getCurrentList().map(friend => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  onMessage={() => handleOpenDM(friend.profile.id)}
                  onRemove={() => removeFriend.mutate(friend.id)}
                />
              ))}
            </div>
          )
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
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background',
          statusColors[friend.profile.status || 'offline']
        )} />
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
