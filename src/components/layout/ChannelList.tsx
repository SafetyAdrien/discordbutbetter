import { cn } from "@/lib/utils";
import { uuidToSnowflake } from "@/lib/snowflake";
import {
  ChevronDown,
  Settings,
  Plus,
  Pencil,
  Calendar,
  Users,
  FolderPlus,
  UserPlus,
  CheckCircle,
  Link,
  Trash2,
  MicOff,
  HeadphoneOff,
  AlertTriangle,
  LogOut,
  Copy,
  Headphones,
  MessageSquare,
  Video as VideoIcon,
  Lock,
  Unlock,
  XCircle,
  CircleDot } from
"lucide-react";

import { ChannelNotificationMenu } from "@/components/channels/ChannelNotificationMenu";
import { StreamlineCrown } from "@/components/icons/StreamlineCrown";
import { StreamlineMegaphone } from "@/components/icons/StreamlineMegaphone";
import { StreamlineForum } from "@/components/icons/StreamlineForum";
import { StreamlineHash } from "@/components/icons/StreamlineHash";
import { StreamlineMedia } from "@/components/icons/StreamlineMedia";
import { StreamlineCalendar } from "@/components/icons/StreamlineCalendar";
import { StreamlineTasks } from "@/components/icons/StreamlineTasks";
import { StreamlineVoice } from "@/components/icons/StreamlineVoice";
import { StreamlineVoiceLocked } from "@/components/icons/StreamlineVoiceLocked";
import { StreamlineStage } from "@/components/icons/StreamlineStage";
import { StreamlineLink } from "@/components/icons/StreamlineLink";

import { useState, useCallback, useMemo, useRef, forwardRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger } from
"@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";
import { ChannelSettingsModal } from "@/components/channel-settings/ChannelSettingsModal";
import { EditCategoryModal } from "@/components/category-settings/EditCategoryModal";
import { AccountSettingsModal } from "@/components/account-settings/AccountSettingsModal";
import { CreateChannelModal } from "@/components/modals/CreateChannelModal";
import { DuplicateChannelModal } from "@/components/modals/DuplicateChannelModal";
import { CreateCategoryModal } from "@/components/modals/CreateCategoryModal";
import { ExternalLinkWarningModal } from "@/components/modals/ExternalLinkWarningModal";
import { CreateInviteModal } from "@/components/modals/CreateInviteModal";
import { VoiceControls } from "./VoiceControls";
import { UserProfileCard } from "@/components/profile/UserProfileCard";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import { useVoice, useVoiceParticipants } from "@/contexts/VoiceContext";
import { VoiceParticipantContextMenu } from "@/components/channels/voice/VoiceParticipantContextMenu";
import { UserProfilePopup } from "@/components/profile/UserProfilePopup";
import { User } from "@/types/app";
import { useUpdateCategory } from "@/hooks/useCategories";
import { useServerEmojis } from "@/hooks/useServerAssets";
import { useMembers } from "@/hooks/useMembers";
import {
  useChannels,
  useReorderCategories,
  useReorderChannels,
  useDeleteChannel,
  useDeleteCategory,
  useDuplicateChannel,
  ChannelType,
  OrphanChannel } from
"@/hooks/useChannels";
import { Thread } from "@/types/thread";
import { useDeleteThread, useCloseThread, useLockThread } from "@/hooks/useThreads";
import { useUnfollowThread } from "@/hooks/useThreadFollow";
import { useMarkThreadAsRead } from "@/hooks/useThreadUnreadCounts";
import { EditThreadModal } from "@/components/threads/EditThreadModal";

import { useChannelUnreadCounts } from "@/hooks/useChannelUnreadCounts";
import { useAllFollowedThreadsForServer } from "@/hooks/useFollowedThreads";
import { useCanAccessServerSettings, usePermissions } from "@/hooks/usePermissions";
import { useLeaveServer } from "@/hooks/useLeaveServer";
import { useServerChannelPermissions } from "@/hooks/useServerChannelPermissions";
import { useStageAudienceCount } from "@/hooks/useStageAudience";
import { Search } from "lucide-react";
// DnD Kit imports
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  CollisionDetection } from
"@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable } from
"@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useDndSensors } from "@/hooks/useDndSensors";
import React from "react";

// Discord-style Drop Indicator - Blue horizontal line with absolute positioning
const DropIndicator = React.forwardRef<
  HTMLDivElement,
  {
    isVisible: boolean;
    position: "before" | "after";
  }>(
  ({ isVisible, position }, ref) => {
    if (!isVisible) return null;
    return (
      <div
        ref={ref}
        className={cn(
          // Absolute positioning, full width with overflow for circles
          "absolute -left-2 -right-2 h-[2px] z-50 pointer-events-none",
          "bg-[#5865f2]",
          // Circles at endpoints using pseudo-elements
          "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:-translate-x-[3px]",
          "before:w-[8px] before:h-[8px] before:rounded-full before:bg-[#5865f2]",
          "after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2 after:translate-x-[3px]",
          "after:w-[8px] after:h-[8px] after:rounded-full after:bg-[#5865f2]",
          // Position based on 'before' or 'after'
          position === "before" ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2",
          // Smooth appearance animation
          "animate-fade-in"
        )} />);


  });
DropIndicator.displayName = "DropIndicator";
interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  unreadCount?: number;
  icon_url?: string | null;
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
  onOpenServerSettings?: (initialTab?: string) => void;
  orphanChannels?: OrphanChannel[];
  activeThreadId?: string | null;
  onThreadSelect?: (threadId: string) => void;
  onOpenVoiceChat?: (channelId: string) => void;
  onOpenGlobalSearch?: () => void;
}
interface ThreadWithUnread extends Thread {
  unreadCount?: number;
}
const channelIcons: Record<ChannelType, React.ElementType> = {
  text: StreamlineHash,
  voice: StreamlineVoice,
  forum: StreamlineForum,
  announcement: StreamlineMegaphone,
  media: StreamlineMedia,
  calendar: StreamlineCalendar,
  tasks: StreamlineTasks,
  stage: StreamlineStage,
  link: StreamlineLink
};
const channelTypeTooltips: Record<string, string> = {
  text: 'Salon textuel',
  voice: 'Salon vocal',
  forum: 'Forum',
  announcement: 'Annonces',
  media: 'Médias',
  calendar: 'Calendrier',
  tasks: 'Tâches',
  stage: 'Scène',
  link: 'Lien',
};
const statusColors = {
  online: "bg-[hsl(var(--online))]",
  idle: "bg-[hsl(var(--idle))]",
  dnd: "bg-[hsl(var(--dnd))]",
  offline: "bg-[hsl(var(--offline))]"
};
const statusLabels = {
  online: "En ligne",
  idle: "Inactif",
  dnd: "Ne pas déranger",
  offline: "Hors ligne"
};
function formatServerDate(dateString?: string): string {
  if (!dateString) return "Date inconnue";
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
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
  onDelete,
  showDropIndicator = false,
  dropPosition = "after",
  canManageChannels = false,
  serverId,
  showInsideHighlight = false












}: {category: Category;children: React.ReactNode;isCollapsed: boolean;onToggle: () => void;onEdit: () => void;onCreateChannel: () => void;onDelete: () => void;showDropIndicator?: boolean;dropPosition?: "before" | "after";canManageChannels?: boolean;serverId: string;showInsideHighlight?: boolean;}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `category-${category.id}`,
    data: {
      type: "category",
      categoryId: category.id
    }
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: undefined // Let Tailwind handle transitions
  };
  return (
    <>
      {/* En-tête de catégorie (zone draggable uniquement) */}
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative dnd-item",
          isDragging && "dnd-item-dragging"
        )}>

        {/* Inside highlight - shows when dragging a channel into this category's middle zone */}
        {showInsideHighlight && (
          <div className="absolute inset-0 bg-primary/10 rounded-md border border-primary/30 pointer-events-none z-[5]" />
        )}

        {/* Drop Indicator - Absolute positioned */}
        {showDropIndicator && !showInsideHighlight && <DropIndicator isVisible={true} position={dropPosition} />}

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              {...attributes}
              {...listeners}
              className="flex items-center gap-1.5 px-3 py-1.5 w-full text-xs font-semibold text-muted-foreground hover:text-foreground group cursor-default"
              style={{ transition: 'color 300ms cubic-bezier(0.2, 0, 0, 1)' }}>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="flex items-center gap-px flex-1">

                <ChevronDown className={cn("w-3 h-3", isCollapsed && "-rotate-90")}
                  style={{ transition: 'transform 300ms cubic-bezier(0.2, 0, 0, 1)' }} />
                <span className="tracking-wide font-ginto text-[14px] font-medium my-0 py-0 px-[2px] mx-[2px] text-muted-foreground">
                  {category.name}
                </span>
              </button>
              {canManageChannels &&
              <Plus
                className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateChannel();
                }} />

              }
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-52">
            <ContextMenuItem onClick={onCreateChannel}>
              <Plus className="w-4 h-4 mr-2" />
              Créer un salon
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ChannelNotificationMenu categoryId={category.id} serverId={serverId} />
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Modifier la catégorie
            </ContextMenuItem>
            <ContextMenuItem onClick={() => copyToClipboard(uuidToSnowflake(category.id), "ID de catégorie copié")}>
              <Copy className="w-4 h-4 mr-2" />
              Copier l'ID
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}>

              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer la catégorie
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* Salons enfants (en dehors de la zone draggable pour une meilleure détection de collision) */}
      {!isCollapsed && <div className="mb-2">{children}</div>}

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onDelete();
              setShowDeleteConfirm(false);
            }
          }}>

          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Supprimer la catégorie
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tu es sûr(e) de vouloir supprimer <strong>{category.name}</strong> ? Cette action est irréversible.
              {category.channels.length > 0 &&
              <>
                  <br />
                  <br />
                  Les {category.channels.length} salon{category.channels.length > 1 ? "s" : ""} de cette catégorie
                  deviendront des salons sans catégorie.
                </>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              autoFocus
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}>

              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>);

}

// Thread Context Menu List - renders threads with right-click context menu
interface ThreadContextMenuListProps {
  threads: ThreadWithUnread[];
  showArchivedThreads: boolean;
  activeThreadId?: string | null;
  onThreadSelect?: (threadId: string) => void;
  channelId: string;
  serverId: string;
  canManageChannels: boolean;
}

const ThreadContextMenuList: React.FC<ThreadContextMenuListProps> = ({
  threads,
  showArchivedThreads,
  activeThreadId,
  onThreadSelect,
  channelId,
  serverId,
  canManageChannels,
}) => {
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null);
  const [editThread, setEditThread] = useState<ThreadWithUnread | null>(null);
  const { user } = useAuth();
  const deleteThread = useDeleteThread();
  const closeThread = useCloseThread();
  const lockThread = useLockThread();
  const unfollowThread = useUnfollowThread();
  const markAsRead = useMarkThreadAsRead();

  const filteredThreads = threads.filter((thread) => showArchivedThreads || !thread.archived);

  return (
    <>
      <div className="mt-1">
        {filteredThreads.map((thread, index) => {
          const isLast = index === filteredThreads.length - 1;
          const isSingle = filteredThreads.length === 1;
          const canManage = canManageChannels || thread.created_by === user?.id;

          return (
            <div key={thread.id} className="flex items-stretch w-full px-2">
              <div className="flex-shrink-0 w-6 relative">
                <div
                  className="absolute left-[5px] top-0 border-l-2 border-muted-foreground/30"
                  style={{ height: isLast || isSingle ? '50%' : '100%' }}
                />
                <div className="absolute left-[5px] top-1/2 -translate-y-1/2 w-[14px] h-[12px] border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
              </div>
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onThreadSelect?.(thread.id);
                    }}
                    onContextMenu={(e) => e.stopPropagation()}
                    className={cn(
                      "flex items-center flex-1 py-1 rounded hover:bg-muted/50 transition-colors",
                      activeThreadId === thread.id && "bg-muted",
                      thread.archived && "opacity-50"
                    )}
                  >
                    <span className="truncate flex-1 text-left font-ginto text-[14px] text-muted-foreground hover:text-foreground ml-1">
                       {thread.name}
                       {thread.archived && " (archivé)"}
                     </span>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-52">
                  <ContextMenuItem
                    onClick={() => markAsRead.mutate({ threadId: thread.id, channelId })}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marquer comme lu
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => unfollowThread.mutate(thread.id)}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Quitter le fil
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  {canManage && (
                    <>
                      <ContextMenuItem onClick={() => closeThread.mutate({ threadId: thread.id, closed: !thread.closed })}>
                        {thread.closed ? <CircleDot className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                        {thread.closed ? "Rouvrir le fil" : "Fermer le fil"}
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => lockThread.mutate({ threadId: thread.id, locked: !thread.locked })}>
                        {thread.locked ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                        {thread.locked ? "Déverrouiller le fil" : "Verrouiller le fil"}
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => setEditThread(thread)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier le fil
                      </ContextMenuItem>
                    </>
                  )}
                  <ContextMenuItem
                    onClick={() => {
                      const link = `${window.location.origin}/channels/${channelId}/${thread.id}`;
                      copyToClipboard(link, "Lien du fil copié");
                    }}
                  >
                    <Link className="w-4 h-4 mr-2" />
                    Copier le lien
                  </ContextMenuItem>
                  {canManage && (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => setDeleteThreadId(thread.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer le fil
                      </ContextMenuItem>
                    </>
                  )}
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => copyToClipboard(uuidToSnowflake(thread.id), "Identifiant du fil copié")}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copier l'identifiant du fil
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>
          );
        })}
      </div>

      {/* Delete Thread Confirmation */}
      <AlertDialog open={!!deleteThreadId} onOpenChange={(open) => !open && setDeleteThreadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Supprimer le fil
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tu es sûr(e) de vouloir supprimer ce fil ? Cette action est irréversible et supprimera tous les messages associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteThreadId) {
                  deleteThread.mutate({ threadId: deleteThreadId, channelId });
                  setDeleteThreadId(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Thread Modal */}
      {editThread && (
        <EditThreadModal
          open={!!editThread}
          onOpenChange={(open) => !open && setEditThread(null)}
          thread={editThread}
          serverId={serverId}
        />
      )}
    </>
  );
};

interface SortableChannelProps {
  channel: Channel;
  serverId: string;
  isActive: boolean;
  isVoiceConnected: boolean;
  speakingUsers: Set<string>;
  hasUnread?: boolean;
  mentionCount?: number;
  onChannelClick: () => void;
  onCopyLink: () => void;
  onMarkAsRead: () => void;
  onOpenSettings: () => void;
  onCreateInvite: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  showDropIndicator?: boolean;
  dropPosition?: "before" | "after";
  threads?: ThreadWithUnread[];
  activeThreadId?: string | null;
  onThreadSelect?: (threadId: string) => void;
  showArchivedThreads?: boolean;
  canManageChannels?: boolean;
  isVoiceLocked?: boolean;
  onOpenChat?: () => void;
}
// Sortable Channel Component
const SortableChannel = forwardRef<HTMLDivElement, SortableChannelProps>(
  (
  {
    channel,
    serverId,
    isActive,
    isVoiceConnected,
    speakingUsers,
    hasUnread = false,
    mentionCount = 0,
    onChannelClick,
    onCopyLink,
    onMarkAsRead,
    onOpenSettings,
    onCreateInvite,
    onDelete,
    onDuplicate,
    showDropIndicator = false,
    dropPosition = "after",
    threads = [],
    activeThreadId,
    onThreadSelect,
    showArchivedThreads = false,
    canManageChannels = false,
    isVoiceLocked = false,
    onOpenChat
  },
  ref) =>
  {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: `channel-${channel.id}`,
      data: {
        type: "channel",
        channelId: channel.id
      }
    });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition: undefined // Let Tailwind handle transitions
    };
    const isVoice = channel.type === "voice";
    const isStage = channel.type === "stage";
    // Show lock icon for voice/stage channels when locked (permission denied)
    const DefaultIcon = (isVoice || isStage) && isVoiceLocked ? StreamlineVoiceLocked : channelIcons[channel.type];
    const { data: participants = [] } = useVoiceParticipants(isVoice ? channel.id : null);

    // Stage audience count with realtime
    const { data: stageData } = useStageAudienceCount(isStage ? channel.id : null);
    const hasActiveSession = stageData?.sessionId && stageData.count > 0;
    const isLiveStage = stageData?.isLive;
    return (
      <>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          className={cn(
            "relative hover:cursor-grab rounded-md dnd-item",
            isDragging && "dnd-item-dragging"
          )}>

          {/* Drop Indicator - Absolute positioned */}
          {showDropIndicator && <DropIndicator isVisible={true} position={dropPosition} />}

          <ContextMenu>
            <ContextMenuTrigger asChild>
              <button
                onClick={onChannelClick}
                className={cn(
                  "channel-item w-full group",
                  isActive && !isVoice && !isStage && "active",
                  isVoiceConnected && "bg-[hsl(var(--online))]/10 border-l-2 border-[hsl(var(--online))]",
                  // Stage active/live highlight
                  isStage && isActive && "bg-muted/80",
                  isStage && isLiveStage && "bg-[hsl(var(--online))]/10",
                  // Unread channel highlight (tinted background)
                  hasUnread && !isActive && "bg-muted/30"
                )}>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex-shrink-0 flex items-center justify-center">
                      {channel.icon_url && !isVoice && !isStage ? (
                        <img src={channel.icon_url} alt="" className="w-4 h-4 rounded-sm object-cover" />
                      ) : (
                        <DefaultIcon className={cn("w-4 h-4", (isStage && isLiveStage || isVoice && participants.length > 0) && "text-[hsl(var(--online))]")} />
                      )}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p>{channelTypeTooltips[channel.type] ?? 'Salon'}</p></TooltipContent>
                </Tooltip>
                <span
                  className={cn(
                    "truncate flex-1 text-left font-ginto text-[16px] font-medium",
                    // White text for unread channels, gray for read
                    hasUnread || isActive ? "text-foreground" : "text-[#9B9CA3]"
                  )}>

                  {channel.name}
                </span>

                {/* Mention badge - ONLY shows for mentions */}
                {mentionCount > 0 &&
                <span className="px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                    {mentionCount}
                  </span>
                }

                <div className="hidden group-hover:flex gap-[5px]">
                  {(isVoice || isStage) && onOpenChat &&
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <MessageSquare
                        className="w-4 h-4 text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChat();
                        }} />
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>Ouvrir le chat</p></TooltipContent>
                  </Tooltip>
                  }
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <UserPlus
                        className="w-4 h-4 text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateInvite();
                        }} />
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>Créer une invitation</p></TooltipContent>
                  </Tooltip>
                  {canManageChannels &&
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Settings
                        className="w-4 h-4 text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSettings();
                        }} />
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>Modifier le salon</p></TooltipContent>
                  </Tooltip>
                  }
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
              <ContextMenuItem onClick={() => copyToClipboard(uuidToSnowflake(channel.id), "ID du salon copié")}>
                <Copy className="w-4 h-4 mr-2" />
                Copier l'ID
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
              {canManageChannels &&
              <ContextMenuItem onClick={onDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Dupliquer le salon
                </ContextMenuItem>
              }
              <ChannelNotificationMenu channelId={channel.id} serverId={serverId} />
              <ContextMenuSeparator />
              <ContextMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}>

                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer le channel
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          {/* Voice Participants */}
          {isVoice && participants.length > 0 &&
          <VoiceParticipantsSidebar participants={participants} speakingUsers={speakingUsers} serverId={serverId} />
          }

          {/* Stage Audience Indicator */}
          {isStage && hasActiveSession &&
          <div className="ml-6 mt-1 px-2 py-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Headphones className="w-3.5 h-3.5" />
                <span>{stageData.count} en écoute</span>
                {isLiveStage &&
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-[hsl(var(--online))] text-white rounded">
                    LIVE
                  </span>
              }
              </div>
            </div>
          }
        </div>

        {/* Threads for text channels - OUTSIDE draggable div */}
        {(channel.type === "text" || channel.type === "announcement") && threads.length > 0 &&
        <ThreadContextMenuList
          threads={threads}
          showArchivedThreads={showArchivedThreads}
          activeThreadId={activeThreadId}
          onThreadSelect={onThreadSelect}
          channelId={channel.id}
          serverId={serverId}
          canManageChannels={canManageChannels}
        />
        }

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onDelete();
                setShowDeleteConfirm(false);
              }
            }}>

            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Supprimer le salon
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tu es sûr(e) de vouloir supprimer <strong>#{channel.name}</strong> ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                autoFocus
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}>

                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>);

  }
);
SortableChannel.displayName = "SortableChannel";
export function ChannelList({
  server,
  activeChannelId,
  onChannelSelect,
  onOpenServerSettings,
  orphanChannels = [],
  activeThreadId,
  onThreadSelect,
  onOpenVoiceChat,
  onOpenGlobalSearch
}: ChannelListProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [showArchivedThreads, setShowArchivedThreads] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<{id: string;name: string;channelCount: number;} | null>(
    null
  );
  const [createChannelForCategory, setCreateChannelForCategory] = useState<{
    id: string | null;
    name: string;
    showSelector?: boolean;
  } | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [inviteChannelId, setInviteChannelId] = useState<string | null>(null);
  const [externalLinkModal, setExternalLinkModal] = useState<{url: string;} | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after">("after");
  const [dropMode, setDropMode] = useState<"before" | "after" | "inside">("after");
  // Synchronous refs mirroring dropPosition/dropMode so handleDragEnd reads fresh values
  // (avoids stale closure when React batches setState between dragOver and dragEnd)
  const dropPositionRef = useRef<"before" | "after">("after");
  const dropModeRef = useRef<"before" | "after" | "inside">("after");
  const { profile, signOut, updateStatus } = useAuth();
  const { voiceState, joinChannel, leaveChannel, toggleMute, toggleDeafen, isConnected, speakingUsers } = useVoice();
  const updateCategory = useUpdateCategory();
  const reorderCategories = useReorderCategories();
  const reorderChannels = useReorderChannels();
  const deleteChannel = useDeleteChannel();
  const deleteCategory = useDeleteCategory();
  const duplicateChannel = useDuplicateChannel();
  const leaveServer = useLeaveServer();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const { data: serverEmojis = [] } = useServerEmojis(server.id);
  const { data: membersData } = useMembers(server.id);

  // Check if user can access server settings
  const canAccessSettings = useCanAccessServerSettings(server.id);

  // Check if user can manage channels
  const { hasPermission, isGod } = usePermissions(server.id);
  const canManageChannels = isGod || hasPermission("manage_channels") || hasPermission("administrator");

  // Check if user is the owner (cannot leave, must delete)
  const isOwner = profile?.id === server.ownerId;

  // BATCH: Get all channel permissions (view + connect) with a SINGLE RPC call
  // Replaces useChannelsVisibility + useVoiceChannelLocks (N+M calls → 1 call)
  const {
    isVisible,
    isLocked: isVoiceChannelLocked,
    isLoading: isPermsLoading
  } = useServerChannelPermissions(server.id);

  // Filter visible channels helper - during loading show all to avoid flash
  const shouldShowChannel = useCallback(
    (channelId: string) => {
      return isPermsLoading || isVisible(channelId);
    },
    [isPermsLoading, isVisible]
  );

  // Filter orphan channels by visibility
  const visibleOrphanChannels = useMemo(() => {
    return orphanChannels.filter((ch) => shouldShowChannel(ch.id));
  }, [orphanChannels, shouldShowChannel]);

  // Filter categories and their channels by visibility
  const visibleCategories = useMemo(() => {
    return server.categories.
    map((category) => ({
      ...category,
      channels: category.channels.filter((ch) => shouldShowChannel(ch.id))
    })).
    filter((category) => canManageChannels || category.channels.length > 0); // Show empty categories to admins only
  }, [server.categories, shouldShowChannel, canManageChannels]);

  // Fetch channel unread info (hasUnread + mentionCount)
  const { channelUnreadInfo } = useChannelUnreadCounts(server.id);

  // Get all text channel IDs for fetching threads
  const allTextChannelIds = useMemo(() => {
    const ids: string[] = [];
    const threadTypes = ["text", "announcement"];
    server.categories.forEach((cat) => {
      cat.channels.forEach((ch) => {
        if (threadTypes.includes(ch.type)) ids.push(ch.id);
      });
    });
    orphanChannels.forEach((ch) => {
      if (threadTypes.includes(ch.type)) ids.push(ch.id);
    });
    return ids;
  }, [server.categories, orphanChannels]);

  // Fetch ALL followed threads for the entire server
  const { data: allFollowedThreads = [] } = useAllFollowedThreadsForServer(server.id || undefined);

  // Group followed threads by channel_id
  const threadsByChannel = useMemo((): Record<string, ThreadWithUnread[]> => {
    const map: Record<string, ThreadWithUnread[]> = {};
    allFollowedThreads.forEach((thread) => {
      if (!map[thread.channel_id]) map[thread.channel_id] = [];
      map[thread.channel_id].push({ ...thread, unreadCount: 0 });
    });
    return map;
  }, [allFollowedThreads]);
  const ownerProfile = membersData?.find((m) => m.user.id === server.ownerId);
  const handleDeleteChannel = async (channelId: string, channelName: string) => {
    try {
      await deleteChannel.mutateAsync({
        channelId,
        serverId: server.id
      });
      toast.success(`Salon #${channelName} supprimé`);

      // If deleted channel was active, clear selection
      if (activeChannelId === channelId) {
        // Find another channel to select
        const firstChannel = server.categories[0]?.channels[0] || orphanChannels[0];
        if (firstChannel) {
          onChannelSelect(firstChannel.id);
        }
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };
  const [duplicateTarget, setDuplicateTarget] = useState<{ id: string; name: string } | null>(null);
  const handleDuplicateChannel = (channelId: string) => {
    const channel = findChannelById(channelId);
    setDuplicateTarget({ id: channelId, name: channel?.name ?? "" });
  };
  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory.mutateAsync({
        categoryId,
        serverId: server.id
      });
    } catch {







      // Error already handled by the hook
    }}; // DnD sensors - optimized with touch support
  const sensors = useDndSensors({ activationDistance: 8, touchDelay: 200 });const toggleCategory = (categoryId: string) => {setCollapsedCategories((prev) => prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]);
  };
  const handleSignOut = async () => {
    await signOut();
  };
  const handleLeaveServer = () => {
    leaveServer.mutate(server.id, {
      onSuccess: () => {
        setShowLeaveDialog(false);
      }
    });
  };
  const handleCopyLink = (channelId: string) => {
    const link = `${window.location.origin}/channels/${server.id}/${channelId}`;
    copyToClipboard(link, "Lien copié");
  };
  const handleMarkAsRead = (channelId: string) => {
    toast.success("Marqué comme lu");
  };
  const handleCreateInvite = (channelId: string) => {
    setInviteChannelId(channelId);
  };
  const getChannelName = (channelId: string): string => {
    for (const cat of server.categories) {
      const ch = cat.channels.find((c) => c.id === channelId);
      if (ch) return ch.name;
    }
    const orphan = orphanChannels.find((c) => c.id === channelId);
    return orphan?.name || "";
  };
  const handleChannelClick = async (channel: Channel) => {
    // Link channels open external link warning modal
    if (channel.type === "link") {
      const url = channel.description || '';
      if (url) setExternalLinkModal({ url });
      return;
    }

    const isVoice = channel.type === "voice";
    const isStage = channel.type === "stage";
    const isVoiceOrStage = isVoice || isStage;

    // Pour les salons vocaux verrouillés, bloquer le changement de canal
    if (isVoiceOrStage && isVoiceChannelLocked(channel.id)) {
      return; // Ne pas changer de canal, rester sur le dernier salon consulté
    }

    // Changer de canal uniquement si autorisé
    onChannelSelect(channel.id);

    // Rejoindre automatiquement UNIQUEMENT les salons Voice (pas Stage)
    if (isVoice && voiceState.channelId !== channel.id) {
      joinChannel(channel.id, channel.name, server.name);
    }
  };
  const handleStartEditCategory = (category: Category) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      channelCount: category.channels.length
    });
  };
  const handleDragStart = (event: DragStartEvent) => {
    dropPositionRef.current = "after";
    dropModeRef.current = "after";
    setActiveId(event.active.id as string);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
    dropPositionRef.current = "after";
    dropModeRef.current = "after";
    setDropPosition("after");
    setDropMode("after");
  };

  // Custom collision detection that filters by dragged item type
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const { active } = args;
    const activeIdStr = active.id.toString();
    const isCategory = activeIdStr.startsWith("category-");

    // Use closestCenter as base detection
    const collisions = closestCenter(args);

    // Filter collisions to only allow same-type drops
    return collisions.filter((collision) => {
      const collidedId = collision.id.toString();
      if (isCategory) {
        // Categories can only be dropped on other categories
        return collidedId.startsWith("category-");
      } else {
        // Channels can be dropped on channels OR on category headers (to add to category)
        return collidedId.startsWith("channel-") || collidedId.startsWith("category-");
      }
    });
  }, []);
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over, delta } = event;
    if (!over || over.id === active.id) {
      setOverId(null);
      dropModeRef.current = "after";
      setDropMode("after");
      return;
    }
    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    // Strict type validation for drop indicator
    const isActiveCategory = activeIdStr.startsWith("category-");
    const isOverCategory = overIdStr.startsWith("category-");

    // Categories can only show indicator over other categories
    if (isActiveCategory && !isOverCategory) {
      setOverId(null);
      return;
    }

    // Calculate cursor position relative to target element
    // Using the over element's rect to determine if cursor is in upper or lower half
    const overRect = over.rect;
    if (overRect) {
      // Get the current pointer position by calculating from initial + delta
      const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent | null;
      let clientY = 0;
      if (activatorEvent) {
        if ("clientY" in activatorEvent) {
          clientY = activatorEvent.clientY + delta.y;
        } else if ("touches" in activatorEvent && activatorEvent.touches[0]) {
          clientY = activatorEvent.touches[0].clientY + delta.y;
        }
      }

      const isActiveChannel = activeIdStr.startsWith("channel-");
      const isOverCategoryHeader = overIdStr.startsWith("category-");

      if (isActiveChannel && isOverCategoryHeader) {
        // 3-state zones for channel → category: top 15% = before, middle 70% = inside, bottom 15% = after
        const topZone = overRect.top + overRect.height * 0.15;
        const bottomZone = overRect.top + overRect.height * 0.85;
        if (clientY < topZone) {
          dropPositionRef.current = "before";
          dropModeRef.current = "before";
          setDropPosition("before");
          setDropMode("before");
        } else if (clientY > bottomZone) {
          dropPositionRef.current = "after";
          dropModeRef.current = "after";
          setDropPosition("after");
          setDropMode("after");
        } else {
          dropModeRef.current = "inside";
          dropPositionRef.current = "after"; // fallback, not used visually
          setDropMode("inside");
          setDropPosition("after");
        }
      } else {
        // Symmetric 50/50 zones for channels: works equally well dragging up or down
        const middleY = overRect.top + overRect.height * 0.5;
        const position: "before" | "after" = clientY < middleY ? "before" : "after";
        dropPositionRef.current = position;
        dropModeRef.current = position;
        setDropPosition(position);
        setDropMode(position);
      }
    }
    setOverId(overIdStr);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    // Snapshot ref values synchronously — handleDragOver writes them; state may be stale here
    const currentDropPosition = dropPositionRef.current;
    const currentDropMode = dropModeRef.current;
    setOverId(null);
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Handle category reordering with precise position
    if (activeIdStr.startsWith("category-") && overIdStr.startsWith("category-")) {
      const activeCatId = activeIdStr.replace("category-", "");
      const overCatId = overIdStr.replace("category-", "");
      const oldIndex = server.categories.findIndex((c) => c.id === activeCatId);
      const overIndex = server.categories.findIndex((c) => c.id === overCatId);
      if (oldIndex !== -1 && overIndex !== -1) {
        // Remove active category and insert at precise position based on dropPosition
        const activeCategory = server.categories[oldIndex];
        const newCategories = server.categories.filter((c) => c.id !== activeCatId);
        let insertIndex = currentDropPosition === "before" ? overIndex : overIndex + 1;
        // Adjust if we removed an element before the insertion point
        if (oldIndex < overIndex) {
          insertIndex--;
        }
        insertIndex = Math.max(0, Math.min(insertIndex, newCategories.length));
        newCategories.splice(insertIndex, 0, activeCategory);
        const orderedIds = newCategories.map((cat) => cat.id);
        requestAnimationFrame(() => {
          reorderCategories.mutate({
            serverId: server.id,
            orderedIds
          });
        });
      }
    }

    // Handle channel reordering (inter-category support)
    if (activeIdStr.startsWith("channel-")) {
      const activeChannelId = activeIdStr.replace("channel-", "");

      // Find source category (null for orphans)
      let sourceCategoryId: string | null = null;
      for (const cat of server.categories) {
        if (cat.channels.some((ch) => ch.id === activeChannelId)) {
          sourceCategoryId = cat.id;
          break;
        }
      }
      if (!sourceCategoryId && orphanChannels.some((ch) => ch.id === activeChannelId)) {
        sourceCategoryId = null;
      }

      // Dropping on another channel
      if (overIdStr.startsWith("channel-")) {
        const overChannelId = overIdStr.replace("channel-", "");

        // Find target category
        let targetCategoryId: string | null = null;
        let targetChannels: Channel[] = [];
        for (const cat of server.categories) {
          if (cat.channels.some((ch) => ch.id === overChannelId)) {
            targetCategoryId = cat.id;
            targetChannels = cat.channels;
            break;
          }
        }
        if (!targetCategoryId && orphanChannels.some((ch) => ch.id === overChannelId)) {
          targetCategoryId = null;
          targetChannels = orphanChannels.map((ch) => ({
            id: ch.id,
            name: ch.name,
            type: (ch.type || "text") as ChannelType,
            description: ch.description || undefined
          }));
        }

        // Calculate new order
        const activeChannel = [
        ...server.categories.flatMap((c) => c.channels),
        ...orphanChannels.map((ch) => ({
          id: ch.id,
          name: ch.name,
          type: (ch.type || "text") as ChannelType,
          description: ch.description || undefined
        }))].
        find((ch) => ch.id === activeChannelId);
        if (activeChannel) {
          // Same category: use precise insertion based on dropPosition
          if (sourceCategoryId === targetCategoryId || sourceCategoryId === null && targetCategoryId === null) {
            const oldIndex = targetChannels.findIndex((ch) => ch.id === activeChannelId);
            const overIndex = targetChannels.findIndex((ch) => ch.id === overChannelId);
            if (oldIndex !== -1 && overIndex !== -1) {
              // Remove the active channel from the array
              const newChannels = targetChannels.filter((ch) => ch.id !== activeChannelId);
              // Calculate insertion index based on dropPosition
              let insertIndex = currentDropPosition === "before" ? overIndex : overIndex + 1;
              // Adjust if we removed an element before the insertion point
              if (oldIndex < overIndex) {
                insertIndex--;
              }
              // Ensure valid index
              insertIndex = Math.max(0, Math.min(insertIndex, newChannels.length));
              // Insert at the precise position
              newChannels.splice(insertIndex, 0, activeChannel);
              reorderChannels.mutate({
                serverId: server.id,
                categoryId: targetCategoryId,
                orderedIds: newChannels.map((ch) => ch.id)
              });
            }
          } else {
            // Different category: move channel to new category at precise position based on dropPosition
            const filteredChannels = targetChannels.filter((ch) => ch.id !== activeChannelId);
            const overIdx = filteredChannels.findIndex((ch) => ch.id === overChannelId);
            // Calculate insertion index based on dropPosition
            const insertIdx = currentDropPosition === "before" ? overIdx : overIdx + 1;
            const newOrder = [
            ...filteredChannels.slice(0, insertIdx),
            activeChannel,
            ...filteredChannels.slice(insertIdx)];

            reorderChannels.mutate({
              serverId: server.id,
              categoryId: targetCategoryId,
              orderedIds: newOrder.map((ch) => ch.id)
            });
          }
        }
      }

      // Dropping on a category header
      else if (overIdStr.startsWith("category-")) {
        const targetCategoryId = overIdStr.replace("category-", "");
        const targetCategory = server.categories.find((c) => c.id === targetCategoryId);
        if (targetCategory) {
          const existingIds = targetCategory.channels.filter((ch) => ch.id !== activeChannelId).map((ch) => ch.id);
          
          if (currentDropMode === "inside" || currentDropMode === "after") {
            // "inside" or "after" category header → add at end of category
            reorderChannels.mutate({
              serverId: server.id,
              categoryId: targetCategoryId,
              orderedIds: [...existingIds, activeChannelId]
            });
          } else {
            // "before" → add at beginning of category
            reorderChannels.mutate({
              serverId: server.id,
              categoryId: targetCategoryId,
              orderedIds: [activeChannelId, ...existingIds]
            });
          }
        }
      }
    }
  };

  // Helper to find a channel by ID for the DragOverlay
  const findChannelById = (id: string): Channel | undefined => {
    for (const cat of server.categories) {
      const found = cat.channels.find((ch) => ch.id === id);
      if (found) return found;
    }
    const orphan = orphanChannels.find((ch) => ch.id === id);
    if (orphan) {
      return {
        id: orphan.id,
        name: orphan.name,
        type: (orphan.type || "text") as ChannelType,
        description: orphan.description || undefined
      };
    }
    return undefined;
  };

  // Get all sortable IDs (use visible categories for DnD)
  const categoryIds = visibleCategories.map((c) => `category-${c.id}`);
  const allChannelIds = [
  ...visibleCategories.flatMap((c) => c.channels.map((ch) => `channel-${ch.id}`)),
  ...visibleOrphanChannels.map((ch) => `channel-${ch.id}`)];

  // Banner visibility on scroll
  const [showBanner, setShowBanner] = useState(true);

  const handleChannelListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = (e.target as HTMLDivElement).scrollTop;
    setShowBanner(scrollTop === 0);
  }, []);

  // Sidebar resizing
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isHoveringResize, setIsHoveringResize] = useState(false);
  const isResizing = useRef(false);
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const delta = e.clientX - startX;
        const newWidth = Math.max(240, Math.min(340, startWidth + delta));
        setSidebarWidth(newWidth);
      };
      const handleMouseUp = () => {
        isResizing.current = false;
        setIsHoveringResize(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [sidebarWidth]
  );
  return (
    <div
      className={cn(
        "bg-surface-1 flex flex-col relative select-none",
        !isResizing.current && "transition-[width] duration-300 ease-out"
      )}
      style={{
        width: `${sidebarWidth}px`,
        minWidth: "240px",
        maxWidth: "340px"
      }}>

      {/* Resize handle - invisible, functional only */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 bg-transparent"
        onMouseEnter={() => setIsHoveringResize(true)}
        onMouseLeave={() => !isResizing.current && setIsHoveringResize(false)}
        onMouseDown={handleResizeMouseDown}
      />
      {/* Server Header - styled like User Panel */}
      <div className="bg-surface-1">
        <div className="flex items-center rounded-t-xl relative overflow-hidden"
        style={{ height: showBanner && server.bannerUrl ? '100px' : '56px' }}>

          {showBanner && server.bannerUrl &&
          <div className="absolute inset-0 z-0 overflow-hidden rounded-t-xl">
              <img src={server.bannerUrl} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          }
          {/* Server Name → Card Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center justify-start gap-2 flex-1 min-w-0 transition-colors relative z-10 h-full rounded-tl-xl",
                showBanner && server.bannerUrl ? "hover:bg-transparent" : "hover:bg-muted/30"
              )}>

                <div className={cn(
                  "flex-1 min-w-0 text-left relative z-10 px-4",
                  showBanner && server.bannerUrl ? "self-end pb-2" : ""
                )}>
                  <p className={cn(
                    "text-sm font-semibold truncate",
                    showBanner && server.bannerUrl && "[text-shadow:0_1px_6px_rgba(0,0,0,0.9),0_0px_2px_rgba(0,0,0,0.8)] text-white"
                  )}>{server.name}</p>
                  {!(showBanner && server.bannerUrl) &&
                  <p className="text-xs text-muted-foreground">{membersData?.length || 0} membres</p>
                  }
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-80 p-0 overflow-hidden rounded-xl">
              {/* Banner with Leave Button */}
              <div className="relative">
                {server.bannerUrl ?
                <img src={server.bannerUrl} className="h-24 w-full object-cover" alt="Server banner" /> :

                <div className="h-24 bg-gradient-to-r from-primary to-primary/50" />
                }

                {/* Leave Server Button - Only visible for non-owners */}
                {!isGod &&
                <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                      onClick={() => setShowLeaveDialog(true)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/20 hover:bg-destructive/90 text-white transition-colors">

                        <LogOut className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Quitter le serveur</p>
                    </TooltipContent>
                  </Tooltip>
                }
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {server.iconUrl ?
                  <img src={server.iconUrl} className="w-12 h-12 rounded-xl object-cover" alt="Server icon" /> :

                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                      {server.name.charAt(0).toUpperCase()}
                    </div>
                  }
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-foreground truncate">{server.name}</h3>
                    {server.description &&
                    <p className="text-sm text-muted-foreground line-clamp-2">{server.description}</p>
                    }
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
                    <span>Fondateur: {ownerProfile?.user?.username?.toLowerCase() || "Inconnu"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{membersData?.length || 0} membres</span>
                  </div>
                </div>

                {serverEmojis.length > 0 &&
                <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Émojis ({serverEmojis.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {serverEmojis.slice(0, 10).map((emoji) =>
                    <img key={emoji.id} src={emoji.url} alt={emoji.name} className="w-6 h-6 rounded" />
                    )}
                      {serverEmojis.length > 10 &&
                    <span className="text-xs text-muted-foreground self-center ml-1">
                          +{serverEmojis.length - 10}
                        </span>
                    }
                    </div>
                  </div>
                }
              </div>
            </PopoverContent>
          </Popover>

          {/* Action icons - right side of header */}
          <div className={cn(
            "flex items-center gap-1 pr-2 relative z-10",
            showBanner && server.bannerUrl ? "self-end pb-2" : ""
          )}>
            {canAccessSettings &&
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onOpenServerSettings?.()}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      showBanner && server.bannerUrl ?
                      "hover:bg-background/30 text-white" :
                      "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}>
                    <Settings className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Paramètres du serveur</p></TooltipContent>
              </Tooltip>
            }
          </div>
        </div>

        {/* Search bar + Invite */}
        <div className="px-2.5 py-2 flex items-center gap-1.5">
          <button
            onClick={() => onOpenGlobalSearch?.()}
            className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-full text-muted-foreground text-sm bg-surface-3"
            style={{ transition: 'all 300ms cubic-bezier(0.2, 0, 0, 1)' }}>
            <Search className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Rechercher</span>
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setInviteChannelId('server')}
                className="flex items-center justify-center h-[36px] w-[36px] rounded-full bg-surface-3 text-muted-foreground hover:text-foreground transition-colors">
                <UserPlus className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Créer une invitation</p></TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Separator */}
      <Separator className="bg-border/20" />

      {/* Channels with DnD */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex-1 overflow-y-auto scrollbar-thin py-2 px-1" onScroll={handleChannelListScroll}>
            <DndContext
              sensors={sensors}
              collisionDetection={customCollisionDetection}
              modifiers={[restrictToVerticalAxis]}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}>

              {/* Orphan Channels - displayed BEFORE categories to allow insertion at top */}
              {visibleOrphanChannels.length > 0 &&
              <div className="px-2 space-y-0.5 mb-2">
                  <SortableContext
                  items={visibleOrphanChannels.map((ch) => `channel-${ch.id}`)}
                  strategy={verticalListSortingStrategy}>

                    {visibleOrphanChannels.map((channel) =>
                  <SortableChannel
                    key={channel.id}
                    channel={{
                      id: channel.id,
                      name: channel.name,
                      type: (channel.type || "text") as ChannelType,
                      description: channel.description || undefined
                    }}
                    serverId={server.id}
                    isActive={activeChannelId === channel.id && !activeThreadId}
                    isVoiceConnected={voiceState.channelId === channel.id}
                    speakingUsers={speakingUsers}
                    hasUnread={channelUnreadInfo[channel.id]?.hasUnread}
                    mentionCount={channelUnreadInfo[channel.id]?.mentionCount || 0}
                    onChannelClick={() =>
                    handleChannelClick({
                      id: channel.id,
                      name: channel.name,
                      type: (channel.type || "text") as ChannelType,
                      description: channel.description || undefined
                    })
                    }
                    onCopyLink={() => handleCopyLink(channel.id)}
                    onMarkAsRead={() => handleMarkAsRead(channel.id)}
                    onOpenSettings={() => setSelectedChannelId(channel.id)}
                    onCreateInvite={() => handleCreateInvite(channel.id)}
                    onDelete={() => handleDeleteChannel(channel.id, channel.name)}
                    onDuplicate={() => handleDuplicateChannel(channel.id)}
                    showDropIndicator={overId === `channel-${channel.id}`}
                    dropPosition={dropPosition}
threads={threadsByChannel[channel.id] || []}
                    activeThreadId={activeThreadId}
                    onThreadSelect={onThreadSelect}
                    showArchivedThreads={showArchivedThreads}
                    canManageChannels={canManageChannels}
                    isVoiceLocked={
                    (channel.type === "voice" || channel.type === "stage") && isVoiceChannelLocked(channel.id)
                    }
                    onOpenChat={
                    channel.type === "voice" || channel.type === "stage" ?
                    () => onOpenVoiceChat?.(channel.id) :
                    undefined
                    } />

                  )}
                  </SortableContext>
                </div>
              }

              {/* Categories */}
              <SortableContext
                items={visibleCategories.map((c) => `category-${c.id}`)}
                strategy={verticalListSortingStrategy}>

                {visibleCategories.map((category, index) =>
                <div key={category.id} className={cn(index > 0 && "mt-4")}>
                    <SortableCategory
                    category={category}
                    isCollapsed={collapsedCategories.includes(category.id)}
                    onToggle={() => toggleCategory(category.id)}
                    onEdit={() => handleStartEditCategory(category)}
                    onCreateChannel={() =>
                    setCreateChannelForCategory({
                      id: category.id,
                      name: category.name
                    })
                    }
                    onDelete={() => handleDeleteCategory(category.id)}
                    showDropIndicator={overId === `category-${category.id}` && dropMode !== "inside"}
                    dropPosition={dropPosition}
                    canManageChannels={canManageChannels}
                    serverId={server.id}
                    showInsideHighlight={overId === `category-${category.id}` && dropMode === "inside"}>

                      <div className="mt-1 px-2 space-y-0.5">
                        <SortableContext
                        items={category.channels.map((ch) => `channel-${ch.id}`)}
                        strategy={verticalListSortingStrategy}>

                          {category.channels.map((channel) =>
                        <SortableChannel
                          key={channel.id}
                          channel={channel}
                          serverId={server.id}
                          isActive={activeChannelId === channel.id && !activeThreadId}
                          isVoiceConnected={voiceState.channelId === channel.id}
                          speakingUsers={speakingUsers}
                          hasUnread={channelUnreadInfo[channel.id]?.hasUnread}
                          mentionCount={channelUnreadInfo[channel.id]?.mentionCount || 0}
                          onChannelClick={() => handleChannelClick(channel)}
                          onCopyLink={() => handleCopyLink(channel.id)}
                          onMarkAsRead={() => handleMarkAsRead(channel.id)}
                          onOpenSettings={() => setSelectedChannelId(channel.id)}
                          onCreateInvite={() => handleCreateInvite(channel.id)}
                          onDelete={() => handleDeleteChannel(channel.id, channel.name)}
                          onDuplicate={() => handleDuplicateChannel(channel.id)}
                          showDropIndicator={overId === `channel-${channel.id}`}
                          dropPosition={dropPosition}
                          threads={threadsByChannel[channel.id] || []}
                          activeThreadId={activeThreadId}
                          onThreadSelect={onThreadSelect}
                          showArchivedThreads={showArchivedThreads}
                          canManageChannels={canManageChannels}
                          isVoiceLocked={
                          (channel.type === "voice" || channel.type === "stage") &&
                          isVoiceChannelLocked(channel.id)
                          }
                          onOpenChat={
                          channel.type === "voice" || channel.type === "stage" ?
                          () => onOpenVoiceChat?.(channel.id) :
                          undefined
                          } />

                        )}
                        </SortableContext>
                      </div>
                    </SortableCategory>
                  </div>
                )}
              </SortableContext>

              {/* Drag Overlay - Semi-transparent ghost following cursor */}
              <DragOverlay dropAnimation={null}>

                {activeId &&
                <div
                  className={cn(
                    // Optimized backdrop with GPU acceleration
                    "bg-card/95 backdrop-optimized border border-[#5865f2]/50 rounded-md px-3 py-2",
                    "gpu-accelerated will-change-transform",
                    "shadow-lg shadow-black/30",
                    "scale-105 cursor-grabbing"
                  )}>

                    {activeId.startsWith("category-") &&
                  <div className="flex items-center gap-2">
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground tracking-wide">
                          {server.categories.find((c) => `category-${c.id}` === activeId)?.name}
                        </span>
                      </div>
                  }
                    {activeId.startsWith("channel-") &&
                  (() => {
                    const channel = findChannelById(activeId.replace("channel-", ""));
                    const FallbackIcon = channel ? channelIcons[channel.type] : StreamlineHash;
                    return (
                      <div className="flex items-center gap-2 text-sm text-foreground">
                            <FallbackIcon className="w-4 h-4 text-[#5865f2]" />
                            <span className="font-medium">{channel?.name || "Channel"}</span>
                          </div>);

                  })()}
                  </div>
                }
              </DragOverlay>
            </DndContext>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuItem
            onClick={() =>
            setCreateChannelForCategory({
              id: null,
              name: "Sans catégorie",
              showSelector: true
            })
            }>

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
      {isConnected && voiceState.channelName &&
      <VoiceControls
        channelName={voiceState.channelName}
        serverName={voiceState.serverName}
        isMuted={voiceState.isMuted}
        isDeafened={voiceState.isDeafened}
        onToggleMute={() => toggleMute()}
        onToggleDeafen={() => toggleDeafen()}
        onDisconnect={() => leaveChannel()} />

      }

      {/* User Panel */}
      <UserProfileCard
        onOpenSettings={() => setShowAccountSettings(true)}
        onOpenProfile={() => setShowAccountSettings(true)}
        speakingUsers={speakingUsers} />


      {showAccountSettings && <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />}

      {selectedChannelId &&
      <ChannelSettingsModal
        channelId={selectedChannelId}
        serverId={server.id}
        onClose={() => setSelectedChannelId(null)} />

      }

      {createChannelForCategory &&
      <CreateChannelModal
        serverId={server.id}
        categoryId={createChannelForCategory.id}
        categoryName={createChannelForCategory.name}
        categories={
        createChannelForCategory.showSelector ?
        server.categories.map((c) => ({
          id: c.id,
          name: c.name
        })) :
        undefined
        }
        showCategorySelector={createChannelForCategory.showSelector}
        onClose={() => setCreateChannelForCategory(null)} />

      }

      {showCreateCategory && <CreateCategoryModal serverId={server.id} onClose={() => setShowCreateCategory(false)} />}

      <DuplicateChannelModal
        open={!!duplicateTarget}
        defaultName={duplicateTarget?.name ?? ""}
        isPending={false}
        onOpenChange={(open) => { if (!open) setDuplicateTarget(null); }}
        onConfirm={(name) => {
          if (!duplicateTarget) return;
          const target = duplicateTarget;
          setDuplicateTarget(null);
          duplicateChannel.mutate({ channelId: target.id, serverId: server.id, name });
        }}
      />

      {externalLinkModal &&
      <ExternalLinkWarningModal
        url={externalLinkModal.url}
        onClose={() => setExternalLinkModal(null)} />

      }

      {inviteChannelId &&
      <CreateInviteModal
        serverId={server.id}
        channelName={getChannelName(inviteChannelId)}
        onClose={() => setInviteChannelId(null)} />

      }

      {editingCategory &&
      <EditCategoryModal
        categoryId={editingCategory.id}
        categoryName={editingCategory.name}
        serverId={server.id}
        channelCount={editingCategory.channelCount}
        onClose={() => setEditingCategory(null)} />

      }

      {/* Leave Server Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le serveur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir quitter <strong>{server.name}</strong> ? Vous pourrez rejoindre à nouveau avec
              une invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveServer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">

              Quitter le serveur
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}

// Voice Participants sidebar sub-component with left-click profile popup & right-click context menu
function VoiceParticipantsSidebar({
  participants,
  speakingUsers,
  serverId,
}: {
  participants: Array<{
    id: string;
    user_id: string;
    muted: boolean;
    deafened: boolean;
    camera?: boolean;
    streaming?: boolean;
    profile: { id: string; username: string; display_name: string; avatar_url: string | null };
  }>;
  speakingUsers: Set<string>;
  serverId: string;
}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cardPosition, setCardPosition] = useState<{ top: number; right: number }>({ top: 100, right: 280 });

  const handleOpenProfile = (participant: typeof participants[0], e?: React.MouseEvent) => {
    const userObj: User = {
      id: participant.profile.id,
      username: participant.profile.username,
      displayName: participant.profile.display_name,
      avatar: participant.profile.avatar_url || undefined,
      status: 'online',
    };
    setSelectedUser(userObj);

    if (e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setCardPosition({
        top: Math.min(rect.top, window.innerHeight - 400),
        right: window.innerWidth - rect.right - 320,
      });
    }

    setProfileOpen(true);
  };

  return (
    <div className="ml-6 mt-1 space-y-0.5">
      {participants.map((participant) => {
        const isSpeaking = speakingUsers.has(participant.user_id);
        return (
          <VoiceParticipantContextMenu
            key={participant.id}
            participantUserId={participant.user_id}
            participantName={participant.profile.display_name}
            onViewProfile={() => handleOpenProfile(participant)}
          >
            <div
              className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={(e) => handleOpenProfile(participant, e)}
            >
              <Avatar
                className={cn(
                  "w-5 h-5 transition-all",
                  isSpeaking ? "ring-2 ring-[hsl(var(--voice-active))] voice-active-ring" : "ring-1 ring-border"
                )}
              >
                <AvatarImage src={participant.profile.avatar_url || undefined} />
                <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                  {participant.profile.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate flex-1 text-xs">{participant.profile.display_name}</span>
              {participant.camera && <VideoIcon className="w-3 h-3 text-muted-foreground" />}
              {participant.streaming && (
                <span className="px-1 py-0.5 text-[9px] font-bold leading-none bg-destructive text-destructive-foreground rounded">DIRECT</span>
              )}
              {participant.muted && <MicOff className="w-3 h-3 text-destructive" />}
              {participant.deafened && <HeadphoneOff className="w-3 h-3 text-destructive" />}
            </div>
          </VoiceParticipantContextMenu>
        );
      })}

      {/* Profile Popup */}
      <UserProfilePopup
        user={selectedUser}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        serverId={serverId}
        mode="card"
        cardPosition={cardPosition}
      />
    </div>
  );
}