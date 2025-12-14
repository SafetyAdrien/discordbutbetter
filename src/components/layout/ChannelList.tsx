import { cn } from '@/lib/utils';
import { ChevronDown, Settings, Plus, Pencil, Calendar, Users, FolderPlus, UserPlus, CheckCircle, Link, Bell, Trash2, MicOff, HeadphoneOff, AlertTriangle } from 'lucide-react';
import { StreamlineCrown } from '@/components/icons/StreamlineCrown';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
import { useChannels, useReorderCategories, useReorderChannels, useDeleteChannel, useDeleteCategory, ChannelType, OrphanChannel } from '@/hooks/useChannels';

// DnD Kit imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay, CollisionDetection, pointerWithin, rectIntersection } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


// Drop Indicator Component
function DropIndicator({
  isVisible
}: {
  isVisible: boolean;
}) {
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
  text: StreamlineHash,
  voice: StreamlineVoice,
  forum: StreamlineForum,
  announcement: StreamlineMegaphone,
  media: StreamlineMedia,
  calendar: StreamlineCalendar,
  tasks: StreamlineTasks
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
  onCreateChannel,
  onDelete
}: {
  category: Category;
  children: React.ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onCreateChannel: () => void;
  onDelete: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `category-${category.id}`,
    data: { type: 'category', categoryId: category.id }
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease, opacity 200ms ease',
    opacity: isDragging ? 0.4 : 1
  };
  return <>
    <div ref={setNodeRef} style={style} className={cn("mb-2", isDragging && "sortable-ghost")}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div {...attributes} {...listeners} className="flex items-center gap-1 px-2 py-1 w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group hover:cursor-grab">
            <button onClick={e => {
            e.stopPropagation();
            onToggle();
          }} className="flex items-center gap-px flex-1">
              <ChevronDown className={cn('w-3 h-3 transition-transform', isCollapsed && '-rotate-90')} />
              <span className="tracking-wide font-ginto text-sm text-[#9b9ca3] font-medium my-0 px-0 py-0 mx-0">{category.name}</span>
            </button>
            <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={e => {
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
          <ContextMenuItem 
            className="text-destructive focus:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer la catégorie
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {!isCollapsed && children}
    </div>

    {/* Delete Category Confirmation Dialog */}
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <form onSubmit={(e) => {
          e.preventDefault();
          onDelete();
          setShowDeleteConfirm(false);
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Supprimer la catégorie "{category.name}" ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-destructive">
                Cette action est immédiate et irréversible.
              </span>
              <br /><br />
              {category.channels.length > 0 ? (
                <>Les <strong>{category.channels.length} salon{category.channels.length > 1 ? 's' : ''}</strong> de cette catégorie deviendront des salons sans catégorie.</>
              ) : (
                <>Cette catégorie est vide.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Annuler</AlertDialogCancel>
            <AlertDialogAction 
              type="submit"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  </>;
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
  onDelete,
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
  onDelete: () => void;
  showDropIndicator?: boolean;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `channel-${channel.id}`,
    data: { type: 'channel', channelId: channel.id }
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'opacity 200ms ease' : 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms ease, background-color 200ms ease',
    opacity: isDragging ? 0.4 : 1
  };
  const Icon = channelIcons[channel.type];
  const isVoice = channel.type === 'voice';
  const {
    data: participants = []
  } = useVoiceParticipants(isVoice ? channel.id : null);
  return <>
      <DropIndicator isVisible={showDropIndicator} />
      <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn("hover:cursor-grab channel-transition", isDragging && "sortable-ghost")}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <button onClick={onChannelClick} className={cn('channel-item w-full group', isActive && !isVoice && 'active', isVoiceConnected && 'bg-[hsl(var(--online))]/10 border-l-2 border-[hsl(var(--online))]')}>
              <Icon className={cn('w-4 h-4 flex-shrink-0', isVoice && 'text-[hsl(var(--online))]')} />
            <span className="truncate flex-1 text-left font-ginto text-base text-[#9b9ca3] font-medium">{channel.name}</span>
            
              {channel.unreadCount && channel.unreadCount > 0 && <span className="px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                  {channel.unreadCount}
                </span>}

              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-[5px]">
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
            <ContextMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <form onSubmit={(e) => {
            e.preventDefault();
            onDelete();
            setShowDeleteConfirm(false);
          }}>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Supprimer #{channel.name} ?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span className="font-semibold text-destructive">Cette action est immédiate et irréversible.</span>
                <br /><br />
                Tous les messages, fichiers et webhooks de ce salon seront définitivement supprimés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Annuler</AlertDialogCancel>
              <AlertDialogAction 
                type="submit"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>;
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
  const deleteChannel = useDeleteChannel();
  const deleteCategory = useDeleteCategory();
  const {
    data: serverEmojis = []
  } = useServerEmojis(server.id);
  const {
    data: membersData
  } = useMembers(server.id);
  const ownerProfile = membersData?.find(m => m.id === server.ownerId);

  const handleDeleteChannel = async (channelId: string, channelName: string) => {
    try {
      await deleteChannel.mutateAsync({ channelId, serverId: server.id });
      toast({ title: `Salon #${channelName} supprimé` });
      
      // If deleted channel was active, clear selection
      if (activeChannelId === channelId) {
        // Find another channel to select
        const firstChannel = server.categories[0]?.channels[0] || orphanChannels[0];
        if (firstChannel) {
          onChannelSelect(firstChannel.id);
        }
      }
    } catch {
      toast({ title: 'Erreur lors de la suppression', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory.mutateAsync({ categoryId, serverId: server.id });
    } catch {
      // Error already handled by the hook
    }
  };

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
    // Toujours sélectionner le canal pour afficher son interface
    onChannelSelect(channel.id);
    
    // Pour les salons vocaux, également rejoindre le voice chat
    if (channel.type === 'voice') {
      joinChannel(channel.id, channel.name, server.name);
    }
  };
  const handleStartEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };
  const handleSaveCategory = () => {
    if (editingCategoryId && editingCategoryName.trim() && server?.id) {
      updateCategory.mutate({
        categoryId: editingCategoryId,
        serverId: server.id,
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

  // Custom collision detection that filters by dragged item type
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const { active } = args;
    const activeIdStr = active.id.toString();
    const isCategory = activeIdStr.startsWith('category-');
    
    // Use closestCenter as base detection
    const collisions = closestCenter(args);
    
    // Filter collisions to only allow same-type drops
    return collisions.filter(collision => {
      const collidedId = collision.id.toString();
      if (isCategory) {
        // Categories can only be dropped on other categories
        return collidedId.startsWith('category-');
      } else {
        // Channels can be dropped on channels OR on category headers (to add to category)
        return collidedId.startsWith('channel-') || collidedId.startsWith('category-');
      }
    });
  }, []);

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || over.id === active.id) {
      setOverId(null);
      return;
    }

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();
    
    // Strict type validation for drop indicator
    const isActiveCategory = activeIdStr.startsWith('category-');
    const isOverCategory = overIdStr.startsWith('category-');
    
    // Categories can only show indicator over other categories
    if (isActiveCategory && !isOverCategory) {
      setOverId(null);
      return;
    }
    
    setOverId(overIdStr);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    setOverId(null);
    const {
      active,
      over
    } = event;
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
          if (sourceCategoryId === targetCategoryId || sourceCategoryId === null && targetCategoryId === null) {
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
            const newOrder = [...filteredChannels.slice(0, overIdx + 1), activeChannel, ...filteredChannels.slice(overIdx + 1)];
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
          const existingIds = targetCategory.channels.filter(ch => ch.id !== activeChannelId).map(ch => ch.id);
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <StreamlineCrown size={16} className="text-yellow-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Propriétaire du serveur</p>
                    </TooltipContent>
                  </Tooltip>
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
            <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
              {/* Orphan Channels - displayed BEFORE categories to allow insertion at top */}
              {orphanChannels.length > 0 && <div className="px-2 space-y-0.5 mb-2">
                  <SortableContext items={orphanChannels.map(ch => `channel-${ch.id}`)} strategy={verticalListSortingStrategy}>
                    {orphanChannels.map(channel => <SortableChannel key={channel.id} channel={{
                  id: channel.id,
                  name: channel.name,
                  type: (channel.type || 'text') as ChannelType,
                  description: channel.description || undefined
                }} serverId={server.id} isActive={activeChannelId === channel.id} isVoiceConnected={voiceState.channelId === channel.id} speakingUsers={speakingUsers} onChannelClick={() => handleChannelClick({
                  id: channel.id,
                  name: channel.name,
                  type: (channel.type || 'text') as ChannelType,
                  description: channel.description || undefined
                })} onCopyLink={() => handleCopyLink(channel.id)} onMarkAsRead={() => handleMarkAsRead(channel.id)} onOpenSettings={() => setSelectedChannelId(channel.id)} onCreateInvite={() => handleCreateInvite(channel.id)} onDelete={() => handleDeleteChannel(channel.id, channel.name)} showDropIndicator={overId === `channel-${channel.id}`} />)}
                  </SortableContext>
                </div>}

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
              })} onDelete={() => handleDeleteCategory(category.id)}>
                      <div className="mt-1 px-2 space-y-0.5">
                        <SortableContext items={category.channels.map(ch => `channel-${ch.id}`)} strategy={verticalListSortingStrategy}>
                          {category.channels.map(channel => <SortableChannel key={channel.id} channel={channel} serverId={server.id} isActive={activeChannelId === channel.id} isVoiceConnected={voiceState.channelId === channel.id} speakingUsers={speakingUsers} onChannelClick={() => handleChannelClick(channel)} onCopyLink={() => handleCopyLink(channel.id)} onMarkAsRead={() => handleMarkAsRead(channel.id)} onOpenSettings={() => setSelectedChannelId(channel.id)} onCreateInvite={() => handleCreateInvite(channel.id)} onDelete={() => handleDeleteChannel(channel.id, channel.name)} showDropIndicator={overId === `channel-${channel.id}`} />)}
                        </SortableContext>
                      </div>
                    </SortableCategory>)}
              </SortableContext>

              {/* Drag Overlay for visual feedback */}
              <DragOverlay>
                {activeId && <div className="bg-card border border-border rounded-md px-3 py-2 drag-overlay-item">
                    {activeId.startsWith('category-') && <span className="text-sm font-semibold text-foreground">
                        {server.categories.find(c => `category-${c.id}` === activeId)?.name}
                      </span>}
                    {activeId.startsWith('channel-') && (() => {
                  const channel = findChannelById(activeId.replace('channel-', ''));
                  const Icon = channel ? channelIcons[channel.type] : StreamlineHash;
                  return <div className="flex items-center gap-2 text-sm text-foreground">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span>{channel?.name || 'Channel'}</span>
                        </div>;
                })()}
                  </div>}
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
      <UserProfileCard onOpenSettings={() => setShowAccountSettings(true)} onOpenProfile={() => setShowAccountSettings(true)} speakingUsers={speakingUsers} />

      {showAccountSettings && <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />}

      {selectedChannelId && <ChannelSettingsModal channelId={selectedChannelId} serverId={server.id} onClose={() => setSelectedChannelId(null)} />}

      {createChannelForCategory && <CreateChannelModal serverId={server.id} categoryId={createChannelForCategory.id} categoryName={createChannelForCategory.name} categories={createChannelForCategory.showSelector ? server.categories.map(c => ({
      id: c.id,
      name: c.name
    })) : undefined} showCategorySelector={createChannelForCategory.showSelector} onClose={() => setCreateChannelForCategory(null)} />}

      {showCreateCategory && <CreateCategoryModal serverId={server.id} onClose={() => setShowCreateCategory(false)} />}

      {inviteChannelId && <CreateInviteModal serverId={server.id} channelName={getChannelName(inviteChannelId)} onClose={() => setInviteChannelId(null)} />}
    </div>;
}