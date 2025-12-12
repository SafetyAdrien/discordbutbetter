import { cn } from '@/lib/utils';
import { ChevronDown, Hash, Volume2, MessagesSquare, Megaphone, Settings, Plus, Pencil, Calendar, Crown, Users, Image, CalendarDays, ListTodo, FolderPlus, UserPlus, CheckCircle, Link, Bell, Trash2, MicOff, HeadphoneOff } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { ChannelSettingsModal } from '@/components/channel-settings/ChannelSettingsModal';
import { AccountSettingsModal } from '@/components/account-settings/AccountSettingsModal';
import { CreateChannelModal } from '@/components/modals/CreateChannelModal';
import { CreateCategoryModal } from '@/components/modals/CreateCategoryModal';
import { CreateInviteModal } from '@/components/modals/CreateInviteModal';
import { VoiceControls } from './VoiceControls';
import { UserProfileCard } from '@/components/profile/UserProfileCard';
import { copyToClipboard } from '@/lib/clipboard';
import { toast } from '@/hooks/use-toast';
import { useVoice, useVoiceParticipants } from '@/contexts/VoiceContext';
import { useUpdateCategory } from '@/hooks/useCategories';
import { useServerEmojis } from '@/hooks/useServerAssets';
import { useMembers } from '@/hooks/useMembers';
import { useChannels, useReorderCategories, useReorderChannels, ChannelType, OrphanChannel } from '@/hooks/useChannels';

// DnD Kit imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Drop Indicator Component
function DropIndicator({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;
  return <div className="drop-indicator mx-2 my-0.5" />;
}
interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  unreadCount?: number;
}
interface Category {
  id: string;
  name: string;
  channels: Channel[];
}
interface Server {
  id: string;
  name: string;
  ownerId: string;
  categories: Category[];
  iconUrl?: string;
  bannerUrl?: string;
  description?: string;
  createdAt?: string;
}
interface ChannelListProps {
  server: Server;
  activeChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
  onOpenServerSettings?: () => void;
  orphanChannels?: OrphanChannel[];
}
const channelIcons: Record<ChannelType, React.ElementType> = {
  text: Hash,
  voice: Volume2,
  forum: MessagesSquare,
  announcement: Megaphone,
  media: Image,
  calendar: CalendarDays,
  tasks: ListTodo
};
const statusColors = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]'
};
const statusLabels = {
  online: 'En ligne',
  idle: 'Inactif',
  dnd: 'Ne pas déranger',
  offline: 'Hors ligne'
};
function formatServerDate(dateString?: string): string {
  if (!dateString) return 'Date inconnue';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Sortable Category Component
function SortableCategory({
  category,
  children,
  isCollapsed,
  onToggle,
  onEdit,
  onCreateChannel
}: {
  category: Category;
  children: React.ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onCreateChannel: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `category-${category.id}`
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease, opacity 200ms ease',
    opacity: isDragging ? 0.4 : 1,
  };
  return <div ref={setNodeRef} style={style} className={cn("mb-2", isDragging && "sortable-ghost")}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div {...attributes} {...listeners} className="flex items-center gap-1 px-2 py-1 w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group hover:cursor-grab">
            <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="flex items-center gap-px flex-1">
              <ChevronDown className={cn('w-3 h-3 transition-transform', isCollapsed && '-rotate-90')} />
              <span className="tracking-wide font-ginto font-normal">{category.name}</span>
            </button>
            <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={e => {
            e.stopPropagation();
            onCreateChannel();
          }} />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem onClick={onCreateChannel}>
            <Plus className="w-4 h-4 mr-2" />
            Créer un salon
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            Modifier la catégorie
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem className="text-destructive focus:text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer la catégorie
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {!isCollapsed && children}
    </div>;
}

// Sortable Channel Component
function SortableChannel({
  channel,
  serverId,
  isActive,
  isVoiceConnected,
  speakingUsers,
  onChannelClick,
  onCopyLink,
  onMarkAsRead,
  onOpenSettings,
  onCreateInvite,
  showDropIndicator = false
}: {
  channel: Channel;
  serverId: string;
  isActive: boolean;
  isVoiceConnected: boolean;
  speakingUsers: Set<string>;
  onChannelClick: () => void;
  onCopyLink: () => void;
  onMarkAsRead: () => void;
  onOpenSettings: () => void;
  onCreateInvite: () => void;
  showDropIndicator?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `channel-${channel.id}`
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging 
      ? 'opacity 200ms ease' 
      : 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms ease, background-color 200ms ease',
    opacity: isDragging ? 0.4 : 1,
  };
  const Icon = channelIcons[channel.type];
  const isVoice = channel.type === 'voice';
  const {
    data: participants = []
  } = useVoiceParticipants(isVoice ? channel.id : null);
  return (
    <>
      <DropIndicator isVisible={showDropIndicator} />
      <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn("hover:cursor-grab channel-transition", isDragging && "sortable-ghost")}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <button onClick={onChannelClick} className={cn('channel-item w-full group', isActive && !isVoice && 'active', isVoiceConnected && 'bg-[hsl(var(--online))]/10 border-l-2 border-[hsl(var(--online))]')}>
              <Icon className={cn('w-4 h-4 flex-shrink-0', isVoice && 'text-[hsl(var(--online))]')} />
            <span className="truncate flex-1 text-left font-ginto font-normal">{channel.name}</span>
            
              {channel.unreadCount && channel.unreadCount > 0 && <span className="px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                  {channel.unreadCount}
                </span>}

              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <UserPlus className="w-4 h-4 text-muted-foreground hover:text-foreground" onClick={e => {
                  e.stopPropagation();
                  onCreateInvite();
                }} />
                <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground" onClick={e => {
                  e.stopPropagation();
                  onOpenSettings();
                }} />
              </div>
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={onMarkAsRead}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Marquer comme lu
            </ContextMenuItem>
            <ContextMenuItem onClick={onCopyLink}>
              <Link className="w-4 h-4 mr-2" />
              Copier le lien
            </ContextMenuItem>
            <ContextMenuItem onClick={onCreateInvite}>
              <UserPlus className="w-4 h-4 mr-2" />
              Créer une invitation
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onOpenSettings}>
              <Settings className="w-4 h-4 mr-2" />
              Modifier le channel
            </ContextMenuItem>
            <ContextMenuItem>
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer le channel
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Voice Participants */}
        {isVoice && participants.length > 0 && <div className="ml-6 mt-1 space-y-1">
            {participants.map(participant => {
          const isSpeaking = speakingUsers.has(participant.user_id);
          return <div key={participant.id} className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                  <Avatar className={cn("w-5 h-5 transition-all", isSpeaking ? "ring-2 ring-[hsl(var(--voice-active))] voice-active-ring" : "ring-1 ring-border")}>
                    <AvatarImage src={participant.profile.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                      {participant.profile.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate flex-1 text-xs">
                    {participant.profile.display_name}
                  </span>
                  {participant.muted && <MicOff className="w-3 h-3 text-destructive" />}
                  {participant.deafened && <HeadphoneOff className="w-3 h-3 text-destructive" />}
                </div>;
        })}
          </div>}
      </div>
    </>
  );
}
export function ChannelList({
  server,
  activeChannelId,
  onChannelSelect,
  onOpenServerSettings,
  orphanChannels = []
}: ChannelListProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [createChannelForCategory, setCreateChannelForCategory] = useState<{
    id: string | null;
    name: string;
    showSelector?: boolean;
  } | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [inviteChannelId, setInviteChannelId] = useState<string | null>(null);
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const {
    profile,
    signOut,
    updateStatus
  } = useAuth();
  const {
    voiceState,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeafen,
    isConnected,
    speakingUsers
  } = useVoice();
  const updateCategory = useUpdateCategory();
  const reorderCategories = useReorderCategories();
  const reorderChannels = useReorderChannels();
  const {
    data: serverEmojis = []
  } = useServerEmojis(server.id);
  const {
    data: membersData
  } = useMembers(server.id);
  const ownerProfile = membersData?.find(m => m.id === server.ownerId);

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]);
  };
  const handleSignOut = async () => {
    await signOut();
  };
  const handleCopyLink = (channelId: string) => {
    const link = `${window.location.origin}/channels/${server.id}/${channelId}`;
    copyToClipboard(link, 'Lien copié');
  };
  const handleMarkAsRead = (channelId: string) => {
    toast({
      title: 'Marqué comme lu'
    });
  };
  const handleCreateInvite = (channelId: string) => {
    setInviteChannelId(channelId);
  };
  
  const getChannelName = (channelId: string): string => {
    for (const cat of server.categories) {
      const ch = cat.channels.find(c => c.id === channelId);
      if (ch) return ch.name;
    }
    const orphan = orphanChannels.find(c => c.id === channelId);
    return orphan?.name || '';
  };
  const handleChannelClick = (channel: Channel) => {
    if (channel.type === 'voice') {
      joinChannel(channel.id, channel.name, server.name);
    } else {
      onChannelSelect(channel.id);
    }
  };
  const handleStartEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };
  const handleSaveCategory = () => {
    if (editingCategoryId && editingCategoryName.trim()) {
      updateCategory.mutate({
        categoryId: editingCategoryId,
        name: editingCategoryName.trim()
      });
    }
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };
  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over && over.id !== activeId) {
      setOverId(over.id as string);
    } else {
      setOverId(null);
    }
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    setOverId(null);
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    
    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Handle category reordering
    if (activeIdStr.startsWith('category-') && overIdStr.startsWith('category-')) {
      const activeCatId = activeIdStr.replace('category-', '');
      const overCatId = overIdStr.replace('category-', '');
      const oldIndex = server.categories.findIndex(c => c.id === activeCatId);
      const newIndex = server.categories.findIndex(c => c.id === overCatId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(server.categories, oldIndex, newIndex);
        const orderedIds = newOrder.map(cat => cat.id);
        reorderCategories.mutate({
          serverId: server.id,
          orderedIds
        });
      }
    }

    // Handle channel reordering (inter-category support)
    if (activeIdStr.startsWith('channel-')) {
      const activeChannelId = activeIdStr.replace('channel-', '');
      
      // Find source category (null for orphans)
      let sourceCategoryId: string | null = null;
      for (const cat of server.categories) {
        if (cat.channels.some(ch => ch.id === activeChannelId)) {
          sourceCategoryId = cat.id;
          break;
        }
      }
      if (!sourceCategoryId && orphanChannels.some(ch => ch.id === activeChannelId)) {
        sourceCategoryId = null;
      }

      // Dropping on another channel
      if (overIdStr.startsWith('channel-')) {
        const overChannelId = overIdStr.replace('channel-', '');
        
        // Find target category
        let targetCategoryId: string | null = null;
        let targetChannels: Channel[] = [];
        
        for (const cat of server.categories) {
          if (cat.channels.some(ch => ch.id === overChannelId)) {
            targetCategoryId = cat.id;
            targetChannels = cat.channels;
            break;
          }
        }
        if (!targetCategoryId && orphanChannels.some(ch => ch.id === overChannelId)) {
          targetCategoryId = null;
          targetChannels = orphanChannels.map(ch => ({
            id: ch.id,
            name: ch.name,
            type: (ch.type || 'text') as ChannelType,
            description: ch.description || undefined
          }));
        }

        // Calculate new order
        const activeChannel = [...server.categories.flatMap(c => c.channels), ...orphanChannels.map(ch => ({
          id: ch.id,
          name: ch.name,
          type: (ch.type || 'text') as ChannelType,
          description: ch.description || undefined
        }))].find(ch => ch.id === activeChannelId);
        
        if (activeChannel) {
          // Same category: perform true swap using arrayMove
          if (sourceCategoryId === targetCategoryId || (sourceCategoryId === null && targetCategoryId === null)) {
            const oldIndex = targetChannels.findIndex(ch => ch.id === activeChannelId);
            const newIndex = targetChannels.findIndex(ch => ch.id === overChannelId);
            if (oldIndex !== -1 && newIndex !== -1) {
              const newOrder = arrayMove(targetChannels, oldIndex, newIndex);
              reorderChannels.mutate({
                serverId: server.id,
                categoryId: targetCategoryId,
                orderedIds: newOrder.map(ch => ch.id)
              });
            }
          } else {
            // Different category: move channel to new category at target position
            const filteredChannels = targetChannels.filter(ch => ch.id !== activeChannelId);
            const overIdx = filteredChannels.findIndex(ch => ch.id === overChannelId);
            const newOrder = [
              ...filteredChannels.slice(0, overIdx + 1),
              activeChannel,
              ...filteredChannels.slice(overIdx + 1)
            ];
            
            reorderChannels.mutate({
              serverId: server.id,
              categoryId: targetCategoryId,
              orderedIds: newOrder.map(ch => ch.id)
            });
          }
        }
      }
      
      // Dropping on a category header - add at end of category
      else if (overIdStr.startsWith('category-')) {
        const targetCategoryId = overIdStr.replace('category-', '');
        const targetCategory = server.categories.find(c => c.id === targetCategoryId);
        
        if (targetCategory) {
          const existingIds = targetCategory.channels
            .filter(ch => ch.id !== activeChannelId)
            .map(ch => ch.id);
          
          reorderChannels.mutate({
            serverId: server.id,
            categoryId: targetCategoryId,
            orderedIds: [...existingIds, activeChannelId]
          });
        }
      }
      
    }
  };

  // Helper to find a channel by ID for the DragOverlay
  const findChannelById = (id: string): Channel | undefined => {
    for (const cat of server.categories) {
      const found = cat.channels.find(ch => ch.id === id);
      if (found) return found;
    }
    const orphan = orphanChannels.find(ch => ch.id === id);
    if (orphan) {
      return {
        id: orphan.id,
        name: orphan.name,
        type: (orphan.type || 'text') as ChannelType,
        description: orphan.description || undefined
      };
    }
    return undefined;
  };

  // Get all sortable IDs
  const categoryIds = server.categories.map(c => `category-${c.id}`);
  const allChannelIds = [...server.categories.flatMap(c => c.channels.map(ch => `channel-${ch.id}`)), ...orphanChannels.map(ch => `channel-${ch.id}`)];
  return <div className="w-60 bg-card flex flex-col border-r border-border">
      {/* Server Header - styled like User Panel */}
      <div className="h-14 px-2 flex items-center gap-2 bg-background/50 border-b border-border">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 flex-1 min-w-0 hover:bg-muted rounded-md p-1.5 transition-colors">
              
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold truncate">{server.name}</p>
                <p className="text-xs text-muted-foreground">{membersData?.length || 0} membres</p>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-80 p-0 overflow-hidden">
            {server.bannerUrl ? <img src={server.bannerUrl} className="h-24 w-full object-cover" alt="Server banner" /> : <div className="h-24 bg-gradient-to-r from-primary to-primary/50" />}
            
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                {server.iconUrl ? <img src={server.iconUrl} className="w-12 h-12 rounded-xl object-cover" alt="Server icon" /> : <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                    {server.name.charAt(0).toUpperCase()}
                  </div>}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-foreground truncate">{server.name}</h3>
                  {server.description && <p className="text-sm text-muted-foreground line-clamp-2">{server.description}</p>}
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Créé le {formatServerDate(server.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span>Fondateur: {ownerProfile?.user?.display_name || 'Inconnu'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{membersData?.length || 0} membres</span>
                </div>
              </div>
              
              {serverEmojis.length > 0 && <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Émojis ({serverEmojis.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {serverEmojis.slice(0, 10).map(emoji => <img key={emoji.id} src={emoji.image_url} alt={emoji.name} className="w-6 h-6 rounded" />)}
                    {serverEmojis.length > 10 && <span className="text-xs text-muted-foreground self-center ml-1">
                        +{serverEmojis.length - 10}
                      </span>}
                  </div>
                </div>}
            </div>
          </PopoverContent>
        </Popover>
        
        <button onClick={onOpenServerSettings} className="p-1.5 hover:bg-muted rounded-md transition-colors">
          <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
        </button>
      </div>

      {/* Channels with DnD */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
              {/* Orphan Channels - displayed BEFORE categories to allow insertion at top */}
              {orphanChannels.length > 0 && (
                <div className="px-2 space-y-0.5 mb-2">
                  <SortableContext items={orphanChannels.map(ch => `channel-${ch.id}`)} strategy={verticalListSortingStrategy}>
                    {orphanChannels.map(channel => (
                      <SortableChannel 
                        key={channel.id} 
                        channel={{
                          id: channel.id,
                          name: channel.name,
                          type: (channel.type || 'text') as ChannelType,
                          description: channel.description || undefined
                        }} 
                        serverId={server.id} 
                        isActive={activeChannelId === channel.id} 
                        isVoiceConnected={voiceState.channelId === channel.id} 
                        speakingUsers={speakingUsers} 
                        onChannelClick={() => handleChannelClick({
                          id: channel.id,
                          name: channel.name,
                          type: (channel.type || 'text') as ChannelType,
                          description: channel.description || undefined
                        })} 
                        onCopyLink={() => handleCopyLink(channel.id)} 
                        onMarkAsRead={() => handleMarkAsRead(channel.id)} 
                        onOpenSettings={() => setSelectedChannelId(channel.id)}
                        onCreateInvite={() => handleCreateInvite(channel.id)}
                        showDropIndicator={overId === `channel-${channel.id}`}
                      />
                    ))}
                  </SortableContext>
                </div>
              )}

              {/* Categories */}
              <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
                {server.categories.map(category => editingCategoryId === category.id ? <div key={category.id} className="px-2 py-1 mb-2">
                      <Input value={editingCategoryName} onChange={e => setEditingCategoryName(e.target.value)} onBlur={handleSaveCategory} onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveCategory();
                  if (e.key === 'Escape') handleCancelEditCategory();
                }} autoFocus className="h-6 text-xs font-semibold" />
                    </div> : <SortableCategory key={category.id} category={category} isCollapsed={collapsedCategories.includes(category.id)} onToggle={() => toggleCategory(category.id)} onEdit={() => handleStartEditCategory(category)} onCreateChannel={() => setCreateChannelForCategory({
                id: category.id,
                name: category.name
              })}>
                      <div className="mt-1 px-2 space-y-0.5">
                        <SortableContext items={category.channels.map(ch => `channel-${ch.id}`)} strategy={verticalListSortingStrategy}>
                          {category.channels.map(channel => <SortableChannel key={channel.id} channel={channel} serverId={server.id} isActive={activeChannelId === channel.id} isVoiceConnected={voiceState.channelId === channel.id} speakingUsers={speakingUsers} onChannelClick={() => handleChannelClick(channel)} onCopyLink={() => handleCopyLink(channel.id)} onMarkAsRead={() => handleMarkAsRead(channel.id)} onOpenSettings={() => setSelectedChannelId(channel.id)} onCreateInvite={() => handleCreateInvite(channel.id)} showDropIndicator={overId === `channel-${channel.id}`} />)}
                        </SortableContext>
                      </div>
                    </SortableCategory>)}
              </SortableContext>

              {/* Drag Overlay for visual feedback */}
              <DragOverlay>
                {activeId && (
                  <div className="bg-card border border-primary/50 rounded-md px-3 py-2 drag-overlay-item">
                    {activeId.startsWith('category-') && (
                      <span className="text-sm font-semibold text-foreground">
                        {server.categories.find(c => `category-${c.id}` === activeId)?.name}
                      </span>
                    )}
                    {activeId.startsWith('channel-') && (() => {
                      const channel = findChannelById(activeId.replace('channel-', ''));
                      const Icon = channel ? channelIcons[channel.type] : Hash;
                      return (
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span>{channel?.name || 'Channel'}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem onClick={() => setCreateChannelForCategory({
            id: null,
            name: 'Sans catégorie',
            showSelector: true
          })}>
            <Plus className="w-4 h-4 mr-2" />
            Créer un salon
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setShowCreateCategory(true)}>
            <FolderPlus className="w-4 h-4 mr-2" />
            Créer une catégorie
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Voice Controls */}
      {isConnected && voiceState.channelName && <VoiceControls channelName={voiceState.channelName} serverName={voiceState.serverName} isMuted={voiceState.isMuted} isDeafened={voiceState.isDeafened} onToggleMute={() => toggleMute()} onToggleDeafen={() => toggleDeafen()} onDisconnect={() => leaveChannel()} />}

      {/* User Panel */}
      <UserProfileCard 
        onOpenSettings={() => setShowAccountSettings(true)}
        onOpenProfile={() => setShowAccountSettings(true)}
        speakingUsers={speakingUsers}
      />

      {showAccountSettings && <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />}

      {selectedChannelId && <ChannelSettingsModal channelId={selectedChannelId} serverId={server.id} onClose={() => setSelectedChannelId(null)} />}

      {createChannelForCategory && <CreateChannelModal serverId={server.id} categoryId={createChannelForCategory.id} categoryName={createChannelForCategory.name} categories={createChannelForCategory.showSelector ? server.categories.map(c => ({ id: c.id, name: c.name })) : undefined} showCategorySelector={createChannelForCategory.showSelector} onClose={() => setCreateChannelForCategory(null)} />}

      {showCreateCategory && <CreateCategoryModal serverId={server.id} onClose={() => setShowCreateCategory(false)} />}

      {inviteChannelId && <CreateInviteModal serverId={server.id} channelName={getChannelName(inviteChannelId)} onClose={() => setInviteChannelId(null)} />}
    </div>;
}