import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronLeft, Settings, Calendar, Users, LogOut, Plus, Flag, FolderOpen, Hash, Layers } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EditCategoryModal } from '@/components/category-settings/EditCategoryModal';
import { ChannelSettingsModal } from '@/components/channel-settings/ChannelSettingsModal';

import { Separator } from '@/components/ui/separator';
import { CreateChannelModal } from '@/components/modals/CreateChannelModal';
import { CreateCategoryModal } from '@/components/modals/CreateCategoryModal';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { StreamlineStage } from '@/components/icons/StreamlineStage';
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
  onOpenSettings?: () => void;
  embedded?: boolean;
}

// ─── Server Profile Sheet ────────────────────────────────────────────

function ServerProfileSheet({
  serverId,
  serverName,
  trigger,
}: {
  serverId: string;
  serverName: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const { user } = useAuth();
  const { data: servers } = useServers();
  const { data: members } = useMembers(open ? serverId : null);
  const { data: emojis } = useServerEmojis(open ? serverId : null);
  const leaveServer = useLeaveServer();

  const server = servers?.find((s) => s.id === serverId);
  const isOwner = server?.owner_id === user?.id || server?.secondary_owner_id === user?.id;
  const ownerMember = members?.find((m) => m.user.id === server?.owner_id);
  const secondaryOwnerMember = members?.find((m) => m.user.id === server?.secondary_owner_id);
  const memberCount = members?.length ?? 0;

  const maxEmojis = 10;
  const displayedEmojis = emojis?.slice(0, maxEmojis) ?? [];
  const remainingEmojis = (emojis?.length ?? 0) - maxEmojis;

  const handleLeave = () => {
    leaveServer.mutate(serverId, {
      onSuccess: () => setOpen(false),
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
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
            {/* Icon + name + description */}
            <div className="flex items-start gap-3">
              <Avatar className="w-14 h-14 rounded-2xl border-2 border-background -mt-8 shadow-lg">
                {server?.icon_url ? (
                  <AvatarImage src={server.icon_url} alt={serverName} />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-primary text-primary-foreground text-lg font-bold">
                  {serverName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pt-1">
                <h3 className="font-bold text-base text-foreground truncate">{serverName}</h3>
                {server?.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {server.description}
                  </p>
                )}
              </div>
            </div>

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
                    Fondateur : <span className="text-foreground font-medium">{ownerMember.user.display_name}</span>
                  </span>
                </div>
              )}

              {secondaryOwnerMember && (
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <StreamlineCrown className="w-4 h-4 flex-shrink-0 text-gray-400" size={16} />
                  <span className="text-xs">
                    Co-propriétaire : <span className="text-foreground font-medium">{secondaryOwnerMember.user.display_name}</span>
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs">
                  {memberCount} membre{memberCount !== 1 ? 's' : ''}
                </span>
              </div>
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
                      src={emoji.image_url}
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

            {/* Actions */}
            <Separator />
            <div className="space-y-1">
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
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const emptyLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { channelUnreadInfo } = useChannelUnreadCounts(serverId);

  const clearEmptyLongPress = useCallback(() => {
    if (emptyLongPressTimer.current) {
      clearTimeout(emptyLongPressTimer.current);
      emptyLongPressTimer.current = null;
    }
  }, []);

  const handleEmptyTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]') || target.closest('a')) return;
    emptyLongPressTimer.current = setTimeout(() => {
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

  const serverNameTrigger = (
    <button className="flex items-center gap-1 text-left min-w-0">
      <h2 className="font-semibold text-sm truncate">{serverName}</h2>
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      {!embedded && (
        <div className="h-12 px-3 flex items-center gap-2 border-b border-border">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <ServerProfileSheet serverId={serverId} serverName={serverName} trigger={serverNameTrigger} />
          </div>
          {onOpenSettings && (
            <button onClick={onOpenSettings} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
      {embedded && (
        <div className="h-12 px-4 flex items-center gap-2 border-b border-border">
          <div className="flex-1 min-w-0">
            <ServerProfileSheet serverId={serverId} serverName={serverName} trigger={serverNameTrigger} />
          </div>
          {onOpenSettings && (
            <button onClick={onOpenSettings} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Channel List */}
      <div
        className="flex-1 overflow-y-auto py-2 px-2"
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
                  onClick={() => { setActiveChannelId(ch.id); onChannelSelect(ch.id, ch.type); }}
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
                    className="w-full flex items-center gap-1 px-3 py-2 text-xs font-semibold text-muted-foreground tracking-wide"
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
                </PopoverContent>
              </Popover>
              {!isCollapsed && cat.channels.map(ch => {
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
                        onClick={() => { setActiveChannelId(ch.id); onChannelSelect(ch.id, ch.type); }}
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
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Empty space long-press menu */}
      {showEmptyLongPressMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setShowEmptyLongPressMenu(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-4 left-6 right-6 bg-popover rounded-lg p-1 shadow-xl border border-border" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}
