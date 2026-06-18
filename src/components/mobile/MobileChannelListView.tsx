import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ServerProfileEditModal } from '@/components/profile/ServerProfileEditModal';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronLeft, ChevronRight, Settings, Calendar, LogOut, Plus, Flag, FolderOpen, Hash, Layers, Trash2, Loader2, UserPlus, Search, Bell, CheckCheck, UserCog, Globe } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EditCategoryModal } from '@/components/category-settings/EditCategoryModal';
import { ChannelSettingsModal } from '@/components/channel-settings/ChannelSettingsModal';
import { useDeleteChannel, useDeleteCategory } from '@/hooks/useChannels';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { CreateChannelModal } from '@/components/modals/CreateChannelModal';
import { CreateCategoryModal } from '@/components/modals/CreateCategoryModal';
import { CreateInviteModal } from '@/components/modals/CreateInviteModal';
import { ExternalLinkWarningModal } from '@/components/modals/ExternalLinkWarningModal';
import { Input } from '@/components/ui/input';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { StreamlineStage } from '@/components/icons/StreamlineStage';
import { StreamlineLink } from '@/components/icons/StreamlineLink';
import { StreamlineCrown } from '@/components/icons/StreamlineCrown';
import { useChannelUnreadCounts } from '@/hooks/useChannelUnreadCounts';
import { useServers } from '@/hooks/useServers';
import { useMembers } from '@/hooks/useMembers';
import { useServerEmojis } from '@/hooks/useServerAssets';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaveServer } from '@/hooks/useLeaveServer';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const channelIcons: Record<string, React.ElementType> = {
  text: StreamlineHash,
  voice: StreamlineVoice,
  forum: StreamlineForum,
  announcement: StreamlineMegaphone,
  media: StreamlineMedia,
  calendar: StreamlineCalendar,
  tasks: StreamlineTasks,
  stage: StreamlineStage,
  link: StreamlineLink,
};

interface Channel {
  id: string;
  name: string;
  type: string;
  description?: string;
}

interface Category {
  id: string;
  name: string;
  channels: Channel[];
}

interface MobileChannelListViewProps {
  serverName: string;
  serverId: string;
  categories: Category[];
  orphanChannels?: Channel[];
  onBack: () => void;
  onChannelSelect: (channelId: string, channelType: string) => void;
  onOpenSettings?: (initialTab?: string) => void;
  embedded?: boolean;
}

// ─── Server Profile Sheet ────────────────────────────────────────────

function ServerProfileSheet({
  serverId,
  serverName,
  trigger,
  onOpenSettings,
}: {
  serverId: string;
  serverName: string;
  trigger: (isOpen: boolean) => React.ReactNode;
  onOpenSettings?: (initialTab?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [showEditServerProfile, setShowEditServerProfile] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const { user } = useAuth();
  const { data: servers } = useServers();
  const { data: members } = useMembers(open ? serverId : null);
  const { data: emojis } = useServerEmojis(open ? serverId : null);
  const leaveServer = useLeaveServer();
  const queryClient = useQueryClient();

  const server = servers?.find((s) => s.id === serverId);
  const isOwner = server?.owner_id === user?.id || server?.secondary_owner_id === user?.id;
  const ownerMember = members?.find((m) => m.user.id === server?.owner_id);
  const secondaryOwnerMember = members?.find((m) => m.user.id === server?.secondary_owner_id);
  const memberCount = members?.length ?? 0;
  const onlineCount = members?.filter((m) => {
    const s = m.user.status;
    return s === 'online' || s === 'idle' || s === 'dnd';
  }).length ?? 0;
  const serverCategory = (server as any)?.category || 'Communauté';

  const maxEmojis = 10;
  const displayedEmojis = emojis?.slice(0, maxEmojis) ?? [];
  const remainingEmojis = (emojis?.length ?? 0) - maxEmojis;

  const handleLeave = () => {
    leaveServer.mutate(serverId, {
      onSuccess: () => setOpen(false),
    });
  };

  const handleMarkAllRead = async () => {
    if (!user || markingRead) return;
    setMarkingRead(true);
    try {
      // Upsert server-level read marker
      await supabase
        .from('server_read_states')
        .upsert(
          { user_id: user.id, server_id: serverId, last_read_at: new Date().toISOString() },
          { onConflict: 'user_id,server_id' }
        );

      // Clear pending mentions for all this server's channels
      const { data: chs } = await supabase
        .from('channels')
        .select('id')
        .eq('server_id', serverId);
      const channelIds = (chs || []).map((c) => c.id);
      if (channelIds.length > 0) {
        await supabase
          .from('channel_mentions')
          .delete()
          .eq('user_id', user.id)
          .in('channel_id', channelIds);
      }

      queryClient.invalidateQueries({ queryKey: ['channel-unread-counts', serverId, user.id] });
      queryClient.invalidateQueries({ queryKey: ['server-unread-mentions'] });
      queryClient.invalidateQueries({ queryKey: ['server-unread-counts'] });
      toast.success('Tous les messages marqués comme lus');
      setOpen(false);
    } catch (e: any) {
      toast.error('Impossible de marquer comme lu');
    } finally {
      setMarkingRead(false);
    }
  };

  const ActionTile = ({
    icon: Icon,
    label,
    onClick,
    danger,
    disabled,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors min-w-0 disabled:opacity-50',
      )}
    >
      <Icon className={cn('w-5 h-5', danger ? 'text-destructive' : 'text-foreground')} />
      <span className={cn('text-[10px] font-medium leading-tight text-center truncate w-full px-0.5', danger ? 'text-destructive' : 'text-muted-foreground')}>
        {label}
      </span>
    </button>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger(open)}</SheetTrigger>
        <SheetContent side="bottom" className="p-0 rounded-t-2xl max-h-[85vh] overflow-y-auto">
          {/* Banner */}
          <div className="relative h-28 w-full overflow-hidden rounded-t-2xl">
            {server?.banner_url ? (
              <img
                src={server.banner_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/60 to-primary/30" />
            )}

            {/* Leave button on banner */}
            {!isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm text-destructive text-xs font-medium hover:bg-background/90 transition-colors">
                    <LogOut className="w-3.5 h-3.5" />
                    Quitter
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Quitter « {serverName} » ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Vous ne pourrez plus accéder à ce serveur sauf si vous êtes réinvité.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLeave}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Quitter le serveur
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Server info */}
          <div className="px-4 pb-5 pt-3 space-y-4">
            {/* Icon + name aligned vertically + single-line stats */}
            <div className="flex items-center gap-3">
              <Avatar className="w-14 h-14 rounded-2xl border-2 border-background -mt-8 shadow-lg flex-shrink-0">
                {server?.icon_url ? (
                  <AvatarImage src={server.icon_url} alt={serverName} />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-primary text-primary-foreground text-lg font-bold">
                  {serverName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-foreground truncate leading-tight">{serverName}</h3>
                <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground min-w-0">
                  <Globe className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{serverCategory}</span>
                  <span className="opacity-60">·</span>
                  <span className="flex items-center gap-0.5 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--online))]" />
                    {onlineCount}
                  </span>
                  <span className="opacity-60">·</span>
                  <span className="flex-shrink-0">{memberCount} membre{memberCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {server?.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {server.description}
              </p>
            )}

            {/* Metadata */}
            <div className="space-y-2.5">
              {server?.created_at && (
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs">
                    Créé le {format(new Date(server.created_at), 'd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}

              {ownerMember && (
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <StreamlineCrown className="w-4 h-4 flex-shrink-0 text-yellow-500" size={16} />
                  <span className="text-xs">
                    Fondateur : <span className="text-foreground font-medium">{ownerMember.user.username}</span>
                  </span>
                </div>
              )}

              {secondaryOwnerMember && (
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <StreamlineCrown className="w-4 h-4 flex-shrink-0 text-gray-400" size={16} />
                  <span className="text-xs">
                    Co-propriétaire : <span className="text-foreground font-medium">{secondaryOwnerMember.user.username}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Primary actions row (icons + small label) */}
            <div className="grid grid-cols-3 gap-2">
              <ActionTile
                icon={UserPlus}
                label="Inviter"
                onClick={() => { setOpen(false); setShowCreateInvite(true); }}
              />
              <ActionTile
                icon={Bell}
                label="Notifs"
                onClick={() => { setOpen(false); onOpenSettings?.('notifications'); }}
              />
              <ActionTile
                icon={Settings}
                label="Paramètres"
                onClick={() => { setOpen(false); onOpenSettings?.(); }}
              />
            </div>

            {/* Emojis */}

            {displayedEmojis.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground">
                  Emojis ({emojis?.length ?? 0})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {displayedEmojis.map((emoji) => (
                    <img
                      key={emoji.id}
                      src={emoji.url}
                      alt={emoji.name}
                      title={`:${emoji.name}:`}
                      className="w-7 h-7 rounded object-contain"
                    />
                  ))}
                  {remainingEmojis > 0 && (
                    <span className="w-7 h-7 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                      +{remainingEmojis}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Secondary actions */}
            <Separator />
            <div className="space-y-1">
              <button
                onClick={handleMarkAllRead}
                disabled={markingRead}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left disabled:opacity-50"
              >
                {markingRead ? (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm text-foreground">Marquer comme lu</span>
              </button>
              <button
                onClick={() => { setOpen(false); setShowEditServerProfile(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
              >
                <UserCog className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Modifie ton profil pour le serveur</span>
              </button>
              <button
                onClick={() => { setOpen(false); setShowCreateChannel(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Créer un salon</span>
              </button>
              <button
                onClick={() => { setOpen(false); setShowCreateCategory(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Créer une catégorie</span>
              </button>
              <button
                onClick={() => {}}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
              >
                <Flag className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">Signaler le serveur</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {showCreateChannel && (
        <CreateChannelModal
          serverId={serverId}
          categoryId={null}
          categoryName=""
          onClose={() => setShowCreateChannel(false)}
        />
      )}

      {showCreateCategory && (
        <CreateCategoryModal
          serverId={serverId}
          onClose={() => setShowCreateCategory(false)}
        />
      )}

      {showCreateInvite && (
        <CreateInviteModal
          serverId={serverId}
          onClose={() => setShowCreateInvite(false)}
        />
      )}

      <ServerProfileEditModal
        open={showEditServerProfile}
        onOpenChange={setShowEditServerProfile}
        initialServerId={serverId}
      />
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function MobileChannelListView({
  serverName,
  serverId,
  categories,
  orphanChannels = [],
  onBack,
  onChannelSelect,
  onOpenSettings,
  embedded = false,
}: MobileChannelListViewProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [longPressedCategoryId, setLongPressedCategoryId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; channelCount: number } | null>(null);
  const [longPressedChannelId, setLongPressedChannelId] = useState<string | null>(null);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [showEmptyLongPressMenu, setShowEmptyLongPressMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [longPressPosition, setLongPressPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [externalLinkModal, setExternalLinkModal] = useState<{ url: string } | null>(null);
  const emptyLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const deleteChannel = useDeleteChannel();
  const deleteCategoryMut = useDeleteCategory();
  const { channelUnreadInfo } = useChannelUnreadCounts(serverId);
  const [bannerProgress, setBannerProgress] = useState(1);
  
  const { data: servers } = useServers();
  const currentServer = servers?.find(s => s.id === serverId);
  const { data: members } = useMembers(serverId);
  const memberCount = members?.length ?? 0;
  const serverCategory = (currentServer as any)?.category || 'Communauté';

  const clearEmptyLongPress = useCallback(() => {
    if (emptyLongPressTimer.current) {
      clearTimeout(emptyLongPressTimer.current);
      emptyLongPressTimer.current = null;
    }
  }, []);

  const handleEmptyTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]') || target.closest('a')) return;
    const touch = e.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;
    emptyLongPressTimer.current = setTimeout(() => {
      setLongPressPosition({ x: touchX, y: touchY });
      setShowEmptyLongPressMenu(true);
    }, 500);
  }, []);

  const handleEmptyTouchEnd = useCallback(() => { clearEmptyLongPress(); }, [clearEmptyLongPress]);
  const handleEmptyTouchMove = useCallback(() => { clearEmptyLongPress(); }, [clearEmptyLongPress]);

  const toggleCategory = (id: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const serverNameTrigger = (isOpen: boolean) => (
    <button className="flex items-center text-left min-w-0 leading-tight gap-1.5">
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <h2 className="font-bold text-lg truncate text-foreground">{serverName}</h2>
          <ChevronRight className={cn("w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200", isOpen && "rotate-90")} />
        </div>
        <p className="text-[11px] text-muted-foreground truncate max-w-full">
          {memberCount} membre{memberCount !== 1 ? 's' : ''} · {serverCategory}
        </p>
      </div>
    </button>
  );

  const serverNameTriggerLight = (isOpen: boolean) => (
    <button className="flex items-center text-left min-w-0 leading-tight gap-1.5">
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <h2 className="font-bold text-lg truncate text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.9),0_0px_2px_rgba(0,0,0,0.8)]">{serverName}</h2>
          <ChevronRight className={cn("w-5 h-5 text-white/90 flex-shrink-0 [filter:drop-shadow(0_1px_4px_rgba(0,0,0,0.9))] transition-transform duration-200", isOpen && "rotate-90")} />
        </div>
        <p className="text-[11px] text-white/80 truncate max-w-full [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
          {memberCount} membre{memberCount !== 1 ? 's' : ''} · {serverCategory}
        </p>
      </div>
    </button>
  );

    const bannerUrl = currentServer?.banner_url;

    const BANNER_HEIGHT = 96;
    const handleChannelListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = (e.target as HTMLDivElement).scrollTop;
      const progress = Math.max(0, Math.min(1, 1 - scrollTop / BANNER_HEIGHT));
      setBannerProgress(progress);
    }, []);

    return (
    <div className="flex flex-col h-full bg-[hsl(var(--surface-1))] select-none">
      {/* Banner (both embedded and non-embedded) - progressive fade */}
      {bannerUrl && (
        <div
          className="relative flex-shrink-0 overflow-hidden rounded-t-xl"
          style={{
            height: `${BANNER_HEIGHT * bannerProgress}px`,
            opacity: bannerProgress,
          }}
        >
          <img src={bannerUrl} className="w-full h-24 object-cover" alt="" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center gap-2">
            {!embedded && (
              <button onClick={onBack} className="p-1 rounded-lg bg-background/30 hover:bg-background/50 transition-colors">
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <ServerProfileSheet serverId={serverId} serverName={serverName} trigger={serverNameTriggerLight} onOpenSettings={onOpenSettings} />
            </div>
          </div>
        </div>
      )}

      {/* Header (shown when no banner or banner nearly hidden) */}
      {(!bannerUrl || bannerProgress < 0.1) && !embedded && (
        <div className="min-h-14 py-1.5 px-3 flex items-center gap-2 border-b border-border rounded-t-xl bg-[hsl(var(--surface-1))]">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <ServerProfileSheet serverId={serverId} serverName={serverName} trigger={serverNameTrigger} onOpenSettings={onOpenSettings} />
          </div>
        </div>
      )}
      {(!bannerUrl || bannerProgress < 0.1) && embedded && (
        <div className="min-h-14 py-1.5 px-4 flex items-center gap-2 border-b border-border bg-[hsl(var(--surface-1))]">
          <div className="flex-1 min-w-0">
            <ServerProfileSheet serverId={serverId} serverName={serverName} trigger={serverNameTrigger} onOpenSettings={onOpenSettings} />
          </div>
        </div>
      )}

      {/* Search bar + Invite - always visible */}
      <div className="px-3 pt-2 pb-1 bg-[hsl(var(--surface-1))] flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
          <Input
            placeholder="Rechercher..."
            value={mobileSearchQuery}
            onChange={(e) => setMobileSearchQuery(e.target.value)}
            className="h-9 pl-8 text-sm bg-input rounded-xl"
          />
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="p-2 rounded-full hover:bg-surface-3 text-muted-foreground transition-colors flex-shrink-0"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Separator before channel list */}
      <div className="h-px bg-border/30" />

      {/* Channel List */}
      <div
        className="flex-1 overflow-y-auto py-2 px-1"
        onScroll={handleChannelListScroll}
        onTouchStart={handleEmptyTouchStart}
        onTouchEnd={handleEmptyTouchEnd}
        onTouchMove={handleEmptyTouchMove}
      >
        {/* Orphan channels */}
        {orphanChannels.map(ch => {
          const Icon = channelIcons[ch.type] || StreamlineHash;
          const info = channelUnreadInfo[ch.id];
          const chLongPressHandlers = {
            onTouchStart: (() => {
              let timer: ReturnType<typeof setTimeout> | null = null;
              return (e: React.TouchEvent) => {
                timer = setTimeout(() => {
                  setLongPressedChannelId(ch.id);
                }, 500);
                (e.currentTarget as any).__longPressTimer = timer;
              };
            })(),
            onTouchEnd: (e: React.TouchEvent) => {
              const timer = (e.currentTarget as any).__longPressTimer;
              if (timer) clearTimeout(timer);
            },
            onTouchMove: (e: React.TouchEvent) => {
              const timer = (e.currentTarget as any).__longPressTimer;
              if (timer) clearTimeout(timer);
            },
          };
          return (
            <Popover key={ch.id} open={longPressedChannelId === ch.id} onOpenChange={(open) => !open && setLongPressedChannelId(null)}>
              <PopoverTrigger asChild>
                <button
                  onClick={() => {
                    if (ch.type === 'link') {
                      const url = ch.description || '';
                      if (url) setExternalLinkModal({ url });
                      return;
                    }
                    setActiveChannelId(ch.id); onChannelSelect(ch.id, ch.type);
                  }}
                  {...chLongPressHandlers}
                  className={cn("channel-item w-full", activeChannelId === ch.id && "active")}
                >
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className={cn(
                    "text-sm truncate flex-1 text-left",
                    info?.hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>{ch.name}</span>
                  {(info?.mentionCount ?? 0) > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-destructive text-destructive-foreground rounded-full font-bold">
                      {info!.mentionCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1" side="bottom" align="start">
                <button
                  onClick={() => {
                    setLongPressedChannelId(null);
                    setEditingChannelId(ch.id);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors w-full text-left"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  Modifier le salon
                </button>
                <button
                  onClick={() => {
                    setLongPressedChannelId(null);
                    setDeletingChannelId(ch.id);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors w-full text-left text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer le salon
                </button>
              </PopoverContent>
            </Popover>
          );
        })}

        {/* Categories */}
        {categories.map(cat => {
          const isCollapsed = collapsedCategories.has(cat.id);
          const longPressHandlers = {
            onTouchStart: (() => {
              let timer: ReturnType<typeof setTimeout> | null = null;
              return (e: React.TouchEvent) => {
                timer = setTimeout(() => {
                  setLongPressedCategoryId(cat.id);
                }, 500);
                (e.currentTarget as any).__longPressTimer = timer;
              };
            })(),
            onTouchEnd: (e: React.TouchEvent) => {
              const timer = (e.currentTarget as any).__longPressTimer;
              if (timer) clearTimeout(timer);
            },
            onTouchMove: (e: React.TouchEvent) => {
              const timer = (e.currentTarget as any).__longPressTimer;
              if (timer) clearTimeout(timer);
            },
          };
          return (
            <div key={cat.id}>
              <Popover open={longPressedCategoryId === cat.id} onOpenChange={(open) => !open && setLongPressedCategoryId(null)}>
                <PopoverTrigger asChild>
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    {...longPressHandlers}
                    className="w-full flex items-center gap-1 px-3 pt-3 pb-0 text-xs font-semibold text-muted-foreground tracking-wide"
                  >
                    <ChevronDown className={cn("w-3 h-3 transition-transform", isCollapsed && "-rotate-90")} />
                    {cat.name}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1" side="bottom" align="start">
                  <button
                    onClick={() => {
                      setLongPressedCategoryId(null);
                      setEditingCategory({ id: cat.id, name: cat.name, channelCount: cat.channels.length });
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors w-full text-left"
                  >
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    Modifier la catégorie
                  </button>
                  <button
                    onClick={() => {
                      setLongPressedCategoryId(null);
                      setDeletingCategoryId(cat.id);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors w-full text-left text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer la catégorie
                  </button>
                </PopoverContent>
              </Popover>
              {!isCollapsed && <div className="mt-0.5 mb-1">{cat.channels.map(ch => {
                const Icon = channelIcons[ch.type] || StreamlineHash;
                const info = channelUnreadInfo[ch.id];
                const chLongPressHandlers = {
                  onTouchStart: (() => {
                    let timer: ReturnType<typeof setTimeout> | null = null;
                    return (e: React.TouchEvent) => {
                      timer = setTimeout(() => {
                        setLongPressedChannelId(ch.id);
                      }, 500);
                      (e.currentTarget as any).__longPressTimer = timer;
                    };
                  })(),
                  onTouchEnd: (e: React.TouchEvent) => {
                    const timer = (e.currentTarget as any).__longPressTimer;
                    if (timer) clearTimeout(timer);
                  },
                  onTouchMove: (e: React.TouchEvent) => {
                    const timer = (e.currentTarget as any).__longPressTimer;
                    if (timer) clearTimeout(timer);
                  },
                };
                return (
                  <Popover key={ch.id} open={longPressedChannelId === ch.id} onOpenChange={(open) => !open && setLongPressedChannelId(null)}>
                    <PopoverTrigger asChild>
                      <button
                        onClick={() => {
                          if (ch.type === 'link') {
                            const url = ch.description || '';
                            if (url) setExternalLinkModal({ url });
                            return;
                          }
                          setActiveChannelId(ch.id); onChannelSelect(ch.id, ch.type);
                        }}
                        {...chLongPressHandlers}
                        className={cn("channel-item w-full", activeChannelId === ch.id && "active")}
                      >
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className={cn(
                          "text-sm truncate flex-1 text-left",
                          info?.hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>{ch.name}</span>
                        {(info?.mentionCount ?? 0) > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-destructive text-destructive-foreground rounded-full font-bold">
                            {info!.mentionCount}
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1" side="bottom" align="start">
                      <button
                        onClick={() => {
                          setLongPressedChannelId(null);
                          setEditingChannelId(ch.id);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors w-full text-left"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        Modifier le salon
                      </button>
                      <button
                        onClick={() => {
                          setLongPressedChannelId(null);
                          setDeletingChannelId(ch.id);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors w-full text-left text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer le salon
                      </button>
                    </PopoverContent>
                  </Popover>
                );
              })}</div>}
            </div>
          );
        })}
      </div>

      {/* Empty space long-press menu */}
      {showEmptyLongPressMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setShowEmptyLongPressMenu(false)}>
          <div
            className="fixed bg-popover rounded-lg p-1 shadow-[0_8px_30px_rgba(0,0,0,0.35)] border border-border w-44"
            style={{
              left: Math.max(8, longPressPosition.x - 180),
              top: Math.min(longPressPosition.y - 40, window.innerHeight - 100),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setShowEmptyLongPressMenu(false); setShowCreateChannel(true); }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-muted transition-colors text-left"
            >
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-foreground font-medium">Créer un salon</span>
            </button>
            <button
              onClick={() => { setShowEmptyLongPressMenu(false); setShowCreateCategory(true); }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-muted transition-colors text-left"
            >
              <Layers className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-foreground font-medium">Créer une catégorie</span>
            </button>
          </div>
        </div>
      )}

      {showCreateChannel && (
        <CreateChannelModal
          serverId={serverId}
          categoryId={null}
          categoryName=""
          onClose={() => setShowCreateChannel(false)}
        />
      )}

      {showCreateCategory && (
        <CreateCategoryModal
          serverId={serverId}
          onClose={() => setShowCreateCategory(false)}
        />
      )}

      {editingCategory && (
        <EditCategoryModal
          categoryId={editingCategory.id}
          categoryName={editingCategory.name}
          serverId={serverId}
          channelCount={editingCategory.channelCount}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {editingChannelId && (
        <ChannelSettingsModal
          channelId={editingChannelId}
          serverId={serverId}
          onClose={() => setEditingChannelId(null)}
        />
      )}

      {/* Delete channel confirmation */}
      <AlertDialog open={!!deletingChannelId} onOpenChange={(open) => !open && setDeletingChannelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le salon</AlertDialogTitle>
            <AlertDialogDescription>
              Tu es sûr(e) de vouloir supprimer <strong className="text-foreground">
                #{[...orphanChannels, ...categories.flatMap(c => c.channels)].find(c => c.id === deletingChannelId)?.name}
              </strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteChannel.isPending}
              onClick={async () => {
                if (!deletingChannelId) return;
                try {
                  await deleteChannel.mutateAsync({ channelId: deletingChannelId, serverId });
                  toast.success('Salon supprimé');
                } catch {
                  toast.error('Erreur lors de la suppression');
                }
                setDeletingChannelId(null);
              }}
            >
              {deleteChannel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete category confirmation */}
      <AlertDialog open={!!deletingCategoryId} onOpenChange={(open) => !open && setDeletingCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la catégorie</AlertDialogTitle>
            <AlertDialogDescription>
              Tu es sûr(e) de vouloir supprimer <strong className="text-foreground">
                {categories.find(c => c.id === deletingCategoryId)?.name}
              </strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCategoryMut.isPending}
              onClick={async () => {
                if (!deletingCategoryId) return;
                try {
                  await deleteCategoryMut.mutateAsync({ categoryId: deletingCategoryId, serverId });
                  toast.success('Catégorie supprimée');
                } catch {
                  toast.error('Erreur lors de la suppression');
                }
                setDeletingCategoryId(null);
              }}
            >
              {deleteCategoryMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showInviteModal && (
        <CreateInviteModal
          serverId={serverId}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {externalLinkModal && (
        <ExternalLinkWarningModal
          url={externalLinkModal.url}
          onClose={() => setExternalLinkModal(null)}
        />
      )}
    </div>
  );
}
