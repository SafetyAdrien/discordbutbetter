import { ThreadContextMenuBody } from '@/components/threads/ThreadContextMenuBody';
import { DeleteThreadDialog } from '@/components/threads/DeleteThreadDialog';
import { ThreadSettingsPage } from '@/components/threads/ThreadSettingsPage';
import { cn } from "@/lib/utils";
import { useCategoryCasePreferences } from "@/hooks/useCategoryCasePreferences";
import { caseClass } from "@/lib/ui/categoryCase";
import { resolveCategoryDropTarget, pickCategoryDropTarget } from "@/lib/dnd/categoryDropTarget";
import { uuidToSnowflake } from "@/lib/snowflake";
import { useScrollAwareContextMenuGuard } from "@/hooks/useScrollAwareContextMenuGuard";
import { FolderPlus, AlertTriangle, Unlock, CircleDot, PlusCircle, CalendarPlus, Blocks, ShieldCheck } from "lucide-react";
import { ChevronDown, Settings, Plus, Pencil, Users, UserPlus, CheckCircle, Link, Trash2, MicOff, HeadphoneOff, LogOut, Copy, Headphones, MessageSquare, Video as VideoIcon, Lock, XCircle, Gem, TrendingUp, Eye, EyeOff, Bell, Check, Shield, Info, IdCard, ChevronRight } from "@/components/icons/discord/lucide";

import { ChannelNotificationMenu } from "@/components/channels/ChannelNotificationMenu";
import { StreamlineCrown } from "@/components/icons/StreamlineCrown";
import { StreamlineMegaphone } from "@/components/icons/StreamlineMegaphone";
import { StreamlineForum } from "@/components/icons/StreamlineForum";
import { StreamlineHash } from "@/components/icons/StreamlineHash";
import { StreamlineMedia } from "@/components/icons/StreamlineMedia";
import { StreamlineCalendar } from "@/components/icons/StreamlineCalendar";
import { StreamlineTasks } from "@/components/icons/StreamlineTasks";
import { StreamlineVoice } from "@/components/icons/StreamlineVoice";
import { ChannelSheetIcon } from "@/components/icons/ChannelSheetIcon";
import { requestOpenForumPost, closeForumPost, useOpenForumPost } from "@/lib/forum";
import { ForumChannelHoverCard } from "./ForumChannelHoverCard";
import { channelSheetIconName } from "@/lib/channelIcons";
import { usePrivateChannelIds } from "@/hooks/usePrivateChannelIds";
import { StreamlineStage } from "@/components/icons/StreamlineStage";
import { StreamlineLink } from "@/components/icons/StreamlineLink";

import { useState, useCallback, useMemo, useRef, useEffect, forwardRef, lazy, Suspense, memo, createContext, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchChannelMessages } from "@/hooks/useMessages";
import { fetchPinnedMessages } from "@/hooks/usePinnedMessages";
import { fetchChannelPolls } from "@/hooks/usePolls";
import { fetchChannelThreads } from "@/hooks/useThreads";
import { Spinner } from "@/components/ui/spinner";

const AccountSettingsModal = lazy(() =>
  import("@/components/account-settings/AccountSettingsModal").then((m) => ({ default: m.AccountSettingsModal }))
);
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MentionBadge } from "@/components/ui/MentionBadge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LazyServerProfileEditModal as ServerProfileEditModal } from "@/components/lazy/LazyModals";
import { Button } from "@/components/ui/button";
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
import { ServerHeaderBadge } from "./ServerHeaderBadge";
import { DiscordRules } from "@/components/icons/DiscordRules";
import { ServerNavItems } from "./ServerNavItems";
import { ServerSetupProgress } from "./ServerSetupProgress";
import { LazyEventsModal as EventsModal, LazyChannelSettingsModal as ChannelSettingsModal } from "@/components/lazy/LazyModals";
import { useServerEvents } from "@/hooks/useServerEvents";
import { useHiddenChannels, readShowAllChannels, writeShowAllChannels } from "@/hooks/useHiddenChannels";
import type { ServerView } from "@/components/server-views/ServerViews";
import { useServerSettings } from "@/hooks/useServerSettings";
import { EditCategoryModal } from "@/components/category-settings/EditCategoryModal";
import { CreateChannelModal } from "@/components/modals/CreateChannelModal";
import { DuplicateChannelModal } from "@/components/modals/DuplicateChannelModal";
import { CreateCategoryModal } from "@/components/modals/CreateCategoryModal";
import { ExternalLinkWarningModal } from "@/components/modals/ExternalLinkWarningModal";
import { CreateInviteModal } from "@/components/modals/CreateInviteModal";
import { VoiceStatusModal } from "@/components/channels/voice/VoiceStatusModal";
import { useVoiceChannelStatuses, useSetVoiceChannelStatus } from "@/hooks/useVoiceChannelStatus";
import { OPEN_VOICE_INVITE_EVENT, OPEN_VOICE_STATUS_EVENT } from "@/lib/invites";
import { VoiceControls } from "./VoiceControls";

import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";
import { useVoice, useVoiceParticipants, useVoiceLevels } from "@/contexts/VoiceContext";
import { VoiceParticipantContextMenu } from "@/components/channels/voice/VoiceParticipantContextMenu";
import { UserProfilePopup } from "@/components/profile/UserProfilePopup";
import { User } from "@/types/app";
import { useUpdateCategory } from "@/hooks/useCategories";
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
// DnD Kit imports
import {
  DndContext,
  closestCenter,
  pointerWithin,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  CollisionDetection,
  useDroppable } from
"@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable } from
"@dnd-kit/sortable";
import React from "react";

// Discord-style Drop Indicator - Blue horizontal line with 80ms fade
const DropIndicator = React.forwardRef<
  HTMLDivElement,
  {
    isVisible: boolean;
    position: "before" | "after";
    variant?: "channel" | "category";
  }>(
  ({ isVisible, position, variant = "channel" }, ref) => {
    const isCategory = variant === "category";
    return (
      <div
        ref={ref}
        data-visible={isVisible ? "true" : "false"}
        className={cn(
          "dnd-drop-indicator-line absolute z-50 pointer-events-none",
          // Barre verte de 3px sur toute la largeur de la rangee (video de reference), sans pastilles.
          "-left-1 -right-1 h-[3px] rounded-full bg-[hsl(var(--dnd-line))]",
          position === "before" ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2"
        )} />);
  });
DropIndicator.displayName = "DropIndicator";

const TOP_ORPHAN_DROP_ID = "channel-list-top-orphan-drop";

function TopOrphanDropTarget({
  activeId,
  overId
}: { activeId: string | null; overId: string | null }) {
  const isChannelDrag = activeId?.startsWith("channel-") ?? false;
  const { setNodeRef } = useDroppable({
    id: TOP_ORPHAN_DROP_ID,
    disabled: !isChannelDrag
  });

  return (
    <div
      ref={setNodeRef}
      data-dnd-type="orphan-top"
      className={cn(
        "absolute left-3 right-3 top-2 z-40 overflow-visible",
        isChannelDrag ? "h-8 pointer-events-auto" : "hidden pointer-events-none"
      )}>
      <DropIndicator isVisible={isChannelDrag && overId === TOP_ORPHAN_DROP_ID} position="before" variant="channel" />
    </div>
  );
}

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
  icon?: string | null;
  channels: Channel[];
}
interface Server {
  id: string;
  name: string;
  ownerId: string;
  secondaryOwnerId?: string;
  categories: Category[];
  iconUrl?: string;
  bannerUrl?: string;
  description?: string;
  createdAt?: string;
  /** Mode Decouverte : tout le monde peut rejoindre. */
  isPublic?: boolean;
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
  activeServerView?: ServerView | null;
  onOpenServerView?: (view: ServerView) => void;
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
const EMPTY_ID_SET: ReadonlySet<string> = new Set();
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
  showInsideHighlight = false,
  isBeingDragged = false












}: {category: Category;children: React.ReactNode;isCollapsed: boolean;onToggle: () => void;onEdit: () => void;onCreateChannel: () => void;onDelete: () => void;showDropIndicator?: boolean;dropPosition?: "before" | "after";canManageChannels?: boolean;serverId: string;showInsideHighlight?: boolean;isBeingDragged?: boolean;}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { prefs: casePrefs } = useCategoryCasePreferences();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: `category-${category.id}`,
    data: {
      type: "category",
      categoryId: category.id
    },
    transition: null,
    disabled: !canManageChannels
  });
  const style = {
    // Pas de deplacement : l'element glisse reste en place (emplacement grise), seule la barre verte bouge.
    transform: undefined as string | undefined,
    transition: 'none'
  };
  return (
    <>
      {/* En-tête de catégorie (zone sortable uniquement, hauteur fixe pour fiabiliser le drop) */}
      <div
        ref={setNodeRef}
        style={style}
        data-dnd-type="category"
        data-category-id={category.id}
        className={cn(
          "relative dnd-item",
          isDragging && "dnd-item-dragging"
        )}>

        {/* Inside highlight - shows when dragging a channel into this category's middle zone */}
        {showInsideHighlight && (
          <div className="absolute inset-0 bg-primary/10 rounded-md border border-primary/30 pointer-events-none z-[5]" />
        )}

        {/* Drop Indicator - Absolute positioned */}
        {!showInsideHighlight && <DropIndicator isVisible={showDropIndicator} position={dropPosition} variant="category" />}

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              {...attributes}
              {...listeners}
              /* Categorie de la capture : 16px au-dessus, libelle de 24px
                 aligne sur les icones des salons (16px du bord), emoji, nom
                 en casse normale 14px, petit chevron APRES le nom, et "+" a
                 droite. */
                className="flex items-center h-[22px] mt-[18px] pl-4 pr-4 w-full text-muted-foreground hover:text-[hsl(var(--interactive-text-hover))] group cursor-default">

              <button type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="flex items-center gap-1 flex-1 min-w-0">

                {category.icon && <span className="text-base leading-none shrink-0">{category.icon}</span>}
                <span translate="no" className={cn("font-ginto text-[14px] font-medium truncate", caseClass('channelCategories', casePrefs))}>
                  {category.name}
                </span>
                <ChevronDown className={cn("w-3 h-3 shrink-0 transition-transform duration-200", isCollapsed && "-rotate-90")} />
              </button>
              {canManageChannels &&
              <Plus
                className="w-[13px] h-[13px] shrink-0 cursor-pointer hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateChannel();
                }} />

              }
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-52">
            {canManageChannels && (
              <>
                <ContextMenuItem onClick={onCreateChannel}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un salon
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            <ChannelNotificationMenu categoryId={category.id} serverId={serverId} />
            {canManageChannels && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onEdit}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Modifier la catégorie
                </ContextMenuItem>
              </>
            )}
            <ContextMenuItem onClick={() => copyToClipboard(uuidToSnowflake(category.id), "ID de catégorie copié")}>
              <ChannelSheetIcon name="id" className="w-4 h-4 mr-2" />
              Copier l'ID
            </ContextMenuItem>
            {canManageChannels && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}>

                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer la catégorie
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* Salons enfants en dehors de la zone sortable: la catégorie reste un en-tête fin (rect réduit),
          ce qui empêche la catégorie active d'absorber le pointeur pendant un drag. */}
      {!isCollapsed && <div className={cn(isBeingDragged && 'opacity-40')}>{children}</div>}


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
              Tu es sûr(e) de vouloir supprimer <strong translate="no">{category.name}</strong> ? Cette action est irréversible.
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
  channelName?: string;
  serverId: string;
  canManageChannels: boolean;
}

const ThreadContextMenuList: React.FC<ThreadContextMenuListProps> = ({
  threads,
  showArchivedThreads,
  activeThreadId,
  onThreadSelect,
  channelId,
  channelName,
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

  // Un fil inactif depuis plus que sa duree de masquage ("Masquer apres une periode d'inactivite") quitte la liste,
  // sauf s'il est ouvert ; il reste accessible dans "anciens fils" de la liste des fils.
  const nowMs = Date.now();
  const filteredThreads = threads.filter((thread) => {
    if (thread.id === activeThreadId) return true;
    if (!showArchivedThreads && thread.archived) return false;
    const last = new Date(thread.last_message_at || thread.created_at).getTime();
    return showArchivedThreads || nowMs - last <= (thread.auto_archive_minutes ?? 4320) * 60_000;
  });

  return (
    <>
      <div className="mt-0.5">
        {filteredThreads.map((thread, index) => {
          const isLast = index === filteredThreads.length - 1;
          const isSingle = filteredThreads.length === 1;
          // NOTE: `manage_channels` est utilisé volontairement comme proxy de modération des fils.
          // La RLS sur `threads` (UPDATE/DELETE) accepte aussi `manage_channels` plutôt que `manage_threads`
          // — confirmé en Phase 1. Garder ce comportement aligné backend ↔ UI.
          const canManage = canManageChannels || thread.created_by === user?.id;


          return (
            // Ligne de fil (video / capture de reference) : meme marge que les salons (mx-2), connecteur
            // au centre de l'icone du salon (16px) qui s'arrondit vers la ligne, ligne decalee de 26px,
            // meme hauteur (32px) et meme police que les salons.
            <div key={thread.id} className="relative mx-2 flex items-stretch h-8">
              {/* Epine (reference) : trait opaque de 2px sous le centre de l'icone du salon, qui remonte
                  jusqu'a la ligne du dessus, puis s'arrondit (rayon 8) vers le nom du fil. */}
              <div className="absolute left-[17px] w-[10px] pointer-events-none" style={{ top: index === 0 ? -2 : 0, bottom: 0 }}>
                {!(isLast || isSingle) && <div className="absolute inset-y-0 left-0 border-l-2 border-[#4e5058]" />}
                <div
                  className="absolute left-0 w-[10px] border-l-2 border-b-2 border-[#4e5058] rounded-bl-[8px]"
                  style={{ top: 0, height: index === 0 ? 18 : 16 }}
                />
              </div>
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <button type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onThreadSelect?.(thread.id);
                    }}
                    onContextMenu={(e) => e.stopPropagation()}
                    className={cn(
                      "ml-[26px] flex items-center flex-1 min-w-0 h-8 px-2 rounded-lg text-base font-medium transition-colors",
                      activeThreadId === thread.id
                        ? "bg-[hsl(var(--interactive-background-selected))] text-white"
                        : "text-[hsl(var(--interactive-icon-default))] hover:bg-[hsl(var(--interactive-background-hover))] hover:text-[hsl(var(--interactive-text-hover))]",
                      thread.archived && "opacity-50"
                    )}
                  >
                    <span className="truncate flex-1 text-left">
                       {thread.name}
                       {thread.archived && " (archivé)"}
                     </span>
                  </button>
                </ContextMenuTrigger>
                <ThreadContextMenuBody thread={thread} channelId={channelId} canManage={canManage} onEdit={() => setEditThread(thread)} onDelete={() => setDeleteThreadId(thread.id)} />
              </ContextMenu>
            </div>
          );
        })}
      </div>

      <DeleteThreadDialog
        open={!!deleteThreadId}
        onOpenChange={(open) => !open && setDeleteThreadId(null)}
        name={threads.find((t) => t.id === deleteThreadId)?.name ?? ''}
        onConfirm={() => { if (deleteThreadId) deleteThread.mutate({ threadId: deleteThreadId, channelId }); setDeleteThreadId(null); }}
      />

      {editThread && (
        <ThreadSettingsPage
          thread={editThread}
          channelName={channelName ?? ''}
          onClose={() => setEditThread(null)}
          onDelete={() => deleteThread.mutate({ threadId: editThread.id, channelId })}
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
  onChannelHover?: () => void;
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
  canCreateInvite?: boolean;
  isVoiceLocked?: boolean;
  /** @everyone ne voit pas ce salon : icone verrouillee. */
  isPrivate?: boolean;
  onOpenChat?: () => void;
  /** Statut du salon vocal (texte libre, emoji compris). */
  voiceStatus?: string;
  onEditVoiceStatus?: () => void;
  onInviteVoice?: () => void;
}
// Debut de la connexion vocale, par salon (compteur vert de la liste des salons).
const voiceSince: Record<string, number> = {};
function VoiceTimer({ channelId }: { channelId: string }) {
  voiceSince[channelId] ??= Date.now();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => { clearInterval(t); delete voiceSince[channelId]; };
  }, [channelId]);
  const sec = Math.max(0, Math.floor((Date.now() - voiceSince[channelId]) / 1000));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), r = sec % 60;
  return <span className="ml-auto text-xs tabular-nums text-[hsl(var(--online))] group-hover:hidden">{h ? `${h}:${String(m).padStart(2, '0')}` : m}:{String(r).padStart(2, '0')}</span>;
}

// Sortable Channel Component
/* Lignes du menu du nom du serveur : 36px, icone 18px a gauche. */
// Video de reference : pas de 36px (35px + 1px), icone 20px, 8px d'ecart, texte 15px.
/** Plage de la glissiere de largeur de la liste de salons (video de reference, zoom 131 %). */
const SIDEBAR_MIN = 186;
const SIDEBAR_MAX = 432;

const serverMenuItemCls = "h-auto min-h-[35px] mb-px gap-2 px-2 py-[7px] text-[15px] leading-5 font-normal rounded-[4px] whitespace-nowrap [&_svg]:w-5 [&_svg]:h-5 focus:bg-white/[0.07]";

function MenuCheckbox({ checked }: { checked: boolean }) {
  return (
    <span className={cn("ml-auto w-5 h-5 rounded-[4px] border-2 flex items-center justify-center", checked ? "bg-primary border-primary" : "border-[hsl(var(--header-icon))]")}>
      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </span>
  );
}

/** Salon de regles de la communaute : icone dediee dans la liste. */
const RulesChannelContext = createContext<string | null>(null);

const SortableChannel = forwardRef<HTMLDivElement, SortableChannelProps>(
  (
  {
    channel,
    serverId,
    isActive: isActiveProp,
    isVoiceConnected,
    speakingUsers,
    hasUnread = false,
    mentionCount = 0,
    onChannelClick,
    onChannelHover,
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
    canCreateInvite = false,
    isVoiceLocked = false,
    isPrivate = false,
    onOpenChat,
    voiceStatus,
    onEditVoiceStatus,
    onInviteVoice
  },
  ref) =>
  {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: `channel-${channel.id}`,
      data: {
        type: "channel",
        channelId: channel.id
      },
      disabled: !canManageChannels
    });
    const style = {
      transform: undefined as string | undefined,
      transition: undefined // Let Tailwind handle transitions
    };
    const isVoice = channel.type === "voice";
    const isStage = channel.type === "stage";
    const isForumLike = channel.type === "forum" || channel.type === "media";
    // Post de ce salon ouvert en pleine fenetre : le post est surligne a la place du salon.
    const openForumPost = useOpenForumPost();
    const postFullscreen = isForumLike && openForumPost.channelId === channel.id && openForumPost.fullscreen;
    const isActive = isActiveProp && !postFullscreen;
    // Show lock icon for voice/stage channels when locked (permission denied)
    const isRulesChannel = useContext(RulesChannelContext) === channel.id;
    const { data: participants = [] } = useVoiceParticipants(isVoice ? channel.id : null);

    // Stage audience count with realtime
    const { data: stageData } = useStageAudienceCount(isStage ? channel.id : null);
    const hasActiveSession = stageData?.sessionId && stageData.count > 0;
    const isLiveStage = stageData?.isLive;
    // Planche des types de salon : variante verrouillee (salon prive ou
    // vocal inaccessible) et active (vocal occupe, conference en direct).
    const sheetIcon = channelSheetIconName(channel.type, {
      locked: isVoiceLocked || isPrivate,
      active: (isVoice && participants.length > 0) || (isStage && !!isLiveStage),
    });
    const DefaultIcon = isRulesChannel ? DiscordRules : channelIcons[channel.type];
    // Salon Forum / Multimedia : la carte "Plus de posts actifs" apparait au survol.
    const wrapHover = (node: React.ReactElement) =>
      channel.type === 'forum' || channel.type === 'media' ? (
        <ForumChannelHoverCard channelId={channel.id} type={channel.type} onOpenChannel={onChannelClick}>{node}</ForumChannelHoverCard>
      ) : (
        node
      );
    return (
      <>
        {wrapHover(
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
          <DropIndicator isVisible={showDropIndicator} position={dropPosition} variant="channel" />

          <ContextMenu>
            <ContextMenuTrigger asChild>
              <button type="button"
                onClick={() => { if (postFullscreen) closeForumPost(channel.id); onChannelClick(); }}
                onMouseEnter={onChannelHover}
                className={cn(
                  // Inset de 8px de Discord. Un <button> ne s'etire pas tout
                  // seul : la largeur doit compenser explicitement la marge.
                  "channel-item group mx-2 w-[calc(100%-16px)]",
                  isActive && !isVoice && !isStage && "active",
                  // Salon vocal connecte (video de reference) : bloc "selectionne" qui englobe aussi
                  // la ligne de statut ; plus de filet vert ni de teinte verte.
                  isVoiceConnected && "bg-[hsl(var(--interactive-background-selected))] !text-white font-semibold",
                  isVoice && (voiceStatus || isVoiceConnected) && "rounded-b-none",
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
                        <img src={channel.icon_url} alt="" className="w-5 h-5 rounded-sm object-contain" />
                      ) : (
                        sheetIcon && !isRulesChannel ? (
                          <ChannelSheetIcon name={sheetIcon} className={cn("w-5 h-5", (isStage && isLiveStage || isVoice && participants.length > 0) && "text-[hsl(var(--online))]")} />
                        ) : (
                          <DefaultIcon className={cn("w-5 h-5", (isStage && isLiveStage || isVoice && participants.length > 0) && "text-[hsl(var(--online))]")} />
                        )
                      )}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p>{channelTypeTooltips[channel.type] ?? 'Salon'}</p></TooltipContent>
                </Tooltip>
                <span translate="no"
                  className={cn(
                    "truncate flex-1 text-left font-ginto text-[16px] font-medium",
                    // White text for unread channels, gray for read
                    hasUnread || isActive ? "text-white" : "text-[hsl(var(--interactive-text-default))] group-hover:text-[hsl(var(--interactive-text-hover))]"
                  )}>

                  {channel.name}
                </span>

                {/* Mention badge - ONLY shows for mentions */}
                <MentionBadge count={mentionCount} size="sm" />

                {isVoice && isVoiceConnected && <VoiceTimer channelId={channel.id} />}
                <div className="flex gap-[5px] max-w-0 overflow-hidden opacity-0 group-hover:max-w-[80px] group-hover:overflow-visible group-hover:opacity-100">
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
                        className="w-5 h-5 text-muted-foreground"
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
                        className="w-[18px] h-[18px] text-muted-foreground"
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
                <ChannelSheetIcon name="id" className="w-4 h-4 mr-2" />
                Copier l'ID
              </ContextMenuItem>
              {canCreateInvite && (
                <ContextMenuItem onClick={onCreateInvite}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Créer une invitation
                </ContextMenuItem>
              )}
              {canManageChannels && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={onOpenSettings}>
                    <Settings className="w-4 h-4 mr-2" />
                    Modifier le channel
                  </ContextMenuItem>
                  <ContextMenuItem onClick={onDuplicate}>
                    <Copy className="w-4 h-4 mr-2" />
                    Dupliquer le salon
                  </ContextMenuItem>
                </>
              )}
              <ChannelNotificationMenu channelId={channel.id} serverId={serverId} />
              {canManageChannels && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}>

                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer le channel
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>

          {/* Voice Participants */}
          {isVoice && (voiceStatus || isVoiceConnected) && (
            <div className={cn("mx-2 pl-[34px] pr-2 pb-1.5 -mt-px mb-0.5 flex items-center min-h-[22px] rounded-b-lg", isVoiceConnected && "bg-[hsl(var(--interactive-background-selected))]")}>
              <button
                type="button"
                disabled={!isVoiceConnected}
                onClick={onEditVoiceStatus}
                className={cn('max-w-full truncate text-xs leading-[18px] text-left text-muted-foreground flex items-center gap-1', isVoiceConnected ? 'hover:text-foreground cursor-pointer' : 'cursor-default')}
              >
                <span className="truncate">{voiceStatus || 'Définir un statut de salon'}</span>
                {isVoiceConnected && <Pencil className="w-3 h-3 shrink-0" />}
              </button>
            </div>
          )}
          {isVoice && (participants.length > 0 || isVoiceConnected) &&
          <VoiceParticipantsSidebar participants={participants} speakingUsers={speakingUsers} serverId={serverId} onInvite={isVoiceConnected ? onInviteVoice : undefined} />
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
        )}

        {/* Fils suivis (et posts suivis d'un Forum / Multimedia) - OUTSIDE draggable div */}
        {(channel.type === "text" || channel.type === "announcement" || channel.type === "forum" || channel.type === "media") && threads.length > 0 &&
        <ThreadContextMenuList
          channelName={channel.name}
          threads={threads}
          showArchivedThreads={showArchivedThreads}
          activeThreadId={isForumLike ? (postFullscreen ? openForumPost.threadId : null) : activeThreadId}
          onThreadSelect={
            isForumLike
              ? (threadId: string) => {
                  // Un post s'ouvre en pleine fenetre dans son salon, pas dans le panneau des fils.
                  onChannelClick();
                  requestOpenForumPost(channel.id, threadId, true);
                }
              : onThreadSelect
          }
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

/**
 * Memoized channel row.
 *
 * Without this, every re-render of ChannelList (a new message, a presence
 * update, a drag operation, a parent state change) re-rendered every channel
 * row in the server. `speakingUsers` is a Set that changes identity on each
 * voice tick, so in a call this happened several times per second for the
 * whole list; VoiceContext now preserves its identity when unchanged.
 */
const MemoSortableChannel = memo(SortableChannel);
export function ChannelList({
  server,
  activeChannelId,
  onChannelSelect,
  onOpenServerSettings,
  orphanChannels = [],
  activeThreadId,
  onThreadSelect,
  onOpenVoiceChat,
  activeServerView,
  onOpenServerView
}: ChannelListProps) {
  const queryClient = useQueryClient();
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
  const [voiceStatusChannelId, setVoiceStatusChannelId] = useState<string | null>(null);
  const voiceStatuses = useVoiceChannelStatuses(server.id);
  const setVoiceStatus = useSetVoiceChannelStatus(server.id);
  const [externalLinkModal, setExternalLinkModal] = useState<{url: string;} | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after">("after");
  const [dropMode, setDropMode] = useState<"before" | "after" | "inside">("after");
  const [optimisticCategoryOrder, setOptimisticCategoryOrder] = useState<string[] | null>(null);
  // Synchronous refs mirroring dropPosition/dropMode so handleDragEnd reads fresh values
  // (avoids stale closure when React batches setState between dragOver and dragEnd)
  const dropPositionRef = useRef<"before" | "after">("after");
  const dropModeRef = useRef<"before" | "after" | "inside">("after");
  // Position Y réelle de la souris, mise à jour indépendamment des événements
  // du shim react-dnd. Le shim planifie un requestAnimationFrame PAR élément
  // survolé, avec un instantané de delta figé au moment de la planification
  // (voir src/lib/dnd-shim/use-sortable.tsx). Si le curseur traverse plusieurs
  // catégories rapidement (typiquement en survolant vers le haut, où les
  // catégories sont plus rapprochées), ces callbacks peuvent s'exécuter dans
  // un ordre différent de celui du survol réel et faire retomber l'indicateur
  // sur une position intermédiaire au lieu de la position finale sous le
  // curseur — d'où l'indicateur qui "part dans le mauvais sens" lors de
  // mouvements rapides.
  //
  // IMPORTANT : on écoute "dragover", PAS "pointermove"/"mousemove". Le
  // backend utilisé ici (react-dnd-html5-backend) s'appuie sur l'API native
  // HTML5 Drag & Drop du navigateur — pendant un drag natif actif, le
  // navigateur NE déclenche PAS pointermove/mousemove sur la page (c'est un
  // comportement standard des navigateurs), seulement dragover. Écouter
  // pointermove ici ne capte donc rien pendant un vrai drag et retombe en
  // silence sur l'ancien calcul basé sur l'événement du shim.
  const liveClientYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activeId) {
      liveClientYRef.current = null;
      return;
    }
    const handleNativeDragOver = (e: DragEvent) => {
      liveClientYRef.current = e.clientY;
    };
    window.addEventListener("dragover", handleNativeDragOver, { passive: true });
    return () => window.removeEventListener("dragover", handleNativeDragOver);
  }, [activeId]);

  const getDragClientY = useCallback((event: DragOverEvent | DragEndEvent) => {
    if (liveClientYRef.current !== null) return liveClientYRef.current;

    // Repli si aucun dragover natif n'a encore été capté (ex: tout premier
    // instant du drag) : ancien calcul basé sur l'événement du shim.
    const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent | null;
    if (!activatorEvent) return null;

    if ("clientY" in activatorEvent) {
      return activatorEvent.clientY + event.delta.y;
    }

    if (!("touches" in activatorEvent)) return null;

    const touch = activatorEvent.touches[0] || activatorEvent.changedTouches[0];
    return touch ? touch.clientY + event.delta.y : null;
  }, []);


  const getCategoryDropTarget = useCallback((activeCategoryId: string, event: DragOverEvent | DragEndEvent) => {
    const clientY = getDragClientY(event);
    if (clientY === null) return null;

    const categoryHeaders = Array.from(
      document.querySelectorAll<HTMLElement>('[data-dnd-type="category"][data-category-id]')
    )
      .map((element) => ({
        id: element.dataset.categoryId,
        rect: element.getBoundingClientRect()
      }))
      .filter((item): item is { id: string; rect: DOMRect } => !!item.id && item.id !== activeCategoryId);

    return resolveCategoryDropTarget(
      categoryHeaders.map((h) => ({ id: h.id, top: h.rect.top, height: h.rect.height })),
      clientY,
    );
  }, [getDragClientY]);
  const { profile, signOut, updateStatus } = useAuth();
  const { voiceState, joinChannel, leaveChannel, toggleMute, toggleDeafen, isConnected } = useVoice();
  // Subscribed separately so an audio tick only re-renders this component,
  // not every consumer of the connection state.
  const { speakingUsers } = useVoiceLevels();
  useEffect(() => {
    const invite = (e: Event) => setInviteChannelId((e as CustomEvent<string>).detail);
    const status = (e: Event) => setVoiceStatusChannelId((e as CustomEvent<string>).detail);
    window.addEventListener(OPEN_VOICE_INVITE_EVENT, invite);
    window.addEventListener(OPEN_VOICE_STATUS_EVENT, status);
    return () => {
      window.removeEventListener(OPEN_VOICE_INVITE_EVENT, invite);
      window.removeEventListener(OPEN_VOICE_STATUS_EVENT, status);
    };
  }, []);
  const updateCategory = useUpdateCategory();
  const reorderCategories = useReorderCategories();
  const reorderChannels = useReorderChannels();
  const deleteChannel = useDeleteChannel();
  const deleteCategory = useDeleteCategory();
  const duplicateChannel = useDuplicateChannel();
  const leaveServer = useLeaveServer();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  // Check if user can access server settings
  const canAccessSettings = useCanAccessServerSettings(server.id);
  const { data: serverSettings } = useServerSettings(server.id);
  const { data: privateChannelIds = EMPTY_ID_SET } = usePrivateChannelIds(server.id);
  const { upcoming: upcomingEvents } = useServerEvents(server.id);
  const [eventsModal, setEventsModal] = useState<{ open: boolean; wizard?: boolean }>({ open: false });
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [showServerProfileEdit, setShowServerProfileEdit] = useState(false);

  // Check if user is the owner (cannot leave, must delete). Calculé
  // directement depuis la prop `server` de cette page (source garantie à
  // jour pour le serveur affiché), à ne pas confondre avec le isGod/isOwner
  // interne de usePermissions() qui dépend d'une liste séparée
  // (useServers(), la liste de TOUS les serveurs de l'utilisateur) pouvant
  // être désynchronisée par rapport au serveur réellement affiché — c'est ce
  // qui bloquait le drag pour de vrais propriétaires/gestionnaires après
  // l'ajout de `disabled: !canManageChannels`.
  const isOwner = profile?.id === server.ownerId;
  // Même logique pour le système de double propriétaire (second propriétaire) :
  // un vrai second propriétaire ne doit pas dépendre uniquement du isGod de
  // usePermissions() (même risque de désynchronisation que pour isOwner).
  const isSecondaryOwner = !!server.secondaryOwnerId && profile?.id === server.secondaryOwnerId;

  // Check if user can manage channels
  const { hasPermission, isGod } = usePermissions(server.id);
  const canManageChannels = isGod || isOwner || isSecondaryOwner || hasPermission("manage_channels") || hasPermission("administrator");

  // Create-invite is gated server-side by owner/admin (RLS on `invites`), not the unused `create_invites` permission enum.
  const canCreateInvite = isGod || hasPermission("administrator");


  // BATCH: Get all channel permissions (view + connect) with a SINGLE RPC call
  // Replaces useChannelsVisibility + useVoiceChannelLocks (N+M calls → 1 call)
  const {
    isVisible,
    isLocked: isVoiceChannelLocked,
    isLoading: isPermsLoading
  } = useServerChannelPermissions(server.id);

  // Salons non suivis ("Chercher des salons"), sauf "Montrer tous les salons".
  const { data: hiddenChannels } = useHiddenChannels(server.id);
  const [showAllChannels, setShowAllChannels] = useState(() => readShowAllChannels(server.id));
  useEffect(() => {
    setShowAllChannels(readShowAllChannels(server.id));
    const onChange = (e: Event) => {
      const d = (e as CustomEvent<{ serverId: string; value: boolean }>).detail;
      if (d?.serverId === server.id) setShowAllChannels(d.value);
    };
    window.addEventListener('channels:show-all-changed', onChange);
    return () => window.removeEventListener('channels:show-all-changed', onChange);
  }, [server.id]);

  // Filter visible channels helper - during loading show all to avoid flash
  const shouldShowChannel = useCallback(
    (channelId: string) => {
      if (!showAllChannels && hiddenChannels?.has(channelId) && channelId !== activeChannelId) return false;
      return isPermsLoading || isVisible(channelId);
    },
    [isPermsLoading, isVisible, showAllChannels, hiddenChannels, activeChannelId]
  );

  // Filter orphan channels by visibility
  const visibleOrphanChannels = useMemo(() => {
    return orphanChannels.filter((ch) => shouldShowChannel(ch.id));
  }, [orphanChannels, shouldShowChannel]);

  const orderedServerCategories = useMemo(() => {
    if (!optimisticCategoryOrder) return server.categories;

    const orderIndex = new Map(optimisticCategoryOrder.map((id, index) => [id, index]));
    return [...server.categories].sort((a, b) => {
      const aIndex = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  }, [server.categories, optimisticCategoryOrder]);

  useEffect(() => {
    if (!optimisticCategoryOrder) return;
    if (optimisticCategoryOrder.every((id, index) => id === server.categories[index]?.id)) {
      setOptimisticCategoryOrder(null);
    }
  }, [server.categories, optimisticCategoryOrder]);

  // Filter categories and their channels by visibility
  const visibleCategories = useMemo(() => {
    return orderedServerCategories.
    map((category) => ({
      ...category,
      channels: category.channels.filter((ch) => shouldShowChannel(ch.id))
    })).
    filter((category) => canManageChannels || category.channels.length > 0); // Show empty categories to admins only
  }, [orderedServerCategories, shouldShowChannel, canManageChannels]);

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
  const handleDeleteChannel = async (channelId: string, channelName: string) => {
    try {
      await deleteChannel.mutateAsync({
        channelId,
        serverId: server.id
      });

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
const toggleCategory = (categoryId: string) => {setCollapsedCategories((prev) => prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]);
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
  const hoverPrefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (hoverPrefetchTimerRef.current) clearTimeout(hoverPrefetchTimerRef.current);
    };
  }, []);
  const handleChannelHover = (channel: Channel) => {
    if (channel.type === "voice" || channel.type === "stage" || channel.type === "link") return;
    if (channel.id === activeChannelId) return;
    if (hoverPrefetchTimerRef.current) clearTimeout(hoverPrefetchTimerRef.current);
    hoverPrefetchTimerRef.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['messages', channel.id],
        queryFn: () => fetchChannelMessages(channel.id),
        staleTime: 30_000,
      });
      // System messages (thread-created, poll-closed, etc.) are plain rows in
      // the same `messages` table above — already covered by the prefetch.
      // These cover the other channel-scoped data ChatArea loads on mount.
      queryClient.prefetchQuery({
        queryKey: ['pinned-messages', channel.id],
        queryFn: () => fetchPinnedMessages(channel.id),
      });
      queryClient.prefetchQuery({
        queryKey: ['polls', 'channel', channel.id],
        queryFn: () => fetchChannelPolls(channel.id),
      });
      queryClient.prefetchQuery({
        queryKey: ['threads', channel.id],
        queryFn: () => fetchChannelThreads(channel.id),
        staleTime: 30_000,
      });
    }, 120);
  };
  const handleStartEditCategory = (category: Category) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      channelCount: category.channels.length
    });
  };
  const handleDragStart = (event: DragStartEvent) => {
    // Défense en profondeur : useSortable({ disabled: !canManageChannels })
    // empêche déjà le drag de démarrer côté catégories/salons, mais on
    // bloque aussi ici au cas où un autre point d'entrée déclencherait un
    // drag (ex: futur code qui oublierait de passer `disabled`).
    const activeIdStr = event.active.id as string;
    if (!canManageChannels && (activeIdStr.startsWith("category-") || activeIdStr.startsWith("channel-"))) {
      return;
    }
    dropPositionRef.current = "after";
    dropModeRef.current = "after";
    setOverId(null);
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

  const handleDragOver = (event: DragOverEvent) => {
    if (!activeId) return;
    const { active, over, delta } = event;
    const activeIdStr = active.id.toString();

    if (activeIdStr.startsWith("category-")) {
      const activeCatId = activeIdStr.replace("category-", "");
      const target = getCategoryDropTarget(activeCatId, event);
      if (!target) {
        setOverId(null);
        return;
      }

      dropPositionRef.current = target.position;
      dropModeRef.current = target.position;
      setDropPosition(target.position);
      setDropMode(target.position);
      setOverId(`category-${target.overCatId}`);
      return;
    }

    if (!over || over.id === active.id) {
      setOverId(null);
      dropModeRef.current = "after";
      setDropMode("after");
      return;
    }
    const overIdStr = over.id.toString();

    if (overIdStr === TOP_ORPHAN_DROP_ID) {
      dropPositionRef.current = "before";
      dropModeRef.current = "before";
      setDropPosition("before");
      setDropMode("before");
      setOverId(TOP_ORPHAN_DROP_ID);
      return;
    }

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
        // Easier orphan drop: hovering the FIRST visible category enlarges the
        // "before" zone to the top 50% so it's easy to move the channel out of
        // its category (works whether or not orphans already exist).
        const overCatId = overIdStr.replace("category-", "");
        const isFirstCategory = visibleCategories[0]?.id === overCatId;
        const topRatio = isFirstCategory ? 0.5 : 0.15;
        const bottomRatio = isFirstCategory ? 0.75 : 0.85;
        const topZone = overRect.top + overRect.height * topRatio;
        const bottomZone = overRect.top + overRect.height * bottomRatio;
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
    // Snapshot ref/state values synchronously — handleDragOver writes them, et on
    // les lit avant que setOverId(null)/setActiveId(null) ne les réinitialisent.
    const currentDropPosition = dropPositionRef.current;
    const currentDropMode = dropModeRef.current;
    const lastOverId = overId; // état React qui pilote RÉELLEMENT le DropIndicator affiché à l'écran
    setOverId(null);
    const { active, over } = event;
    setActiveId(null);
    const activeIdStr = active.id as string;
    const overIdStr = over?.id as string | undefined;

    // Handle category reordering with precise position
    if (activeIdStr.startsWith("category-")) {
      const activeCatId = activeIdStr.replace("category-", "");
      // IMPORTANT : on utilise `lastOverId` (l'état React `overId`), PAS
      // `overIdStr` (event.over?.id). Ce dernier vient du hit-test natif du
      // shim react-dnd (ctx.state.lastOverId côté use-sortable.tsx) : il ne se
      // met à jour QUE quand le curseur est physiquement au-dessus de la fine
      // bande DOM de l'en-tête d'une catégorie. Notre calcul personnalisé
      // (getCategoryDropTarget, appelé depuis handleDragOver) résout au
      // contraire une cible même dans les zones "creuses" entre catégories —
      // et c'est LUI qui pilote le DropIndicator affiché via `overId`/`setOverId`.
      // Utiliser overIdStr créait exactement le bug rapporté : l'indicateur
      // était au bon endroit, mais si le curseur n'était pas *exactement* sur
      // la bande DOM d'un en-tête au moment du lâcher, overIdStr restait périmé
      // (dernier en-tête réellement survolé au sens du hit-test natif), donc le
      // drop se résolvait ailleurs.
      const hoverTarget = lastOverId?.startsWith("category-") && lastOverId !== activeIdStr ?
        { overCatId: lastOverId.replace("category-", ""), position: currentDropPosition } :
        null;
      const resolvedTarget = pickCategoryDropTarget(hoverTarget, getCategoryDropTarget(activeCatId, event));

      if (!resolvedTarget) return;


      const overCatId = resolvedTarget.overCatId;
      const oldIndex = orderedServerCategories.findIndex((c) => c.id === activeCatId);
      const overIndex = orderedServerCategories.findIndex((c) => c.id === overCatId);
      if (oldIndex !== -1 && overIndex !== -1) {
        // Remove active category and insert at precise position based on dropPosition
        const activeCategory = orderedServerCategories[oldIndex];
        const newCategories = orderedServerCategories.filter((c) => c.id !== activeCatId);
        let insertIndex = resolvedTarget.position === "before" ? overIndex : overIndex + 1;
        // Adjust if we removed an element before the insertion point
        if (oldIndex < overIndex) {
          insertIndex--;
        }
        insertIndex = Math.max(0, Math.min(insertIndex, newCategories.length));
        newCategories.splice(insertIndex, 0, activeCategory);
        const orderedIds = newCategories.map((cat) => cat.id);
        if (orderedIds.every((id, index) => id === orderedServerCategories[index]?.id)) return;
        setOptimisticCategoryOrder(orderedIds);
        reorderCategories.mutate({
          serverId: server.id,
          orderedIds
        }, {
          onError: () => setOptimisticCategoryOrder(null)
        });
      }
      return;
    }

    if (!over || !overIdStr || active.id === over.id) return;

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

      if (overIdStr === TOP_ORPHAN_DROP_ID) {
        const existingOrphanIds = visibleOrphanChannels
          .map((ch) => ch.id)
          .filter((id) => id !== activeChannelId);
        reorderChannels.mutate({
          serverId: server.id,
          categoryId: null,
          orderedIds: [activeChannelId, ...existingOrphanIds]
        });
        return;
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
          // "before" on the FIRST visible category header → move out of any
          // category as the first orphan, matching the dedicated invisible top target.
          const firstVisibleCategoryId = visibleCategories[0]?.id;
          if (
            currentDropMode === "before" &&
            targetCategoryId === firstVisibleCategoryId
          ) {
            const existingOrphanIds = visibleOrphanChannels
              .map((ch) => ch.id)
              .filter((id) => id !== activeChannelId);
            reorderChannels.mutate({
              serverId: server.id,
              categoryId: null,
              orderedIds: [activeChannelId, ...existingOrphanIds]
            });
            return;
          }

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

  // Banner header — like Discord: a fixed 56px header bar (name + icons)
  // always sits at the bottom of the header zone. When there's a banner,
  // the header zone starts at BANNER_HEIGHT and the banner is a layer
  // stacked above the bar, covering it. Scrolling the channel list slides
  // the banner up (translateY) while the header zone shrinks by the same
  // amount, so the banner tucks away behind the bar and the zone settles
  // at exactly HEADER_HEIGHT — matching a bannerless server. Scrolling
  // back to the top reverses both, sliding the banner back down.
  //
  // The per-pixel offset is applied to the DOM directly on every scroll
  // frame and never touches React state — with a long channel list, a
  // state update on every scroll event forces a full re-render of this
  // (large, DnD-heavy) component in between frames, which is what caused
  // the header to visibly stutter/flash during a real, continuous scroll
  // even though isolated before/after screenshots looked fine. The only
  // state involved, `showBanner`, is a coarse boolean that flips once
  // when crossing the collapse threshold — it drives text/icon contrast,
  // not the animation itself, so it re-renders at most twice per scroll
  // gesture instead of once per pixel.
  //
  // A banner that fails to load is treated as no banner at all: otherwise
  // the header keeps its 100px banner zone and shows an empty dark block
  // (stale storage URLs after a Supabase migration did exactly that).
  const [failedBannerUrl, setFailedBannerUrl] = useState<string | null>(null);
  const bannerUrl = server.bannerUrl && server.bannerUrl !== failedBannerUrl ? server.bannerUrl : undefined;
  const [failedIconUrl, setFailedIconUrl] = useState<string | null>(null);
  const iconUrl = server.iconUrl && server.iconUrl !== failedIconUrl ? server.iconUrl : undefined;
  // Video de reference : bannieres de 130px (a 120% de zoom : 156px) sous une barre de 48px
  // qui chevauche leur haut ; la zone se replie de 130 a 48px au defilement.
  const BANNER_HEIGHT = 130;
  const HEADER_HEIGHT = 48;
  const BANNER_SCROLL_RANGE = BANNER_HEIGHT - HEADER_HEIGHT;
  // Pas d'etat React : la bascule "bannière visible" ne passe que par un attribut
  // data sur la zone d'en-tete (les classes group-data-[over=1] de l'en-tete s'en servent).
  // Un setState ici redessinait toute la liste (une centaine de salons) en passant le seuil du defilement.
  const showBannerRef = useRef(!!bannerUrl);
  const setShowBanner = useCallback((v: boolean) => {
    showBannerRef.current = v;
    headerZoneRef.current?.setAttribute('data-over', v ? '1' : '0');
  }, []);
  const bannerLayerRef = useRef<HTMLDivElement | null>(null);
  const barTintRef = useRef<HTMLDivElement | null>(null);
  const bannerVeilRef = useRef<HTMLDivElement | null>(null);
  const headerZoneRef = useRef<HTMLDivElement | null>(null);
  const bannerRafRef = useRef<number | null>(null);

  const applyBannerOffset = useCallback((offset: number) => {
    // Servers without a banner have nothing to animate — force the header
    // zone to the plain HEADER_HEIGHT instead of BANNER_HEIGHT - offset,
    // otherwise a leftover 100px-tall inline height (from BANNER_HEIGHT -
    // 0 on reset) would leave an oversized empty header on every
    // bannerless server.
    if (!bannerUrl) {
      if (bannerLayerRef.current) bannerLayerRef.current.style.transform = 'translateY(0px)';
      if (showBannerRef.current !== false) {
        showBannerRef.current = false;
        setShowBanner(false);
      }
      return;
    }
    // La banniere defile avec la liste, pixel pour pixel (comme Discord) : la zone d'en-tete
    // reste a 48px et un espaceur de BANNER_SCROLL_RANGE px pousse les salons sous la banniere.
    if (bannerLayerRef.current) {
      // Au bout de la plage de repli (BANNER_SCROLL_RANGE) la banniere a quitte entierement la barre :
      // elle monte plus vite que la liste pour ne laisser aucun reste au-dessus du nom du serveur.
      const progress = Math.min(1, offset / BANNER_SCROLL_RANGE);
      bannerLayerRef.current.style.transform = `translate3d(0,-${BANNER_HEIGHT * progress}px,0)`;
      bannerLayerRef.current.style.visibility = progress >= 1 ? 'hidden' : 'visible';
      // Reference : la barre s'assombrit au fil du repli (voile du fond du panneau sur la banniere).
      const tint = Math.min(1, progress * 1.15);
      if (barTintRef.current) barTintRef.current.style.opacity = String(tint);
      // Le voile couvre toute la banniere (130px, toute la largeur) et la suit dans son defilement.
      if (bannerVeilRef.current) bannerVeilRef.current.style.opacity = String(tint * 0.85);
    }
    const nextShowBanner = offset < BANNER_SCROLL_RANGE - 4;
    if (showBannerRef.current !== nextShowBanner) {
      showBannerRef.current = nextShowBanner;
      setShowBanner(nextShowBanner);
    }
  }, [bannerUrl, BANNER_HEIGHT, HEADER_HEIGHT, BANNER_SCROLL_RANGE]);

  const handleChannelListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!bannerUrl) return;
    const scrollTop = (e.target as HTMLDivElement).scrollTop;
    // Applique tout de suite (pas de rAF) : la banniere reste calee sur la liste, sans retard d'une image.
    applyBannerOffset(Math.max(0, Math.min(BANNER_SCROLL_RANGE, scrollTop)));
  }, [bannerUrl, BANNER_HEIGHT, applyBannerOffset]);

  // Reset to "fully shown" whenever the active server (or its banner)
  // changes, so a leftover scrolled-away banner from a previous server
  // doesn't leak in.
  useEffect(() => {
    setShowBanner(!!bannerUrl);
    applyBannerOffset(0);
  }, [server.id, bannerUrl, applyBannerOffset]);

  useEffect(() => () => {
    if (bannerRafRef.current !== null) cancelAnimationFrame(bannerRafRef.current);
  }, []);

  // Sidebar resizing
  // 280px : largeur de la liste de salons sur la capture de reference ;
  // plage 186-432px relevee a la glissiere (video de reference, zoom 131 %).
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isHoveringResize, setIsHoveringResize] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isResizing = useRef(false);
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      setIsDragging(true);
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const delta = e.clientX - startX;
        const newWidth = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startWidth + delta));
        setSidebarWidth(newWidth);
      };
      const handleMouseUp = () => {
        isResizing.current = false;
        setIsDragging(false);
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
        // h-full/min-h-0 let the panel wrapper below distribute the leftover
        // height, so the user panel always sits flush at the bottom.
        // Coin arrondi interieur du panneau principal (12px - 1px de bordure).
        "bg-surface-1 flex flex-col relative select-none h-full min-h-0 rounded-tl-[11px]",
        !isResizing.current && "transition-[width] duration-300 ease-out"
      )}
      style={{
        width: `${sidebarWidth}px`,
        minWidth: `${SIDEBAR_MIN}px`,
        maxWidth: `${SIDEBAR_MAX}px`
      }}>

      {/* Glissiere de largeur (video de reference) : zone de prise a cheval sur le bord de la liste,
          la barre claire de 4,5px (collee au bord) n'apparait qu'au survol et pendant le glissement. */}
      <div
        className="group/grip absolute -top-px bottom-0 left-full z-20 -ml-[1.5px] w-[7.5px] cursor-ew-resize"
        onMouseEnter={() => setIsHoveringResize(true)}
        onMouseLeave={() => setIsHoveringResize(false)}
        onMouseDown={handleResizeMouseDown}
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-y-0 left-[1.5px] w-[4.5px] bg-[#404146] transition-opacity duration-100',
            isHoveringResize || isDragging ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>
      {/* Server Header - styled like User Panel */}
      <div className="bg-surface-1 rounded-tl-[11px]">
        <div
          ref={headerZoneRef}
          data-over={bannerUrl ? "1" : "0"}
          className="group/hdr relative z-20 rounded-tl-[11px]"
          // La banniere deborde sous la barre : on ne rogne que le haut, avec le coin arrondi du panneau,
          // pour qu'il reste arrondi quand la banniere defile (sinon il redevient un angle droit).
          style={{ height: `${HEADER_HEIGHT}px`, clipPath: 'inset(0 0 -400px 0 round 11px 0 0 0)' }}>

          {/* Fixed header bar — always present at the bottom of the header
              zone, opaque background. The banner (if any) is a separate
              layer stacked above it that slides up to tuck away behind it. */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-center bg-surface-1 border-b border-[hsl(var(--frame-border))]" style={{ height: `${HEADER_HEIGHT}px` }} />

          {bannerUrl &&
          <div
            ref={barTintRef}
            aria-hidden
            className="absolute inset-x-0 top-0 z-[25] bg-surface-1 pointer-events-none"
            // Fondu vers le bas : aucun bord de voile visible (le trait de la barre n'apparait qu'une fois la banniere partie).
            style={{ height: `${HEADER_HEIGHT + 24}px`, opacity: 0, WebkitMaskImage: 'linear-gradient(to bottom,#000 55%,transparent)', maskImage: 'linear-gradient(to bottom,#000 55%,transparent)' }} />
          }
          {bannerUrl &&
          <div
            ref={bannerLayerRef}
            className="absolute inset-x-0 top-0 z-20 overflow-hidden rounded-tl-[11px] pointer-events-none will-change-transform"
            style={{ height: `${BANNER_HEIGHT}px` }}>
              {/* key + opacite 0 jusqu'au chargement : au changement de serveur l'ancienne banniere
                  ne reste plus affichee le temps que la nouvelle se charge. */}
              <img
                key={bannerUrl}
                src={bannerUrl}
                className="w-full h-full object-cover opacity-0 transition-opacity duration-150"
                alt=""
                onLoad={(e) => { e.currentTarget.style.opacity = '1'; }}
                onError={() => setFailedBannerUrl(bannerUrl)} />
              <div className="absolute inset-x-0 top-0 h-[56px] bg-gradient-to-b from-black/45 to-transparent" />
              <div ref={bannerVeilRef} aria-hidden className="absolute inset-0 bg-surface-1" style={{ opacity: 0 }} />
            </div>
          }

          {/* Server Name + action icons — always on top, anchored to the
              bottom of the header zone (so they read as "inside" the fixed
              bar once the banner has tucked away). */}
          <div className="absolute inset-x-0 top-0 z-30 flex items-center" style={{ height: `${HEADER_HEIGHT}px` }}>
            {/* Nom du serveur -> menu deroulant de Discord (video de reference) */}
            <DropdownMenu modal={false} onOpenChange={setServerMenuOpen}>
              <DropdownMenuTrigger asChild>
                {/* En-tete de la capture : rosette 20px (communaute), nom 16px
                    gras blanc et chevron, sur une barre de 48px. */}
                {/* Survol / ouverture : pastille arrondie claire autour de
                    l'icone, du nom et du chevron (comme Discord). */}
                <button type="button" className={cn(
                  "flex items-center gap-2 min-w-0 max-w-[calc(100%-8px)] h-9 ml-2 pl-2 pr-2 rounded-lg text-white relative transition-colors",
                  "hover:bg-[hsl(var(--interactive-background-hover))] data-[state=open]:bg-[hsl(var(--interactive-background-selected))]",
                  "group-data-[over=1]/hdr:[text-shadow:0_1px_6px_rgba(0,0,0,0.9),0_0px_2px_rgba(0,0,0,0.8)]"
                )}>
                  {/* Comme Discord : seule la rosette d'un serveur de communaute
                      precede le nom, jamais l'icone du serveur. */}
                  {serverSettings?.community_enabled && <ServerHeaderBadge isPublic={!!server.isPublic} className="group-data-[over=1]/hdr:[filter:drop-shadow(0_1px_6px_rgba(0,0,0,0.6))]" />}
                  <span translate="no" className="text-base font-semibold truncate">{server.name}</span>
                  <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform duration-200", "group-data-[over=1]/hdr:[filter:drop-shadow(0_1px_6px_rgba(0,0,0,0.6))]", serverMenuOpen && "rotate-180")} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6} className="w-max min-w-[220px] max-w-[320px] origin-[var(--radix-dropdown-menu-content-transform-origin)] data-[state=open]:zoom-in-[0.5] data-[state=open]:duration-75 data-[state=closed]:duration-75 p-2 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin rounded-lg bg-[#3b3b45] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)] [&>[role=separator]]:my-2 [&>[role=separator]]:mx-0 [&>[role=separator]]:bg-white/[0.08]">
                <DropdownMenuItem className={serverMenuItemCls} onSelect={() => onOpenServerView?.('boosts')}>
                  <Gem className="w-[18px] h-[18px]" /> Boost de serveur
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className={serverMenuItemCls} onSelect={() => setInviteChannelId('server')}>
                  <UserPlus className="w-[18px] h-[18px]" /> Inviter sur le serveur
                </DropdownMenuItem>
                {canAccessSettings && (
                  <DropdownMenuItem className={serverMenuItemCls} onSelect={() => onOpenServerSettings?.()}>
                    <Settings className="w-[18px] h-[18px]" /> Paramètres du serveur
                  </DropdownMenuItem>
                )}
                {canAccessSettings && serverSettings?.community_enabled && (
                  <DropdownMenuItem className={serverMenuItemCls} onSelect={() => onOpenServerSettings?.('analytics')}>
                    <TrendingUp className="w-[18px] h-[18px]" /> Analyses de serveur
                  </DropdownMenuItem>
                )}
                {canManageChannels && (
                  <>
                    <DropdownMenuItem className={serverMenuItemCls} onSelect={() => setCreateChannelForCategory({ id: null, name: "Sans catégorie", showSelector: true })}>
                      <PlusCircle className="w-[18px] h-[18px]" /> Créer un salon
                    </DropdownMenuItem>
                    <DropdownMenuItem className={serverMenuItemCls} onSelect={() => setShowCreateCategory(true)}>
                      <FolderPlus className="w-[18px] h-[18px]" /> Créer une catégorie
                    </DropdownMenuItem>
                  </>
                )}
                {hasPermission('create_events') && (
                  <DropdownMenuItem className={serverMenuItemCls} onSelect={() => setEventsModal({ open: true, wizard: true })}>
                    <CalendarPlus className="w-[18px] h-[18px]" /> Créer un événement
                  </DropdownMenuItem>
                )}
                {canAccessSettings && (
                  <DropdownMenuItem className={serverMenuItemCls} onSelect={() => onOpenServerSettings?.('integrations')}>
                    <Blocks className="w-[18px] h-[18px]" /> Répertoire d'applications
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={serverMenuItemCls}
                  onSelect={(e) => {
                    e.preventDefault();
                    writeShowAllChannels(server.id, !showAllChannels);
                  }}
                >
                  <Eye className="w-[18px] h-[18px]" /> <span className="flex-1">Montrer tous les salons</span>
                  <MenuCheckbox checked={showAllChannels} />
                </DropdownMenuItem>
                <DropdownMenuItem className={serverMenuItemCls} disabled>
                  <Bell className="w-[18px] h-[18px]" /> <span className="flex-1 truncate">Paramètres de notification</span>
                </DropdownMenuItem>
                <DropdownMenuItem className={serverMenuItemCls} disabled>
                  <ShieldCheck className="w-[18px] h-[18px]" /> <span className="flex-1 truncate">Paramètres de confidentialité</span>
                </DropdownMenuItem>
                <DropdownMenuItem className={serverMenuItemCls} disabled>
                  <Shield className="w-[18px] h-[18px]" /> <span className="flex-1 truncate">Voir les permissions</span>
                </DropdownMenuItem>
                <DropdownMenuItem className={serverMenuItemCls} disabled>
                  <Info className="w-[18px] h-[18px]" /> <span className="flex-1 truncate">Infos du serveur</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className={serverMenuItemCls} onSelect={() => setShowServerProfileEdit(true)}>
                  <Pencil className="w-[18px] h-[18px]" /> <span className="flex-1 truncate">Modifier le profil par serveur</span>
                </DropdownMenuItem>
                <DropdownMenuItem className={serverMenuItemCls} disabled>
                  <EyeOff className="w-[18px] h-[18px]" /> <span className="flex-1 truncate">Masquer les salons en sourdine</span>
                  <MenuCheckbox checked={false} />
                </DropdownMenuItem>
                <p className="px-2 pt-1 pb-0.5 text-[11px] text-muted-foreground">Notifications, confidentialité et sourdine : bientôt disponible</p>
                {canAccessSettings && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className={cn(serverMenuItemCls, "text-[#f57976] focus:text-white focus:bg-destructive")} onSelect={() => onOpenServerSettings?.('invites')}>
                      <Lock className="w-[18px] h-[18px]" /> Actions de cybersécurité
                    </DropdownMenuItem>
                    <DropdownMenuItem className={cn(serverMenuItemCls, "text-[#f57976]")} disabled>
                      <Shield className="w-[18px] h-[18px]" /> Signaler un raid
                    </DropdownMenuItem>
                  </>
                )}
                {!isGod && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className={cn(serverMenuItemCls, "text-[#f57976] focus:text-white focus:bg-destructive")} onSelect={() => setShowLeaveDialog(true)}>
                      <LogOut className="w-[18px] h-[18px]" /> Quitter le serveur
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className={serverMenuItemCls} onSelect={() => copyToClipboard(uuidToSnowflake(server.id), "Identifiant copié !")}>
                  <IdCard className="w-[18px] h-[18px]" />
                  <span className="flex-1 truncate">Copier l'identifiant du serveur</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          {/* Action icon - right side of header (invitation seule, comme la
              capture ; les parametres sont dans le menu du nom). */}
          <div className="flex items-center pr-3 ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button"
                  onClick={() => setInviteChannelId('server')}
                  aria-label="Créer une invitation"
                  className={cn(
                    "p-1 rounded-md transition-colors",
                    "text-foreground hover:text-white group-data-[over=1]/hdr:text-white group-data-[over=1]/hdr:[filter:drop-shadow(0_1px_6px_rgba(0,0,0,0.6))]"
                  )}>
                  <UserPlus className="w-6 h-6" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Créer une invitation</p></TooltipContent>
            </Tooltip>
          </div>
          </div>
        </div>
      </div>

      {/* Channels with DnD */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <RulesChannelContext.Provider value={serverSettings?.community_enabled ? serverSettings.rules_channel_id ?? null : null}>
          <ChannelListScrollContainer onScroll={handleChannelListScroll}>
            {bannerUrl && <div aria-hidden style={{ height: BANNER_SCROLL_RANGE }} />}
            <DndContext
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}>



              <ServerSetupProgress serverId={server.id} activeChannelId={activeChannelId} onChannelSelect={onChannelSelect} />

              <ServerNavItems
                community={!!serverSettings?.community_enabled}
                eventCount={upcomingEvents.length}
                canSeeMembers={canAccessSettings}
                activeView={activeServerView}
                onOpenView={onOpenServerView}
                onOpenEvents={() => setEventsModal({ open: true })}
              />

              {/* Orphan Channels - displayed BEFORE categories to allow insertion at top */}
              <TopOrphanDropTarget activeId={activeId} overId={overId} />

              {visibleOrphanChannels.length > 0 &&
              <div className="space-y-0.5 mb-2">
                  <SortableContext
                  items={visibleOrphanChannels.map((ch) => `channel-${ch.id}`)}
                  strategy={verticalListSortingStrategy}>

                    {visibleOrphanChannels.map((channel) =>
                  <MemoSortableChannel
                    key={channel.id}
                    channel={{
                      id: channel.id,
                      name: channel.name,
                      type: (channel.type || "text") as ChannelType,
                      description: channel.description || undefined,
                      icon_url: channel.icon_url ?? null
                    }}
                    serverId={server.id}
                    isActive={activeChannelId === channel.id && !activeThreadId}
                    isVoiceConnected={voiceState.channelId === channel.id}
                    voiceStatus={voiceStatuses[channel.id]}
                    onEditVoiceStatus={() => setVoiceStatusChannelId(channel.id)}
                    onInviteVoice={() => setInviteChannelId(channel.id)}
                    speakingUsers={speakingUsers}
                    hasUnread={channelUnreadInfo[channel.id]?.hasUnread}
                    mentionCount={channelUnreadInfo[channel.id]?.mentionCount || 0}
                    onChannelClick={() =>
                    handleChannelClick({
                      id: channel.id,
                      name: channel.name,
                      type: (channel.type || "text") as ChannelType,
                      description: channel.description || undefined,
                      icon_url: channel.icon_url ?? null
                    })
                    }
                    onChannelHover={() =>
                    handleChannelHover({
                      id: channel.id,
                      name: channel.name,
                      type: (channel.type || "text") as ChannelType,
                      description: channel.description || undefined,
                      icon_url: channel.icon_url ?? null
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
                    canCreateInvite={canCreateInvite}
                    isVoiceLocked={
                    (channel.type === "voice" || channel.type === "stage") && isVoiceChannelLocked(channel.id)
                    }
                    isPrivate={privateChannelIds.has(channel.id)}
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
                    isCollapsed={collapsedCategories.includes(category.id) || (!!activeId?.startsWith("category-") && activeId !== `category-${category.id}`)}
                    isBeingDragged={activeId === `category-${category.id}`}
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

                      <div className="mt-0.5 space-y-0.5">
                        <SortableContext
                        items={category.channels.map((ch) => `channel-${ch.id}`)}
                        strategy={verticalListSortingStrategy}>

                          {category.channels.map((channel) =>
                        <MemoSortableChannel
                          key={channel.id}
                          channel={channel}
                          serverId={server.id}
                          isActive={activeChannelId === channel.id && !activeThreadId}
                          isVoiceConnected={voiceState.channelId === channel.id}
                    voiceStatus={voiceStatuses[channel.id]}
                    onEditVoiceStatus={() => setVoiceStatusChannelId(channel.id)}
                    onInviteVoice={() => setInviteChannelId(channel.id)}
                          speakingUsers={speakingUsers}
                          hasUnread={channelUnreadInfo[channel.id]?.hasUnread}
                          mentionCount={channelUnreadInfo[channel.id]?.mentionCount || 0}
                          onChannelClick={() => handleChannelClick(channel)}
                          onChannelHover={() => handleChannelHover(channel)}
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
                          canCreateInvite={canCreateInvite}
                          isVoiceLocked={
                          (channel.type === "voice" || channel.type === "stage") &&
                          isVoiceChannelLocked(channel.id)
                          }
                          isPrivate={privateChannelIds.has(channel.id)}
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

              {/* Pas de fantome sous le curseur (video de reference) : l'element reste en place, grise. */}
            </DndContext>
          </ChannelListScrollContainer>
          </RulesChannelContext.Provider>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          {canManageChannels ? (
            <>
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
            </>
          ) : (
            <ContextMenuItem disabled className="text-muted-foreground">
              Aucune action disponible
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* The user panel is now rendered by Index inside this same column, directly
          after the channel list, so no reserved-space spacer is needed here. */}
      {showServerProfileEdit && (
        <ServerProfileEditModal open onOpenChange={setShowServerProfileEdit} initialServerId={server.id} />
      )}
      {eventsModal.open && (
        <EventsModal
          serverId={server.id}
          open
          startWithWizard={eventsModal.wizard}
          onClose={() => setEventsModal({ open: false })}
          onOpenRoles={canAccessSettings && onOpenServerSettings ? () => {
            setEventsModal({ open: false });
            onOpenServerSettings('roles');
          } : undefined}
        />
      )}
      {showAccountSettings && (
        <Suspense fallback={<Spinner />}>
          <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />
        </Suspense>
      )}

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

      {voiceStatusChannelId &&
      <VoiceStatusModal
        channelName={getChannelName(voiceStatusChannelId)}
        serverId={server.id}
        initial={voiceStatuses[voiceStatusChannelId] ?? ''}
        onClose={() => setVoiceStatusChannelId(null)}
        onSave={(status) => setVoiceStatus.mutate({ channelId: voiceStatusChannelId, status })} />
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
              Êtes-vous sûr de vouloir quitter <strong translate="no">{server.name}</strong> ? Vous pourrez rejoindre à nouveau avec
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
  onInvite,
}: {
  onInvite?: () => void;
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
    <div className="ml-8 mr-2 mt-1 space-y-0.5">
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
              className="flex items-center gap-2.5 px-2 h-9 text-sm text-muted-foreground rounded-[4px] hover:bg-[hsl(var(--interactive-background-hover))] cursor-pointer transition-colors"
              onClick={(e) => handleOpenProfile(participant, e)}
            >
              <div
                className={cn(
                  // No transition, for the same reason as the other two rings.
                  "rounded-full border-2 p-0",
                  isSpeaking ? "border-[hsl(var(--online))]" : "border-transparent"
                )}
              >
                <Avatar className="w-7 h-7">
                  <AvatarImage src={participant.profile.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                    {participant.profile.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="truncate flex-1 text-[15px] font-medium text-[hsl(var(--interactive-icon-default))]">{participant.profile.display_name}</span>
              {participant.camera && <VideoIcon className="w-3 h-3 text-muted-foreground" />}
              {participant.streaming && (
                <span className="px-1.5 h-[18px] flex items-center text-[10px] font-bold uppercase leading-none bg-[#da373c] text-white rounded-[4px]">En direct</span>
              )}
              {participant.muted && <MicOff className="w-3 h-3 text-destructive" />}
              {participant.deafened && <HeadphoneOff className="w-3 h-3 text-destructive" />}
            </div>
          </VoiceParticipantContextMenu>
        );
      })}

      {onInvite && (
        <button type="button" onClick={onInvite} className="w-full h-8 pl-2 pr-2 rounded-[4px] flex items-center gap-2 text-sm text-muted-foreground hover:bg-[hsl(var(--interactive-background-hover))] hover:text-foreground transition-colors">
          <span className="w-6 h-6 rounded-full border border-dashed border-current flex items-center justify-center shrink-0"><UserPlus className="w-3.5 h-3.5" /></span>
          <span className="flex-1 truncate text-left">Inviter dans le salon vocal</span>
          <ChevronRight className="w-4 h-4 shrink-0" />
        </button>
      )}

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

const ChannelListScrollContainer = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    children: React.ReactNode;
  }
>(function ChannelListScrollContainer({ children, className, ...rest }, ref) {
  const guard = useScrollAwareContextMenuGuard();
  return (
    <div
      ref={ref}
      // pb : le panneau utilisateur flotte par-dessus le bas de la liste.
      className={cn("flex-1 overflow-y-auto scrollbar-thin pt-3 pb-[76px] relative", className)}
      {...guard}
      {...rest}
    >
      {children}
    </div>
  );
});



