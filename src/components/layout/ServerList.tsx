import { createPortal } from 'react-dom';
import { planRailDrop, finalizeRail, type RailEntry, type DropTarget } from '@/lib/railDrop';
import { Server } from '@/types/app';
import { cn } from '@/lib/utils';
import { uuidToSnowflake } from '@/lib/snowflake';
import { Compass, Plus, MessageCircle, Settings, UserPlus, LogOut, CheckCircle, Volume2, Folder, Star } from '@/components/icons/discord/lucide';
import { useServerVoiceParticipants } from '@/hooks/useServerVoiceParticipants';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip';
import { RailTooltipContent } from './RailTooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { copyToClipboard } from '@/lib/clipboard';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { useServerUnreadCounts } from '@/hooks/useServerUnreadCounts';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useDMMentionCounts } from '@/hooks/useDMMentionCounts';
import { useFriends } from '@/hooks/useFriends';
import { MentionBadge } from '@/components/ui/MentionBadge';
import { useServerOrder } from '@/hooks/useServerOrder';
import { useLeaveServer } from '@/hooks/useLeaveServer';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from 'react';


// DnD Kit imports
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

import { ChannelSheetIcon } from '@/components/icons/ChannelSheetIcon';
import { useServerFolders, type ServerFolder } from '@/hooks/useServerFolders';
import { ServerFolderItem, folderTileId } from './ServerFolderItem';
import { FolderSettingsModal } from './FolderSettingsModal';
import { DropBar, MergeDot } from './DndMarkers';
// (Drop indicator removed - now rendered inline like mobile)

// Server icon image with skeleton placeholder until decoded — prevents the
// "fallback initials flash then real icon" jank on cold cache loads.
// A failed load falls back to the initials: rendering the broken <img> showed
// its alt text spilling out of the tile (e.g. stale storage URLs after a
// Supabase migration).
function ServerIconImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);
  if (failed) {
    return (
      <span className="text-sm font-semibold pointer-events-none">
        {alt.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <div className="relative w-full h-full rounded-[inherit] overflow-hidden">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted/40 rounded-[inherit]" />
      )}
      <img
        src={src}
        alt={alt}
        width={48}
        height={48}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          'w-full h-full object-cover rounded-[inherit] pointer-events-none transition-opacity duration-150',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}


// Sortable Server Icon Component
function SortableServerIcon({
  server,
  isActive,
  hasUnread,
  mentionCount,
  isShaking,
  isDragging,
  isMergeTarget = false,
  inFolder = false,
  folderId,
  dropIndicator,
  onClick,
  onOpenSettings,
  onMarkAsRead,
  onInvite,
  onCopyId,
  onLeave,
  onRemoveFromFolder,
}: {
  server: Server;
  isActive: boolean;
  hasUnread: boolean;
  mentionCount: number;
  isShaking: boolean;
  isDragging: boolean;
  isMergeTarget?: boolean;
  inFolder?: boolean;
  folderId?: string;
  dropIndicator: 'before' | 'after' | null;
  onClick: () => void;
  onOpenSettings?: () => void;
  onMarkAsRead: () => void;
  onInvite: () => void;
  onCopyId: () => void;
  onLeave: () => void;
  onRemoveFromFolder?: () => void;
}) {
  const { user: me } = useAuth();
  const { data: voiceParticipants } = useServerVoiceParticipants(server.id);
  const { isGod, hasPermission } = usePermissions(server.id);
  const canCreateInvite = isGod || hasPermission('administrator');
  const canOpenSettings = isGod || hasPermission('manage_server') || hasPermission('administrator');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: server.id,
    data: { type: 'server', server },
  });

  // Pas de deplacement ni de fantome (video de reference) : la tuile glissee reste en place sous
  // forme d'emplacement gris, la barre verte indique ou elle tombera.
  const style = { transform: undefined as string | undefined, transition };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="relative overflow-visible"
      data-rail-id={server.id}
      data-rail-kind={inFolder ? 'child' : 'loose'}
      data-rail-entry={inFolder ? folderTileId(folderId!) : server.id}
      data-folder-id={folderId}
    >
      {/* Inline drop indicator - before */}
      {dropIndicator === 'before' && <DropBar edge="before" wide={inFolder} />}
      
      <ContextMenu>
        <Tooltip>
          <ContextMenuTrigger asChild>
            <TooltipTrigger asChild>
                <button type="button"
                  {...attributes}
                  {...listeners}
                  onClick={onClick}
                  className={cn(
                    'server-icon relative group select-none',
                    isActive && 'is-active',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-3 text-foreground hover:bg-primary hover:text-primary-foreground',
                    isDragging && '!bg-white/[0.08] [&>*]:invisible',
                    isMergeTarget && 'bg-[hsl(var(--dnd-line)/0.18)] shadow-[inset_0_0_0_1px_hsl(var(--dnd-line)/0.7)]'
                  )}
                >
                  {/* Active pill indicator */}
                  <div
                    className={cn(
                      /* Pastille d'état contre le bord gauche du rail : rail de 72px,
                     tuile de 40px → 16px de marge, d'où -left-4.
                     Hauteurs 40 / 20 / 8px (actif / survol / non lu). */
                      'absolute -left-4 w-1 rounded-r-full bg-foreground',
                      isActive
                        ? 'h-10'
                        : hasUnread || mentionCount > 0
                          ? 'h-2'
                          : 'h-0 group-hover:h-5'
                    )}
                    style={{ transition: 'height 300ms' }}
                  />
                
              {server.icon ? (
                  server.icon.startsWith('http') ? (
                    <ServerIconImage src={server.icon} alt={server.name} />
                  ) : (
                    <span className="text-xl pointer-events-none">{server.icon}</span>
                  )
                ) : (
                  <span className="text-sm font-semibold pointer-events-none">
                    {server.name.slice(0, 2).toUpperCase()}
                  </span>
                )}

                {isMergeTarget && <MergeDot />}

                {/* Voice activity badge - top right */}
                {voiceParticipants && voiceParticipants.length > 0 && mentionCount === 0 && (
                  <div className={cn("absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 border-sidebar", voiceParticipants.some((p) => p.user_id === me?.id) ? "bg-[hsl(var(--online))]" : "bg-black")}>
                    <Volume2 className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                {/* Mention notification badge - ONLY shows for mentions, not general unreads */}
                <MentionBadge
                  count={mentionCount}
                  size="lg"
                  className={cn(
                    "absolute -bottom-1 -right-1 border-[3px] border-[hsl(var(--surface-server-list))] animate-badge-pop",
                    isShaking && "animate-badge-shake"
                  )}
                />
              </button>
            </TooltipTrigger>
          </ContextMenuTrigger>
          <RailTooltipContent className="max-w-[200px]">
            <p translate="no" className="font-semibold">{server.name}</p>
            {voiceParticipants && voiceParticipants.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-muted-foreground/30 flex items-center justify-center shrink-0">
                    <Volume2 className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex items-center -space-x-1.5">
                    {voiceParticipants.slice(0, 3).map((p) => (
                      <Avatar key={p.user_id} className="w-4 h-4 border border-popover">
                        {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                        <AvatarFallback className="text-[7px] bg-muted">
                          {p.display_name.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {voiceParticipants.length > 3 && (
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      +{voiceParticipants.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}
          </RailTooltipContent>
        </Tooltip>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onSelect={onMarkAsRead}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Marquer comme lu
          </ContextMenuItem>
          {inFolder && onRemoveFromFolder && (
            <ContextMenuItem onSelect={onRemoveFromFolder}>
              Retirer du dossier
            </ContextMenuItem>
          )}
          {canCreateInvite && (
            <ContextMenuItem onSelect={onInvite}>
              <UserPlus className="w-4 h-4 mr-2" />
              Inviter des personnes
            </ContextMenuItem>
          )}
          {canOpenSettings && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={onOpenSettings}>
                <Settings className="w-4 h-4 mr-2" />
                Paramètres du serveur
              </ContextMenuItem>
            </>
          )}
          <ContextMenuItem onSelect={onCopyId}>
            <ChannelSheetIcon name="id" className="w-4 h-4 mr-2" />
            Copier l'ID
          </ContextMenuItem>
          {!isGod && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem 
                onSelect={(e) => {
                  e.preventDefault();
                  onLeave();
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Quitter le serveur
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {/* Inline drop indicator - after */}
      {dropIndicator === 'after' && <DropBar edge="after" wide={inFolder} />}
    </div>
  );
}



/*
 * Cible d'un glisser d'apres la position verticale du curseur (video de reference) :
 * quart haut / bas d'une tuile = barre verte avant / apres ; milieu = contour vert du dossier
 * (ou fusion en dossier au centre d'un serveur libre). Entre deux tuiles du dossier la barre
 * s'insere entre elles ; sous la derniere tuile, juste en dessous du dossier = sortie.
 */
function computeDropTarget(activeKey: string, y: number): DropTarget | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-rail-id]')).filter((el) => !el.closest('[inert]'));
  const tiles = els.map((el) => ({
    id: el.dataset.railId!,
    kind: el.dataset.railKind as 'loose' | 'folder-tile' | 'child',
    folder: el.dataset.folderId,
    entry: el.dataset.railEntry!,
    rect: el.getBoundingClientRect(),
  }));
  if (!tiles.length) return null;
  const inflate = 4;
  let t = tiles.find((r) => y >= r.rect.top - inflate && y <= r.rect.bottom + inflate);
  if (!t) t = tiles.reduce((best, r) => (Math.abs(y - (r.rect.top + r.rect.bottom) / 2) < Math.abs(y - (best.rect.top + best.rect.bottom) / 2) ? r : best));

  const isFolderDrag = activeKey.startsWith('folder:');
  const entryRect = document.querySelector<HTMLElement>(`[data-rail-entry="${CSS.escape(t.entry)}"]`)?.getBoundingClientRect() ?? t.rect;
  if (isFolderDrag) {
    if (t.entry === activeKey) return null;
    return { type: y < (entryRect.top + entryRect.bottom) / 2 ? 'before' : 'after', id: t.entry };
  }

  const rel = (y - t.rect.top) / t.rect.height;
  const top = rel < 0.25;
  const bottom = rel > 0.75;
  if (t.kind === 'loose') {
    if (t.id === activeKey) return null;
    return top ? { type: 'before', id: t.id } : bottom ? { type: 'after', id: t.id } : { type: 'into', id: t.id };
  }
  if (t.kind === 'folder-tile') {
    if (top) return { type: 'before', id: t.id };
    if (bottom) {
      const first = tiles.find((r) => r.kind === 'child' && r.folder === t!.folder);
      return first ? { type: 'before', id: first.id } : { type: 'after', id: t.id };
    }
    return { type: 'into', id: t.id };
  }
  // serveur d'un dossier
  const siblings = tiles.filter((r) => r.kind === 'child' && r.folder === t!.folder);
  const last = siblings[siblings.length - 1];
  if (last && t.id === last.id && y > t.rect.bottom + 2) return { type: 'after', id: `folder:${t.folder}` };
  if (top) return { type: 'before', id: t.id };
  if (bottom) return { type: 'after', id: t.id };
  return { type: 'into', id: `folder:${t.folder}` };
}

interface ServerListProps {
  servers: Server[];
  activeServerId: string | null;
  onServerSelect: (serverId: string | null) => void;
  onDiscoverClick: () => void;
  onCreateClick: () => void;
  onOpenServerSettings?: (serverId: string) => void;
  /** Leave room at the bottom for the floating user panel drawn over the rail. */
  reserveUserPanel?: boolean;
  /** La page Decouvrir est ouverte : le bouton boussole est actif et aucun serveur n'est surligne. */
  discoverActive?: boolean;
  /** Vue Favoris : bouton etoile du rail ("Afficher les serveurs favoris"). */
  favoritesEnabled?: boolean;
  favoritesActive?: boolean;
  onFavoritesClick?: () => void;
}

export function ServerList({
  servers,
  activeServerId,
  onServerSelect,
  onDiscoverClick,
  onCreateClick,
  onOpenServerSettings,
  reserveUserPanel = false,
  discoverActive = false,
  favoritesEnabled = false,
  favoritesActive = false,
  onFavoritesClick,
}: ServerListProps) {
  const { unreadInfo, markServerAsRead } = useServerUnreadCounts();
  const { unreadCounts: dmUnreadCounts } = useUnreadCounts();
  const { totalMentionCount: dmMentionCount } = useDMMentionCounts();
  // Pastille de l'accueil : mentions de MP + demandes d'ami recues (comme la reference).
  const { data: railFriends = [] } = useFriends();
  const totalDMMentions = dmMentionCount + railFriends.filter((f) => f.status === 'pending' && f.isIncoming).length;
  const { sortServers, reorderServers } = useServerOrder();
  const leaveServer = useLeaveServer();
  const { user } = useAuth();
  

  // Leave server dialog state
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [serverToLeave, setServerToLeave] = useState<Server | null>(null);

  // Sort servers by user's custom order
  const sortedServers = useMemo(() => sortServers(servers), [servers, sortServers]);

  // Dossiers : le rail est une liste d'entrees (serveurs libres + dossiers).
  // Les serveurs libres suivent profiles.server_order, chaque dossier se place
  // a sa position parmi les entrees.
  const { folders, createFolder, updateFolder, deleteFolder, updateFolders } = useServerFolders();
  const [settingsFolderId, setSettingsFolderId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const entries = useMemo<RailEntry[]>(() => {
    const byId = new Map(sortedServers.map((s) => [s.id, s]));
    const inFolder = new Set<string>();
    const folderEntries: RailEntry[] = [];
    for (const f of folders) {
      const members = f.serverIds.map((id) => byId.get(id)).filter((x): x is Server => !!x);
      if (!members.length) continue;
      members.forEach((m) => inFolder.add(m.id));
      folderEntries.push({ id: folderTileId(f.id), folder: f, servers: members });
    }
    const list: RailEntry[] = sortedServers.filter((s) => !inFolder.has(s.id)).map((server) => ({ id: server.id, server }));
    [...folderEntries]
      .sort((a, b) => a.folder!.position - b.folder!.position)
      .forEach((e) => list.splice(Math.min(e.folder!.position, list.length), 0, e));
    return list;
  }, [sortedServers, folders]);
  const serverIds = useMemo(() => entries.map((e) => e.id), [entries]);
  const settingsFolder = folders.find((f) => f.id === settingsFolderId) ?? null;

  /** Enregistre un nouvel ordre d'entrees : ordre des serveurs + position des dossiers. */
  const commitEntries = useCallback((next: RailEntry[]) => {
    const looseIds = next.filter((e) => e.server).map((e) => e.id);
    const folderMembers = next.flatMap((e) => e.servers?.map((s) => s.id) ?? []);
    reorderServers([...looseIds, ...folderMembers]);
    updateFolders(
      next.flatMap((e, i) => (e.folder && e.folder.position !== i ? [{ id: e.folder.id, patch: { position: i } }] : [])),
    );
  }, [reorderServers, updateFolders]);

  const removeFromFolder = useCallback((folder: ServerFolder, serverId: string) => {
    const idx = entries.findIndex((e) => e.folder?.id === folder.id);
    const server = sortedServers.find((s) => s.id === serverId);
    if (idx < 0 || !server) return;
    const remaining = folder.serverIds.filter((id) => id !== serverId);
    const next = [...entries];
    if (remaining.length) {
      updateFolder(folder.id, { serverIds: remaining });
      next[idx] = { ...next[idx], folder: { ...folder, serverIds: remaining }, servers: next[idx].servers!.filter((s) => s.id !== serverId) };
      next.splice(idx + 1, 0, { id: server.id, server });
    } else {
      deleteFolder(folder.id);
      next[idx] = { id: server.id, server };
    }
    commitEntries(next);
  }, [entries, sortedServers, updateFolder, deleteFolder, commitEntries]);

  // Calculate total unread DMs
  const totalUnreadDMs = Object.values(dmUnreadCounts).reduce((acc, count) => acc + count, 0);
  const hasUnreadDMs = Object.values(dmUnreadCounts).some(count => count > 0);

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  // Cible courante du glisser (calculee depuis la position du curseur) : barre verte avant / apres
  // une tuile, ou "dans" = contour vert du dossier / fusion au centre d'une tuile.
  const [dropTarget, setDropTargetState] = useState<DropTarget | null>(null);
  const dropTargetRef = useRef<DropTarget | null>(null);
  const setDropTarget = useCallback((t: DropTarget | null) => {
    const prev = dropTargetRef.current;
    if (prev?.type === t?.type && prev?.id === t?.id) return;
    dropTargetRef.current = t;
    setDropTargetState(t);
  }, []);
  const droppedRef = useRef(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const wasDraggingRef = useRef(false);
  
  const activeEntry = activeId ? entries.find(e => e.id === activeId) : null;
  const activeServer = activeEntry?.server ?? null;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Track previous counts for shake animation
  const prevMentionCounts = useRef<Record<string, number>>({});
  const prevDMCount = useRef<number>(0);
  const [shakingServers, setShakingServers] = useState<Set<string>>(new Set());
  const [shakingDMs, setShakingDMs] = useState(false);

  useEffect(() => {
    const newShaking = new Set<string>();
    Object.entries(unreadInfo).forEach(([serverId, info]) => {
      const prevCount = prevMentionCounts.current[serverId] || 0;
      if (info.mentionCount > prevCount) {
        newShaking.add(serverId);
      }
    });

    if (newShaking.size > 0) {
      setShakingServers(newShaking);
      setTimeout(() => setShakingServers(new Set()), 500);
    }

    const newPrevCounts: Record<string, number> = {};
    Object.entries(unreadInfo).forEach(([serverId, info]) => {
      newPrevCounts[serverId] = info.mentionCount;
    });
    prevMentionCounts.current = newPrevCounts;
  }, [unreadInfo]);

  useEffect(() => {
    if (totalDMMentions > prevDMCount.current) {
      setShakingDMs(true);
      setTimeout(() => setShakingDMs(false), 500);
    }
    prevDMCount.current = totalDMMentions;
  }, [totalDMMentions]);

  const handleCopyId = (serverId: string) => {
    copyToClipboard(uuidToSnowflake(serverId), 'ID serveur copié');
  };

  const handleMarkAsRead = (serverId: string) => {
    markServerAsRead(serverId);
  };

  const handleInvite = (serverId: string) => {
    const inviteLink = `${window.location.origin}/invite/${serverId}`;
    copyToClipboard(inviteLink, 'Lien d\'invitation copié');
  };

  const handleLeaveServer = (server: Server) => {
    console.log('[DEBUG] handleLeaveServer called for server:', server.id, server.name);
    console.log('[DEBUG] Current user:', user?.id);
    console.log('[DEBUG] Server owner:', server.ownerId);
    // Check if user is the owner
    if (server.ownerId === user?.id) {
      console.log('[DEBUG] User is owner, cannot leave');
      toast.error("Vous ne pouvez pas quitter un serveur dont vous êtes propriétaire");
      return;
    }
    console.log('[DEBUG] Opening leave dialog');
    setServerToLeave(server);
    setShowLeaveDialog(true);
  };

  const confirmLeaveServer = () => {
    console.log('[DEBUG] confirmLeaveServer called');
    console.log('[DEBUG] serverToLeave:', serverToLeave?.id);
    if (!serverToLeave) {
      console.log('[DEBUG] No server to leave');
      return;
    }
    console.log('[DEBUG] Calling leaveServer.mutate');
    leaveServer.mutate(serverToLeave.id, {
      onSuccess: () => {
        console.log('[DEBUG] Leave server success');
        setShowLeaveDialog(false);
        setServerToLeave(null);
        // Redirection is handled reactively by Index.tsx useEffect
      },
      onError: (error) => {
        console.log('[DEBUG] Leave server error:', error);
      }
    });
  };

  const handleServerClick = useCallback((serverId: string) => {
    if (wasDraggingRef.current) return;
    onServerSelect(serverId);
    markServerAsRead(serverId);
  }, [onServerSelect, markServerAsRead]);

  // DnD handlers (mobile-style)
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    wasDraggingRef.current = true;
    document.body.style.cursor = 'grabbing';
  }, []);

  /** Applique un depot : deplacement, sortie / entree de dossier, creation de dossier. */
  const applyDrop = useCallback((activeKey: string, target: DropTarget | null) => {
    const plan = planRailDrop(entries, activeKey, target);
    if (!plan) return;
    const run = (list: RailEntry[]) => {
      const { next, deleted, updates } = finalizeRail(list);
      deleted.forEach((id) => deleteFolder(id));
      updates.forEach((u) => updateFolder(u.id, { serverIds: u.serverIds }));
      commitEntries(next);
    };
    if (plan.createFolder) {
      const { at, targetServer, server } = plan.createFolder;
      void createFolder({ serverIds: [targetServer.id, server.id], position: at, expanded: false }).then((f) => {
        const out = [...plan.next];
        out[at] = { id: folderTileId(f.id), folder: f, servers: [targetServer, server] };
        run(out);
      });
      return;
    }
    run(plan.next);
  }, [entries, createFolder, updateFolder, deleteFolder, commitEntries]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    // Le depot natif a deja ete applique (ecouteur "drop") ; ce chemin sert aux ecrans tactiles.
    if (!droppedRef.current) applyDrop(String(event.active.id), dropTargetRef.current);
    droppedRef.current = false;
    setActiveId(null);
    setDropTarget(null);
    document.body.style.cursor = '';
    setTimeout(() => { wasDraggingRef.current = false; }, 100);
  }, [applyDrop, setDropTarget]);

  const handleDragCancel = useCallback(() => {
    droppedRef.current = false;
    setActiveId(null);
    setDropTarget(null);
    document.body.style.cursor = '';
    setTimeout(() => { wasDraggingRef.current = false; }, 100);
  }, [setDropTarget]);

  // Pendant un glisser, la cible est recalculee a chaque mouvement depuis la position du curseur
  // (les tuiles ne bougent pas : seule la barre / le contour verts indiquent ou l'on depose).
  useEffect(() => {
    if (!activeId) return;
    const onMove = (e: DragEvent) => {
      if (e.clientX === 0 && e.clientY === 0) return;
      setDropTarget(computeDropTarget(activeId, e.clientY));
      const el = previewRef.current;
      if (el) el.style.transform = `translate3d(${e.clientX - 20}px, ${e.clientY - 14}px, 0)`;
    };
    const onDrop = () => {
      droppedRef.current = true;
      applyDrop(activeId, dropTargetRef.current);
    };
    window.addEventListener('dragover', onMove, true);
    window.addEventListener('drop', onDrop, true);
    return () => {
      window.removeEventListener('dragover', onMove, true);
      window.removeEventListener('drop', onDrop, true);
    };
  }, [activeId, applyDrop, setDropTarget]);

  return (
    // h-full/min-h-0: the rail is now nested one level deeper (inside the
    // sidebar column that also hosts the user panel), so it no longer inherits
    // its full height from the outer flex. Without these it collapses to its
    // content height and the rail background stops mid-screen.
    /*
     * Rail de la capture de reference : 72px, meme gris que la liste de
     * salons, sans bordure propre (c'est le panneau principal qui porte le
     * filet). Accueil, separateur, serveurs puis actions defilent ensemble ;
     * le bas est reserve au panneau utilisateur qui flotte par-dessus.
     */
    <div className="w-[72px] h-full min-h-0 bg-[hsl(var(--surface-server-list))] flex flex-col">
      <div
        className={cn(
          'flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-none flex flex-col items-center gap-2 pt-[6px]',
          reserveUserPanel ? 'pb-[76px]' : 'pb-3'
        )}
      >
      {/* Home / DMs */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button"
            onClick={() => onServerSelect(null)}
            className={cn(
              'server-icon relative group shrink-0',
              activeServerId === null && !discoverActive && !favoritesActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface-3 text-foreground hover:bg-primary hover:text-primary-foreground'
            )}
          >
            {/* Pastille d'etat, collee au bord gauche du rail (tuile de 40px
                centree dans 72px : 16px de marge). */}
            <div
              className={cn(
                'absolute -left-4 w-1 rounded-r-full bg-foreground',
                activeServerId === null && !discoverActive && !favoritesActive ? 'h-10' : hasUnreadDMs ? 'h-2' : 'h-0 group-hover:h-5'
              )}
              style={{ transition: 'height 300ms' }}
            />
            <MessageCircle className="w-6 h-6" />

            {totalDMMentions > 0 && (
              <MentionBadge
                count={totalDMMentions}
                size="md"
                className={cn(
                  "absolute -bottom-1 -right-1 border-[3px] border-[hsl(var(--surface-server-list))] animate-badge-pop",
                  shakingDMs && "animate-badge-shake"
                )}
              />
            )}
          </button>
        </TooltipTrigger>
        <RailTooltipContent>
          <p>Messages Privés</p>
        </RailTooltipContent>
      </Tooltip>

      {favoritesEnabled && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onFavoritesClick}
              aria-pressed={favoritesActive}
              className={cn('server-icon relative group shrink-0', favoritesActive ? 'bg-primary text-primary-foreground' : 'bg-surface-3 text-foreground hover:bg-primary hover:text-primary-foreground')}
            >
              <div className={cn('absolute -left-4 w-1 rounded-r-full bg-foreground', favoritesActive ? 'h-10' : 'h-0 group-hover:h-5')} style={{ transition: 'height 300ms' }} />
              <Star className="w-6 h-6 fill-current" />
            </button>
          </TooltipTrigger>
          <RailTooltipContent>
            <p>Favoris</p>
          </RailTooltipContent>
        </Tooltip>
      )}

      <div className="w-8 h-px shrink-0 bg-[hsl(var(--frame-border))]" />

      {/* Server Icons with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={serverIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col items-center gap-2 w-full">
            {entries.map((entry) => {
              const line = (id: string) => (dropTarget && dropTarget.type !== 'into' && dropTarget.id === id ? dropTarget.type : null);
              const into = (id: string) => dropTarget?.type === 'into' && dropTarget.id === id;
              const indicator = line(entry.id);
              const renderServer = (server: Server, inFolder: boolean, folder?: ServerFolder) => {
                const serverInfo = unreadInfo[server.id] || { hasUnread: false, mentionCount: 0 };
                return (
                  <SortableServerIcon
                    key={server.id}
                    server={server}
                    isActive={activeServerId === server.id && !discoverActive && !favoritesActive}
                    hasUnread={serverInfo.hasUnread}
                    mentionCount={serverInfo.mentionCount}
                    isShaking={shakingServers.has(server.id)}
                    isDragging={activeId === server.id}
                    isMergeTarget={into(server.id)}
                    inFolder={inFolder}
                    folderId={folder?.id}
                    dropIndicator={inFolder ? line(server.id) : indicator}
                    onClick={() => handleServerClick(server.id)}
                    onOpenSettings={() => onOpenServerSettings?.(server.id)}
                    onMarkAsRead={() => handleMarkAsRead(server.id)}
                    onInvite={() => handleInvite(server.id)}
                    onCopyId={() => handleCopyId(server.id)}
                    onLeave={() => handleLeaveServer(server)}
                    onRemoveFromFolder={folder ? () => removeFromFolder(folder, server.id) : undefined}
                  />
                );
              };
              if (entry.server) return renderServer(entry.server, false);
              const { folder, servers: members } = entry as Required<RailEntry>;
              const infos = members.map((m) => unreadInfo[m.id] || { hasUnread: false, mentionCount: 0 });
              const hasUnread = infos.some((i) => i.hasUnread);
              const mentions = infos.reduce((n, i) => n + i.mentionCount, 0);
              return (
                <ServerFolderItem
                  key={entry.id}
                  folder={folder}
                  servers={members}
                  containsActive={members.some((m) => m.id === activeServerId)}
                  hasUnread={hasUnread}
                  mentionCount={mentions}
                  isMergeTarget={into(entry.id)}
                  isDragging={activeId === entry.id}
                  dropIndicator={indicator}
                  canMarkRead={hasUnread || mentions > 0}
                  onToggle={() => {
                    if (!wasDraggingRef.current) updateFolder(folder.id, { expanded: !folder.expanded });
                  }}
                  onMarkRead={() => members.forEach((m) => handleMarkAsRead(m.id))}
                  onMove={(to) => {
                    const rest = entries.filter((e) => e.id !== entry.id);
                    commitEntries(to === 'first' ? [entry, ...rest] : [...rest, entry]);
                  }}
                  onSettings={() => { setSettingsFolderId(folder.id); setSettingsOpen(true); }}
                  onCloseAll={() => updateFolders(folders.filter((f) => f.expanded).map((f) => ({ id: f.id, patch: { expanded: false } })))}
                >
                  {members.map((m) => renderServer(m, true, folder))}
                </ServerFolderItem>
              );
            })}
          </div>
        </SortableContext>


      </DndContext>

      {/* Apercu qui suit le curseur pendant un glisser (video de reference) : la tuile en cours,
          a sa taille, par-dessus tout ; l'original reste en emplacement gris dans le rail. */}
      {activeId && createPortal(
        <div
          ref={previewRef}
          aria-hidden
          className="fixed left-0 top-0 z-[9999] pointer-events-none"
          style={{ transform: 'translate3d(-200px,-200px,0)', willChange: 'transform' }}
        >
          {(() => {
            const folderEntry = entries.find((e) => e.id === activeId && e.folder);
            const srv = entries.flatMap((e) => (e.server ? [e.server] : e.servers ?? [])).find((x) => x.id === activeId);
            if (folderEntry) {
              return (
                <div className="w-12 h-12 rounded-[16px] flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.4)]" style={{ backgroundColor: `color-mix(in srgb, ${folderEntry.folder!.color ?? '#5865f2'} 60%, #2b2d31)` }}>
                  <Folder className="w-6 h-6" style={{ color: folderEntry.folder!.color ?? '#5865f2' }} />
                </div>
              );
            }
            if (!srv) return null;
            return (
              <div className="server-icon !m-0 bg-surface-3 text-foreground shadow-[0_8px_16px_rgba(0,0,0,0.4)] overflow-hidden">
                {srv.icon?.startsWith('http') ? (
                  <img src={srv.icon} alt="" draggable={false} className="w-full h-full object-cover" />
                ) : srv.icon ? (
                  <span className="text-xl">{srv.icon}</span>
                ) : (
                  <span className="text-sm font-semibold">{srv.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
            );
          })()}
        </div>,
        document.body,
      )}

      {/* Action Buttons */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button"
            onClick={onCreateClick}
            className="server-icon shrink-0 bg-surface-3 text-foreground hover:bg-status-online hover:text-primary-foreground"
          >
            <Plus className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <RailTooltipContent>
          <p>Ajouter un serveur</p>
        </RailTooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button"
            onClick={onDiscoverClick}
            aria-pressed={discoverActive}
            className={cn('server-icon shrink-0 relative group', discoverActive ? 'is-active bg-primary text-primary-foreground' : 'bg-surface-3 text-foreground hover:bg-status-online hover:text-primary-foreground')}
          >
            <span className={cn('absolute -left-4 w-1 rounded-r-full bg-foreground', discoverActive ? 'h-10' : 'h-0 group-hover:h-5')} style={{ transition: 'height 300ms' }} />
            <Compass className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <RailTooltipContent>
          <p>Découvrir</p>
        </RailTooltipContent>
      </Tooltip>
      </div>

      {settingsFolder && (
        <FolderSettingsModal
          folder={settingsFolder}
          open={settingsOpen}
          // Le dialogue reste monte le temps de l'animation de sortie.
          onClose={() => { setSettingsOpen(false); setTimeout(() => setSettingsFolderId(null), 200); }}
          onSave={(patch) => updateFolder(settingsFolder.id, patch)}
        />
      )}

      {/* Leave Server Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le serveur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir quitter <strong>{serverToLeave?.name}</strong> ? Vous pourrez rejoindre à nouveau avec
              une invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setServerToLeave(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmLeaveServer} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Quitter le serveur
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
